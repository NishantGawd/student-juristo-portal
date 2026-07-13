import { tool } from "ai";
import { z } from "zod";

export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
};

export type TavilySearchResponse = {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  images?: { url: string; description?: string }[];
};

const TAVILY_MAX_QUERY_LENGTH = 400;
const TAVILY_SAFE_QUERY_LENGTH = 360;
const MAX_SEARCHES_PER_TOOL_CALL = 4;
const MAX_RESULTS_PER_TOOL_CALL = 6;
const SEARCH_SEGMENT_SPLIT_RE = /[;\n]+/;

function buildSearchFailure(params: {
  query: string;
  startTime: number;
  error?: string;
}) {
  return {
    query: params.query,
    answer: "Source search could not finish. Answer with appropriate caveats.",
    error: params.error || "SEARCH_FAILED",
    executionTimeMs: Date.now() - params.startTime,
    results: [],
    images: [],
  };
}

function compactQuery(query: string, maxLength = TAVILY_SAFE_QUERY_LENGTH) {
  const compacted = query.replace(/\s+/g, " ").trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  const clipped = compacted.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");

  return (lastSpace > 180 ? clipped.slice(0, lastSpace) : clipped).trim();
}

function buildSearchSeries(query: string) {
  const compacted = query.replace(/\s+/g, " ").trim();

  if (compacted.length <= TAVILY_MAX_QUERY_LENGTH) {
    return [compacted];
  }

  const segments = compacted
    .split(SEARCH_SEGMENT_SPLIT_RE)
    .map((segment) => compactQuery(segment))
    .filter((segment) => segment.length > 0);

  const uniqueSegments = Array.from(new Set(segments));

  if (uniqueSegments.length === 0) {
    return [compactQuery(compacted)];
  }

  return uniqueSegments.slice(0, MAX_SEARCHES_PER_TOOL_CALL);
}

async function runTavilySearch({
  apiKey,
  includeImages,
  query,
  searchDepth,
}: {
  apiKey: string;
  includeImages: boolean;
  query: string;
  searchDepth: string;
}) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth ?? "advanced",
      include_answer: true,
      include_images: includeImages ?? false,
      include_image_descriptions: includeImages ?? false,
      max_results: MAX_RESULTS_PER_TOOL_CALL,
    }),
  });

  if (!response.ok) {
    await response.text();
    console.warn("[WEBSEARCH DEBUG] Source search failed:", response.status);
    throw new Error("SEARCH_FAILED");
  }

  return response.json();
}

async function executeWebSearch(rawArgs: any) {
  const query: string | undefined =
    rawArgs?.query ??
    rawArgs?.input?.query ??
    (typeof rawArgs === "string" ? rawArgs : undefined);
  const includeImages: boolean = rawArgs?.includeImages ?? false;
  const searchDepth: string = rawArgs?.searchDepth ?? "advanced";

  console.log("[WEBSEARCH DEBUG] Tool execute called.", {
    hasQuery: Boolean(query),
    queryLength: query?.length ?? 0,
  });

  if (!query || query.trim().length === 0) {
    console.error("[WEBSEARCH DEBUG] No query provided to webSearch tool!");
    return {
      query: "Source search",
      answer:
        "The search query was empty. Please try again with a specific question.",
      error: "EMPTY_QUERY",
      executionTimeMs: 0,
      results: [],
      images: [],
    };
  }

  const startTime = Date.now();
  const apiKey = process.env.TAVILY_API_KEY;
  const searchQueries = buildSearchSeries(query);

  if (!apiKey) {
    console.error("[WEBSEARCH DEBUG] Source search is not configured.");
    return buildSearchFailure({
      query: searchQueries[0] || "Source search",
      startTime,
      error: "SEARCH_NOT_CONFIGURED",
    });
  }

  try {
    const allResults: TavilySearchResult[] = [];
    const allImages: { url: string; description?: string }[] = [];
    const answers: string[] = [];

    for (const searchQuery of searchQueries) {
      const data = await runTavilySearch({
        apiKey,
        includeImages,
        query: searchQuery,
        searchDepth,
      });

      if (typeof data.answer === "string" && data.answer.trim()) {
        answers.push(data.answer.trim());
      }

      allResults.push(
        ...(data.results ?? []).map((result: any) => ({
          title: result.title,
          url: result.url,
          content: result.content,
          score: result.score,
          published_date: result.published_date,
        }))
      );

      if (includeImages) {
        allImages.push(
          ...(data.images ?? []).map((image: any) => ({
            url: typeof image === "string" ? image : image.url,
            description:
              typeof image === "string" ? undefined : image.description,
          }))
        );
      }
    }

    const uniqueResults = Array.from(
      new Map(allResults.map((result) => [result.url, result])).values()
    ).slice(0, MAX_RESULTS_PER_TOOL_CALL);
    const executionTimeMs = Date.now() - startTime;

    console.log(
      "[WEBSEARCH DEBUG] Tavily returned",
      uniqueResults.length,
      "unique results from",
      searchQueries.length,
      "sequential search(es) in",
      executionTimeMs,
      "ms"
    );

    return {
      query: searchQueries[0] || "Source search",
      answer: answers[0],
      executionTimeMs,
      searchCount: searchQueries.length,
      results: uniqueResults,
      images: allImages.slice(0, 6),
    };
  } catch {
    return buildSearchFailure({
      query: searchQueries[0] || "Source search",
      startTime,
    });
  }
}

export function createWebSearchTool() {
  let queue: Promise<void> = Promise.resolve();
  const settleQueue = () => Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>) => {
    const run = queue.then(task, task);
    queue = run.then(settleQueue, settleQueue);
    return run;
  };

  return tool({
    description: `Search the web for real-time information using Tavily.
Use this tool when:
- User asks about current events, news, recent legal updates, or time-sensitive information
- User asks about specific laws, regulations, or court judgments that may have been recently passed
- User asks anything that requires live data (prices, people, companies, recent cases)
- User explicitly asks to search the web or look something up online
IMPORTANT:
- Always synthesize the full chat conversation context first before formulating the search query. Do not just use their last message out of context.
- Keep the query concise. Prefer one focused source-search query over several visible searches.
- If there are many legal issues, use the most important issue first and let Juristo run searches sequentially.
Always prefer this tool over saying you don't have access to real-time information.`,

    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "The search query to look up. Be specific and include relevant context."
        ),
      includeImages: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include image results"),
      searchDepth: z
        .enum(["basic", "advanced"])
        .optional()
        .default("advanced")
        .describe("Search depth"),
    }),

    // @ts-expect-error - AI SDK tool() overload infers from zod parameters; explicit annotation conflicts.
    execute: (rawArgs: any) => {
      return enqueue(() => executeWebSearch(rawArgs));
    },
  });
}

export const webSearch = createWebSearchTool();
