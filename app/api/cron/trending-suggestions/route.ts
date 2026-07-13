import { NextResponse } from "next/server";
import { refreshTrendingSuggestions } from "@/lib/ai/trending-suggestions";

export const maxDuration = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  const secret = url.searchParams.get("secret");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    secret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const suggestions = await refreshTrendingSuggestions();

    return NextResponse.json({
      success: true,
      refreshedAt: new Date().toISOString(),
      count: suggestions.length,
      suggestions: suggestions.map((suggestion) => suggestion.text),
    });
  } catch (error) {
    console.error("[Trending Suggestions Cron] Error:", error);

    return NextResponse.json(
      { error: "Failed to refresh trending suggestions" },
      { status: 500 }
    );
  }
}
