import { NextResponse } from "next/server";
import { downgradeExpiredPaidPlans } from "@/lib/billing/plan-cycle";

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
    const result = await downgradeExpiredPaidPlans();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Billing Sync Cron] Error:", error);

    return NextResponse.json(
      { error: "Failed to run billing sync" },
      { status: 500 }
    );
  }
}
