import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";
import { activateUserPlan, getFallbackPeriodEnd } from "@/lib/billing/plan-cycle";
import { trackPlanUpgraded } from "@/lib/posthog";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { planId, couponCode } = await req.json();

        if (!planId) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        await activateUserPlan({
            userId: session.user.id,
            plan: planId,
            subscriptionId: `COUPON_FREE_${couponCode || "PROMO"}`,
            subscriptionStatus: "created",
            currentPeriodEnd: getFallbackPeriodEnd(),
        });

        // Track the upgrade for analytics
        trackPlanUpgraded(session.user.id, planId, "0");

        return NextResponse.json({ success: true, message: "Upgraded successfully" });
    } catch (error) {
        console.error("Free upgrade error:", error);
        return NextResponse.json({ error: "Failed to process free upgrade" }, { status: 500 });
    }
}
