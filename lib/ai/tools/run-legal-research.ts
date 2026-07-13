import { generateObject, tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  getAiCreditCost,
  getUsageDiffForJuristoModel,
} from "@/lib/ai/model-access";
import {
  type AuthorityRef,
  auditResearchPacket,
  buildAuthorityRefs,
  buildClaimGraphEdges,
  buildFallbackClaims,
  buildForumRoutes,
  buildNodeExecutions,
  buildTargetedReresearchPlan,
  buildTreatmentCheck,
  classifyResearchSource,
  decomposeIssueGraph,
  getDomain,
  getFailedClaimIds,
  hasCrossForumRoutes,
  isMajorCaseAuthority,
  OFFICIAL_LEGAL_DOMAINS,
  type ResearchAudits,
  type ResearchClaim,
  type ResearchIssueNode,
  type ResearchNodeExecution,
  type ResearchPacketV2,
  type ResearchSourceLike,
  type ResearchSourceType,
  researchClaimSchema,
  researchSourceTypeSchema,
  type TreatmentCheck,
} from "@/lib/ai/research-verification";
import { getUserUsage, updateUserUsage } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { getLimit } from "@/lib/usage/plan-limits";
import { generateUUID } from "@/lib/utils";

type RunLegalResearchProps = {
  chatId: string;
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

type ResearchSource = ResearchSourceLike & {
  domain: string;
  content: string;
  sourceType: ResearchSourceType;
  query: string;
  status: "found" | "used";
};

type ResearchFinding = {
  title: string;
  url: string;
  domain: string;
  sourceType: ResearchSourceType;
  publishedDate?: string;
  note: string;
};

type ResearchPlanItem = {
  id: string;
  label: string;
  query: string;
  issueNodeId?: string;
  sourceGoal?:
    | "primary-law"
    | "case-law"
    | "regulator"
    | "treatment"
    | "recent";
};

type ResearchProgressStage =
  | "issue-graph"
  | "authorities"
  | "treatment"
  | "forum"
  | "citation-audit"
  | "ready-for-writing";

type ResearchProgressEvent = {
  status: "running" | "complete";
  stage: ResearchProgressStage;
  message: string;
  activeQuery?: string;
  plan?: ResearchPlanItem[];
  sources?: ResearchSource[];
  issueGraph?: ResearchIssueNode[];
  authorities?: AuthorityRef[];
  claims?: ResearchClaim[];
  nodeExecutions?: ResearchNodeExecution[];
  audits?: ResearchAudits;
};

const JURISTO_MINI_MODEL = "google/gemini-3.5-flash";
const JURISTO_MACRO_MODEL = "google/gemini-3-pro-preview";
const TAVILY_MAX_QUERY_LENGTH = 400;
const TAVILY_SAFE_QUERY_LENGTH = 390;
const TAVILY_FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_TAVILY_MAX_RESULTS = 5;
const MAX_RESEARCH_PLAN_ITEMS = 8;
const MAX_TREATMENT_CHECKS = 4;
const MAX_RETRY_SEARCHES = 3;

function extractTokenCount(usage: any, fallbackTokens: number) {
  if (!usage) {
    return fallbackTokens;
  }
  if (typeof usage.totalTokens === "number") {
    return usage.totalTokens;
  }
  if (typeof usage.total === "number") {
    return usage.total;
  }

  const input =
    typeof usage.inputTokens === "number"
      ? usage.inputTokens
      : typeof usage.inputTokens?.total === "number"
        ? usage.inputTokens.total
        : 0;
  const output =
    typeof usage.outputTokens === "number"
      ? usage.outputTokens
      : typeof usage.outputTokens?.total === "number"
        ? usage.outputTokens.total
        : 0;

  return input + output || fallbackTokens;
}

function estimateTokens(text: string, outputBudget = 1500) {
  return Math.ceil(text.length / 4) + outputBudget;
}

async function assertTokenBudget(userId: string, estimatedTokens: number) {
  const usage = await getUserUsage(userId);
  const plan = usage?.plan || "free";
  const limit = getLimit(plan, "tokens");
  const used = Number(usage?.tokensUsed || 0);

  const estimatedCredits = getAiCreditCost(JURISTO_MACRO_MODEL, estimatedTokens);

  if (limit !== -1 && used + estimatedCredits > limit) {
    throw new Error(
      "TOKEN_LIMIT_REACHED: Research Mode needs more AI credits than your current plan allows. Please upgrade to continue deep research."
    );
  }

  return plan;
}

async function chargeModelUsage(params: {
  userId: string;
  modelId: string;
  usage: any;
  fallbackTokens: number;
}) {
  const tokens = extractTokenCount(params.usage, params.fallbackTokens);
  await updateUserUsage({
    id: params.userId,
    ...getUsageDiffForJuristoModel(params.modelId, tokens),
  });
  return tokens;
}

function isOfficialDomain(domain: string) {
  return OFFICIAL_LEGAL_DOMAINS.some((officialDomain) =>
    domain.includes(officialDomain)
  );
}

function compactResearchQuery(query: string) {
  const compacted = query.replace(/\s+/g, " ").trim();

  if (compacted.length <= TAVILY_MAX_QUERY_LENGTH) {
    return compacted;
  }

  const clipped = compacted.slice(0, TAVILY_SAFE_QUERY_LENGTH);
  const lastSpace = clipped.lastIndexOf(" ");

  return (lastSpace > 240 ? clipped.slice(0, lastSpace) : clipped).trim();
}

function sortSources(sources: ResearchSource[]) {
  return [...sources].sort((a, b) => {
    const aOfficial = isOfficialDomain(a.domain);
    const bOfficial = isOfficialDomain(b.domain);
    if (aOfficial !== bOfficial) {
      return aOfficial ? -1 : 1;
    }
    const aPrimary = ["court", "statute", "regulator", "government"].includes(
      a.sourceType
    );
    const bPrimary = ["court", "statute", "regulator", "government"].includes(
      b.sourceType
    );
    if (aPrimary !== bPrimary) {
      return aPrimary ? -1 : 1;
    }
    return (b.score || 0) - (a.score || 0);
  });
}

function addUniquePlanItem(plan: ResearchPlanItem[], item: ResearchPlanItem) {
  if (plan.some((existing) => existing.query === item.query)) {
    return;
  }
  plan.push(item);
}

function buildResearchQueries({
  legalIssue,
  jurisdiction,
  focusAreas,
  issueGraph,
}: {
  legalIssue: string;
  jurisdiction?: string;
  focusAreas?: string[];
  issueGraph: ResearchIssueNode[];
}) {
  const jurisdictionText = jurisdiction || "India";
  const focusText = focusAreas?.length ? ` ${focusAreas.join(" ")}` : "";
  const plan: ResearchPlanItem[] = [];

  for (const node of issueGraph) {
    const topicText = `${legalIssue} ${node.keywords.join(" ")} ${focusText}`;
    addUniquePlanItem(plan, {
      id: `${node.id}-primary`,
      issueNodeId: node.id,
      label: `${node.issue}: primary law`,
      sourceGoal: "primary-law",
      query: `${topicText} ${jurisdictionText} official statute rules gazette site:indiacode.nic.in OR site:legislative.gov.in OR site:egazette.nic.in`,
    });

    addUniquePlanItem(plan, {
      id: `${node.id}-cases`,
      issueNodeId: node.id,
      label: `${node.issue}: cases and forum authority`,
      sourceGoal: "case-law",
      query: `${topicText} ${jurisdictionText} Supreme Court High Court tribunal judgment official`,
    });

    if (
      [
        "pmla_attachment",
        "ngt_environment",
        "environment_clearance",
        "ibc_moratorium",
        "ibc_section_14",
        "ibc_section_32a",
        "forum_conflict",
        "current_law",
        "statutory_interpretation",
      ].includes(node.topic)
    ) {
      addUniquePlanItem(plan, {
        id: `${node.id}-regulator`,
        issueNodeId: node.id,
        label: `${node.issue}: regulator or government material`,
        sourceGoal: "regulator",
        query: `${topicText} ${jurisdictionText} regulator notification circular order official`,
      });
    }
  }

  addUniquePlanItem(plan, {
    id: "recent-developments",
    label: "Recent developments and amendments",
    sourceGoal: "recent",
    query: `${legalIssue} ${jurisdictionText} latest 2025 2026 amendment judgment notification official`,
  });

  return plan.slice(0, MAX_RESEARCH_PLAN_ITEMS);
}

async function tavilySearch(
  query: string,
  maxResults = DEFAULT_TAVILY_MAX_RESULTS,
  options: {
    searchDepth?: "basic" | "advanced";
    timeoutMs?: number;
  } = {}
) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Research source search is not configured.");
  }
  const safeQuery = compactResearchQuery(query);
  const timeoutMs = options.timeoutMs || TAVILY_FETCH_TIMEOUT_MS;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      api_key: apiKey,
      query: safeQuery,
      search_depth: options.searchDepth || "basic",
      include_answer: true,
      include_images: false,
      max_results: maxResults,
    }),
  });

  if (!response.ok) {
    await response.text();
    console.warn("[LegalResearch] Source search failed", response.status);
    throw new Error("Research source search failed.");
  }

  return response.json();
}

function normalizeSearchResult(
  item: any,
  query: string
): ResearchSource | null {
  if (!item?.url) {
    return null;
  }
  const domain = getDomain(item.url);
  const title = item.title || item.url;
  return {
    title,
    url: item.url,
    domain,
    content: item.content || "",
    score: item.score,
    publishedDate: item.published_date,
    sourceType: classifyResearchSource(item.url, title),
    query,
    status: "found",
  };
}

function toFindings(authorities: AuthorityRef[]): ResearchFinding[] {
  return authorities.map((authority) => ({
    title: authority.title,
    url: authority.sourceUrl,
    domain: authority.domain,
    sourceType: authority.sourceType,
    note: `${authority.authorityType}; ${authority.note}`,
  }));
}

function normalizeGeneratedClaims({
  claims,
  fallbackClaims,
  authorities,
  issueGraph,
}: {
  claims: ResearchClaim[];
  fallbackClaims: ResearchClaim[];
  authorities: AuthorityRef[];
  issueGraph: ResearchIssueNode[];
}) {
  const issueIds = new Set(issueGraph.map((node) => node.id));
  const authorityById = new Map(
    authorities.map((authority) => [authority.id, authority])
  );

  if (claims.length === 0) {
    return fallbackClaims;
  }

  return claims.map((claim, index) => {
    const fallback = fallbackClaims[index] || fallbackClaims[0];
    const supportingAuthorityIds = claim.supportingAuthorityIds.filter((id) =>
      authorityById.has(id)
    );
    const hasPrimarySupport = supportingAuthorityIds.some(
      (id) => authorityById.get(id)?.sourceRole === "primary"
    );

    return {
      ...claim,
      claimId: claim.claimId || fallback.claimId,
      issueNodeId: issueIds.has(claim.issueNodeId)
        ? claim.issueNodeId
        : fallback.issueNodeId,
      supportingAuthorityIds,
      confidence:
        claim.loadBearing && !hasPrimarySupport ? "low" : claim.confidence,
      loadBearing: claim.loadBearing && supportingAuthorityIds.length > 0,
      unresolvedReason:
        claim.loadBearing && !hasPrimarySupport
          ? "Generated claim lacks primary-source support."
          : claim.unresolvedReason,
    };
  });
}

function buildQualityReviewFromAudits(audits: ResearchAudits) {
  const allFindings = [
    ...audits.citationAudit,
    ...audits.sourceHierarchyAudit,
    ...audits.treatmentAudit,
    ...audits.completenessAudit,
  ];
  const failures = allFindings.filter((finding) => finding.status === "fail");
  const warnings = allFindings.filter(
    (finding) => finding.status === "warning"
  );

  return {
    confidence:
      failures.length > 0 ? "low" : warnings.length > 0 ? "medium" : "high",
    gaps: failures.map((finding) => finding.message),
    sourceWarnings: warnings.map((finding) => finding.message),
    recommendedWriterEmphasis: [
      "Write from the issue graph and forum routes.",
      "Use claim IDs and authority IDs for load-bearing propositions.",
      "Mark unresolved issues instead of converting them into conclusions.",
    ],
  };
}

export const runLegalResearch = ({
  chatId,
  session,
  dataStream,
}: RunLegalResearchProps) =>
  tool({
    description:
      "Run the full Juristo Deep Research verification pipeline before report writing. This decomposes issues, retrieves authorities, checks treatment, routes forums, builds claim-level citations, audits the packet, and returns ResearchPacketV2 for createResearchReport.",
    inputSchema: z.object({
      legalIssue: z.string().describe("The legal issue or research question."),
      jurisdiction: z
        .string()
        .optional()
        .describe("Jurisdiction, e.g. India, Delhi, Maharashtra, US."),
      focusAreas: z
        .array(z.string())
        .optional()
        .describe(
          "Optional areas to prioritize, e.g. statutes, recent cases, regulator guidance."
        ),
      userGoal: z
        .string()
        .optional()
        .describe("How the user wants to use the research."),
    }),
    execute: async ({ legalIssue, jurisdiction, focusAreas, userGoal }) => {
      const runId = generateUUID();
      const startedAt = Date.now();
      const userId = session.user.id;
      const modelUsage: Array<{
        stage: string;
        modelId: string;
        tier: "mini" | "macro" | "max";
        tokens: number;
      }> = [];
      await assertTokenBudget(userId, 2000);

      let issueGraph = decomposeIssueGraph({
        legalIssue,
        jurisdiction,
        focusAreas,
      });
      let researchPlan = buildResearchQueries({
        legalIssue,
        jurisdiction,
        focusAreas,
        issueGraph,
      });
      let forumRoutes = buildForumRoutes(issueGraph);
      const sourcesByUrl = new Map<string, ResearchSource>();

      const emit = (data: ResearchProgressEvent) => {
        dataStream.write({
          type: "data-research-progress",
          data: {
            chatId,
            runId,
            legalIssue,
            jurisdiction: jurisdiction || "India",
            startedAt,
            ...data,
          },
          transient: true,
        });
      };

      emit({
        status: "running",
        stage: "issue-graph",
        message: "Breaking the question into key legal points.",
        plan: researchPlan,
        sources: [],
        issueGraph,
      });

      try {
        const prompt = `Legal issue: ${legalIssue}
Jurisdiction: ${jurisdiction || "India"}
User goal: ${userGoal || "Prepare a lawyer-ready research report"}
Focus areas: ${focusAreas?.join(", ") || "statutes, cases, regulators, recent developments"}

Refine the issue graph and search tracks for a legal research pipeline. Preserve the user's legal issues. Each issue node must map to one forum route. Each search track should target primary legal authority first.`;
        const estimatedTokens = estimateTokens(prompt, 1400);
        await assertTokenBudget(userId, estimatedTokens);

        const result = await generateObject({
          model: getLanguageModel(JURISTO_MINI_MODEL) as any,
          system:
            "You are Juristo Mini, the issue-graph planner inside Juristo Deep Research. Produce structured issue nodes and primary-source search tracks only.",
          prompt,
          schema: z.object({
            issueGraph: z.array(
              z.object({
                issue: z.string(),
                subQuestion: z.string(),
                topic: z.string(),
                keywords: z.array(z.string()),
              })
            ),
            plan: z
              .array(
                z.object({
                  id: z.string(),
                  label: z.string(),
                  query: z.string(),
                  issueNodeId: z.string().optional(),
                  sourceGoal: z
                    .enum([
                      "primary-law",
                      "case-law",
                      "regulator",
                      "treatment",
                      "recent",
                    ])
                    .optional(),
                })
              )
              .min(4)
              .max(10),
          }),
        });

        if (result.object.issueGraph.length > issueGraph.length) {
          const deterministicNodes = decomposeIssueGraph({
            legalIssue: `${legalIssue} ${result.object.issueGraph
              .map((node) => node.keywords.join(" "))
              .join(" ")}`,
            jurisdiction,
            focusAreas,
          });
          issueGraph = deterministicNodes;
          forumRoutes = buildForumRoutes(issueGraph);
        }

        if (result.object.plan.length > 0) {
          researchPlan = result.object.plan.map((item, index) => ({
            ...item,
            id: item.id || `track-${index + 1}`,
            sourceGoal: item.sourceGoal || "primary-law",
          }));
        }

        const tokens = await chargeModelUsage({
          userId,
          modelId: JURISTO_MINI_MODEL,
          usage: (result as any).usage,
          fallbackTokens: estimatedTokens,
        });
        modelUsage.push({
          stage: "issue-graph-planner",
          modelId: JURISTO_MINI_MODEL,
          tier: "mini",
          tokens,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("TOKEN_LIMIT_REACHED")
        ) {
          throw error;
        }
        console.warn(
          "[LegalResearch] Issue planner failed, using deterministic graph",
          error
        );
      }

      for (const planItem of researchPlan) {
        emit({
          status: "running",
          stage: "authorities",
          message: planItem.label,
          activeQuery: planItem.query,
          plan: researchPlan,
          sources: Array.from(sourcesByUrl.values()),
          issueGraph,
        });

        try {
          const result = await tavilySearch(planItem.query, 5, {
            searchDepth:
              planItem.sourceGoal === "primary-law" ||
              planItem.sourceGoal === "case-law"
                ? "advanced"
                : "basic",
          });
          const results = Array.isArray(result.results) ? result.results : [];

          for (const item of results) {
            const source = normalizeSearchResult(item, planItem.query);
            if (!source || sourcesByUrl.has(source.url)) {
              continue;
            }
            sourcesByUrl.set(source.url, source);
          }
        } catch {
          emit({
            status: "running",
            stage: "authorities",
            message:
              "One source search could not finish. Continuing with other sources.",
            activeQuery: planItem.query,
            plan: researchPlan,
            sources: Array.from(sourcesByUrl.values()),
            issueGraph,
          });
        }
      }

      const rankedSources = sortSources(Array.from(sourcesByUrl.values()));
      const topSources = rankedSources.slice(0, 18).map((source) => ({
        ...source,
        status: "used" as const,
      }));
      let authorities = buildAuthorityRefs(topSources, issueGraph);

      emit({
        status: "running",
        stage: "treatment",
        message: "Checking whether key cases are still reliable.",
        plan: researchPlan,
        sources: topSources,
        issueGraph,
        authorities,
      });

      const treatmentChecks: TreatmentCheck[] = [];
      const majorAuthorities = authorities
        .filter(isMajorCaseAuthority)
        .slice(0, MAX_TREATMENT_CHECKS);

      for (const authority of majorAuthorities) {
        const checkedQuery = `${authority.title} overruled recalled distinguished stayed clarified limited subsequent treatment India`;
        emit({
          status: "running",
          stage: "treatment",
          message: "Checking case status.",
          activeQuery: checkedQuery,
          plan: researchPlan,
          sources: Array.from(sourcesByUrl.values()),
          issueGraph,
          authorities,
        });

        try {
          const result = await tavilySearch(checkedQuery, 4, {
            searchDepth: "basic",
          });
          const results = Array.isArray(result.results) ? result.results : [];
          const checkedSources: string[] = [];
          const treatmentText: string[] = [];

          for (const item of results) {
            const source = normalizeSearchResult(item, checkedQuery);
            if (!source) {
              continue;
            }
            checkedSources.push(source.url);
            treatmentText.push(`${source.title} ${source.content}`);
            if (!sourcesByUrl.has(source.url)) {
              sourcesByUrl.set(source.url, { ...source, status: "used" });
            }
          }

          treatmentChecks.push(
            buildTreatmentCheck({
              authority,
              checkedQuery,
              checkedSources,
              treatmentText: treatmentText.join("\n"),
            })
          );
        } catch (error) {
          console.warn("[LegalResearch] Treatment search failed", error);
          treatmentChecks.push(
            buildTreatmentCheck({
              authority,
              checkedQuery,
              checkedSources: [],
              treatmentText: "",
            })
          );
        }
      }

      let finalSources = sortSources(Array.from(sourcesByUrl.values()))
        .slice(0, 24)
        .map((source) => ({
          ...source,
          status: "used" as const,
        }));
      authorities = buildAuthorityRefs(finalSources, issueGraph);

      emit({
        status: "running",
        stage: "forum",
        message: hasCrossForumRoutes(forumRoutes)
          ? "Multiple legal routes may apply."
          : "Likely legal route identified.",
        plan: researchPlan,
        sources: finalSources,
        issueGraph,
        authorities,
      });

      let findings = toFindings(authorities);
      let synthesisNotes: string[] = [
        hasCrossForumRoutes(forumRoutes)
          ? "The report must include a Forum Split section because the issue crosses multiple forums."
          : "The report should still state the forum assumption and route.",
      ];
      let fallbackClaims = buildFallbackClaims({
        issueGraph,
        authorities,
        treatmentChecks,
      });
      let claims = fallbackClaims;

      try {
        const prompt = `Legal issue: ${legalIssue}
Jurisdiction: ${jurisdiction || "India"}
User goal: ${userGoal || "Prepare a lawyer-ready research report"}

Issue graph:
${issueGraph
  .map(
    (node) =>
      `${node.id}: ${node.issue} | forum=${node.forum} | sub-question=${node.subQuestion}`
  )
  .join("\n")}

Forum routes:
${forumRoutes
  .map((route) => `${route.issueNodeId}: ${route.label} - ${route.reason}`)
  .join("\n")}

Authorities:
${authorities
  .map(
    (authority) =>
      `${authority.id}: ${authority.title}
URL: ${authority.sourceUrl}
Type: ${authority.authorityType}
Role: ${authority.sourceRole}
Issue nodes: ${authority.issueNodeIds.join(", ")}
Pinpoint: ${authority.pinpoint}
Snippet: ${authority.note}`
  )
  .join("\n\n")}

Treatment checks:
${treatmentChecks
  .map(
    (check) =>
      `${check.authorityId}: ${check.status} (${check.confidence}) - ${check.note}`
  )
  .join("\n")}

Create a source-backed legal research packet.
Rules:
- Every load-bearing claim must cite authority IDs from the list above.
- Do not use commentary/news as final support for a load-bearing legal proposition.
- If primary authority is missing, mark the point unresolved rather than inventing a conclusion.
- Use claim IDs and issue node IDs exactly enough for a report writer to cite them.`;
        const estimatedTokens = estimateTokens(prompt, 2600);
        await assertTokenBudget(userId, estimatedTokens);

        const result = await generateObject({
          model: getLanguageModel(JURISTO_MACRO_MODEL) as any,
          system:
            "You are Juristo Macro, the legal synthesis model inside Juristo Deep Research. Build claim-level legal propositions from verified issue nodes and authorities.",
          prompt,
          schema: z.object({
            findings: z.array(
              z.object({
                title: z.string(),
                url: z.string().url(),
                domain: z.string(),
                sourceType: researchSourceTypeSchema,
                publishedDate: z.string().optional(),
                note: z.string(),
              })
            ),
            synthesisNotes: z.array(z.string()),
            claims: z.array(researchClaimSchema).min(1).max(14),
          }),
        });

        if (result.object.findings.length > 0) {
          findings = result.object.findings;
        }
        synthesisNotes = result.object.synthesisNotes;
        claims = normalizeGeneratedClaims({
          claims: result.object.claims,
          fallbackClaims,
          authorities,
          issueGraph,
        });

        const tokens = await chargeModelUsage({
          userId,
          modelId: JURISTO_MACRO_MODEL,
          usage: (result as any).usage,
          fallbackTokens: estimatedTokens,
        });
        modelUsage.push({
          stage: "claim-synthesis",
          modelId: JURISTO_MACRO_MODEL,
          tier: "macro",
          tokens,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("TOKEN_LIMIT_REACHED")
        ) {
          throw error;
        }
        console.warn(
          "[LegalResearch] Claim synthesis failed, using fallback claims",
          error
        );
      }

      let packetWithoutAudits = {
        researchPacketVersion: 2 as const,
        issueGraph,
        forumRoutes,
        authorities,
        claims,
        treatmentChecks,
      };
      let audits = auditResearchPacket(packetWithoutAudits);
      const retryPlan = buildTargetedReresearchPlan({
        audits,
        claims,
        issueGraph,
        legalIssue,
        jurisdiction,
      }).slice(0, MAX_RETRY_SEARCHES);

      if (audits.status === "needs_revision" && retryPlan.length > 0) {
        emit({
          status: "running",
          stage: "citation-audit",
          message: "Checking a few points again with stronger legal sources.",
          plan: [...researchPlan, ...retryPlan],
          sources: finalSources,
          issueGraph,
          authorities,
          claims,
          audits,
        });

        for (const retryItem of retryPlan) {
          emit({
            status: "running",
            stage: "authorities",
            message: retryItem.label,
            activeQuery: retryItem.query,
            plan: [...researchPlan, ...retryPlan],
            sources: Array.from(sourcesByUrl.values()),
            issueGraph,
            authorities,
            claims,
            audits,
          });

          try {
            const result = await tavilySearch(retryItem.query, 4, {
              searchDepth: "basic",
            });
            const results = Array.isArray(result.results) ? result.results : [];
            for (const item of results) {
              const source = normalizeSearchResult(item, retryItem.query);
              if (!source || sourcesByUrl.has(source.url)) {
                continue;
              }
              sourcesByUrl.set(source.url, source);
            }
          } catch (error) {
            console.warn("[LegalResearch] Targeted re-research failed", error);
          }
        }

        researchPlan = [...researchPlan, ...retryPlan];
        finalSources = sortSources(Array.from(sourcesByUrl.values()))
          .slice(0, 24)
          .map((source) => ({
            ...source,
            status: "used" as const,
          }));
        authorities = buildAuthorityRefs(finalSources, issueGraph);

        const checkedAuthorityIds = new Set(
          treatmentChecks.map((check) => check.authorityId)
        );
        const uncheckedMajorAuthorities = authorities
          .filter(isMajorCaseAuthority)
          .filter((authority) => !checkedAuthorityIds.has(authority.id))
          .slice(0, 3);

        for (const authority of uncheckedMajorAuthorities) {
          const checkedQuery = `${authority.title} overruled recalled distinguished stayed clarified limited subsequent treatment India`;
          try {
            const result = await tavilySearch(checkedQuery, 4, {
              searchDepth: "basic",
            });
            const results = Array.isArray(result.results) ? result.results : [];
            const checkedSources: string[] = [];
            const treatmentText: string[] = [];

            for (const item of results) {
              const source = normalizeSearchResult(item, checkedQuery);
              if (!source) {
                continue;
              }
              checkedSources.push(source.url);
              treatmentText.push(`${source.title} ${source.content}`);
              if (!sourcesByUrl.has(source.url)) {
                sourcesByUrl.set(source.url, { ...source, status: "used" });
              }
            }

            treatmentChecks.push(
              buildTreatmentCheck({
                authority,
                checkedQuery,
                checkedSources,
                treatmentText: treatmentText.join("\n"),
              })
            );
          } catch (error) {
            console.warn(
              "[LegalResearch] Retry treatment search failed",
              error
            );
            treatmentChecks.push(
              buildTreatmentCheck({
                authority,
                checkedQuery,
                checkedSources: [],
                treatmentText: "",
              })
            );
          }
        }

        const failedClaimIds = getFailedClaimIds(audits);
        fallbackClaims = buildFallbackClaims({
          issueGraph,
          authorities,
          treatmentChecks,
        });
        claims = claims.map((claim) => {
          if (!failedClaimIds.has(claim.claimId)) {
            return claim;
          }
          return (
            fallbackClaims.find(
              (fallbackClaim) => fallbackClaim.issueNodeId === claim.issueNodeId
            ) || claim
          );
        });

        packetWithoutAudits = {
          researchPacketVersion: 2 as const,
          issueGraph,
          forumRoutes,
          authorities,
          claims,
          treatmentChecks,
        };
        audits = auditResearchPacket(packetWithoutAudits);
      }

      const claimGraphEdges = buildClaimGraphEdges(claims);
      const nodeExecutions = buildNodeExecutions({
        issueGraph,
        researchPlan,
        authorities,
        claims,
        audits,
        retryQueries: retryPlan,
      });
      const researchPacket: ResearchPacketV2 = {
        ...packetWithoutAudits,
        claimGraphEdges,
        nodeExecutions,
        audits,
      };
      const qualityReview = buildQualityReviewFromAudits(audits);

      emit({
        status: audits.status === "pass" ? "complete" : "running",
        stage: "citation-audit",
        message:
          audits.status === "pass"
            ? "Source checks passed."
            : "Some points need more support before export.",
        plan: researchPlan,
        sources: finalSources,
        issueGraph,
        authorities,
        claims,
        nodeExecutions,
        audits,
      });

      emit({
        status: "complete",
        stage: "ready-for-writing",
        message:
          audits.status === "pass"
            ? "Verified research is ready."
            : "Research is ready for revision before export.",
        plan: researchPlan,
        sources: finalSources,
        issueGraph,
        authorities,
        claims,
        nodeExecutions,
        audits,
      });

      return {
        runId,
        legalIssue,
        jurisdiction: jurisdiction || "India",
        userGoal,
        researchPacketVersion: 2,
        researchPlan,
        sources: finalSources,
        findings,
        synthesisNotes,
        qualityReview,
        issueGraph,
        forumRoutes,
        authorities,
        claims,
        claimGraphEdges,
        treatmentChecks,
        nodeExecutions,
        audits,
        researchPacket,
        modelUsage,
        tokenUsage: {
          total: modelUsage.reduce((sum, item) => sum + item.tokens, 0),
          mini: modelUsage
            .filter((item) => item.tier === "mini")
            .reduce((sum, item) => sum + item.tokens, 0),
          macro: modelUsage
            .filter((item) => item.tier === "macro")
            .reduce((sum, item) => sum + item.tokens, 0),
          max: modelUsage
            .filter((item) => item.tier === "max")
            .reduce((sum, item) => sum + item.tokens, 0),
        },
        elapsedMs: Date.now() - startedAt,
        instruction:
          audits.status === "pass"
            ? "Call createResearchReport with the compact ResearchPacketV2 fields. Omit reportMarkdown unless a targeted revision is required; the server will assemble and save the full report."
            : "Revise the research claims or mark unsupported points as unresolved before calling createResearchReport. If exporting, pass compact ResearchPacketV2 fields and omit reportMarkdown unless a targeted revision is required.",
      };
    },
  });
