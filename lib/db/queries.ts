import "server-only";
import "@/lib/server/safe-timeout";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
  contractPurchase,
  type ContractPurchase,
  contractReview,
  type ContractReview,
  ticket,
  type Ticket,
  lawyerContract, // Added for V2 Migration
  juristoTemplate,
  type JuristoTemplate,
  liveChatMessage,
  liveChatSession,
  userActivityEvent,
  userKeywordInsight,
  adminAccessAudit,
} from "./schema";
import { generateHashedPassword } from "./utils";
import * as schema from "./schema";

const client = postgres(process.env.POSTGRES_URL!, {
  connect_timeout: 30,
  idle_timeout: 20,
  max_lifetime: 60 * 10,
});

export const db = drizzle(client, {
  schema,
});

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(
  email: string, 
  password: string,
  firstName?: string,
  lastName?: string,
  phone?: string,
  audience?: string
) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ 
      email, 
      password: hashedPassword,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      audience: audience || null,
    }).returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function createUserFromOAuth(email: string): Promise<User> {
  try {
    const [newUser] = await db
      .insert(user)
      .values({ email, password: null })
      .returning();
    return newUser;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create OAuth user"
    );
  }
}


export async function getUserUsage(userId: string) {
  try {
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));

    if (currentUser) {
      const lastReset = currentUser.lastReset ? new Date(currentUser.lastReset) : null;
      const now = new Date();
      const plan = (currentUser.plan || "free").toLowerCase();
      const currentPeriodEnd = currentUser.currentPeriodEnd
        ? new Date(currentUser.currentPeriodEnd)
        : null;
      const isExpiredNonRenewingPaidPlan =
        plan !== "free" &&
        plan !== "basic" &&
        currentPeriodEnd &&
        currentPeriodEnd <= now &&
        ["cancelled", "past_due", "created"].includes(
          currentUser.subscriptionStatus || ""
        );

      if (isExpiredNonRenewingPaidPlan) {
        const expiredValues = {
          plan: "free" as const,
          subscriptionStatus: "cancelled" as const,
          currentPeriodEnd: null,
          tokensUsed: "0",
          miniTokensUsed: "0",
          macroTokensUsed: "0",
          maxTokensUsed: "0",
          chatCount: "0",
          draftCount: "0",
          analysisCount: "0",
          odrPacketCount: "0",
          lastReset: now,
        };

        await db.update(user).set(expiredValues).where(eq(user.id, userId));
        return {
          ...currentUser,
          ...expiredValues,
        };
      }

      const paidPeriodIsStillOpen =
        plan !== "free" &&
        plan !== "basic" &&
        currentPeriodEnd &&
        currentPeriodEnd > now;
      const shouldReset =
        !paidPeriodIsStillOpen &&
        (!lastReset ||
          now.getFullYear() !== lastReset.getFullYear() ||
          now.getMonth() !== lastReset.getMonth());

      if (shouldReset) {
        const resetValues = {
          tokensUsed: "0",
          miniTokensUsed: "0",
          macroTokensUsed: "0",
          maxTokensUsed: "0",
          chatCount: "0",
          draftCount: "0",
          analysisCount: "0",
          odrPacketCount: "0",
          lastReset: now,
        };

        await db.update(user).set(resetValues).where(eq(user.id, userId));
        return {
          ...currentUser,
          ...resetValues,
        };
      }
    }

    return currentUser;
  } catch {
    try {
      const [legacyUser] = await db
        .select({
          id: user.id,
          email: user.email,
          plan: user.plan,
          tokensUsed: user.tokensUsed,
          chatCount: user.chatCount,
          draftCount: user.draftCount,
          analysisCount: user.analysisCount,
        })
        .from(user)
        .where(eq(user.id, userId));

      return legacyUser
        ? ({
            ...legacyUser,
            password: null,
            firstName: null,
            lastName: null,
            phone: null,
            subscriptionId: null,
            subscriptionStatus: null,
            currentPeriodEnd: null,
            miniTokensUsed: "0",
            macroTokensUsed: "0",
            maxTokensUsed: "0",
            odrPacketCount: "0",
            lastReset: null,
            passwordResetToken: null,
            passwordResetTokenExpiry: null,
            userType: "user",
            onboardingCompleted: false,
            phoneVerified: false,
            workArea: null,
            quizAnnouncementSeen: false,
            audience: null,
          } as User)
        : null;
    } catch {
      return null;
    }
  }
}

export async function updateUserUsage({
  id,
  tokensDiff = 0,
  chatDiff = 0,
  draftDiff = 0,
  analysisDiff = 0,
  odrPacketDiff = 0,
  miniTokensDiff = 0,
  macroTokensDiff = 0,
  maxTokensDiff = 0,
}: {
  id: string;
  tokensDiff?: number;
  chatDiff?: number;
  draftDiff?: number;
  analysisDiff?: number;
  odrPacketDiff?: number;
  miniTokensDiff?: number;
  macroTokensDiff?: number;
  maxTokensDiff?: number;
}) {
  try {
    const [currentUser] = await db
      .select({
        tokensUsed: user.tokensUsed,
        miniTokensUsed: user.miniTokensUsed,
        macroTokensUsed: user.macroTokensUsed,
        maxTokensUsed: user.maxTokensUsed,
        chatCount: user.chatCount,
        draftCount: user.draftCount,
        analysisCount: user.analysisCount,
      })
      .from(user)
      .where(eq(user.id, id));

    if (!currentUser) return;

    const updateValues: Partial<typeof user.$inferInsert> = {
      tokensUsed: String(Number(currentUser.tokensUsed || 0) + tokensDiff),
      miniTokensUsed: String(Number((currentUser as any).miniTokensUsed || 0) + miniTokensDiff),
      macroTokensUsed: String(Number((currentUser as any).macroTokensUsed || 0) + macroTokensDiff),
      maxTokensUsed: String(Number((currentUser as any).maxTokensUsed || 0) + maxTokensDiff),
      chatCount: String(Number(currentUser.chatCount || 0) + chatDiff),
      draftCount: String(Number(currentUser.draftCount || 0) + draftDiff),
      analysisCount: String(Number(currentUser.analysisCount || 0) + analysisDiff),
    };

    if (odrPacketDiff !== 0) {
      const currentOdrUser = await getUserUsage(id);
      updateValues.odrPacketCount = String(
        Number((currentOdrUser as any)?.odrPacketCount || 0) + odrPacketDiff
      );
    }

    await db
      .update(user)
      .set(updateValues)
      .where(eq(user.id, id));
  } catch (error) {
    console.error("Failed to update user usage", error);
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function getChatCountByUserId(userId: string): Promise<number> {
  try {
    const result = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));
    return result.length;
  } catch (error) {
    console.error("Failed to get chat count", error);
    return 0;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // 1. SMART DELETION: Find all documents referenced in this chat's messages
    const chatMessages = await db.select({ parts: message.parts }).from(message).where(eq(message.chatId, id));

    // Convert parts to string to safely regex-extract any generated Document UUIDs
    const partsString = JSON.stringify(chatMessages.map(m => m.parts));
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const referencedUUIDs = [...new Set(partsString.match(uuidRegex) || [])];

    // Delete associated documents from the Vault
    if (referencedUUIDs.length > 0) {
      // @ts-ignore
      await db.delete(document).where(inArray(document.id, referencedUUIDs));
    }

    // 2. Standard Cleanup
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));
    
    // 3. Analytics & Logging Cleanup (THIS FIXES THE CRASH)
    await db.delete(userActivityEvent).where(eq(userActivityEvent.chatId, id));
    await db.delete(userKeywordInsight).where(eq(userKeywordInsight.chatId, id));
    await db.delete(adminAccessAudit).where(eq(adminAccessAudit.chatId, id));

    // 4. Finally, delete the chat itself
    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();

    return chatsDeleted;
  } catch (error) {
    // Pro-tip: Log the actual error here so it doesn't get swallowed as a generic ChatSDKError in the console
    console.error("[DB ERROR] Failed to delete chat by id:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) return { deletedCount: 0 };

    const chatIds = userChats.map((c) => c.id);

    // SMART DELETION: Purge all documents strictly owned by this user
    await db.delete(document).where(eq(document.userId, userId));

    // Standard Cleanup
    // @ts-ignore
    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    // @ts-ignore
    await db.delete(message).where(inArray(message.chatId, chatIds));
    // @ts-ignore
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    // Analytics & Logging Cleanup
    await db.delete(userActivityEvent).where(inArray(userActivityEvent.chatId, chatIds));
    await db.delete(userKeywordInsight).where(inArray(userKeywordInsight.chatId, chatIds));
    await db.delete(adminAccessAudit).where(inArray(adminAccessAudit.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (error) {
    console.error("[DB ERROR] Failed to delete all chats by user id:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentsByUserId({ userId }: { userId: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.userId, userId))
      .orderBy(desc(document.createdAt));

    // Enrich documents with chatId found in messages
    const documentsWithChatId = await Promise.all(
      documents.map(async (doc) => {
        // Find chat where this document ID appears in message parts
        const [msg] = await db
          .select({ chatId: message.chatId })
          .from(message)
          .where(sql`${message.parts}::text LIKE ${`%${doc.id}%`}`)
          .limit(1);

        return {
          ...doc,
          chatId: msg?.chatId,
        };
      })
    );

    return documentsWithChatId;
  } catch (error) {
    console.error("Failed to get documents by user id", error);
    return [];
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function getUserPrompts(userId: string, limit = 100): Promise<string[]> {
  const userChats = await db
    .select({ id: chat.id })
    .from(chat)
    .where(eq(chat.userId, userId));

  if (userChats.length === 0) return [];

  const chatIds = userChats.map((c) => c.id);

  const userMessages = await db
    .select({ parts: message.parts })
    .from(message)
    .where(
      and(
        inArray(message.chatId, chatIds),
        eq(message.role, "user")
      )
    )
    .orderBy(desc(message.createdAt))
    .limit(limit);

  const prompts = userMessages
    .flatMap((m: any) => {
      const parts = Array.isArray(m.parts) ? m.parts : [];
      return parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text);
    })
    .filter((text): text is string => typeof text === "string" && text.length > 3);

  return Array.from(new Set(prompts));
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        // @ts-ignore
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        // @ts-ignore
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update title for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({
        id: streamId,
        chatId,
        // Use .toISOString() to match the new string-mode timestamp requirement
        createdAt: new Date().toISOString()
      });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getContractsByCategory(category?: string) {
  if (!category || category === "all") {
    return await db.select().from(lawyerContract).where(eq(lawyerContract.status, "published")).orderBy(desc(lawyerContract.createdAt));
  }
  return await db.select().from(lawyerContract).where(and(eq(lawyerContract.status, "published"), eq(lawyerContract.category, category))).orderBy(desc(lawyerContract.createdAt));
}

export async function getContractBySlug(slug: string) {
  const [contract] = await db.select().from(lawyerContract).where(eq(lawyerContract.slug, slug));
  return contract || null;
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

// Contract Purchase Queries
export async function getContractPurchase({
  userId,
  contractSlug,
}: {
  userId: string;
  contractSlug: string;
}): Promise<ContractPurchase | null> {
  try {
    const [purchase] = await db
      .select()
      .from(contractPurchase)
      .where(
        and(
          eq(contractPurchase.userId, userId),
          eq(contractPurchase.contractSlug, contractSlug),
          eq(contractPurchase.paymentStatus, "completed")
        )
      );
    return purchase || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get contract purchase"
    );
  }
}

export async function getContractPurchasesByUserId({
  userId,
}: {
  userId: string;
}): Promise<ContractPurchase[]> {
  try {
    return await db
      .select()
      .from(contractPurchase)
      .where(
        and(
          eq(contractPurchase.userId, userId)
        )
      )
      .orderBy(desc(contractPurchase.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get contract purchases by user id"
    );
  }
}

export async function createContractPurchase({
  userId,
  userEmail,
  contractSlug,
  contractName,
  contractId,
  tier,
  price,
  paymentId,
}: {
  userId: string;
  userEmail: string;
  contractSlug: string;
  contractName: string;
  contractId?: string;
  tier: "ready-made" | "ai-generated" | "lawyer-vetted";
  price: string;
  paymentId: string;
}): Promise<ContractPurchase> {
  try {
    const [purchase] = await db
      .insert(contractPurchase)
      .values({
        userId,
        userEmail,
        contractSlug,
        contractName,
        contractId: contractId || contractSlug,
        tier,
        price,
        paymentId,
        paymentStatus: "pending",
      })
      .returning();
    return purchase;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create contract purchase"
    );
  }
}

export async function updateContractPurchaseStatus({
  id,
  paymentStatus,
  razorpayOrderId,
  razorpayPaymentId,
}: {
  id: string;
  paymentStatus: "pending" | "completed" | "failed" | "cancelled";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}): Promise<ContractPurchase | null> {
  try {
    const updateData: Record<string, string> = { paymentStatus };
    if (razorpayOrderId) updateData.razorpayOrderId = razorpayOrderId;
    if (razorpayPaymentId) updateData.razorpayPaymentId = razorpayPaymentId;

    const [purchase] = await db
      .update(contractPurchase)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(contractPurchase.id, id))
      .returning();
    return purchase || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update contract purchase status"
    );
  }
}

export async function getContractPurchaseById({
  id,
}: {
  id: string;
}): Promise<ContractPurchase | null> {
  try {
    const [purchase] = await db
      .select()
      .from(contractPurchase)
      .where(eq(contractPurchase.id, id));
    return purchase || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get contract purchase by id"
    );
  }
}

// Contract Review Queries
export async function getContractReviews({
  contractSlug,
}: {
  contractSlug: string;
}): Promise<ContractReview[]> {
  try {
    return await db
      .select()
      .from(contractReview)
      .where(eq(contractReview.contractSlug, contractSlug))
      .orderBy(desc(contractReview.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get contract reviews"
    );
  }
}

export async function createContractReview({
  contractSlug,
  userId,
  userName,
  userEmail,
  rating,
  comment,
}: {
  contractSlug: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: string;
  comment: string;
}): Promise<ContractReview> {
  try {
    const [review] = await db
      .insert(contractReview)
      .values({
        contractSlug,
        userId,
        userName,
        userEmail,
        rating,
        comment,
      })
      .returning();
    return review;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create contract review"
    );
  }
}

export async function getUserContractReview({
  contractSlug,
  userId,
}: {
  contractSlug: string;
  userId: string;
}): Promise<ContractReview | null> {
  try {
    const [review] = await db
      .select()
      .from(contractReview)
      .where(
        and(
          eq(contractReview.contractSlug, contractSlug),
          eq(contractReview.userId, userId)
        )
      );
    return review || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user contract review"
    );
  }
}

export async function getUserById({ id }: { id: string }): Promise<User | null> {
  try {
    const [foundUser] = await db.select().from(user).where(eq(user.id, id));
    return foundUser || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get user by id");
  }
}

// Ticket Queries
export async function createTicket({
  userId,
  userEmail,
  subject,
  description,
  category,
  priority,
}: {
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  category: "bug" | "feature" | "billing" | "general";
  priority: "low" | "medium" | "high";
}): Promise<Ticket> {
  try {
    const [newTicket] = await db
      .insert(ticket)
      .values({
        userId,
        userEmail,
        subject,
        description,
        category,
        priority,
      })
      .returning();
    return newTicket;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create ticket"
    );
  }
}

export async function getTicketsByUserId({
  userId,
  limit = 20,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<Ticket[]> {
  try {
    return await db
      .select()
      .from(ticket)
      .where(eq(ticket.userId, userId))
      .orderBy(desc(ticket.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("[DB ERROR] getTicketsByUserId:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get tickets by user id"
    );
  }
}

export async function deleteMessagesByChatIdAndMessageId({
  chatId,
  messageId,
}: {
  chatId: string;
  messageId: string;
}) {
  try {
    await db.delete(message)
      .where(
        and(
          eq(message.chatId, chatId),
          eq(message.id, messageId)
        )
      );
  } catch (error) {
    console.error("Failed to delete message:", error);
    throw error;
  }
}

// --- Juristo Template Queries ---

export async function searchJuristoTemplates(query: string, state?: string) {
  try {
    const searchPattern = `%${query.replace(/\s+/g, "%")}%`;
    const conditions: SQL[] = [
      eq(juristoTemplate.isActive, true),
      sql`(${juristoTemplate.name} ILIKE ${searchPattern} OR ${juristoTemplate.category} ILIKE ${searchPattern} OR ${juristoTemplate.slug} ILIKE ${searchPattern})`,
    ];
    if (state) {
      const statePattern = `%${state}%`;
      conditions.push(
        sql`(${juristoTemplate.state} ILIKE ${statePattern} OR ${juristoTemplate.state} = 'Pan-India')`
      );
    }
    return await db
      .select()
      .from(juristoTemplate)
      .where(and(...conditions))
      .orderBy(desc(juristoTemplate.updatedAt))
      .limit(5);
  } catch (error) {
    console.error("[DB] searchJuristoTemplates error:", error);
    return [];
  }
}

export async function getJuristoTemplateBySlug(slug: string): Promise<JuristoTemplate | null> {
  try {
    const [template] = await db
      .select()
      .from(juristoTemplate)
      .where(and(eq(juristoTemplate.slug, slug), eq(juristoTemplate.isActive, true)));
    return template || null;
  } catch (error) {
    console.error("[DB] getJuristoTemplateBySlug error:", error);
    return null;
  }
}

export async function getJuristoTemplatesByCategory(category: string): Promise<JuristoTemplate[]> {
  try {
    return await db
      .select()
      .from(juristoTemplate)
      .where(and(eq(juristoTemplate.category, category), eq(juristoTemplate.isActive, true)))
      .orderBy(asc(juristoTemplate.state));
  } catch (error) {
    console.error("[DB] getJuristoTemplatesByCategory error:", error);
    return [];
  }
}

// ----------------------------------------------------------------------
// Live Chat Ecosystem Queries
// ----------------------------------------------------------------------

/**
 * Fetches a specific live chat session by ID
 */
export async function getLiveChatSessionById(id: string) {
  try {
    const [session] = await db
      .select()
      .from(liveChatSession)
      .where(eq(liveChatSession.id, id));
    return session || null;
  } catch (error) {
    console.error("[DB] getLiveChatSessionById error:", error);
    return null;
  }
}

/**
 * Fetches all messages for a specific live chat session
 */
export async function getLiveChatMessages(sessionId: string) {
  try {
    return await db
      .select()
      .from(liveChatMessage)
      .where(eq(liveChatMessage.sessionId, sessionId))
      .orderBy(asc(liveChatMessage.createdAt));
  } catch (error) {
    console.error("[DB] getLiveChatMessages error:", error);
    return [];
  }
}

/**
 * Fetches all live chat sessions for a specific user (for their history)
 */
export async function getLiveChatSessionsByUserId(userId: string) {
  try {
    return await db
      .select()
      .from(liveChatSession)
      .where(eq(liveChatSession.userId, userId))
      .orderBy(desc(liveChatSession.createdAt));
  } catch (error) {
    console.error("[DB] getLiveChatSessionsByUserId error:", error);
    return [];
  }
}

// ----------------------------------------------------------------------
// User Activity & Analytics Queries (Admin)
// ----------------------------------------------------------------------

export async function getUserActivityEvents(userId: string, limit = 50) {
  try {
    return await db
      .select()
      .from(userActivityEvent)
      .where(eq(userActivityEvent.userId, userId))
      .orderBy(desc(userActivityEvent.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[DB] getUserActivityEvents error:", error);
    return [];
  }
}

export async function getUserTopKeywords(userId: string, limit = 10) {
  try {
    return await db
      .select()
      .from(userKeywordInsight)
      .where(eq(userKeywordInsight.userId, userId))
      .orderBy(desc(userKeywordInsight.count))
      .limit(limit);
  } catch (error) {
    console.error("[DB] getUserTopKeywords error:", error);
    return [];
  }
}

export async function getGlobalKeywordStats(limit = 20) {
  try {
    const results = await db
      .select({
        keyword: userKeywordInsight.keywordKey,
        totalUses: sql<number>`SUM(${userKeywordInsight.count})`,
        uniqueUsers: count(userKeywordInsight.userId),
      })
      .from(userKeywordInsight)
      .groupBy(userKeywordInsight.keywordKey)
      .orderBy(desc(sql<number>`SUM(${userKeywordInsight.count})`))
      .limit(limit);
    return results;
  } catch (error) {
    console.error("[DB] getGlobalKeywordStats error:", error);
    return [];
  }
}

export async function getActivityVolumeByDay(days = 14) {
  try {
    const results = await db
      .select({
        date: sql<string>`DATE(${userActivityEvent.createdAt})`,
        count: count(userActivityEvent.id),
      })
      .from(userActivityEvent)
      .where(sql`${userActivityEvent.createdAt} >= NOW() - INTERVAL '${days} days'`)
      .groupBy(sql`DATE(${userActivityEvent.createdAt})`)
      .orderBy(asc(sql`DATE(${userActivityEvent.createdAt})`));
    return results;
  } catch (error) {
    console.error("[DB] getActivityVolumeByDay error:", error);
    return [];
  }
}
