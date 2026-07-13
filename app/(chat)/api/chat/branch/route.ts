import { NextResponse } from "next/server";
import { db } from "@/lib/db/queries"; 
import { chat, message } from "@/lib/db/schema"; 
import { eq, asc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const { originalChatId, messageId } = await req.json();

    if (!originalChatId || !messageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch the original chat
    const [originalChat] = await db.select()
      .from(chat)
      .where(eq(chat.id, originalChatId))
      .limit(1);

    if (!originalChat) {
      return NextResponse.json({ error: "Original chat not found" }, { status: 404 });
    }

    // 2. Fetch all messages in the thread
    const allMessages = await db.select()
      .from(message)
      .where(eq(message.chatId, originalChatId))
      .orderBy(asc(message.createdAt));

    // 3. Find target index for the branch
    const targetIndex = allMessages.findIndex((msg) => msg.id === messageId);
    if (targetIndex === -1) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const messagesToCopy = allMessages.slice(0, targetIndex + 1);
    const newChatId = generateUUID();

    // 4. Create the new branched chat record
    await db.insert(chat).values({
      id: newChatId,
      userId: originalChat.userId,
      title: `${originalChat.title} (Branch)`,
      visibility: originalChat.visibility,
      createdAt: new Date(),
    });

    // 5. THE FIX: Map messages to match your schema exactly
    const newMessages = messagesToCopy.map((msg) => ({
      id: generateUUID(),
      chatId: newChatId,
      role: msg.role,
      // Use 'parts' if 'content' is missing, and provide an empty array for attachments
      parts: (msg as any).parts || [],
      attachments: (msg as any).attachments || [], 
      createdAt: new Date(),
    }));

    if (newMessages.length > 0) {
      await db.insert(message).values(newMessages);
    }

    return NextResponse.json({ newChatId }, { status: 200 });

  } catch (error) {
    console.error("[BRANCH_CHAT_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}