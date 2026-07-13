import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const now = new Date().toISOString();

    await db
      .insert(newsletterSubscribers)
      .values({
        email: cleanEmail,
        name: cleanEmail.split("@")[0],
        source: "v2_dashboard",
        type: "Email Preferences",
        isActive: false,
        isConfirmed: false,
        marketingEmailsEnabled: false,
        newsletterEmailsEnabled: false,
        quizEmailsEnabled: false,
        onboardingReminderEmailsEnabled: false,
        unsubscribedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: {
          isActive: false,
          isConfirmed: false,
          marketingEmailsEnabled: false,
          newsletterEmailsEnabled: false,
          quizEmailsEnabled: false,
          onboardingReminderEmailsEnabled: false,
          unsubscribedAt: now,
          updatedAt: now,
        },
      });

    return NextResponse.json({ success: true, message: "Optional emails disabled" });
  } catch (error) {
    console.error("Newsletter Opt-out Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
