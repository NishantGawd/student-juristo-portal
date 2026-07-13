import { auth } from "@/app/(auth)/auth";
import { verifyPaymentSignature, createRazorpaySubscription, type PlanType } from "@/lib/razorpay";
import { trackContractPurchased, trackPlanUpgraded } from "@/lib/posthog";
import { trackUserActivity } from "@/lib/activity/tracking";
import { activateUserPlan, getFallbackPeriodEnd } from "@/lib/billing/plan-cycle";
import { updateContractPurchaseStatus, getContractPurchaseById } from "@/lib/db/queries";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { sql } from "drizzle-orm";
import { NotificationService } from "@/lib/notifications/service";

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            razorpay_order_id,
            razorpay_subscription_id,
            razorpay_payment_id,
            razorpay_signature,
            type,
            itemId,
            purchaseId,
            couponCode
        } = body;

        console.log("[VERIFY] Received body:", {
            razorpay_order_id,
            razorpay_subscription_id,
            razorpay_payment_id,
            razorpay_signature: razorpay_signature ? `${razorpay_signature.substring(0, 10)}...` : "MISSING",
            type,
            itemId,
            purchaseId,
            couponCode,
        });

        const idToVerify = razorpay_subscription_id || razorpay_order_id;

        if (!idToVerify || !razorpay_payment_id || !razorpay_signature) {
            console.error("[VERIFY] Missing payment details:", {
                idToVerify: !!idToVerify,
                razorpay_payment_id: !!razorpay_payment_id,
                razorpay_signature: !!razorpay_signature,
            });
            return NextResponse.json(
                { error: "Missing payment details" },
                { status: 400 }
            );
        }

        // Verify signature (Subscriptions hash subscription_id instead of order_id)
        console.log("[VERIFY] Verifying signature with:", {
            idToVerify,
            paymentId: razorpay_payment_id,
            isSubscription: !!razorpay_subscription_id,
            keySecretConfigured: !!process.env.RAZORPAY_KEY_SECRET,
        });

        const isValid = verifyPaymentSignature(
            idToVerify,
            razorpay_payment_id,
            razorpay_signature,
            !!razorpay_subscription_id
        );

        if (!isValid) {
            console.error("[VERIFY] Signature verification FAILED for:", {
                idToVerify,
                paymentId: razorpay_payment_id,
            });
            return NextResponse.json(
                { error: "Invalid payment signature" },
                { status: 400 }
            );
        }

        console.log("[VERIFY] Signature verified successfully");

        // Handle based on type
        if (type === "contract" && purchaseId) {
            // Update contract purchase status
            await updateContractPurchaseStatus({
                id: purchaseId,
                paymentStatus: "completed",
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
            });

            const purchase = await getContractPurchaseById({ id: purchaseId });
            if (purchase) {
                trackContractPurchased(
                    session.user.id,
                    purchase.contractSlug,
                    purchase.price,
                    purchase.tier
                );

                await NotificationService.triggerEvent("PAYMENT_SUCCESSFUL", {
                    userId: session.user.id,
                    userEmail: session.user.email || "",
                    userName: session.user.name || "User",
                    targetName: `Contract: ${purchase.contractName}`,
                    extraData: { amount: `₹${purchase.price}`, paymentId: razorpay_payment_id },
                    targetUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://chat.juristo.in"}/dashboard/contracts`
                });

                // Track contract_purchased activity
                trackUserActivity({
                    userId: session.user.id,
                    eventType: "contract_purchased",
                    sourceTable: "ContractPurchase",
                    sourceId: purchaseId,
                    textPreview: `Purchased: ${purchase.contractName}`,
                    keywords: [purchase.contractSlug, purchase.tier].filter(Boolean),
                    metadata: {
                        contractSlug: purchase.contractSlug,
                        contractName: purchase.contractName,
                        tier: purchase.tier,
                        price: purchase.price,
                        paymentId: razorpay_payment_id,
                    },
                }).catch(() => {});
            }
        } else if (type === "plan_upgrade" && itemId) {
            const isSubscription = !!body.razorpay_subscription_id;
            const currentPeriodEnd = getFallbackPeriodEnd();

            if (couponCode && !isSubscription) {
                // Coupon was applied: first payment was a one-time order at discounted price.
                // Now create a subscription starting next month for future full-price charges.
                try {
                    const subscription = await createRazorpaySubscription(
                        itemId as string,
                        session.user.id,
                        session.user.email || "",
                        currentPeriodEnd // start_at: 30 days from now
                    );

                    await activateUserPlan({
                        userId: session.user.id,
                        plan: itemId as PlanType,
                        subscriptionId: subscription.id,
                        subscriptionStatus: "active",
                        currentPeriodEnd,
                    });

                    console.log(`[VERIFY] Coupon plan upgrade: user ${session.user.id} → ${itemId}, subscription ${subscription.id} starts at ${currentPeriodEnd.toISOString()}`);
                } catch (subError) {
                    console.error("[VERIFY] Failed to create deferred subscription:", subError);
                    // Still upgrade the plan even if subscription creation fails
                    await activateUserPlan({
                        userId: session.user.id,
                        plan: itemId as PlanType,
                        subscriptionId: razorpay_payment_id,
                        subscriptionStatus: "created",
                        currentPeriodEnd,
                    });
                }
            } else {
                // Normal subscription flow (no coupon)
                await activateUserPlan({
                    userId: session.user.id,
                    plan: itemId as PlanType,
                    subscriptionId: body.razorpay_subscription_id || razorpay_payment_id,
                    subscriptionStatus: isSubscription ? "active" : "created",
                    currentPeriodEnd: isSubscription ? currentPeriodEnd : null,
                });
            }

            trackPlanUpgraded(session.user.id, itemId, String(body.amount || 0));

            const displayAmount = body.amount ? `₹${body.amount / 100}` : "your plan upgrade";

            await NotificationService.triggerEvent("PAYMENT_SUCCESSFUL", {
                userId: session.user.id,
                userEmail: session.user.email || "",
                userName: session.user.name || "User",
                targetName: `Juristo ${itemId} Plan`,
                extraData: { amount: displayAmount, paymentId: razorpay_payment_id },
                targetUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://chat.juristo.in"}/dashboard`
            });

            // Track plan_upgraded activity
            trackUserActivity({
                userId: session.user.id,
                eventType: "plan_upgraded",
                sourceTable: "User",
                sourceId: session.user.id,
                textPreview: `Upgraded to ${itemId} plan`,
                keywords: [itemId],
                metadata: {
                    plan: itemId,
                    amount: body.amount,
                    paymentId: razorpay_payment_id,
                    couponCode: couponCode || null,
                },
            }).catch(() => {});
        }

        // --- COUPON USAGE INCREMENT ---
        if (couponCode) {
            try {
                await db.execute(
                    sql`UPDATE "Coupons" SET "currentUsage" = "currentUsage" + 1 WHERE "code" = ${couponCode}`
                );
                console.log(`Successfully incremented usage for coupon: ${couponCode}`);
            } catch (couponError) {
                console.error("Failed to update coupon usage:", couponError);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Payment verified successfully",
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        return NextResponse.json(
            { error: "Failed to verify payment" },
            { status: 500 }
        );
    }
}
