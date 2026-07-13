import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email, name, source } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if they already exist in the database
    const existingSub = await db.query.newsletterSubscribers.findFirst({
      where: eq(newsletterSubscribers.email, cleanEmail)
    });

    if (existingSub) {
      if (!existingSub.isActive) {
        // Reactivate an old, inactive subscription
        await db.update(newsletterSubscribers)
          .set({
            isActive: true,
            isConfirmed: true,
            newsletterEmailsEnabled: true,
            unsubscribedAt: null,
            updatedAt: new Date().toISOString()
          })
          .where(eq(newsletterSubscribers.email, cleanEmail));
        return NextResponse.json({ success: true, message: "Resubscribed successfully!" });
      }
      return NextResponse.json({ message: "Already subscribed!", alreadySubscribed: true });
    }

    // 2. Insert new subscriber
    await db.insert(newsletterSubscribers).values({
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      source: source || 'v2_chatbot', // Distinctly marks V2 subscriptions
      type: 'Registered Member',
      isActive: true,
      isConfirmed: true,
      newsletterEmailsEnabled: true,
    });
    
    return NextResponse.json({ success: true, message: "Subscribed successfully!" });

  } catch (error) {
    console.error("Subscription Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
