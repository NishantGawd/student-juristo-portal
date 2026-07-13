import "server-only";

const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/generation";

type GenerationData = {
  id: string;
  model: string;
  tokens_prompt?: number;
  tokens_completion?: number;
  native_tokens_prompt?: number;
  native_tokens_completion?: number;
  total_cost?: number;
  usage?: number;
  created_at?: string;
};

type GenerationUsage = {
  generationId: string;
  model: string;
  tokensPrompt: number;
  tokensCompletion: number;
  totalTokens: number;
  costUsd?: number;
  createdAt: string;
};

/**
 * Fetch generation details from Vercel AI Gateway
 * Returns token usage information for a specific generation
 */
export async function getGenerationUsage(
  generationId: string
): Promise<GenerationUsage | null> {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY;

  if (!apiKey) {
    console.warn("[AI Gateway] No API key found for fetching generation usage");
    return null;
  }

  try {
    console.log("[AI Gateway] Fetching generation:", generationId);

    const res = await fetch(`${AI_GATEWAY_URL}?id=${generationId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      console.warn(
        "[AI Gateway] Usage lookup unavailable:",
        res.status,
        res.statusText
      );
      return null;
    }

    const body = await res.json();
    const data: GenerationData = body.data || body;

    console.log("[AI Gateway] Generation data:", data);

    const tokensPrompt = data.tokens_prompt ?? data.native_tokens_prompt ?? 0;
    const tokensCompletion =
      data.tokens_completion ?? data.native_tokens_completion ?? 0;
    const usage: GenerationUsage = {
      generationId: data.id,
      model: data.model,
      tokensPrompt,
      tokensCompletion,
      totalTokens: tokensPrompt + tokensCompletion,
      costUsd: data.total_cost ?? data.usage,
      createdAt: data.created_at ?? new Date().toISOString(),
    };

    console.log("[AI Gateway] Parsed usage:", usage);
    return usage;
  } catch (error) {
    console.warn("[AI Gateway] Error fetching generation usage:", error);
    return null;
  }
}

/**
 * Estimate tokens from text if gateway fetch fails
 * Uses ~4 characters per token as rough estimate
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
