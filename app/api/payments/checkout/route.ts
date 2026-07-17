import { auth } from "@/app/(auth)/auth";
import { createRazorpayOrder, createRazorpaySubscription, PLAN_PRICES, type PlanType } from "@/lib/razorpay";
import { generateUUID } from "@/lib/utils";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { type, itemId, amount, itemName, coupon } = body;

        if (!type || !itemId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let razorpayResponseId: string;
        let responseAmount: number;
        let responseCurrency: string = "INR";
        let isSubscription = false;
        let discountPercent = 0;

        if (type === "plan_upgrade") {
            const plan = itemId as PlanType;
            if (!PLAN_PRICES[plan]) {
                return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
            }

            const fullPricePaise = PLAN_PRICES[plan]; // already in paise

            // If coupon is provided, validate it server-side and create a one-time order
            // for the discounted first payment. The subscription starts next month at full price.
            if (coupon) {
                const couponResult = await db.execute(
                    sql`SELECT * FROM "Coupons" WHERE "code" = ${coupon} LIMIT 1`
                );
                const couponRow = couponResult[0];

                if (!couponRow || couponRow.status !== "Active") {
                    return NextResponse.json({ error: "Invalid or inactive coupon" }, { status: 400 });
                }

                if (Number(couponRow.maxUsage) > 0 && Number(couponRow.currentUsage) >= Number(couponRow.maxUsage)) {
                    return NextResponse.json({ error: "Coupon has reached its usage limit" }, { status: 400 });
                }

                discountPercent = Number(couponRow.discountPercentage);
                const discountedPaise = Math.max(0, Math.round(fullPricePaise - (fullPricePaise * (discountPercent / 100))));

                if (discountedPaise === 0) {
                    // 100% off — this should be handled by the free-upgrade endpoint
                    return NextResponse.json({ error: "Use free upgrade for 100% discount" }, { status: 400 });
                }

                // Create a one-time order for the discounted first month
                const receipt = `rcpt_${generateUUID().slice(0, 8)}`;
                const order = await createRazorpayOrder({
                    amount: discountedPaise,
                    receipt,
                    type: "plan_upgrade",
                    itemId,
                    userId: session.user.id,
                    userEmail: session.user.email || "",
                });

                razorpayResponseId = order.id;
                responseAmount = discountedPaise;
                responseCurrency = order.currency;
                isSubscription = false; // One-time order, NOT a subscription
            } else {
                // No coupon — create a recurring subscription at full price
                const subscription = await createRazorpaySubscription(plan, session.user.id, session.user.email || "");
                razorpayResponseId = subscription.id;
                responseAmount = fullPricePaise;
                isSubscription = true;
            }
        } else if (type === "contract") {
            if (!amount || typeof amount !== "number") {
                return NextResponse.json({ error: "Amount required" }, { status: 400 });
            }
            const orderAmount = amount * 100; // Convert to paise
            const receipt = `rcpt_${generateUUID().slice(0, 8)}`;

            const order = await createRazorpayOrder({
                amount: orderAmount,
                receipt,
                type,
                itemId,
                userId: session.user.id,
                userEmail: session.user.email || "",
            });

            razorpayResponseId = order.id;
            responseAmount = orderAmount;
            responseCurrency = order.currency;
        } else {
            return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
        }

        return NextResponse.json({
            orderId: razorpayResponseId,
            amount: responseAmount,
            currency: responseCurrency,
            keyId: process.env.RAZORPAY_KEY_ID,
            itemName: itemName || itemId,
            isSubscription,
            couponApplied: coupon || null,
            discountPercent,
        });
    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}
