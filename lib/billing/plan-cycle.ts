import "server-only";

import { and, eq, inArray, lte, ne } from "drizzle-orm";
import { getRazorpaySubscription, type PlanType } from "@/lib/razorpay";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

type SubscriptionStatus = "active" | "cancelled" | "past_due" | "created";

const RESET_USAGE_VALUES = {
  tokensUsed: "0",
  miniTokensUsed: "0",
  macroTokensUsed: "0",
  maxTokensUsed: "0",
  chatCount: "0",
  draftCount: "0",
  analysisCount: "0",
  odrPacketCount: "0",
};

export function getFallbackPeriodEnd(from = new Date()) {
  const end = new Date(from);
  end.setDate(end.getDate() + 30);
  return end;
}

export function getRazorpayPeriodEnd(entity: any, fallback = new Date()) {
  const seconds = entity?.current_end || entity?.charge_at || entity?.end_at;
  if (typeof seconds === "number" && seconds > 0) {
    return new Date(seconds * 1000);
  }
  return getFallbackPeriodEnd(fallback);
}

export function getRazorpayPeriodEndIfPresent(entity: any) {
  const seconds = entity?.current_end || entity?.end_at;
  if (typeof seconds === "number" && seconds > 0) {
    return new Date(seconds * 1000);
  }
  return null;
}

export async function activateUserPlan({
  userId,
  plan,
  subscriptionId,
  subscriptionStatus = "active",
  currentPeriodEnd,
  resetUsage = true,
}: {
  userId: string;
  plan: PlanType | string;
  subscriptionId: string;
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  resetUsage?: boolean;
}) {
  const now = new Date();

  await db
    .update(user)
    .set({
      plan: plan as PlanType,
      subscriptionId,
      subscriptionStatus,
      currentPeriodEnd,
      ...(resetUsage ? RESET_USAGE_VALUES : {}),
      lastReset: now,
    })
    .where(eq(user.id, userId));
}

export async function renewSubscriptionCycle({
  subscriptionId,
  currentPeriodEnd,
}: {
  subscriptionId: string;
  currentPeriodEnd: Date;
}) {
  const now = new Date();

  return db
    .update(user)
    .set({
      subscriptionStatus: "active",
      currentPeriodEnd,
      ...RESET_USAGE_VALUES,
      lastReset: now,
    })
    .where(eq(user.subscriptionId, subscriptionId))
    .returning({ id: user.id, email: user.email, plan: user.plan });
}

export async function markSubscriptionEnded({
  subscriptionId,
  status,
  currentPeriodEnd,
}: {
  subscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
}) {
  const updateValues: Partial<typeof user.$inferInsert> = {
    subscriptionStatus: status,
  };

  if (currentPeriodEnd) {
    updateValues.currentPeriodEnd = currentPeriodEnd;
  }

  await db.update(user).set(updateValues).where(eq(user.subscriptionId, subscriptionId));
}

export async function downgradeExpiredPaidPlans(now = new Date()) {
  const expired = await db
    .select({
      id: user.id,
      subscriptionId: user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
    })
    .from(user)
    .where(
      and(
        ne(user.plan, "free"),
        lte(user.currentPeriodEnd, now),
        inArray(user.subscriptionStatus, ["cancelled", "past_due", "created"])
      )
    );

  if (expired.length === 0) {
    return { downgraded: 0, refreshed: 0, checked: 0 };
  }

  let downgraded = 0;
  let refreshed = 0;

  for (const account of expired) {
    const subscriptionId = account.subscriptionId || "";
    if (subscriptionId && !subscriptionId.startsWith("COUPON_FREE")) {
      const subscription = await getRazorpaySubscription(subscriptionId);
      const remoteStatus = subscription?.status;
      const remoteEnd = subscription ? getRazorpayPeriodEnd(subscription, now) : null;

      if (remoteStatus === "active" && remoteEnd && remoteEnd > now) {
        await db
          .update(user)
          .set({
            subscriptionStatus: "active",
            currentPeriodEnd: remoteEnd,
          })
          .where(eq(user.id, account.id));
        refreshed += 1;
        continue;
      }
    }

    await db
      .update(user)
      .set({
        plan: "free",
        subscriptionStatus: "cancelled",
        currentPeriodEnd: null,
        ...RESET_USAGE_VALUES,
        lastReset: now,
      })
      .where(eq(user.id, account.id));
    downgraded += 1;
  }

  return { downgraded, refreshed, checked: expired.length };
}
