import "server-only";
import { headers } from "next/headers";

import { userActivityEvent, userKeywordInsight } from "@/lib/db/schema";
import { db } from "@/lib/db/queries";

type TrackActivityInput = {
  userId: string;
  chatId?: string | null;
  messageId?: string | null;
  eventType: string;
  sourceTable: string;
  sourceId: string;
  sourceKey?: string;
  userPlan?: string | null;
  model?: string | null;
  textPreview?: string | null;
  keywords?: string[];
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
};

function buildSourceKey(input: TrackActivityInput) {
  return (
    input.sourceKey ||
    `${input.sourceTable}:${input.sourceId}:${input.eventType}`
  );
}

function buildKeywordKey({
  userId,
  chatId,
  sourceId,
  keyword,
}: {
  userId: string;
  chatId?: string | null;
  sourceId: string;
  keyword: string;
}) {
  return [userId, chatId || "global", sourceId, keyword].join(":");
}

export async function trackUserActivity(input: TrackActivityInput) {
  try {
    const occurredAt = input.occurredAt || new Date();
    const sourceKey = buildSourceKey(input);
    const keywords = Array.from(new Set(input.keywords || [])).slice(0, 20);
    
    // Safely attempt to read Cloudflare country header
    let country: string | null = null;
    try {
      const headersList = await headers();
      country = headersList.get("cf-ipcountry") || null;
    } catch (e) {
      // headers() throws if called outside a request context
    }

    await db
      .insert(userActivityEvent)
      .values({
        userId: input.userId,
        chatId: input.chatId || null,
        messageId: input.messageId || null,
        eventType: input.eventType,
        sourceTable: input.sourceTable,
        sourceId: input.sourceId,
        sourceKey,
        userPlan: input.userPlan || null,
        model: input.model || null,
        textPreview: input.textPreview || null,
        keywords,
        metadata: input.metadata || null,
        country,
        occurredAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userActivityEvent.sourceKey,
        set: {
          userPlan: input.userPlan || null,
          model: input.model || null,
          textPreview: input.textPreview || null,
          keywords,
          metadata: input.metadata || null,
          country,
          occurredAt,
          updatedAt: new Date(),
        },
      });

    if (keywords.length === 0) return;

    await Promise.all(
      keywords.map((keyword) =>
        db
          .insert(userKeywordInsight)
          .values({
            keywordKey: buildKeywordKey({
              userId: input.userId,
              chatId: input.chatId,
              sourceId: input.messageId || input.sourceId,
              keyword,
            }),
            userId: input.userId,
            chatId: input.chatId || null,
            messageId: input.messageId || null,
            keyword,
            source: input.eventType,
            count: 1,
            firstUsedAt: occurredAt,
            lastUsedAt: occurredAt,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: userKeywordInsight.keywordKey,
            set: {
              lastUsedAt: occurredAt,
              updatedAt: new Date(),
            },
          })
      )
    );
  } catch (error) {
    console.warn("[Activity] Failed to track user activity", {
      eventType: input.eventType,
      sourceTable: input.sourceTable,
      sourceId: input.sourceId,
      error,
    });
  }
}
