import "server-only";
import Razorpay from "razorpay";

let razorpayInstance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay {
    if (!razorpayInstance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error("Razorpay credentials not configured");
        }
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
}

export type OrderType = "contract" | "plan_upgrade";

export interface CreateOrderParams {
    amount: number; // Amount in paise (INR * 100)
    currency?: string;
    receipt: string;
    type: OrderType;
    itemId: string;
    userId: string;
    userEmail: string;
}

// Creates an order for inline checkout (signature-compatible)
export async function createRazorpayOrder(params: CreateOrderParams) {
    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
        amount: params.amount,
        currency: params.currency || "INR",
        receipt: params.receipt,
        notes: {
            type: params.type,
            itemId: params.itemId,
            userId: params.userId,
            userEmail: params.userEmail,
        },
    });

    return order;
}

export function verifyPaymentSignature(
    orderOrSubscriptionId: string,
    paymentId: string,
    signature: string,
    isSubscription: boolean = false
): boolean {
    const crypto = require("crypto");
    // Razorpay uses different payload ordering:
    // Orders:        order_id|payment_id
    // Subscriptions: payment_id|subscription_id
    const payload = isSubscription
        ? `${paymentId}|${orderOrSubscriptionId}`
        : `${orderOrSubscriptionId}|${paymentId}`;

    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(payload)
        .digest("hex");

    return generatedSignature === signature;
}

export const PLAN_ID_MAP: Record<string, string | undefined> = {
    clat_spark: process.env.RAZORPAY_PLAN_CLAT_SPARK || "plan_T5U4LEkXYTTmtl",
    clat_momentum: process.env.RAZORPAY_PLAN_CLAT_MOMENTUM || "plan_T5U5TyM6uGusr5",
    clat_peak: process.env.RAZORPAY_PLAN_CLAT_PEAK || "plan_T5U68xYS1MEZi2",
    advance: process.env.RAZORPAY_PLAN_ADVANCE,
    advance_pro: process.env.RAZORPAY_PLAN_ADVANCE_PRO,
    // Add other plans here as they are created
};

export async function getRazorpaySubscription(subscriptionId: string) {
    const razorpay = getRazorpayInstance();
    try {
        return await razorpay.subscriptions.fetch(subscriptionId);
    } catch (e) {
        console.error('Failed to fetch subscription:', e);
        return null;
    }
}

export async function createRazorpaySubscription(planType: string, userId: string, userEmail: string, startAt?: Date) {
    const razorpay = getRazorpayInstance();
    const planId = PLAN_ID_MAP[planType];
    
    if (!planId) {
        throw new Error(`Razorpay plan ID not configured for plan: ${planType}`);
    }

    const subscriptionParams: any = {
        plan_id: planId,
        customer_notify: 1,
        total_count: 120, // 10 years
        notes: {
            type: "plan_upgrade",
            itemId: planType,
            userId,
            userEmail,
        },
    };

    // If startAt is provided, defer the first charge to that date.
    // This is used when a coupon covers the first payment via a one-time order.
    if (startAt) {
        subscriptionParams.start_at = Math.floor(startAt.getTime() / 1000);
    }

    const subscription = await razorpay.subscriptions.create(subscriptionParams);

    return subscription;
}

// Plan pricing in INR (paise)
export const PLAN_PRICES = {
    clat_spark: 9900, // Rs. 99
    clat_momentum: 29900, // Rs. 299
    clat_peak: 49900, // Rs. 499
    advance: 29900, // ₹299
    advance_pro: 99900, // ₹999
    business: 499900, // Custom placeholder
} as const;

export type PlanType = keyof typeof PLAN_PRICES;
