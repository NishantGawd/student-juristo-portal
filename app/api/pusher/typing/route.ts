// app/api/pusher/typing/route.ts
import { NextResponse } from "next/server";
import Pusher from "pusher";

// Initialize Pusher Server SDK
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const { ticketId, isTyping, userType } = await req.json();

    // Broadcast the typing event to the specific ticket's channel
    await pusher.trigger(`ticket-${ticketId}`, "typing-event", {
      isTyping,
      userType, // 'User' or 'Admin'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pusher typing error:", error);
    return NextResponse.json({ error: "Failed to broadcast" }, { status: 500 });
  }
}