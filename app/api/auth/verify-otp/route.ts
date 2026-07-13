import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { phoneVerification } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    let { email, otp } = await request.json().catch(() => ({}));

    email = email || session?.user?.email;

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    // Find the most recent unexpired, unverified OTP for this email
    const records = await db
      .select()
      .from(phoneVerification)
      .where(
        and(
          eq(phoneVerification.email, email),
          eq(phoneVerification.otp, otp),
          eq(phoneVerification.verified, false),
          gt(phoneVerification.expiresAt, new Date())
        )
      )
      .orderBy(desc(phoneVerification.createdAt))
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Mark as verified
    await db
      .update(phoneVerification)
      .set({ verified: true })
      .where(eq(phoneVerification.id, records[0].id));

    return NextResponse.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("[OTP] Verify error:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
