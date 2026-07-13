import { auth } from "@/app/(auth)/auth";
import { deleteMessagesByChatIdAndMessageId } from "@/lib/db/queries";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { chatId, messageId } = await req.json();

    if (!chatId || !messageId) {
      return new Response("Missing parameters", { status: 400 });
    }

    // Completely delete the bad assistant message from the DB
    await deleteMessagesByChatIdAndMessageId({
      chatId,
      messageId,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Regeneration DB Cleanup Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}