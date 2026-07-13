/**
 * Mem0 REST API Client
 * Docs: https://docs.mem0.ai/api-reference
 *
 * Uses the Mem0 Platform API to manage user memories.
 * Each Juristo user is mapped to a unique Mem0 user_id (their Juristo user ID).
 */

const MEM0_API_KEY = process.env.MEM0_API_KEY!;
const MEM0_BASE = "https://api.mem0.ai/v1";

type Mem0Memory = {
  id: string;
  memory: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

type Mem0SearchResult = {
  id: string;
  memory: string;
  score: number;
  user_id: string;
  created_at: string;
  updated_at: string;
};

async function mem0Fetch(path: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`${MEM0_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${MEM0_API_KEY}`,
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[MEM0 API ERROR] ${res.status} at ${MEM0_BASE}${path}: ${text}`
      );

      // Graceful handling for Quota or Server errors to prevent app-wide crashes
      if (res.status === 429 || res.status >= 500) {
        return {
          _error: true,
          status: res.status,
          message:
            res.status === 429 ? "Mem0 Quota Exceeded" : "Mem0 Server Error",
          raw: text,
        };
      }

      throw new Error(`Mem0 API error ${res.status}: ${text}`);
    }

    return res.json();
  } catch (err) {
    if (err instanceof Error && err.message.includes("Mem0 API error")) {
      throw err; // Re-throw handled API errors
    }
    console.error(`[MEM0 FETCH FAILED] ${path}:`, err);
    return { _error: true, message: String(err) };
  }
}

// ─── Public API ────────────────────────────────────────────

/** Add a new memory for a user */
export async function addMemory(
  userId: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  if (!userId) {
    console.error("[MEM0 CLIENT] addMemory called without userId");
    return { error: "User ID is required" };
  }
  // Guard: content MUST be a non-empty string or Mem0 returns 400
  const safeContent =
    typeof content === "string" && content.trim() ? content.trim() : null;
  if (!safeContent) {
    console.error(
      "[MEM0 CLIENT] addMemory called with empty/undefined content, skipping"
    );
    return { error: "Content is required" };
  }

  const payload = {
    messages: [{ role: "user", content: safeContent }],
    user_id: userId,
    infer: false, // Prevents merging; ensures memories act as a list for plan limits
    ...(metadata ? { metadata } : {}),
  };
  console.log("[MEM0 CLIENT] addMemory payload:", JSON.stringify(payload));
  return mem0Fetch("/memories/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Search memories relevant to a query */
export async function searchMemories(
  userId: string,
  query: string,
  limit = 5
): Promise<Mem0SearchResult[]> {
  const safeQuery = query?.trim() || "user context";
  const payload = {
    query: safeQuery,
    user_id: userId,
    top_k: limit,
  };
  console.log("[MEM0 CLIENT] searchMemories payload:", JSON.stringify(payload));
  const data = await mem0Fetch("/memories/search/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!data || data._error) {
    return [];
  }
  return data.results || data || [];
}

/** Get all memories for a user */
export async function getMemories(userId: string): Promise<Mem0Memory[]> {
  if (!userId) {
    console.error("[MEM0 CLIENT] getMemories called without userId");
    return [];
  }
  const data = await mem0Fetch(
    `/memories/?user_id=${encodeURIComponent(userId)}`,
    {
      method: "GET",
    }
  );
  if (!data || data._error) {
    return [];
  }
  return data.results || data || [];
}

/** Get a single memory by ID */
export async function getMemory(memoryId: string): Promise<Mem0Memory | null> {
  const data = await mem0Fetch(`/memories/${memoryId}/`, { method: "GET" });
  if (!data || data._error) {
    return null;
  }
  return data;
}

/** Update an existing memory */
export async function updateMemory(memoryId: string, content: string) {
  const data = await mem0Fetch(`/memories/${memoryId}`, {
    method: "PUT",
    body: JSON.stringify({ text: content }),
  });
  if (!data || data._error) {
    return { success: false, error: data?.message || "Update failed" };
  }
  return { success: true, data };
}

/** Delete a specific memory */
export async function deleteMemory(memoryId: string) {
  const data = await mem0Fetch(`/memories/${memoryId}`, { method: "DELETE" });
  if (!data || data._error) {
    return { success: false, error: data?.message || "Delete failed" };
  }
  return { success: true };
}

/** Delete all memories for a user */
export async function deleteAllMemories(userId: string) {
  const data = await mem0Fetch(
    `/memories/?user_id=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    }
  );
  if (!data || data._error) {
    return { success: false, error: data?.message || "Delete all failed" };
  }
  return { success: true };
}
