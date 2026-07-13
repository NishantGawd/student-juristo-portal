import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phone, workArea, referralSource, phoneVerified } = body;

    const updates: any = {};
    if (phone !== undefined) updates.phone = phone;
    if (workArea !== undefined) updates.workArea = workArea;
    if (referralSource !== undefined) updates.referralSource = referralSource;
    if (phoneVerified !== undefined) updates.phoneVerified = phoneVerified;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    await db
      .update(user)
      .set(updates)
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Profile] Update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
