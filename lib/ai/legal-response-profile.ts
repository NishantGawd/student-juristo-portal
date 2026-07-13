export const JURISTO_MINI_MODEL = "google/gemini-3.5-flash";
export const JURISTO_MACRO_MODEL = "google/gemini-3-pro-preview";
export const JURISTO_MAX_MODEL = "google/gemini-3.1-pro-preview";

export type LegalResponseDepth = "simple" | "complex" | "high_risk";

export type LegalResponseCategory =
  | "simple"
  | "complex_chat"
  | "current_law"
  | "document_analysis"
  | "drafting"
  | "odr"
  | "property"
  | "contract";

export type LegalPromptMode =
  | "standard"
  | "complex"
  | "current_law"
  | "document_analysis";

export type LegalResponseProfile = {
  depth: LegalResponseDepth;
  category: LegalResponseCategory;
  needsWebSearch: boolean;
  needsCitations: boolean;
  suggestedModelId: string;
  promptMode: LegalPromptMode;
  reason: string;
};

export type LegalActionType =
  | "none"
  | "collect_facts"
  | "prepare_documents"
  | "draft_notice"
  | "review_contract"
  | "file_odr"
  | "find_lawyer"
  | "research_deeper"
  | "explain_simpler";

export type SignatureAnswerMode = "none" | "light_action" | "complex_action";

export type LegalSuggestedAction = {
  label: string;
  prompt: string;
};

export type LegalActionProfile = {
  actionType: LegalActionType;
  nextActions: LegalSuggestedAction[];
  closingLabel: string;
  lawyerTrigger?: string;
  evidenceChecklist: string[];
  signatureAnswerMode: SignatureAnswerMode;
  reason: string;
};

type ClassifyLegalQueryOptions = {
  text: string;
  hasAttachments?: boolean;
  userPlan?: string | null;
};

const PAID_MAX_PLANS = new Set([
  "advance",
  "advance_pro",
  "business",
  "business_yearly",
  "admin",
]);

const CURRENT_LAW_PATTERNS = [
  /\b(latest|recent|new|current|today|now|updated|amendment|notification|circular|guideline|gazette)\b/i,
  /\b20(2[4-9]|3[0-9])\b/,
  /\b(dpdp|bns|bnss|bsa|bharatiya nyaya sanhita|digital personal data protection)\b/i,
  /\b(supreme court|high court|sebi|rbi|irdai|cci|mca|meity)\b.*\b(judg(e)?ment|order|ruling|notification|circular)\b/i,
];

const HIGH_RISK_PATTERNS = [
  /\b(arrest|bail|fir|police|criminal|jail|custody|summons|warrant)\b/i,
  /\b(injunction|stay order|eviction|demolition|sealing|attachment)\b/i,
  /\b(fraud|scam|cyber crime|cyber fraud|cheating|forgery|extortion)\b/i,
  /\b(domestic violence|harassment|stalking|threat|blackmail)\b/i,
  /\b(limitation|deadline|statute of limitation|urgent|emergency)\b/i,
  /\b(crores?|lakhs?|high[-\s]?value|material liability)\b/i,
];

const COMPLEX_LEGAL_PATTERNS = [
  /\b(advise|advice|strategy|legal opinion|opinion|risk|liability|exposure|remedy|relief)\b/i,
  /\b(can i|should i|what should|next steps|grounds|defen[cs]e|claim|counterclaim)\b/i,
  /\b(section|article|rule|regulation|act|statute|code|provision|interpretation)\b/i,
  /\b(case law|precedent|judg(e)?ment|citation|landmark|authority)\b/i,
  /\b(dispute|notice|complaint|suit|petition|appeal|tribunal|court|arbitration|mediation)\b/i,
  /\b(contract breach|breach of contract|termination|indemnity|damages|specific performance)\b/i,
];

const DRAFTING_PATTERNS = [
  /\b(draft|write|prepare|create|generate)\b.*\b(contract|agreement|deed|notice|petition|reply|clause|affidavit|letter)\b/i,
  /\b(legal notice|rental agreement|nda|mou|sale deed|employment agreement)\b/i,
];

const ODR_PATTERNS = [
  /\b(odr|online dispute|file.*complaint|consumer complaint|ecommerce dispute|msme delayed payment|banking complaint|insurance dispute)\b/i,
];

const PROPERTY_PATTERNS = [
  /\b(property|land|plot|khasra|survey number|boundary|encroachment|title|sale deed|revenue record)\b/i,
];

const CONTRACT_PATTERNS = [
  /\b(contract|agreement|deed|clause|nda|mou|lease|rent agreement|employment agreement)\b/i,
];

const CONTRACT_REVIEW_PATTERNS = [
  /\b(review|check|analy[sz]e|red flag|risk|negotiate|fair|unfair)\b.*\b(contract|agreement|clause|nda|mou|lease)\b/i,
  /\b(contract|agreement|clause|nda|mou|lease)\b.*\b(review|check|analy[sz]e|red flag|risk|negotiate|fair|unfair)\b/i,
];

const LEGAL_NOTICE_PATTERNS = [
  /\b(legal notice|reply notice|demand notice|cease and desist|show cause notice)\b/i,
  /\b(draft|prepare|write|reply)\b.*\bnotice\b/i,
];

const LAWYER_TRIGGER_PATTERNS = [
  /\b(lawyer|advocate|attorney|counsel|representation|consult|legal help)\b/i,
];

const EXPLAIN_PATTERNS = [
  /\b(explain|meaning|what is|difference between|in simple terms|eli5)\b/i,
];

const MULTI_STEP_FACT_PATTERNS = [
  /\b(first|then|after that|subsequently|later|before|after)\b/i,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/,
  /\b\d{4}\b/,
  /[,;:]/,
];

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0
  );
}

function canUseMaxModel(plan?: string | null) {
  return PAID_MAX_PLANS.has((plan || "free").toLowerCase());
}

function hasMultiStepFacts(text: string) {
  return text.length > 700 || countMatches(text, MULTI_STEP_FACT_PATTERNS) >= 2;
}

function createSuggestedAction(
  label: string,
  prompt: string
): LegalSuggestedAction {
  return { label, prompt };
}

function emptyActionProfile(reason: string): LegalActionProfile {
  return {
    actionType: "none",
    nextActions: [],
    closingLabel: "",
    evidenceChecklist: [],
    signatureAnswerMode: "none",
    reason,
  };
}

export function classifyLegalQuery({
  text,
  hasAttachments = false,
  userPlan,
}: ClassifyLegalQueryOptions): LegalResponseProfile {
  const normalizedText = text.trim();
  const lowerText = normalizedText.toLowerCase();
  const currentLaw = matchesAny(lowerText, CURRENT_LAW_PATTERNS);
  const highRisk = matchesAny(lowerText, HIGH_RISK_PATTERNS);
  const complexScore =
    countMatches(lowerText, COMPLEX_LEGAL_PATTERNS) +
    (hasMultiStepFacts(lowerText) ? 1 : 0) +
    (PROPERTY_PATTERNS.some((pattern) => pattern.test(lowerText)) ? 1 : 0);

  if (hasAttachments) {
    const suggestedModelId =
      highRisk && canUseMaxModel(userPlan)
        ? JURISTO_MAX_MODEL
        : JURISTO_MACRO_MODEL;
    return {
      depth: highRisk ? "high_risk" : "complex",
      category: "document_analysis",
      needsWebSearch: currentLaw,
      needsCitations: currentLaw,
      suggestedModelId,
      promptMode: "document_analysis",
      reason: currentLaw
        ? "Uploaded legal material plus current-law indicators require sourced document analysis."
        : "Uploaded legal material requires structured document analysis.",
    };
  }

  if (matchesAny(lowerText, ODR_PATTERNS)) {
    return {
      depth: "complex",
      category: "odr",
      needsWebSearch: currentLaw,
      needsCitations: currentLaw,
      suggestedModelId: JURISTO_MACRO_MODEL,
      promptMode: currentLaw ? "current_law" : "standard",
      reason:
        "Dispute-filing language should preserve the ODR workflow while using stronger routing.",
    };
  }

  if (matchesAny(lowerText, DRAFTING_PATTERNS)) {
    return {
      depth: "complex",
      category: matchesAny(lowerText, CONTRACT_PATTERNS)
        ? "contract"
        : "drafting",
      needsWebSearch: currentLaw,
      needsCitations: currentLaw,
      suggestedModelId: JURISTO_MACRO_MODEL,
      promptMode: currentLaw ? "current_law" : "standard",
      reason:
        "Legal drafting request should use the existing drafting workflow on a capable model.",
    };
  }

  if (currentLaw) {
    return {
      depth: highRisk ? "high_risk" : "complex",
      category: "current_law",
      needsWebSearch: true,
      needsCitations: true,
      suggestedModelId:
        highRisk && canUseMaxModel(userPlan)
          ? JURISTO_MAX_MODEL
          : JURISTO_MACRO_MODEL,
      promptMode: "current_law",
      reason: "Time-sensitive legal query requires live sources and citations.",
    };
  }

  if (highRisk) {
    return {
      depth: "high_risk",
      category: "complex_chat",
      needsWebSearch: false,
      needsCitations: false,
      suggestedModelId: canUseMaxModel(userPlan)
        ? JURISTO_MAX_MODEL
        : JURISTO_MACRO_MODEL,
      promptMode: "complex",
      reason: "High-risk legal topic requires deeper legal reasoning.",
    };
  }

  if (matchesAny(lowerText, PROPERTY_PATTERNS) && complexScore >= 2) {
    return {
      depth: "complex",
      category: "property",
      needsWebSearch: false,
      needsCitations: false,
      suggestedModelId: JURISTO_MACRO_MODEL,
      promptMode: "complex",
      reason: "Property-law dispute indicators require structured analysis.",
    };
  }

  if (complexScore >= 2) {
    return {
      depth: "complex",
      category: "complex_chat",
      needsWebSearch: false,
      needsCitations: false,
      suggestedModelId: JURISTO_MACRO_MODEL,
      promptMode: "complex",
      reason:
        "Multiple legal complexity indicators require structured analysis.",
    };
  }

  return {
    depth: "simple",
    category: "simple",
    needsWebSearch: false,
    needsCitations: false,
    suggestedModelId: JURISTO_MINI_MODEL,
    promptMode: "standard",
    reason:
      "No complex, high-risk, document, or current-law indicators detected.",
  };
}

export function classifyLegalAction({
  text,
  hasAttachments = false,
  responseProfile,
}: {
  text: string;
  hasAttachments?: boolean;
  responseProfile: LegalResponseProfile;
}): LegalActionProfile {
  const lowerText = text.trim().toLowerCase();

  if (!lowerText && !hasAttachments) {
    return emptyActionProfile(
      "No user text or attachment context was present."
    );
  }

  if (matchesAny(lowerText, LEGAL_NOTICE_PATTERNS)) {
    return {
      actionType: "draft_notice",
      nextActions: [
        createSuggestedAction(
          "Draft reply notice",
          "Draft a reply notice based on these facts."
        ),
        createSuggestedAction(
          "Prepare evidence list",
          "Prepare an evidence checklist for this notice."
        ),
        createSuggestedAction(
          "Find a lawyer",
          "Help me find a lawyer for this notice."
        ),
      ],
      closingLabel: "Next best move",
      lawyerTrigger:
        "Use a lawyer before sending a formal notice or reply with admissions, deadlines, or settlement offers.",
      evidenceChecklist: [
        "Notice copy",
        "Relevant contract or invoices",
        "Timeline of communications",
      ],
      signatureAnswerMode: "light_action",
      reason: "Notice matters naturally lead to drafting and evidence steps.",
    };
  }

  if (
    responseProfile.category === "odr" ||
    responseProfile.category === "contract" ||
    responseProfile.category === "drafting" ||
    responseProfile.category === "property"
  ) {
    return {
      actionType:
        responseProfile.category === "odr"
          ? "file_odr"
          : responseProfile.category === "property"
            ? "prepare_documents"
            : "draft_notice",
      nextActions: [],
      closingLabel: "Next best move",
      evidenceChecklist: [],
      signatureAnswerMode: "none",
      reason:
        "Specialized workflow should handle next actions without extra generic suggestions.",
    };
  }

  if (
    responseProfile.category === "simple" &&
    matchesAny(lowerText, EXPLAIN_PATTERNS) &&
    !matchesAny(lowerText, HIGH_RISK_PATTERNS)
  ) {
    return emptyActionProfile(
      "Simple informational query should stay clean and avoid forced suggestions."
    );
  }

  if (matchesAny(lowerText, CONTRACT_REVIEW_PATTERNS) || hasAttachments) {
    return {
      actionType: "review_contract",
      nextActions: [
        createSuggestedAction(
          "List red flags",
          "List the red flags in this document and rank them by legal risk."
        ),
        createSuggestedAction(
          "Prepare negotiation points",
          "Turn this into negotiation points I can send to the other side."
        ),
        createSuggestedAction(
          "Find a lawyer",
          "Help me find a lawyer to review this document."
        ),
      ],
      closingLabel: "Next best move",
      lawyerTrigger:
        "Use lawyer review before signing, sending, or relying on high-value or disputed documents.",
      evidenceChecklist: [
        "Signed or latest draft",
        "All schedules/annexures",
        "Emails or chats about disputed clauses",
      ],
      signatureAnswerMode:
        responseProfile.depth === "high_risk"
          ? "complex_action"
          : "light_action",
      reason: "Document or contract-review context benefits from suggested next actions.",
    };
  }

  if (responseProfile.category === "current_law") {
    return {
      actionType: "research_deeper",
      nextActions: [
        createSuggestedAction(
          "Run deep research",
          "Run a deeper legal research memo on this issue with sources."
        ),
        createSuggestedAction(
          "Check practical impact",
          "Explain how this legal update affects my situation."
        ),
      ],
      closingLabel: "Source check",
      evidenceChecklist: [],
      signatureAnswerMode: "light_action",
      reason:
        "Current-law answers benefit from source-aware follow-up actions.",
    };
  }

  if (
    responseProfile.depth === "high_risk" ||
    matchesAny(lowerText, LAWYER_TRIGGER_PATTERNS)
  ) {
    return {
      actionType: "find_lawyer",
      nextActions: [
        createSuggestedAction(
          "Prepare evidence list",
          "Prepare the documents and evidence I should collect before speaking to a lawyer."
        ),
        createSuggestedAction(
          "Check urgent deadlines",
          "Check urgent limitation, filing, or response deadlines for this situation."
        ),
        createSuggestedAction(
          "Find a lawyer",
          "Help me find a lawyer for this matter."
        ),
      ],
      closingLabel: "Lawyer trigger",
      lawyerTrigger:
        "Escalate promptly where arrest, fraud, eviction, injunction, limitation, safety, or high-value exposure is possible.",
      evidenceChecklist: [
        "Chronology with dates",
        "Notices, FIRs, orders, or complaints",
        "Payment records and written communications",
      ],
      signatureAnswerMode: "complex_action",
      reason:
        "High-risk legal issue should end with practical escalation steps.",
    };
  }

  if (responseProfile.depth === "complex") {
    return {
      actionType: "prepare_documents",
      nextActions: [
        createSuggestedAction(
          "Prepare document list",
          "Prepare a document checklist for this legal issue."
        ),
        createSuggestedAction(
          "Explain simply",
          "Explain this answer in simpler terms."
        ),
      ],
      closingLabel: "Next best move",
      evidenceChecklist: [
        "Relevant contracts/notices",
        "Chronology of events",
        "Proof of payment or communication",
      ],
      signatureAnswerMode: "light_action",
      reason: "Complex legal issue should offer a small action-first close.",
    };
  }

  return emptyActionProfile("No useful action-first close was needed.");
}
