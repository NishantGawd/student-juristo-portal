import { NextResponse } from "next/server";
import crypto from "crypto";
import {
    activateUserPlan,
    getFallbackPeriodEnd,
    getRazorpayPeriodEnd,
    getRazorpayPeriodEndIfPresent,
    markSubscriptionEnded,
    renewSubscriptionCycle,
} from "@/lib/billing/plan-cycle";
import type { PlanType } from "@/lib/razorpay";
import { NotificationService } from "@/lib/notifications/service";

// Consolidated Razorpay webhook endpoint

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get("x-razorpay-signature");

        if (!signature) {
            console.error("[WEBHOOK] Missing x-razorpay-signature header");
            return NextResponse.json({ error: "Missing signature" }, { status: 400 });
        }

        // Verify webhook signature
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("[WEBHOOK] RAZORPAY_WEBHOOK_SECRET not configured");
            return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
        }

        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== signature) {
            console.error("[WEBHOOK] Invalid webhook signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const event = JSON.parse(body);
        console.log("[WEBHOOK] Received event:", event.event);

        const payload = event.payload;

        switch (event.event) {
            case "payment.captured":
                await handlePaymentCaptured(payload);
                break;

            case "subscription.charged":
                await handleSubscriptionCharged(payload);
                break;

            case "subscription.cancelled":
            case "subscription.halted":
                await handleSubscriptionEnded(payload);
                break;

            default:
                console.log("[WEBHOOK] Unhandled event type:", event.event);
        }

        // Always return 200 to acknowledge receipt
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("[WEBHOOK] Error processing webhook:", error);
        // Return 200 even on errors to prevent infinite retries
        return NextResponse.json({ status: "ok" });
    }
}

// ─── payment.captured ────────────────────────────────────────────────
async function handlePaymentCaptured(payload: any) {
    const payment = payload?.payment?.entity;
    if (!payment) {
        console.error("[WEBHOOK] No payment entity in payload");
        return;
    }

    const orderId = payment.order_id;
    const paymentId = payment.id;
    const subscriptionId = payment.subscription_id;
    const notes = payment.notes || {};
    const { type, itemId, userId } = notes;

    console.log("[WEBHOOK] Payment captured:", {
        orderId,
        paymentId,
        type,
        itemId,
        userId,
        amount: payment.amount,
        subscriptionId,
    });

    // Handle one-time plan payments. Recurring subscription payments are
    // handled by subscription.charged so the real subscription id stays intact.
    if (type === "plan_upgrade" && itemId && userId && !subscriptionId) {
        try {
            await activateUserPlan({
                userId,
                plan: itemId as PlanType,
                subscriptionId: paymentId,
                subscriptionStatus: "created",
                currentPeriodEnd: getFallbackPeriodEnd(),
            });

            console.log(`[WEBHOOK] Plan upgraded for user ${userId} to ${itemId}`);
        } catch (dbError) {
            console.error("[WEBHOOK] Failed to update user plan:", dbError);
        }
    }

    // Handle contract purchase
    if (type === "contract" && notes.purchaseId) {
        try {
            const { updateContractPurchaseStatus } = await import("@/lib/db/queries");
            await updateContractPurchaseStatus({
                id: notes.purchaseId,
                paymentStatus: "completed",
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
            });
            console.log(`[WEBHOOK] Contract purchase ${notes.purchaseId} marked as completed`);
        } catch (dbError) {
            console.error("[WEBHOOK] Failed to update contract purchase:", dbError);
        }
    }
}

// ─── subscription.charged ────────────────────────────────────────────
async function handleSubscriptionCharged(payload: any) {
    const subscription = payload?.subscription?.entity;
    const payment = payload?.payment?.entity;

    if (!subscription?.id) {
        console.error("[WEBHOOK] No subscription entity in subscription.charged payload");
        return;
    }

    const newEnd = getRazorpayPeriodEnd(subscription);
    let result = await renewSubscriptionCycle({
        subscriptionId: subscription.id,
        currentPeriodEnd: newEnd,
    });

    if (result.length === 0) {
        const notes = subscription.notes || {};
        if (notes.type === "plan_upgrade" && notes.userId && notes.itemId) {
            await activateUserPlan({
                userId: notes.userId,
                plan: notes.itemId as PlanType,
                subscriptionId: subscription.id,
                subscriptionStatus: "active",
                currentPeriodEnd: newEnd,
            });

            result = [{
                id: notes.userId,
                email: notes.userEmail || "",
                plan: notes.itemId,
            }];
        }
    }

    if (result.length > 0) {
        const dbUser = result[0];
        console.log(`[WEBHOOK] Subscription charged for user ${dbUser.id}, renewed until ${newEnd.toISOString()}`);

        await NotificationService.triggerEvent("PAYMENT_SUCCESSFUL", {
            userId: dbUser.id,
            userEmail: dbUser.email || "",
            userName: "Juristo User",
            targetName: `Juristo ${dbUser.plan} Renewal`,
            extraData: { amount: `Rs. ${(payment?.amount || 0) / 100}`, paymentId: payment?.id || "" },
            targetUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://chat.juristo.in"}/dashboard`,
        });
    }
}

// ─── subscription.cancelled / subscription.halted ────────────────────
async function handleSubscriptionEnded(payload: any) {
    const subscription = payload?.subscription?.entity;

    if (!subscription?.id) {
        console.error("[WEBHOOK] No subscription entity in ended payload");
        return;
    }

    await markSubscriptionEnded({
        subscriptionId: subscription.id,
        status: subscription.status === "halted" ? "past_due" : "cancelled",
        currentPeriodEnd: getRazorpayPeriodEndIfPresent(subscription) || new Date(),
    });

    console.log(`[WEBHOOK] Subscription ${subscription.id} ended with status: ${subscription.status}`);
}
