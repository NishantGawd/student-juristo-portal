export type ClatModelTier = "mini" | "macro" | "max";

export const CLAT_MODEL_OPTIONS: Array<{
  description: string;
  id: ClatModelTier;
  label: string;
  modelId: string;
}> = [
  {
    id: "mini",
    label: "Juristo Mini",
    description: "Fast personalized quizzes and mini mocks.",
    modelId: "google/gemini-3.5-flash",
  },
  {
    id: "macro",
    label: "Juristo Macro",
    description: "Stronger reasoning for personalized full mocks.",
    modelId: "google/gemini-3-pro-preview",
  },
  {
    id: "max",
    label: "Juristo Max",
    description: "Deepest reasoning for high-stakes mock generation.",
    modelId: "google/gemini-3.1-pro-preview",
  },
];

const PLAN_MODEL_ACCESS: Record<string, ClatModelTier[]> = {
  free: ["mini"],
  basic: ["mini"],
  clat_spark: ["mini"],
  clat_momentum: ["mini", "macro"],
  clat_peak: ["mini", "macro", "max"],
  advance: ["mini", "macro"],
  advance_pro: ["mini", "macro", "max"],
  business: ["mini", "macro", "max"],
};

export function getAllowedClatModelTiers(plan?: string | null) {
  return PLAN_MODEL_ACCESS[(plan || "free").toLowerCase()] || PLAN_MODEL_ACCESS.free;
}

export function getDefaultClatModelTier(plan?: string | null): ClatModelTier {
  const allowed = getAllowedClatModelTiers(plan);
  return allowed[allowed.length - 1] || "mini";
}

export function getClatModelOption(tier?: string | null) {
  return (
    CLAT_MODEL_OPTIONS.find((option) => option.id === tier) ||
    CLAT_MODEL_OPTIONS[0]
  );
}

export function canUseClatModel(plan: string | undefined | null, tier: string) {
  return getAllowedClatModelTiers(plan).includes(tier as ClatModelTier);
}
