import { NextResponse } from "next/server";

import { downgradeExpiredPaidPlans } from "@/lib/billing/plan-cycle";

import { db } from "@/lib/db/queries";
import {
  checkoutSession,
  liveChatSession,
  notification,
  user,
} from "@/lib/db/schema";
import { NotificationService } from "@/lib/notifications/service";
import { eq, lt, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  const secret = url.searchParams.get("secret");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    secret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const results: any = {};

  // ---------------- Billing Sync ----------------
  try {
    results.billing = await downgradeExpiredPaidPlans();
  } catch (e) {
    console.error("Billing Sync:", e);
    results.billing = "Failed";
  }

  
  // ---------------- Notifications ----------------
  try {
    const now = new Date();

    const twoHoursAgo = new Date(
      now.getTime() - 2 * 60 * 60 * 1000
    );

    const abandonedCheckouts = await db
      .select()
      .from(checkoutSession)
      .where(
        and(
          eq(checkoutSession.status, "OPEN"),
          eq(checkoutSession.abandonmentEmailSent, false),
          lt(checkoutSession.createdAt, twoHoursAgo)
        )
      );

    for (const checkout of abandonedCheckouts) {
      await NotificationService.triggerEvent("PAYMENT_ABANDONED", {
        userId: checkout.userId || undefined,
        userEmail: checkout.userEmail,
        targetName: checkout.targetName || "your item",
        targetUrl:
          `${process.env.NEXT_PUBLIC_BASE_URL || "https://juristo.in"}/dashboard`,
      });

      await db
        .update(checkoutSession)
        .set({ abandonmentEmailSent: true })
        .where(eq(checkoutSession.id, checkout.id));
    }

    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    );

    const pendingConsultations = await db
      .select()
      .from(liveChatSession)
      .where(
        and(
          eq(liveChatSession.status, "pending"),
          lt(liveChatSession.createdAt, twentyFourHoursAgo)
        )
      );

    for (const consultation of pendingConsultations) {
      const [dbUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, consultation.userId || ""))
        .limit(1);

      if (!dbUser) continue;

      const [recentNotification] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, dbUser.id),
            eq(notification.event, "CONSULTATION_REMINDER")
          )
        )
        .orderBy(desc(notification.createdAt))
        .limit(1);

      const timeSinceLastReminder = recentNotification
        ? now.getTime() -
          new Date(recentNotification.createdAt).getTime()
        : Infinity;

      if (timeSinceLastReminder > 24 * 60 * 60 * 1000) {
        await NotificationService.triggerEvent(
          "CONSULTATION_REMINDER",
          {
            userId: dbUser.id,
            userEmail: dbUser.email,
            userName: dbUser.firstName || "there",
          }
        );
      }
    }

    results.notifications = {
      abandoned: abandonedCheckouts.length,
      reminders: pendingConsultations.length,
    };
  } catch (e) {
    console.error("Notifications:", e);
    results.notifications = "Failed";
  }

  return NextResponse.json({
    success: true,
    executedAt: new Date().toISOString(),
    results,
  });
}