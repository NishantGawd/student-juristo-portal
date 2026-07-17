import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkoutSession } from "@/lib/db/schema";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { targetType, targetId, targetName, price, email } = body;

    const userEmail = session?.user?.email || email;
    const userId = session?.user?.id;

    if (!userEmail || !targetType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [createdSession] = await db.insert(checkoutSession).values({
      userId: userId || null,
      userEmail: userEmail,
      targetType: targetType,
      targetId: targetId || null,
      targetName: targetName || "Product",
      price: price || null,
      status: "OPEN",
    }).returning();

    return NextResponse.json({ success: true, checkoutSessionId: createdSession.id });
  } catch (error) {
    console.error("[Track Checkout] Error:", error);
    return NextResponse.json({ error: "Failed to track checkout" }, { status: 500 });
  }
}
