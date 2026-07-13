// Vercel AI Gateway Model Configuration
// Default to Juristo Mini for fast legal chat.
export const DEFAULT_CHAT_MODEL = "google/gemini-3.5-flash";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  tooltip: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "google/gemini-3.5-flash",
    name: "Juristo Mini",
    provider: "juristo",
    description: "Fast next-gen intelligence",
    tooltip: "Fast answers for quick legal tasks.",
  },
  {
    id: "google/gemini-3-pro-preview",
    name: "Juristo Macro",
    provider: "juristo",
    description: "State-of-the-art reasoning",
    tooltip: "Stronger reasoning for drafting and research.",
  },
  {
    // Juristo Max uses Gemini 3.1 Pro Preview with high-thinking level
    id: "google/gemini-3.1-pro-preview",
    name: "Juristo Max",
    provider: "juristo",
    description: "Advanced complex multi-step logic",
    tooltip: "Deep thinking for complex legal work.",
  },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
