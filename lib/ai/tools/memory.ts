import { tool } from "ai";
import { z } from "zod";
import { addMemory, deleteMemory, searchMemories } from "@/lib/mem0/client";

/**
 * AI Tool: Search the user's memory bank for relevant context.
 * Invoked automatically before generating answers that might benefit from
 * past context (preferences, case details, past topics).
 */
export const searchMemoryTool = (userId: string) =>
  tool({
    description:
      "Search the user's personal memory bank for relevant context. Use this to recall past conversations, preferences, case details, or any previously stored information about the user. Call this proactively when the user's query might relate to something they've discussed before.",
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant memories"),
    }),
    // @ts-expect-error
    execute: async (args: any) => {
      const query =
        args?.query || (typeof args === "string" ? args : "user context");
      console.log(
        "[searchMemory tool] Raw args from SDK:",
        JSON.stringify(args)
      );
      if (!userId) {
        return { results: [], error: "No user context" };
      }
      try {
        const results: any = await searchMemories(userId, query, 5);
        if (results?._error || results?.error) {
          return {
            results: [],
            error: results.message || results.error || "Search failed",
          };
        }
        return {
          results: results.map((r: any) => ({
            memory: r.memory,
            relevance: r.score,
          })),
        };
      } catch (error: any) {
        console.error("[searchMemory tool] Error:", error);
        return { results: [], error: error.message };
      }
    },
  });

/**
 * AI Tool: Save a new memory about the user.
 * Use when the user shares a preference, important fact, case detail,
 * or explicitly asks to "remember" something.
 */
export const addMemoryTool = (userId: string) =>
  tool({
    description:
      'Save important information about the user to their personal memory bank. Use this when the user shares preferences (e.g. "I prefer arbitration over litigation"), important facts about their case, personal details relevant to legal advice, or explicitly asks you to "remember" something. The memory should be a concise, factual statement.',
    inputSchema: z.object({
      memory: z
        .string()
        .describe("A concise, factual statement to remember about the user"),
    }),
    // @ts-expect-error
    execute: async (args: any) => {
      console.log("[addMemory tool] Raw args:", JSON.stringify(args));

      // Defensive: handle various parameter names the AI might use
      const memory =
        args?.memory ||
        args?.description ||
        args?.content ||
        args?.text ||
        (typeof args === "string" ? args : undefined);

      console.log("[addMemory tool] Extracted memory:", memory);

      if (!userId) {
        return { success: false, error: "No user context" };
      }
      if (!memory || typeof memory !== "string" || !memory.trim()) {
        return { success: false, error: "No memory content provided" };
      }
      try {
        const result: any = await addMemory(userId, memory.trim());
        if (result?._error || result?.error) {
          return {
            success: false,
            error: result.message || result.error || "Failed to save memory",
            code: result.status === 429 ? "QUOTA_EXCEEDED" : "SERVER_ERROR",
          };
        }
        return { success: true, message: "Memory saved successfully", result };
      } catch (error: any) {
        console.error("[addMemory tool] Error:", error);
        return { success: false, error: error.message };
      }
    },
  });

/**
 * AI Tool: Delete a specific memory.
 * Use when the user asks to forget something or remove incorrect information.
 */
export const deleteMemoryTool = (userId: string) =>
  tool({
    description:
      "Delete a specific memory from the user's memory bank. Use when the user asks to forget something, correct outdated information, or remove a specific stored fact.",
    inputSchema: z.object({
      memoryId: z.string().describe("The ID of the memory to delete"),
      reason: z
        .string()
        .optional()
        .describe("Why this memory is being deleted"),
    }),
    // @ts-expect-error
    execute: async ({
      memoryId,
      reason,
    }: {
      memoryId: string;
      reason?: string;
    }) => {
      if (!userId) {
        return { success: false, error: "No user context" };
      }
      try {
        const result: any = await deleteMemory(memoryId);
        if (result?._error || result?.error || result?.success === false) {
          return {
            success: false,
            error: result.message || result.error || "Delete failed",
          };
        }
        return { success: true, message: "Memory deleted successfully" };
      } catch (error: any) {
        console.error("[deleteMemory tool] Error:", error);
        return { success: false, error: error.message };
      }
    },
  });
