"use server";

import { generateText } from "ai";
import { revalidatePath } from "next/cache";
import type { VisibilityType } from "@/components/visibility-selector";
import { getTitleModel } from "@/lib/ai/providers";
import {
  deleteChatById as deleteChatFromDb,
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

export async function generateTitleFromUserMessage({
  message,
}: {
  message: ChatMessage;
}) {
  const { text } = await generateText({
    model: getTitleModel(),
    system: `\n
      - you will generate a short title based on the first message a user begins a chat with
      - prevent it from being longer than 3 words
      - try not to use quotation marks
      - use the language of the message (English or Turkish)`,
    prompt: `Generate a title for this message: ${JSON.stringify(message.parts)}`,
  });

  return text;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  if (!message) {
    return;
  }

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });

  revalidatePath("/");
}

export async function serverUpdateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisibilityById({ chatId, visibility });
  revalidatePath("/");
}

export async function deleteChatById({ id }: { id: string }) {
  await deleteChatFromDb({ id });
  revalidatePath("/");
}
