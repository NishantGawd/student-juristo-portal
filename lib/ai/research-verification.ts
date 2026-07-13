import { z } from "zod";

const WWW_PREFIX_REGEX = /^www\./;
const RULES_WORD_REGEX = /\brules?\b/;
const PINPOINT_PARAGRAPH_REGEX = /\b(?:para|paragraph)\s*\.?\s*(\d+[a-z]?)/i;
const PINPOINT_SECTION_REGEX = /\bsection\s+(\d+[a-z]?)/i;
const PINPOINT_RULE_REGEX = /\brule\s+(\d+[a-z]?)/i;
const GOOD_LAW_REGEX = /\b(still good law|not overruled|good law|followed)\b/;
const OVERRULED_REGEX = /\b(overruled|set aside|reversed)\b/;
const RECALLED_REGEX = /\b(recalled)\b/;
const STAYED_REGEX = /\b(stayed|stay granted)\b/;
const DISTINGUISHED_REGEX = /\b(distinguished)\b/;
const CLARIFIED_REGEX = /\b(clarified|explained)\b/;
const LIMITED_REGEX = /\b(limited|confined to|read down)\b/;
const PLACEHOLDER_PATTERNS = [
  /\bto be completed\b/i,
  /\btbd\b/i,
  /\bplaceholder\b/i,
  /\[insert\b/i,
  /\buncited best available arguments?\b/i,
];
const FORUM_SPLIT_HEADING_REGEX = /^#{1,3}\s+Forum Split/im;
const NEXT_MARKDOWN_HEADING_REGEX = /^#{1,3}\s+\S+/im;

export const researchSourceTypeSchema = z.enum([
  "court",
  "statute",
  "regulator",
  "government",
  "legal-database",
  "commentary",
  "news",
  "other",
]);

export type ResearchSourceType = z.infer<typeof researchSourceTypeSchema>;

export const researchSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  domain: z.string().optional(),
  content: z.string().optional(),
  score: z.number().optional(),
  publishedDate: z.string().optional(),
  sourceType: researchSourceTypeSchema.optional(),
  query: z.string().optional(),
  status: z.enum(["found", "used"]).optional(),
});

export type ResearchSourceLike = z.infer<typeof researchSourceSchema>;

export const researchIssueTopicSchema = z.enum([
  "arbitration",
  "contract_private",
  "fraud_public_law",
  "ibc_moratorium",
  "ibc_section_14",
  "ibc_section_32a",
  "pmla_attachment",
  "ngt_environment",
  "environment_clearance",
  "forest_rights",
  "land_acquisition",
  "writ_jurisdiction",
  "forum_conflict",
  "statutory_interpretation",
  "criminal_process",
  "current_law",
  "general",
]);

export type ResearchIssueTopic = z.infer<typeof researchIssueTopicSchema>;

export const forumSchema = z.enum([
  "arbitration",
  "civil_court",
  "high_court",
  "ngt",
  "nclt_nclat",
  "supreme_court",
  "ed_pmla",
  "criminal_court",
  "regulator",
  "unknown",
]);

export type ResearchForum = z.infer<typeof forumSchema>;

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type ResearchConfidence = z.infer<typeof confidenceSchema>;

export const researchIssueNodeSchema = z.object({
  id: z.string(),
  parentId: z.string().optional(),
  nodeKind: z.enum(["root", "issue", "sub_issue"]).default("issue"),
  issue: z.string(),
  subQuestion: z.string(),
  topic: researchIssueTopicSchema,
  jurisdiction: z.string(),
  forum: forumSchema,
  keywords: z.array(z.string()),
  confidence: confidenceSchema,
});

export type ResearchIssueNode = z.infer<typeof researchIssueNodeSchema>;

export const forumRouteSchema = z.object({
  id: z.string(),
  issueNodeId: z.string(),
  forum: forumSchema,
  label: z.string(),
  reason: z.string(),
  confidence: confidenceSchema,
});

export type ForumRoute = z.infer<typeof forumRouteSchema>;

export const authorityTypeSchema = z.enum([
  "supreme_court",
  "high_court",
  "tribunal",
  "statute",
  "rules",
  "gazette",
  "regulator",
  "government",
  "legal_database",
  "commentary",
  "news",
  "other",
]);

export type AuthorityType = z.infer<typeof authorityTypeSchema>;

export const authorityRefSchema = z.object({
  id: z.string(),
  sourceIndex: z.number(),
  sourceUrl: z.string(),
  title: z.string(),
  domain: z.string(),
  sourceType: researchSourceTypeSchema,
  authorityType: authorityTypeSchema,
  sourceRole: z.enum(["primary", "secondary"]),
  hierarchyRank: z.number(),
  issueNodeIds: z.array(z.string()),
  citation: z.string().optional(),
  pinpoint: z.string().optional(),
  note: z.string(),
});

export type AuthorityRef = z.infer<typeof authorityRefSchema>;

export const treatmentStatusSchema = z.enum([
  "good_law",
  "overruled",
  "recalled",
  "distinguished",
  "stayed",
  "clarified",
  "limited",
  "unknown",
]);

export type TreatmentStatus = z.infer<typeof treatmentStatusSchema>;

export const treatmentCheckSchema = z.object({
  authorityId: z.string(),
  status: treatmentStatusSchema,
  confidence: confidenceSchema,
  checkedQuery: z.string().optional(),
  checkedSources: z.array(z.string()).default([]),
  note: z.string(),
});

export type TreatmentCheck = z.infer<typeof treatmentCheckSchema>;

export const researchClaimSchema = z.object({
  claimId: z.string(),
  issueNodeId: z.string(),
  proposition: z.string(),
  supportingAuthorityIds: z.array(z.string()),
  pinpoint: z.string().optional(),
  treatmentStatus: treatmentStatusSchema.optional(),
  confidence: confidenceSchema,
  loadBearing: z.boolean(),
  unresolvedReason: z.string().optional(),
});

export type ResearchClaim = z.infer<typeof researchClaimSchema>;

export const auditFindingSchema = z.object({
  gate: z.enum(["citation", "source_hierarchy", "treatment", "completeness"]),
  status: z.enum(["pass", "warning", "fail"]),
  message: z.string(),
  claimId: z.string().optional(),
  authorityId: z.string().optional(),
});

export type AuditFinding = z.infer<typeof auditFindingSchema>;

export const researchNodeExecutionSchema = z.object({
  issueNodeId: z.string(),
  status: z.enum(["pending", "running", "passed", "needs_reresearch"]),
  researchPlanIds: z.array(z.string()),
  authorityIds: z.array(z.string()),
  claimIds: z.array(z.string()),
  failedGates: z.array(z.string()),
  retryQueries: z.array(z.string()),
});

export type ResearchNodeExecution = z.infer<typeof researchNodeExecutionSchema>;

export const claimGraphEdgeSchema = z.object({
  fromClaimId: z.string(),
  toClaimId: z.string(),
  relation: z.enum(["supports", "limits", "conflicts", "depends_on"]),
  note: z.string(),
});

export type ClaimGraphEdge = z.infer<typeof claimGraphEdgeSchema>;

export const researchAuditsSchema = z.object({
  status: z.enum(["pass", "needs_revision"]),
  citationAudit: z.array(auditFindingSchema),
  sourceHierarchyAudit: z.array(auditFindingSchema),
  treatmentAudit: z.array(auditFindingSchema),
  completenessAudit: z.array(auditFindingSchema),
});

export type ResearchAudits = z.infer<typeof researchAuditsSchema>;

export const researchPacketV2Schema = z.object({
  researchPacketVersion: z.literal(2),
  issueGraph: z.array(researchIssueNodeSchema),
  forumRoutes: z.array(forumRouteSchema),
  authorities: z.array(authorityRefSchema),
  claims: z.array(researchClaimSchema),
  claimGraphEdges: z.array(claimGraphEdgeSchema).default([]),
  treatmentChecks: z.array(treatmentCheckSchema),
  nodeExecutions: z.array(researchNodeExecutionSchema).default([]),
  audits: researchAuditsSchema,
});

export type ResearchPacketV2 = z.infer<typeof researchPacketV2Schema>;

export const RESEARCH_REQUIRED_SECTIONS = [
  "Executive Summary",
  "Research Question",
  "Jurisdiction and Assumptions",
  "Research Method",
  "Issue Graph",
  "Forum Routing",
  "Applicable Statutes / Rules",
  "Case Law and Precedents",
  "Treatment Check",
  "Claim-Level Citation Map",
  "Recent Developments",
  "Analysis",
  "Practical Implications for Lawyers",
  "Risks / Unresolved Questions",
  "Recommended Next Steps",
  "Full Source List",
];

export const OFFICIAL_LEGAL_DOMAINS = [
  "indiacode.nic.in",
  "sci.gov.in",
  "main.sci.gov.in",
  "egazette.nic.in",
  "mca.gov.in",
  "sebi.gov.in",
  "rbi.org.in",
  "irdai.gov.in",
  "cci.gov.in",
  "meity.gov.in",
  "legislative.gov.in",
  "nclt.gov.in",
  "nclat.nic.in",
  "greentribunal.gov.in",
  "ngt.gov.in",
];

const TOPIC_DEFINITIONS: Array<{
  topic: ResearchIssueTopic;
  keywords: string[];
  issue: string;
  subQuestion: string;
}> = [
  {
    topic: "arbitration",
    keywords: [
      "arbitration",
      "arbitral",
      "arbitrability",
      "section 8",
      "section 11",
      "section 34",
    ],
    issue: "Arbitrability and private dispute resolution",
    subQuestion:
      "Whether the dispute can be resolved by arbitration and what court support or challenge route applies.",
  },
  {
    topic: "contract_private",
    keywords: [
      "contract",
      "agreement",
      "breach",
      "clause",
      "specific performance",
      "notice",
    ],
    issue: "Contractual claim and private remedies",
    subQuestion:
      "What contractual rights, notices, damages, or civil remedies are available on the facts.",
  },
  {
    topic: "fraud_public_law",
    keywords: [
      "fraud",
      "public law",
      "corruption",
      "public policy",
      "misrepresentation",
    ],
    issue: "Fraud, public law, and non-arbitrability limits",
    subQuestion:
      "Whether fraud or public-law elements change forum, evidence burden, or available remedies.",
  },
  {
    topic: "ibc_moratorium",
    keywords: [
      "ibc",
      "insolvency",
      "moratorium",
      "resolution plan",
      "section 32a",
      "clean slate",
      "nclt",
      "nclat",
    ],
    issue: "IBC moratorium, resolution plan, and clean-slate effect",
    subQuestion:
      "How the IBC moratorium or approved resolution plan affects claims, attachments, and liabilities.",
  },
  {
    topic: "pmla_attachment",
    keywords: [
      "pmla",
      "ed",
      "enforcement directorate",
      "attachment",
      "money laundering",
      "provisional attachment",
    ],
    issue: "PMLA attachment and criminal/regulatory exposure",
    subQuestion:
      "How PMLA attachment, ED action, or criminal liability interacts with the civil or insolvency route.",
  },
  {
    topic: "ngt_environment",
    keywords: [
      "ngt",
      "environment",
      "eia",
      "pollution",
      "forest clearance",
      "environment clearance",
    ],
    issue: "Environmental forum and NGT jurisdiction",
    subQuestion:
      "Whether the dispute belongs before the NGT, High Court, regulator, or another forum.",
  },
  {
    topic: "forest_rights",
    keywords: [
      "forest rights",
      "fra",
      "forest dwellers",
      "gram sabha",
      "scheduled tribes",
    ],
    issue: "Forest rights and community consent",
    subQuestion:
      "Whether Forest Rights Act protections, Gram Sabha consent, or forest clearance conditions are triggered.",
  },
  {
    topic: "land_acquisition",
    keywords: [
      "land acquisition",
      "rfctlarr",
      "compensation",
      "rehabilitation",
      "resettlement",
      "collector award",
    ],
    issue: "Land acquisition and compensation route",
    subQuestion:
      "Which acquisition, compensation, rehabilitation, or challenge route applies.",
  },
  {
    topic: "writ_jurisdiction",
    keywords: [
      "writ",
      "article 226",
      "article 32",
      "mandamus",
      "certiorari",
      "constitutional",
      "high court",
    ],
    issue: "Writ jurisdiction and public-law challenge",
    subQuestion:
      "Whether a constitutional writ route is available despite alternate statutory or private remedies.",
  },
  {
    topic: "criminal_process",
    keywords: [
      "fir",
      "arrest",
      "bail",
      "criminal",
      "police",
      "summons",
      "charge sheet",
    ],
    issue: "Criminal process and immediate procedural risk",
    subQuestion:
      "What criminal-court or police-process steps affect the user's legal strategy.",
  },
  {
    topic: "current_law",
    keywords: [
      "latest",
      "recent",
      "current",
      "2026",
      "2025",
      "amendment",
      "notification",
      "new judgment",
    ],
    issue: "Current-law status and recent developments",
    subQuestion:
      "What recent statutory, case-law, or regulator developments must be verified before relying on the answer.",
  },
  {
    topic: "statutory_interpretation",
    keywords: [
      "section",
      "act",
      "rule",
      "rules",
      "statute",
      "notification",
      "gazette",
      "interpretation",
    ],
    issue: "Statutory interpretation",
    subQuestion:
      "Which statutory text, rules, notifications, or official guidance govern the issue.",
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX_REGEX, "");
  } catch {
    return url;
  }
}

export function classifyResearchSource(
  url: string,
  title: string
): ResearchSourceType {
  const domain = getDomain(url).toLowerCase();
  const lowerTitle = normalize(title);

  if (
    domain.includes("sci.gov.in") ||
    lowerTitle.includes("supreme court") ||
    lowerTitle.includes("high court") ||
    lowerTitle.includes("tribunal") ||
    domain.includes("nclat") ||
    domain.includes("nclt") ||
    domain.includes("greentribunal")
  ) {
    return "court";
  }
  if (
    domain.includes("indiacode") ||
    domain.includes("legislative") ||
    domain.includes("egazette") ||
    lowerTitle.includes("act,") ||
    lowerTitle.includes(" rules")
  ) {
    return "statute";
  }
  if (
    ["sebi.gov.in", "rbi.org.in", "irdai.gov.in", "cci.gov.in"].some((d) =>
      domain.includes(d)
    )
  ) {
    return "regulator";
  }
  if (domain.endsWith(".gov.in") || domain.endsWith(".nic.in")) {
    return "government";
  }
  if (
    domain.includes("indiankanoon") ||
    domain.includes("scconline") ||
    domain.includes("manupatra")
  ) {
    return "legal-database";
  }
  if (
    domain.includes("livemint") ||
    domain.includes("economictimes") ||
    domain.includes("timesofindia")
  ) {
    return "news";
  }
  if (
    domain.includes("barandbench") ||
    domain.includes("livelaw") ||
    domain.includes("mondaq") ||
    domain.includes("lexology")
  ) {
    return "commentary";
  }
  return "other";
}

export function decomposeIssueGraph({
  legalIssue,
  jurisdiction,
  focusAreas,
}: {
  legalIssue: string;
  jurisdiction?: string;
  focusAreas?: string[];
}): ResearchIssueNode[] {
  const text = normalize(`${legalIssue} ${(focusAreas || []).join(" ")}`);
  const detected = TOPIC_DEFINITIONS.filter((definition) =>
    definition.keywords.some((keyword) => text.includes(keyword))
  );
  const definitions =
    detected.length > 0
      ? detected
      : [
          {
            topic: "general" as const,
            keywords: ["general"],
            issue: "General legal issue",
            subQuestion:
              "What legal framework, authorities, forum, and practical risks govern the user's question.",
          },
        ];

  const rootNodes: ResearchIssueNode[] = definitions.map(
    (definition, index) => {
      const route = inferForumRoute(definition.topic, legalIssue);
      return {
        id: `issue-${index + 1}-${slugify(definition.topic)}`,
        nodeKind: "issue" as const,
        issue: definition.issue,
        subQuestion: definition.subQuestion,
        topic: definition.topic,
        jurisdiction: jurisdiction || "India",
        forum: route.forum,
        keywords: definition.keywords,
        confidence: detected.length > 0 ? "high" : "medium",
      };
    }
  );

  return [...rootNodes, ...spawnSubIssueNodes(rootNodes, text, jurisdiction)];
}

function spawnSubIssueNodes(
  rootNodes: ResearchIssueNode[],
  normalizedText: string,
  jurisdiction?: string
): ResearchIssueNode[] {
  const subIssues: ResearchIssueNode[] = [];
  const addSubIssue = ({
    parent,
    suffix,
    issue,
    subQuestion,
    topic,
    keywords,
  }: {
    parent: ResearchIssueNode;
    suffix: string;
    issue: string;
    subQuestion: string;
    topic: ResearchIssueTopic;
    keywords: string[];
  }) => {
    const route = inferForumRoute(topic, issue);
    subIssues.push({
      id: `${parent.id}-${suffix}`,
      parentId: parent.id,
      nodeKind: "sub_issue",
      issue,
      subQuestion,
      topic,
      jurisdiction: jurisdiction || parent.jurisdiction,
      forum: route.forum,
      keywords,
      confidence: parent.confidence,
    });
  };

  for (const parent of rootNodes) {
    if (parent.topic === "arbitration") {
      if (normalizedText.includes("fraud")) {
        addSubIssue({
          parent,
          suffix: "fraud-doctrine",
          issue: "Fraud doctrine within arbitrability",
          subQuestion:
            "Whether the fraud allegations are civil and arbitrable or so serious/public that court adjudication is required.",
          topic: "fraud_public_law",
          keywords: ["fraud", "arbitrability", "serious fraud", "civil fraud"],
        });
      }
      if (
        normalizedText.includes("public law") ||
        normalizedText.includes("public policy")
      ) {
        addSubIssue({
          parent,
          suffix: "public-law-exception",
          issue: "Public-law exception to arbitration",
          subQuestion:
            "Whether public rights, statutory duties, or sovereign action prevent private arbitral resolution.",
          topic: "writ_jurisdiction",
          keywords: ["public law", "public policy", "writ", "state action"],
        });
      }
    }

    if (parent.topic === "ibc_moratorium") {
      if (
        normalizedText.includes("section 14") ||
        normalizedText.includes("moratorium")
      ) {
        addSubIssue({
          parent,
          suffix: "section-14",
          issue: "IBC Section 14 moratorium",
          subQuestion:
            "Whether the moratorium bars proceedings, enforcement, or attachments for the specific claim.",
          topic: "ibc_section_14",
          keywords: ["section 14", "moratorium", "ibc"],
        });
      }
      if (
        normalizedText.includes("section 32a") ||
        normalizedText.includes("clean slate")
      ) {
        addSubIssue({
          parent,
          suffix: "section-32a",
          issue: "IBC Section 32A clean-slate protection",
          subQuestion:
            "Whether Section 32A protects the corporate debtor or assets after approval of a resolution plan.",
          topic: "ibc_section_32a",
          keywords: ["section 32a", "clean slate", "resolution plan", "ibc"],
        });
      }
    }

    if (parent.topic === "pmla_attachment") {
      addSubIssue({
        parent,
        suffix: "attachment",
        issue: "PMLA attachment route",
        subQuestion:
          "Whether provisional attachment, confirmation, or release must proceed under PMLA forums.",
        topic: "pmla_attachment",
        keywords: ["pmla", "attachment", "ed", "provisional attachment"],
      });
      if (normalizedText.includes("32a") || normalizedText.includes("ibc")) {
        addSubIssue({
          parent,
          suffix: "section-32a-conflict",
          issue: "PMLA and IBC Section 32A conflict",
          subQuestion:
            "How PMLA attachment interacts with IBC clean-slate protection after plan approval.",
          topic: "forum_conflict",
          keywords: ["pmla", "section 32a", "ibc", "attachment conflict"],
        });
      }
    }

    if (parent.topic === "ngt_environment") {
      addSubIssue({
        parent,
        suffix: "environment-clearance",
        issue: "Environmental clearance and EIA",
        subQuestion:
          "Whether environmental clearance, EIA conditions, or regulator approvals control the challenge.",
        topic: "environment_clearance",
        keywords: ["environment clearance", "eia", "ec", "moef"],
      });
      if (normalizedText.includes("forest") || normalizedText.includes("fra")) {
        addSubIssue({
          parent,
          suffix: "fra",
          issue: "Forest Rights Act and consent",
          subQuestion:
            "Whether FRA recognition, Gram Sabha consent, or forest-dweller rights affect validity.",
          topic: "forest_rights",
          keywords: ["forest rights", "fra", "gram sabha", "forest dwellers"],
        });
      }
      addSubIssue({
        parent,
        suffix: "ngt-jurisdiction",
        issue: "NGT jurisdiction boundary",
        subQuestion:
          "Whether the claim is within NGT jurisdiction or requires High Court writ review.",
        topic: "forum_conflict",
        keywords: ["ngt", "jurisdiction", "high court", "writ"],
      });
    }
  }

  const forums = new Set(rootNodes.map((node) => node.forum));
  if (forums.size > 1) {
    const route = inferForumRoute("forum_conflict", normalizedText);
    subIssues.push({
      id: "issue-forum-conflict",
      nodeKind: "sub_issue",
      issue: "Forum conflict resolution",
      subQuestion:
        "Which forum should decide each issue, and where conflicts between NCLT, NGT, High Court, criminal/PMLA, civil court, and arbitration must be resolved.",
      topic: "forum_conflict",
      jurisdiction: jurisdiction || "India",
      forum: route.forum,
      keywords: [
        "forum conflict",
        "jurisdiction",
        "nclt",
        "ngt",
        "high court",
        "arbitration",
      ],
      confidence: "high",
    });
  }

  return subIssues;
}

export function inferForumRoute(
  topic: ResearchIssueTopic,
  issueText = ""
): ForumRoute {
  const text = normalize(issueText);
  const defaults: Record<
    ResearchIssueTopic,
    { forum: ResearchForum; label: string; reason: string }
  > = {
    arbitration: {
      forum: "arbitration",
      label: "Arbitration / civil court support",
      reason:
        "Private contractual or arbitrability questions usually start with the arbitral forum, with court support or challenge where the statute allows.",
    },
    contract_private: {
      forum: "civil_court",
      label: "Civil court / contract forum",
      reason:
        "Private contract claims usually require notice, arbitration if agreed, or ordinary civil remedies.",
    },
    fraud_public_law: {
      forum:
        text.includes("public") || text.includes("state")
          ? "high_court"
          : "civil_court",
      label:
        "Civil court, High Court, or arbitral forum depending on fraud/public-law content",
      reason:
        "Fraud can affect arbitrability and may require a public-law or criminal route if state action or public rights are involved.",
    },
    ibc_moratorium: {
      forum: "nclt_nclat",
      label: "NCLT / NCLAT / Supreme Court",
      reason:
        "IBC moratorium, resolution-plan, and Section 32A issues are controlled by insolvency forums and appellate courts.",
    },
    ibc_section_14: {
      forum: "nclt_nclat",
      label: "NCLT / NCLAT / Supreme Court",
      reason:
        "Section 14 moratorium issues are insolvency-route questions with NCLT, NCLAT, and Supreme Court treatment.",
    },
    ibc_section_32a: {
      forum: "nclt_nclat",
      label: "NCLT / NCLAT / Supreme Court",
      reason:
        "Section 32A clean-slate and liability-shield issues belong to the IBC forum route and appellate courts.",
    },
    pmla_attachment: {
      forum: "ed_pmla",
      label: "ED / PMLA adjudication / criminal court",
      reason:
        "Attachment and money-laundering issues require the PMLA statutory route and may overlap with criminal proceedings.",
    },
    ngt_environment: {
      forum: "ngt",
      label: "NGT / High Court",
      reason:
        "Environmental statutes and clearance disputes may go to the NGT, while constitutional validity and writ questions may remain with High Courts.",
    },
    environment_clearance: {
      forum: "ngt",
      label: "NGT / regulator / High Court",
      reason:
        "Environmental clearance and EIA questions usually require regulator and NGT analysis, with writ review for constitutional or jurisdictional issues.",
    },
    forest_rights: {
      forum: "high_court",
      label: "High Court / statutory forest-rights authorities",
      reason:
        "Forest rights and consent issues often involve statutory authorities and writ review, with NGT overlap only for environmental approvals.",
    },
    land_acquisition: {
      forum: "high_court",
      label: "Land acquisition authority / High Court",
      reason:
        "Acquisition validity and compensation questions follow the acquisition statute and may reach writ courts.",
    },
    writ_jurisdiction: {
      forum: "high_court",
      label: "High Court writ jurisdiction",
      reason:
        "Article 226 challenges require a writ-route analysis and cannot be collapsed into private arbitration or tribunal remedies.",
    },
    forum_conflict: {
      forum: "high_court",
      label: "Forum conflict and writ supervision",
      reason:
        "Cross-forum conflicts must be resolved explicitly, often with writ or appellate supervision rather than a single flattened forum rule.",
    },
    statutory_interpretation: {
      forum: "high_court",
      label: "Statutory forum / High Court",
      reason:
        "Statutory interpretation depends on the governing Act and any specialized appellate or writ route.",
    },
    criminal_process: {
      forum: "criminal_court",
      label: "Criminal court / police process",
      reason:
        "FIR, arrest, bail, and charge-sheet issues require criminal procedure and urgent local counsel evaluation.",
    },
    current_law: {
      forum: "unknown",
      label: "Current-law verification route",
      reason:
        "Recent statutes, judgments, and notifications must be verified against the relevant court, regulator, gazette, or official portal.",
    },
    general: {
      forum: "unknown",
      label: "Forum to be verified",
      reason:
        "The query needs issue decomposition before a single forum can be assigned.",
    },
  };

  const selected = defaults[topic];
  return {
    id: `route-${slugify(topic)}`,
    issueNodeId: "",
    forum: selected.forum,
    label: selected.label,
    reason: selected.reason,
    confidence: selected.forum === "unknown" ? "low" : "medium",
  };
}

export function buildForumRoutes(
  issueGraph: ResearchIssueNode[]
): ForumRoute[] {
  return issueGraph.map((node) => {
    const route = inferForumRoute(node.topic, node.issue);
    return {
      ...route,
      id: `route-${node.id}`,
      issueNodeId: node.id,
      forum: node.forum,
      confidence: node.confidence === "high" ? "high" : route.confidence,
    };
  });
}

export function hasCrossForumRoutes(routes: ForumRoute[]) {
  const forums = new Set(
    routes.map((route) => route.forum).filter((forum) => forum !== "unknown")
  );
  return forums.size > 1;
}

function inferAuthorityType(source: ResearchSourceLike): AuthorityType {
  const domain = normalize(source.domain || getDomain(source.url));
  const title = normalize(`${source.title} ${source.content || ""}`);

  if (domain.includes("sci.gov.in") || title.includes("supreme court")) {
    return "supreme_court";
  }
  if (title.includes("high court")) {
    return "high_court";
  }
  if (
    title.includes("nclt") ||
    title.includes("nclat") ||
    title.includes("ngt") ||
    title.includes("tribunal") ||
    domain.includes("greentribunal")
  ) {
    return "tribunal";
  }
  if (domain.includes("egazette")) {
    return "gazette";
  }
  if (domain.includes("indiacode") || domain.includes("legislative")) {
    return "statute";
  }
  if (RULES_WORD_REGEX.test(title)) {
    return "rules";
  }
  if (
    ["sebi.gov.in", "rbi.org.in", "irdai.gov.in", "cci.gov.in"].some((d) =>
      domain.includes(d)
    )
  ) {
    return "regulator";
  }
  if (domain.endsWith(".gov.in") || domain.endsWith(".nic.in")) {
    return "government";
  }
  if (source.sourceType === "legal-database") {
    return "legal_database";
  }
  if (source.sourceType === "commentary") {
    return "commentary";
  }
  if (source.sourceType === "news") {
    return "news";
  }
  return "other";
}

function getHierarchyRank(authorityType: AuthorityType) {
  const ranks: Record<AuthorityType, number> = {
    supreme_court: 1,
    statute: 2,
    rules: 3,
    gazette: 3,
    high_court: 4,
    tribunal: 5,
    regulator: 5,
    government: 6,
    legal_database: 7,
    commentary: 8,
    news: 9,
    other: 10,
  };
  return ranks[authorityType];
}

function isPrimaryAuthority(authorityType: AuthorityType) {
  return [
    "supreme_court",
    "high_court",
    "tribunal",
    "statute",
    "rules",
    "gazette",
    "regulator",
    "government",
  ].includes(authorityType);
}

function inferPinpoint(text: string) {
  const para = text.match(PINPOINT_PARAGRAPH_REGEX);
  if (para) {
    return `para ${para[1]}`;
  }

  const section = text.match(PINPOINT_SECTION_REGEX);
  if (section) {
    return `Section ${section[1].toUpperCase()}`;
  }

  const rule = text.match(PINPOINT_RULE_REGEX);
  if (rule) {
    return `Rule ${rule[1].toUpperCase()}`;
  }

  return "pinpoint unavailable";
}

function assignIssueNodes(
  source: ResearchSourceLike,
  issueGraph: ResearchIssueNode[]
) {
  const haystack = normalize(`${source.title} ${source.content || ""}`);
  const matches = issueGraph.filter((node) =>
    node.keywords.some((keyword) => haystack.includes(normalize(keyword)))
  );
  return (matches.length ? matches : issueGraph).map((node) => node.id);
}

export function buildAuthorityRefs(
  sources: ResearchSourceLike[],
  issueGraph: ResearchIssueNode[]
): AuthorityRef[] {
  return sources.map((rawSource, index) => {
    const source = {
      ...rawSource,
      domain: rawSource.domain || getDomain(rawSource.url),
      sourceType:
        rawSource.sourceType ||
        classifyResearchSource(rawSource.url, rawSource.title),
    };
    const authorityType = inferAuthorityType(source);
    const hierarchyRank = getHierarchyRank(authorityType);
    const sourceRole = isPrimaryAuthority(authorityType)
      ? "primary"
      : "secondary";

    return {
      id: `auth-${index + 1}-${slugify(source.domain || source.title)}`,
      sourceIndex: index,
      sourceUrl: source.url,
      title: source.title,
      domain: source.domain || getDomain(source.url),
      sourceType: source.sourceType,
      authorityType,
      sourceRole,
      hierarchyRank,
      issueNodeIds: assignIssueNodes(source, issueGraph),
      citation: source.title,
      pinpoint: inferPinpoint(`${source.title} ${source.content || ""}`),
      note: (source.content || "").slice(0, 700) || `${authorityType} source`,
    };
  });
}

export function inferTreatmentStatus(text: string): TreatmentStatus {
  const lower = normalize(text);

  if (GOOD_LAW_REGEX.test(lower)) {
    return "good_law";
  }
  if (OVERRULED_REGEX.test(lower)) {
    return "overruled";
  }
  if (RECALLED_REGEX.test(lower)) {
    return "recalled";
  }
  if (STAYED_REGEX.test(lower)) {
    return "stayed";
  }
  if (DISTINGUISHED_REGEX.test(lower)) {
    return "distinguished";
  }
  if (CLARIFIED_REGEX.test(lower)) {
    return "clarified";
  }
  if (LIMITED_REGEX.test(lower)) {
    return "limited";
  }
  return "unknown";
}

export function isMajorCaseAuthority(authority: AuthorityRef) {
  return ["supreme_court", "high_court", "tribunal", "legal_database"].includes(
    authority.authorityType
  );
}

export function buildTreatmentCheck({
  authority,
  checkedQuery,
  checkedSources,
  treatmentText,
}: {
  authority: AuthorityRef;
  checkedQuery?: string;
  checkedSources?: string[];
  treatmentText?: string;
}): TreatmentCheck {
  const status = inferTreatmentStatus(
    `${authority.title} ${authority.note} ${treatmentText || ""}`
  );
  return {
    authorityId: authority.id,
    status,
    confidence: status === "unknown" ? "low" : "medium",
    checkedQuery,
    checkedSources: checkedSources || [],
    note:
      status === "unknown"
        ? "Treatment search completed, but no reliable overruled/stayed/distinguished signal was found in the available snippets."
        : `Treatment signal detected as ${status.replace(/_/g, " ")}.`,
  };
}

export function buildFallbackClaims({
  issueGraph,
  authorities,
  treatmentChecks,
}: {
  issueGraph: ResearchIssueNode[];
  authorities: AuthorityRef[];
  treatmentChecks: TreatmentCheck[];
}): ResearchClaim[] {
  const treatmentByAuthority = new Map(
    treatmentChecks.map((check) => [check.authorityId, check])
  );

  return issueGraph.map((node, index) => {
    const linkedAuthorities = authorities
      .filter((authority) => authority.issueNodeIds.includes(node.id))
      .sort((a, b) => a.hierarchyRank - b.hierarchyRank)
      .slice(0, 3);
    const primary = linkedAuthorities.find(
      (authority) => authority.sourceRole === "primary"
    );
    const firstTreatment = linkedAuthorities
      .map((authority) => treatmentByAuthority.get(authority.id))
      .find(Boolean);

    return {
      claimId: `claim-${index + 1}-${slugify(node.topic)}`,
      issueNodeId: node.id,
      proposition: primary
        ? `${node.issue} must be analysed against ${primary.title}.`
        : `${node.issue} remains unresolved until a primary legal authority is verified.`,
      supportingAuthorityIds: linkedAuthorities.map(
        (authority) => authority.id
      ),
      pinpoint: primary?.pinpoint || "pinpoint unavailable",
      treatmentStatus: firstTreatment?.status || "unknown",
      confidence: primary ? "medium" : "low",
      loadBearing: Boolean(primary),
      unresolvedReason: primary
        ? undefined
        : "No primary authority was found for this issue node.",
    };
  });
}

export function auditResearchPacket(packet: {
  issueGraph: ResearchIssueNode[];
  authorities: AuthorityRef[];
  claims: ResearchClaim[];
  treatmentChecks: TreatmentCheck[];
}): ResearchAudits {
  const authoritiesById = new Map(
    packet.authorities.map((authority) => [authority.id, authority])
  );
  const treatmentsByAuthority = new Map(
    packet.treatmentChecks.map((check) => [check.authorityId, check])
  );

  const citationAudit: AuditFinding[] = [];
  const sourceHierarchyAudit: AuditFinding[] = [];
  const treatmentAudit: AuditFinding[] = [];
  const completenessAudit: AuditFinding[] = [];

  for (const claim of packet.claims.filter((item) => item.loadBearing)) {
    const supportingAuthorities = claim.supportingAuthorityIds
      .map((id) => authoritiesById.get(id))
      .filter((authority): authority is AuthorityRef => Boolean(authority));

    if (supportingAuthorities.length === 0) {
      citationAudit.push({
        gate: "citation",
        status: "fail",
        claimId: claim.claimId,
        message: "Load-bearing claim has no valid supporting authority.",
      });
    } else {
      citationAudit.push({
        gate: "citation",
        status: "pass",
        claimId: claim.claimId,
        message: "Load-bearing claim has at least one linked authority.",
      });
    }

    if (
      supportingAuthorities.length > 0 &&
      supportingAuthorities.every(
        (authority) => authority.sourceRole !== "primary"
      )
    ) {
      sourceHierarchyAudit.push({
        gate: "source_hierarchy",
        status: "fail",
        claimId: claim.claimId,
        message:
          "Load-bearing claim is supported only by secondary sources/commentary.",
      });
    } else {
      sourceHierarchyAudit.push({
        gate: "source_hierarchy",
        status: "pass",
        claimId: claim.claimId,
        message: "Load-bearing claim has primary-source support.",
      });
    }

    for (const authority of supportingAuthorities.filter(
      isMajorCaseAuthority
    )) {
      const treatment = treatmentsByAuthority.get(authority.id);
      if (!treatment) {
        treatmentAudit.push({
          gate: "treatment",
          status: "fail",
          authorityId: authority.id,
          claimId: claim.claimId,
          message: "Major case authority has no subsequent-treatment check.",
        });
      } else if (treatment.status === "unknown") {
        treatmentAudit.push({
          gate: "treatment",
          status: "warning",
          authorityId: authority.id,
          claimId: claim.claimId,
          message:
            "Subsequent-treatment search was run, but current status remains unknown.",
        });
      } else {
        treatmentAudit.push({
          gate: "treatment",
          status: "pass",
          authorityId: authority.id,
          claimId: claim.claimId,
          message: `Subsequent-treatment status: ${treatment.status}.`,
        });
      }
    }
  }

  if (packet.issueGraph.length === 0) {
    completenessAudit.push({
      gate: "completeness",
      status: "fail",
      message: "Research packet has no issue graph.",
    });
  }

  if (packet.authorities.length === 0) {
    completenessAudit.push({
      gate: "completeness",
      status: "fail",
      message: "Research packet has no authorities.",
    });
  }

  if (packet.claims.length === 0) {
    completenessAudit.push({
      gate: "completeness",
      status: "fail",
      message: "Research packet has no claim-level citation map.",
    });
  }

  const allFindings = [
    ...citationAudit,
    ...sourceHierarchyAudit,
    ...treatmentAudit,
    ...completenessAudit,
  ];
  return {
    status: allFindings.some((finding) => finding.status === "fail")
      ? "needs_revision"
      : "pass",
    citationAudit,
    sourceHierarchyAudit,
    treatmentAudit,
    completenessAudit,
  };
}

export function getFailedClaimIds(audits: ResearchAudits) {
  return new Set(
    [
      ...audits.citationAudit,
      ...audits.sourceHierarchyAudit,
      ...audits.treatmentAudit,
      ...audits.completenessAudit,
    ]
      .filter((finding) => finding.status === "fail" && finding.claimId)
      .map((finding) => finding.claimId as string)
  );
}

export function buildClaimGraphEdges(
  claims: ResearchClaim[]
): ClaimGraphEdge[] {
  const edges: ClaimGraphEdge[] = [];
  const byIssue = new Map<string, ResearchClaim[]>();

  for (const claim of claims) {
    const existing = byIssue.get(claim.issueNodeId) || [];
    existing.push(claim);
    byIssue.set(claim.issueNodeId, existing);
  }

  for (const issueClaims of byIssue.values()) {
    for (let index = 1; index < issueClaims.length; index += 1) {
      edges.push({
        fromClaimId: issueClaims[index - 1].claimId,
        toClaimId: issueClaims[index].claimId,
        relation: "supports",
        note: "Claims arise from the same research issue node.",
      });
    }
  }

  for (const claim of claims) {
    const text = normalize(
      `${claim.proposition} ${claim.unresolvedReason || ""}`
    );
    if (text.includes("conflict") || text.includes("overlap")) {
      const related = claims.find(
        (candidate) => candidate.claimId !== claim.claimId
      );
      if (related) {
        edges.push({
          fromClaimId: claim.claimId,
          toClaimId: related.claimId,
          relation: "conflicts",
          note: "Claim text indicates a forum or statute conflict that the writer must resolve explicitly.",
        });
      }
    }
  }

  return edges;
}

export function buildNodeExecutions({
  issueGraph,
  researchPlan,
  authorities,
  claims,
  audits,
  retryQueries,
}: {
  issueGraph: ResearchIssueNode[];
  researchPlan: Array<{ id: string; issueNodeId?: string; query: string }>;
  authorities: AuthorityRef[];
  claims: ResearchClaim[];
  audits: ResearchAudits;
  retryQueries?: Array<{ issueNodeId?: string; query: string }>;
}): ResearchNodeExecution[] {
  const failedClaimIds = getFailedClaimIds(audits);
  const failedFindings = [
    ...audits.citationAudit,
    ...audits.sourceHierarchyAudit,
    ...audits.treatmentAudit,
    ...audits.completenessAudit,
  ].filter((finding) => finding.status === "fail");

  return issueGraph.map((node) => {
    const nodeClaims = claims.filter((claim) => claim.issueNodeId === node.id);
    const failedGates = failedFindings
      .filter((finding) =>
        finding.claimId
          ? nodeClaims.some((claim) => claim.claimId === finding.claimId)
          : false
      )
      .map((finding) => finding.gate);
    const nodeRetryQueries = (retryQueries || [])
      .filter((query) => query.issueNodeId === node.id)
      .map((query) => query.query);

    return {
      issueNodeId: node.id,
      status:
        nodeClaims.some((claim) => failedClaimIds.has(claim.claimId)) ||
        nodeRetryQueries.length > 0
          ? "needs_reresearch"
          : "passed",
      researchPlanIds: researchPlan
        .filter((item) => item.issueNodeId === node.id)
        .map((item) => item.id),
      authorityIds: authorities
        .filter((authority) => authority.issueNodeIds.includes(node.id))
        .map((authority) => authority.id),
      claimIds: nodeClaims.map((claim) => claim.claimId),
      failedGates: Array.from(new Set(failedGates)),
      retryQueries: nodeRetryQueries,
    };
  });
}

export function buildTargetedReresearchPlan({
  audits,
  claims,
  issueGraph,
  legalIssue,
  jurisdiction,
}: {
  audits: ResearchAudits;
  claims: ResearchClaim[];
  issueGraph: ResearchIssueNode[];
  legalIssue: string;
  jurisdiction?: string;
}) {
  const failedClaimIds = getFailedClaimIds(audits);
  const failedNodes = issueGraph.filter((node) =>
    claims.some(
      (claim) =>
        claim.issueNodeId === node.id && failedClaimIds.has(claim.claimId)
    )
  );
  const jurisdictionText = jurisdiction || "India";

  return failedNodes.slice(0, 4).map((node, index) => ({
    id: `retry-${index + 1}-${node.id}`,
    issueNodeId: node.id,
    label: `Re-research ${node.issue}`,
    sourceGoal: "primary-law" as const,
    query: `${legalIssue} ${node.issue} ${node.keywords.join(" ")} ${jurisdictionText} official primary authority Supreme Court statute tribunal regulator judgment`,
  }));
}

function getSectionBody(markdown: string, section: string) {
  const headingPattern = `^#{1,3}\\s+${escapeRegex(section)}\\s*$`;
  const match = new RegExp(headingPattern, "im").exec(markdown);
  if (!match) {
    return null;
  }

  const start = match.index + match[0].length;
  const nextHeading = NEXT_MARKDOWN_HEADING_REGEX.exec(markdown.slice(start));
  const end = nextHeading ? start + nextHeading.index : markdown.length;
  return markdown.slice(start, end).trim();
}

export function validateResearchReportMarkdown({
  reportMarkdown,
  sources,
  researchPacket,
}: {
  reportMarkdown: string;
  sources: ResearchSourceLike[];
  researchPacket?: ResearchPacketV2;
}): ResearchAudits {
  const completenessAudit: AuditFinding[] = [];
  const markdown = reportMarkdown.trim();
  for (const section of RESEARCH_REQUIRED_SECTIONS) {
    const body = getSectionBody(markdown, section);
    if (body === null) {
      completenessAudit.push({
        gate: "completeness",
        status: "warning",
        message: `Missing required section: ${section}.`,
      });
      continue;
    }

    if (body.length < 20) {
      completenessAudit.push({
        gate: "completeness",
        status: "warning",
        message: `Required section is too thin: ${section}.`,
      });
    }
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(markdown)) {
      completenessAudit.push({
        gate: "completeness",
        status: "fail",
        message: "Report contains placeholder or unfinished review text.",
      });
      break;
    }
  }

  const sourceUrls = sources
    .map((source) => source.url)
    .filter((url) => typeof url === "string" && url.length > 0);

  if (
    sourceUrls.length > 0 &&
    !sourceUrls.some((url) => markdown.includes(url))
  ) {
    completenessAudit.push({
      gate: "completeness",
      status: "fail",
      message: "Report does not cite any provided source URL.",
    });
  }

  if (researchPacket) {
    if (hasCrossForumRoutes(researchPacket.forumRoutes)) {
      const hasForumSplit = FORUM_SPLIT_HEADING_REGEX.test(markdown);
      if (!hasForumSplit) {
        completenessAudit.push({
          gate: "completeness",
          status: "fail",
          message:
            "Cross-forum research packet requires a Forum Split section.",
        });
      }
    }

    for (const claim of researchPacket.claims.filter(
      (item) => item.loadBearing
    )) {
      const supportingUrls = claim.supportingAuthorityIds
        .map((id) =>
          researchPacket.authorities.find((authority) => authority.id === id)
        )
        .filter((authority): authority is AuthorityRef => Boolean(authority))
        .map((authority) => authority.sourceUrl);
      const citesClaim =
        markdown.includes(claim.claimId) ||
        supportingUrls.some((url) => markdown.includes(url));

      if (!citesClaim) {
        completenessAudit.push({
          gate: "completeness",
          status: "fail",
          claimId: claim.claimId,
          message:
            "Report omits a claim-level citation or source URL for a load-bearing claim.",
        });
      }
    }
  }

  const packetAudits = researchPacket?.audits;
  const merged: ResearchAudits = {
    status: "pass",
    citationAudit: packetAudits?.citationAudit || [],
    sourceHierarchyAudit: packetAudits?.sourceHierarchyAudit || [],
    treatmentAudit: packetAudits?.treatmentAudit || [],
    completenessAudit,
  };

  const allFindings = [
    ...merged.citationAudit,
    ...merged.sourceHierarchyAudit,
    ...merged.treatmentAudit,
    ...merged.completenessAudit,
  ];
  merged.status = allFindings.some((finding) => finding.status === "fail")
    ? "needs_revision"
    : "pass";

  return merged;
}
