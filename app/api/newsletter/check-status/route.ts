import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check Neon DB for an active subscription
    const subscriber = await db.query.newsletterSubscribers.findFirst({
      where: and(
        eq(newsletterSubscribers.email, email.toLowerCase().trim()),
        eq(newsletterSubscribers.isActive, true)
      )
    });

    return NextResponse.json({ isSubscribed: !!subscriber });

  } catch (error) {
    console.error("Check Status Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}