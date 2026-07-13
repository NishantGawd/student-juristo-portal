export type JuristoModelTier = "mini" | "macro" | "max";

export const AI_CREDIT_MULTIPLIER: Record<JuristoModelTier, number> = {
  mini: 1,
  macro: 5,
  max: 20,
};

const MODEL_ACCESS_BY_PLAN: Record<string, JuristoModelTier[]> = {
  free: ["mini"],
  basic: ["mini"],
  clat_spark: ["mini"],
  clat_momentum: ["mini", "macro"],
  clat_peak: ["mini", "macro", "max"],
  advance: ["mini", "macro"],
  advance_pro: ["mini", "macro", "max"],
  business: ["mini", "macro", "max"],
};

export function getJuristoModelTier(modelId: string): JuristoModelTier {
  if (modelId === "google/gemini-3.1-pro-preview") {
    return "max";
  }

  if (modelId.includes("flash")) {
    return "mini";
  }

  return "macro";
}

export function getAiCreditCost(modelId: string, rawTokens: number) {
  const tier = getJuristoModelTier(modelId);
  return Math.ceil(rawTokens * AI_CREDIT_MULTIPLIER[tier]);
}

export function getUsageDiffForJuristoModel(modelId: string, rawTokens: number) {
  const tier = getJuristoModelTier(modelId);
  const credits = getAiCreditCost(modelId, rawTokens);

  return {
    tokensDiff: credits,
    miniTokensDiff: tier === "mini" ? rawTokens : 0,
    macroTokensDiff: tier === "macro" ? rawTokens : 0,
    maxTokensDiff: tier === "max" ? rawTokens : 0,
  };
}

export function getAllowedJuristoModelTiers(plan?: string | null) {
  return MODEL_ACCESS_BY_PLAN[(plan || "free").toLowerCase()] || MODEL_ACCESS_BY_PLAN.free;
}

export function canUseJuristoModel(plan: string | undefined | null, modelId: string) {
  return getAllowedJuristoModelTiers(plan).includes(getJuristoModelTier(modelId));
}

export function getModelAccessError(plan: string | undefined | null, modelId: string) {
  const tier = getJuristoModelTier(modelId);
  const planName = (plan || "free").toLowerCase();

  if (tier === "max") {
    return planName.startsWith("clat")
      ? "Juristo Max is available on Peak for CLAT analytics and on Advance Pro or Business for professional legal work."
      : "Juristo Max is available on Advance Pro and Business plans for complex legal work.";
  }

  if (tier === "macro") {
    return "Juristo Macro is available on Momentum, Peak, Advance, Advance Pro, and Business plans.";
  }

  return "Juristo Mini is available on every Juristo plan.";
}
