import { NextResponse } from "next/server";
import { runPlatformHealthLookup } from "@/lib/monitoring/platform-health";

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
    const result = await runPlatformHealthLookup();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Platform Health Cron] Error:", error);

    return NextResponse.json(
      { error: "Failed to run platform health lookup" },
      { status: 500 }
    );
  }
}
