import { createGateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

const THINKING_SUFFIX_REGEX = /-thinking$/;

const apiKey =
  process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY;
const gateway = createGateway({
  apiKey,
});

export const myProvider = null;

export function getLanguageModel(modelId: string) {
  console.log("[PROVIDER DEBUG] getLanguageModel called with:", modelId);
  console.log(
    "[PROVIDER DEBUG] API key exists:",
    Boolean(apiKey)
  );
  console.log(
    "[PROVIDER DEBUG] API key length:",
    apiKey?.length || 0
  );

  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    const actualModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");
    console.log("[PROVIDER DEBUG] Using reasoning model:", actualModelId);

    return wrapLanguageModel({
      model: gateway(actualModelId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  let actualModelId = modelId;
  if (
    modelId === "google/gemini-3.1-pro-preview-high" ||
    modelId === "google/gemini-3.1-pro-high" ||
    modelId === "google/gemini-3.1-pro-preview"
  ) {
    // Juristo Max Primary
    actualModelId = "openai/gpt-5";
  } else if (
    modelId === "google/gemini-3.1-pro-low" ||
    modelId === "google/gemini-3.1-pro" ||
    modelId === "google/gemini-2.5-pro" ||
    modelId === "google/gemini-1.5-pro" ||
    modelId === "google/gemini-3-pro-preview"
  ) {
    // Juristo Macro Primary
    actualModelId = "anthropic/claude-sonnet-4.5";
  } else if (
    modelId === "google/gemini-3.5-flash-high" ||
    modelId === "google/gemini-3-flash" ||
    modelId === "google/gemini-2.0-flash" ||
    modelId === "google/gemini-1.5-flash" ||
    modelId === "google/gemini-3.1-flash" ||
    modelId === "google/gemini-3.1-flash-lite-preview" ||
    modelId === "google/gemini-3.5-flash"
  ) {
    // Juristo Mini Primary
    actualModelId = "openai/gpt-4o-mini";
  }

  console.log("[PROVIDER DEBUG] Using standard model:", actualModelId);
  return gateway(actualModelId) as any;
}

export function getFallbackModels(modelId: string): string[] {
  if (
    modelId === "google/gemini-3.1-pro-preview-high" ||
    modelId === "google/gemini-3.1-pro-high" ||
    modelId === "google/gemini-3.1-pro-preview"
  ) {
    // Juristo Max Fallbacks
    return ["anthropic/claude-opus-4.8", "anthropic/claude-sonnet-4.5"];
  } else if (
    modelId === "google/gemini-3.1-pro-low" ||
    modelId === "google/gemini-3.1-pro" ||
    modelId === "google/gemini-2.5-pro" ||
    modelId === "google/gemini-1.5-pro" ||
    modelId === "google/gemini-3-pro-preview"
  ) {
    // Juristo Macro Fallbacks
    return ["openai/gpt-4o-mini", "google/gemini-pro"];
  } else if (
    modelId === "google/gemini-3.5-flash-high" ||
    modelId === "google/gemini-3-flash" ||
    modelId === "google/gemini-2.0-flash" ||
    modelId === "google/gemini-1.5-flash" ||
    modelId === "google/gemini-3.1-flash" ||
    modelId === "google/gemini-3.1-flash-lite-preview" ||
    modelId === "google/gemini-3.5-flash"
  ) {
    // Juristo Mini Fallbacks
    return ["anthropic/claude-haiku-4.5", "google/gemini-flash"];
  }
  return [];
}

export function getTitleModel() {
  // Use Juristo Mini for fast title generation (fallback to gpt-4o-mini since google is down)
  return gateway("openai/gpt-4o-mini");
}

export function getArtifactModel() {
  console.log("[ARTIFACT MODEL] getArtifactModel called");
  console.log(
    "[ARTIFACT MODEL] API key exists:",
    Boolean(process.env.VERCEL_AI_GATEWAY_API_KEY)
  );

  // Use a capable model for artifact/document generation
  const model = gateway("openai/gpt-4o-mini");
  console.log("[ARTIFACT MODEL] Returning model: openai/gpt-4o-mini");
  return model;
}

export function getContractDraftingModel() {
  console.log("[CONTRACT DRAFTING MODEL] getContractDraftingModel called");
  const model = gateway("anthropic/claude-sonnet-4-6");
  console.log("[CONTRACT DRAFTING MODEL] Returning: anthropic/claude-sonnet-4-6");
  return model;
}