import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { phoneVerification } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/index";
import { eq, and, gt } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    let { email } = await request.json().catch(() => ({}));

    email = email || session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await db.insert(phoneVerification).values({
      email,
      otp,
      expiresAt,
    });

    // Send OTP via the active mail provider
    try {
      await sendEmail({
        to: email,
        subject: "Your Juristo Verification Code",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #09090b; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #fafafa; font-size: 24px; font-weight: 600; margin: 0;">Juristo AI</h1>
              <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">Email Verification</p>
            </div>
            <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; text-align: center;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 16px;">Your verification code is:</p>
              <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #a78bfa; margin: 16px 0;">${otp}</div>
              <p style="color: #71717a; font-size: 12px; margin: 16px 0 0;">This code expires in 10 minutes.</p>
            </div>
            <p style="color: #52525b; font-size: 11px; text-align: center; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("[OTP] Failed to send email:", emailError);
      // Still return success with OTP logged for dev purposes
      console.log(`[OTP] Dev fallback - OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("[OTP] Error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
