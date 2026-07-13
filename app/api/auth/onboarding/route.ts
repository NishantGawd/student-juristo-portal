import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/queries";
import { user } from "@/lib/db/schema";
import { NotificationService } from "@/lib/notifications/service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phone, workArea, referralSource, skipPhoneVerification } = body;

    // Check existing status to avoid duplicate welcome emails
    const existingUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { onboardingCompleted: true },
    });

    // Update user with strictly parsed onboarding data
    await db
      .update(user)
      .set({
        phone: phone ? String(phone).trim() : null,
        phoneVerified: skipPhoneVerification ? false : !!phone,
        workArea: workArea ? String(workArea).trim() : null,
        referralSource: referralSource ? String(referralSource).trim() : null,
        onboardingCompleted: true,
      })
      .where(eq(user.id, session.user.id));

    // Send Welcome Email via Notification Service only if first time completing
    // Isolated in a try-catch so an email error NEVER blocks a successful onboarding
    try {
      if (session.user.email && !existingUser?.onboardingCompleted) {
        await NotificationService.triggerEvent("USER_ONBOARDED", {
          userId: session.user.id,
          userEmail: session.user.email,
          userName: session.user.name || "there",
        });
      }
    } catch (emailError) {
      console.error(
        "[Onboarding] Failed to send welcome notification:",
        emailError
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Onboarding completed",
    });
    response.cookies.delete("post_onboarding_callback");
    return response;
  } catch (error) {
    console.error("[Onboarding] Error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
