import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { trackUserActivity } from "@/lib/activity/tracking";
import {
  RESEARCH_REQUIRED_SECTIONS,
  type ResearchPacketV2,
  researchPacketV2Schema,
  validateResearchReportMarkdown,
} from "@/lib/ai/research-verification";
import { saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateResearchReportProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

const WWW_PREFIX_REGEX = /^www\./;
const SOURCE_LOGOS_HEADING_REGEX = /^#{1,3}\s+Source Logos and References/im;
const PRIMARY_SOURCE_TYPES = new Set([
  "court",
  "statute",
  "regulator",
  "government",
]);
const RECENT_SOURCE_REGEX = /latest|recent|2025|2026|notification|amendment/i;

const sourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  domain: z.string().optional(),
  publishedDate: z.string().optional(),
  sourceType: z
    .enum([
      "court",
      "statute",
      "regulator",
      "government",
      "legal-database",
      "commentary",
      "news",
      "other",
    ])
    .optional(),
  note: z.string().optional(),
});

function normalizeReportTitle(title: string) {
  const cleaned = title.trim() || "Legal Research Report";
  return cleaned.toLowerCase().startsWith("legal research report")
    ? cleaned
    : `Legal Research Report: ${cleaned}`;
}

function getSourceDomain(source: z.infer<typeof sourceSchema>) {
  if (source.domain) {
    return source.domain;
  }
  return new URL(source.url).hostname.replace(WWW_PREFIX_REGEX, "");
}

function getFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function buildSourceReferenceSection(sources: z.infer<typeof sourceSchema>[]) {
  if (sources.length === 0) {
    return "";
  }

  return [
    "## Source Logos and References",
    ...sources.map((source, index) => {
      const domain = getSourceDomain(source);
      const date = source.publishedDate ? `, ${source.publishedDate}` : "";
      const type = source.sourceType ? `, ${source.sourceType}` : "";
      const note = source.note ? ` - ${source.note}` : "";
      return `${index + 1}. ![${domain} logo](${getFaviconUrl(domain)}) [${source.title}](${source.url}) (${domain}${date}${type})${note}`;
    }),
  ].join("\n");
}

function appendSourceReferenceSection(
  reportMarkdown: string,
  sources: z.infer<typeof sourceSchema>[]
) {
  let report = reportMarkdown.trim();

  if (sources.length > 0 && !SOURCE_LOGOS_HEADING_REGEX.test(report)) {
    report += `\n\n${buildSourceReferenceSection(sources)}`;
  }

  return report;
}

function uniqueByUrl(sources: z.infer<typeof sourceSchema>[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) {
      return false;
    }
    seen.add(source.url);
    return true;
  });
}

function sourcesFromPacket(packet?: ResearchPacketV2) {
  if (!packet) {
    return [];
  }

  return uniqueByUrl(
    packet.authorities.map((authority) => ({
      title: authority.title,
      url: authority.sourceUrl,
      domain: authority.domain,
      sourceType: authority.sourceType,
      note: `${authority.authorityType}; ${authority.note}`,
    }))
  );
}

function authorityLink(authority: ResearchPacketV2["authorities"][number]) {
  const pinpoint = authority.pinpoint ? `, ${authority.pinpoint}` : "";
  return `[${authority.id}: ${authority.title}](${authority.sourceUrl})${pinpoint}`;
}

function formatList(items: string[], fallback: string) {
  if (items.length === 0) {
    return fallback;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function getAuditNotes(packet?: ResearchPacketV2) {
  if (!packet) {
    return [];
  }

  return [
    ...packet.audits.citationAudit,
    ...packet.audits.sourceHierarchyAudit,
    ...packet.audits.treatmentAudit,
    ...packet.audits.completenessAudit,
  ].filter((finding) => finding.status !== "pass");
}

function buildResearchReportMarkdown({
  title,
  jurisdiction,
  legalIssue,
  researchPlan,
  findings,
  sources,
  packet,
}: {
  title: string;
  jurisdiction?: string;
  legalIssue: string;
  researchPlan?: string[];
  findings?: string[];
  sources: z.infer<typeof sourceSchema>[];
  packet?: ResearchPacketV2;
}) {
  const reportTitle = normalizeReportTitle(title);
  const jurisdictionText = jurisdiction || "India";
  const issueGraph = packet?.issueGraph || [];
  const forumRoutes = packet?.forumRoutes || [];
  const authorities = packet?.authorities || [];
  const treatmentChecks = packet?.treatmentChecks || [];
  const claims = packet?.claims || [];
  const authorityById = new Map(
    authorities.map((authority) => [authority.id, authority])
  );
  const treatmentByAuthorityId = new Map(
    treatmentChecks.map((check) => [check.authorityId, check])
  );
  const auditNotes = getAuditNotes(packet);

  const statutes = authorities.filter((authority) =>
    ["statute", "rules", "gazette", "regulator", "government"].includes(
      authority.authorityType
    )
  );
  const cases = authorities.filter((authority) =>
    ["supreme_court", "high_court", "tribunal", "legal_database"].includes(
      authority.authorityType
    )
  );
  const recentSources = sources.filter(
    (source) =>
      source.publishedDate ||
      RECENT_SOURCE_REGEX.test(`${source.title} ${source.note || ""}`)
  );
  const unresolvedClaims = claims.filter(
    (claim) => claim.unresolvedReason || claim.confidence === "low"
  );

  const claimRows = claims.map((claim) => {
    const linkedAuthorities = claim.supportingAuthorityIds
      .map((id) => authorityById.get(id))
      .filter(
        (authority): authority is ResearchPacketV2["authorities"][number] =>
          Boolean(authority)
      );
    const authorityText =
      linkedAuthorities.length > 0
        ? linkedAuthorities.map(authorityLink).join("; ")
        : "No linked authority; treated as unresolved.";
    const treatmentStatus =
      claim.treatmentStatus ||
      linkedAuthorities
        .map((authority) => treatmentByAuthorityId.get(authority.id)?.status)
        .find(Boolean) ||
      "unknown";
    return `${claim.claimId}: ${claim.proposition} Authority: ${authorityText}. Treatment: ${treatmentStatus}. Confidence: ${claim.confidence}.`;
  });

  const analysisRows = issueGraph.map((node) => {
    const nodeClaims = claims.filter((claim) => claim.issueNodeId === node.id);
    const claimText = nodeClaims.length
      ? nodeClaims
          .map((claim) => `${claim.claimId}: ${claim.proposition}`)
          .join(" ")
      : "No final claim was generated for this point; treat it as a research gap.";
    return `${node.issue}: ${node.subQuestion} ${claimText}`;
  });

  const sections = [
    `# ${reportTitle}`,
    "## Executive Summary",
    claims.length
      ? `Juristo reviewed ${issueGraph.length || "the relevant"} legal point${
          issueGraph.length === 1 ? "" : "s"
        } across ${jurisdictionText}. The strongest supported conclusions are mapped below by claim ID, authority, treatment status, and confidence. Low-confidence or unsupported points are kept as unresolved issues instead of being converted into advice.`
      : `Juristo prepared a source-backed research report for ${legalIssue} in ${jurisdictionText}. The report identifies the governing route, source base, and open questions from the available research packet.`,
    "## Research Question",
    legalIssue,
    "## Jurisdiction and Assumptions",
    `Jurisdiction considered: ${jurisdictionText}. This report uses public sources available during the Juristo research run and should be reviewed by counsel before filing, advising, or relying on it in a proceeding.`,
    "## Research Method",
    formatList(
      [
        ...(researchPlan || []).map((item) => `Search track: ${item}`),
        "Primary legal sources were preferred for load-bearing propositions.",
        "Major case authorities were checked for available subsequent-treatment signals.",
        "Claims were mapped to authority IDs and confidence levels before writing.",
      ],
      "- Juristo used the verified research packet, authority list, treatment checks, and citation audits to prepare this report."
    ),
    "## Issue Graph",
    formatList(
      issueGraph.map(
        (node) =>
          `${node.id}: ${node.issue}. Question: ${node.subQuestion}. Likely route: ${node.forum}. Confidence: ${node.confidence}.`
      ),
      "- No separate issue graph was available; treat the research question as a single general legal issue."
    ),
    "## Forum Routing",
    formatList(
      forumRoutes.map(
        (route) =>
          `${route.label}: ${route.reason} Confidence: ${route.confidence}.`
      ),
      "- Forum route could not be classified from the available packet."
    ),
    "## Forum Split",
    formatList(
      forumRoutes.map(
        (route) =>
          `${route.forum}: ${route.label}. This route applies to ${route.issueNodeId}.`
      ),
      "- No cross-forum split was detected, but counsel should confirm the correct filing route before acting."
    ),
    "## Applicable Statutes / Rules",
    formatList(
      statutes.map(authorityLink),
      "- No statute, rule, gazette, regulator, or government source was captured as a primary authority in the packet."
    ),
    "## Case Law and Precedents",
    formatList(
      cases.map(authorityLink),
      "- No case-law authority was captured in the packet."
    ),
    "## Treatment Check",
    formatList(
      treatmentChecks.map(
        (check) =>
          `${check.authorityId}: ${check.status} (${check.confidence}). ${check.note}`
      ),
      "- No major case treatment result was available; use lower confidence for case-law propositions until verified."
    ),
    "## Claim-Level Citation Map",
    formatList(
      claimRows,
      "- No claim-level citation map was available in the packet."
    ),
    "## Recent Developments",
    formatList(
      recentSources.map(
        (source) =>
          `[${source.title}](${source.url})${source.publishedDate ? ` (${source.publishedDate})` : ""}: ${source.note || source.sourceType || "reviewed source"}`
      ),
      "- No dated recent-development source was isolated in the source set; confirm the latest statutory and case-law position before relying on the report."
    ),
    "## Analysis",
    formatList(
      analysisRows,
      findings?.length
        ? findings.map((finding) => `- ${finding}`).join("\n")
        : "- The legal analysis should be read with the claim map above; unsupported points remain open."
    ),
    "## Practical Implications for Lawyers",
    formatList(
      [
        "Use the forum routing section to avoid filing or advising under a single flattened forum theory where multiple statutory routes apply.",
        "Use the claim-level citation map as the working checklist for drafting pleadings, notices, opinions, or client advice.",
        "Treat low-confidence claims and unknown treatment checks as points requiring manual legal verification before use.",
      ],
      "- Review the claim map and source list before taking procedural steps."
    ),
    "## Risks / Unresolved Questions",
    formatList(
      [
        ...unresolvedClaims.map(
          (claim) =>
            `${claim.claimId}: ${claim.unresolvedReason || `Confidence is ${claim.confidence}.`}`
        ),
        ...auditNotes.map((note) => note.message),
      ],
      "- No unresolved claim was flagged by the packet audits, but counsel should still verify current law and facts before use."
    ),
    "## Recommended Next Steps",
    formatList(
      [
        "Confirm the factual record and documents against each issue node.",
        "Verify the latest version of statutes, rules, notifications, and case treatment before filing or advising.",
        "Prepare forum-specific arguments separately where the Forum Split section identifies more than one route.",
        "Have a licensed lawyer review the final strategy, limitation period, maintainability, and reliefs.",
      ],
      "- Have counsel review the report before use."
    ),
    "## Full Source List",
    formatList(
      sources.map((source, index) => {
        const primaryLabel =
          source.sourceType && PRIMARY_SOURCE_TYPES.has(source.sourceType)
            ? "primary"
            : "secondary/context";
        return `${index + 1}. [${source.title}](${source.url}) (${getSourceDomain(
          source
        )}${source.publishedDate ? `, ${source.publishedDate}` : ""}${
          source.sourceType ? `, ${source.sourceType}` : ""
        }, ${primaryLabel})${source.note ? ` - ${source.note}` : ""}`;
      }),
      "- No source URLs were provided."
    ),
  ];

  return sections.join("\n\n");
}

function flattenAuditErrors(
  audits: ReturnType<typeof validateResearchReportMarkdown>
) {
  return [
    ...audits.citationAudit,
    ...audits.sourceHierarchyAudit,
    ...audits.treatmentAudit,
    ...audits.completenessAudit,
  ]
    .filter((finding) => finding.status === "fail")
    .map((finding) => finding.message);
}

function flattenAuditWarnings(
  audits: ReturnType<typeof validateResearchReportMarkdown>
) {
  return [
    ...audits.citationAudit,
    ...audits.sourceHierarchyAudit,
    ...audits.treatmentAudit,
    ...audits.completenessAudit,
  ]
    .filter((finding) => finding.status === "warning")
    .map((finding) => finding.message);
}

function buildResearchPacketFromFields(input: {
  researchPacket?: ResearchPacketV2;
  researchPacketVersion?: number;
  issueGraph?: ResearchPacketV2["issueGraph"];
  forumRoutes?: ResearchPacketV2["forumRoutes"];
  authorities?: ResearchPacketV2["authorities"];
  claims?: ResearchPacketV2["claims"];
  claimGraphEdges?: ResearchPacketV2["claimGraphEdges"];
  treatmentChecks?: ResearchPacketV2["treatmentChecks"];
  nodeExecutions?: ResearchPacketV2["nodeExecutions"];
  audits?: ResearchPacketV2["audits"];
}) {
  if (input.researchPacket) {
    return input.researchPacket;
  }
  if (input.researchPacketVersion !== 2) {
    return;
  }
  if (
    !input.issueGraph ||
    !input.forumRoutes ||
    !input.authorities ||
    !input.claims ||
    !input.treatmentChecks ||
    !input.audits
  ) {
    return;
  }

  return researchPacketV2Schema.parse({
    researchPacketVersion: 2,
    issueGraph: input.issueGraph,
    forumRoutes: input.forumRoutes,
    authorities: input.authorities,
    claims: input.claims,
    claimGraphEdges: input.claimGraphEdges || [],
    treatmentChecks: input.treatmentChecks,
    nodeExecutions: input.nodeExecutions || [],
    audits: input.audits,
  });
}

export const createResearchReport = ({
  session,
  dataStream,
}: CreateResearchReportProps) =>
  tool({
    description:
      "Create the final Juristo Deep Research report artifact from verified research sources or ResearchPacketV2. Prefer compact packet fields over a full reportMarkdown payload; the server can assemble the complete legal research memo.",
    inputSchema: z.object({
      title: z.string().describe("Short report title."),
      jurisdiction: z.string().optional(),
      legalIssue: z.string().describe("The core legal issue researched."),
      researchPlan: z.array(z.string()).optional(),
      findings: z.array(z.string()).optional(),
      sources: z.array(sourceSchema).default([]),
      researchPacketVersion: z.number().optional(),
      researchPacket: researchPacketV2Schema.optional(),
      issueGraph: researchPacketV2Schema.shape.issueGraph.optional(),
      forumRoutes: researchPacketV2Schema.shape.forumRoutes.optional(),
      authorities: researchPacketV2Schema.shape.authorities.optional(),
      claims: researchPacketV2Schema.shape.claims.optional(),
      claimGraphEdges: researchPacketV2Schema.shape.claimGraphEdges.optional(),
      treatmentChecks: researchPacketV2Schema.shape.treatmentChecks.optional(),
      nodeExecutions: researchPacketV2Schema.shape.nodeExecutions.optional(),
      audits: researchPacketV2Schema.shape.audits.optional(),
      reportMarkdown: z
        .string()
        .optional()
        .describe(
          "Optional complete markdown report. Prefer omitting this when ResearchPacketV2 is available so the server can build the report faster from verified claims and sources."
        ),
    }),
    execute: async ({
      title,
      jurisdiction,
      legalIssue,
      researchPlan,
      findings,
      sources,
      researchPacketVersion,
      researchPacket,
      issueGraph,
      forumRoutes,
      authorities,
      claims,
      claimGraphEdges,
      treatmentChecks,
      nodeExecutions,
      audits,
      reportMarkdown,
    }) => {
      const id = generateUUID();
      const reportTitle = normalizeReportTitle(title);
      const packet = buildResearchPacketFromFields({
        researchPacket,
        researchPacketVersion,
        issueGraph,
        forumRoutes,
        authorities,
        claims,
        claimGraphEdges,
        treatmentChecks,
        nodeExecutions,
        audits,
      });
      const effectiveSources = uniqueByUrl([
        ...sources,
        ...sourcesFromPacket(packet),
      ]);
      const baseMarkdown =
        reportMarkdown && reportMarkdown.trim().length >= 200
          ? reportMarkdown
          : buildResearchReportMarkdown({
              title: reportTitle,
              jurisdiction,
              legalIssue,
              researchPlan,
              findings,
              sources: effectiveSources,
              packet,
            });
      const content = appendSourceReferenceSection(
        baseMarkdown,
        effectiveSources
      );
      const validation = validateResearchReportMarkdown({
        reportMarkdown: content,
        sources: effectiveSources,
        researchPacket: packet,
      });
      const validationWarnings = flattenAuditWarnings(validation);

      if (validation.status === "needs_revision") {
        const validationErrors = flattenAuditErrors(validation);
        return {
          status: "needs_revision",
          title: reportTitle,
          legalIssue,
          jurisdiction,
          sourceCount: effectiveSources.length,
          requiredSections: RESEARCH_REQUIRED_SECTIONS,
          validationErrors,
          qualityNotes: validationWarnings,
          audits: validation,
          message:
            "Research report export blocked. Revise the report or research packet to fix the listed validation errors, then call createResearchReport again.",
        };
      }

      dataStream.write({ type: "data-kind", data: "text", transient: true });
      dataStream.write({ type: "data-id", data: id, transient: true });
      dataStream.write({
        type: "data-title",
        data: reportTitle,
        transient: true,
      });
      dataStream.write({ type: "data-clear", data: null, transient: true });

      for (let index = 0; index < content.length; index += 1200) {
        dataStream.write({
          type: "data-textDelta",
          data: content.slice(index, index + 1200),
          transient: true,
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      dataStream.write({ type: "data-finish", data: null, transient: true });

      if (session?.user?.id) {
        await saveDocument({
          id,
          title: reportTitle,
          kind: "text",
          content,
          userId: session.user.id,
        });

        trackUserActivity({
          userId: session.user.id,
          eventType: "document_created",
          sourceTable: "Document",
          sourceId: id,
          userPlan: (session.user as any).plan || "free",
          textPreview: `Created research report: ${reportTitle}`,
          keywords: [
            "research",
            "legal report",
            jurisdiction || "",
            legalIssue,
          ],
          metadata: {
            kind: "research_report",
            jurisdiction: jurisdiction || null,
            legalIssue,
            sourceCount: effectiveSources.length,
            researchPlan,
            findings,
            researchPacketVersion: packet?.researchPacketVersion || null,
            auditStatus: validation.status,
            qualityNotes: validationWarnings,
          },
        }).catch(() => {
          // Activity tracking must not block report creation.
        });
      }

      return {
        status: "created",
        id,
        title: reportTitle,
        kind: "text",
        legalIssue,
        jurisdiction,
        sourceCount: effectiveSources.length,
        sources: effectiveSources,
        qualityNotes: validationWarnings,
        message:
          "The legal research report was created and is visible in the report panel.",
      };
    },
  });
