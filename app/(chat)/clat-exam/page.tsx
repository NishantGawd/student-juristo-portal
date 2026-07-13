import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { getMessagesByChatId, getUserUsage } from "@/lib/db/queries";
import { chat, examProfile, examUpdate, quiz } from "@/lib/db/schema";
import { createPageMetadata } from "@/lib/seo";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { QuizHubClient } from "./quiz-hub-client";

export const metadata: Metadata = createPageMetadata({
  title: "CLAT Exam Prep OS",
  description: "Prepare for CLAT with Juristo AI mock tests, analytics, AI mentoring, and a personalized roadmap.",
  path: "/clat-exam",
  noIndex: true,
});

export default async function QuizHubPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const tab = resolvedParams.tab;
  const queryChatId = resolvedParams.chatId;

  // Fetch structural dependencies
  const pastQuizzes = await db
    .select()
    .from(quiz)
    .where(eq(quiz.userId, session.user.id))
    .orderBy(desc(quiz.createdAt))
    .limit(100);

  const [profile] = await db
    .select()
    .from(examProfile)
    .where(eq(examProfile.userId, session.user.id))
    .limit(1);

  const [latestUpdate] = await db
    .select()
    .from(examUpdate)
    .orderBy(desc(examUpdate.createdAt))
    .limit(1);

  const userUsage = await getUserUsage(session.user.id);

  let activeMentorChatId: string;
  let initialMessages: any[] = [];

  // Logic Shift: If the user clicked a specific item from the history sidebar, target it directly
  if (queryChatId && typeof queryChatId === "string") {
    activeMentorChatId = queryChatId;
    const dbMessages = await getMessagesByChatId({ id: activeMentorChatId });
    initialMessages = convertToUIMessages(dbMessages);
  } else {
    // Standard Fallback: Find the latest generalized AI Mentor instance
    const [existingMentorChat] = await db
      .select()
      .from(chat)
      .where(
        and(eq(chat.userId, session.user.id), eq(chat.title, "CLAT AI Mentor"))
      )
      .orderBy(desc(chat.createdAt))
      .limit(1);

    if (existingMentorChat) {
      activeMentorChatId = existingMentorChat.id;
      const dbMessages = await getMessagesByChatId({ id: activeMentorChatId });
      initialMessages = convertToUIMessages(dbMessages);
    } else {
      activeMentorChatId = generateUUID();
      await db.insert(chat).values({
        id: activeMentorChatId,
        createdAt: new Date(),
        userId: session.user.id,
        title: "CLAT AI Mentor",
        visibility: "private",
      });
    }
  }

  return (
    <div className="flex h-[calc(100vh)] w-full overflow-hidden bg-background">
      <QuizHubClient
        initialMessages={initialMessages}
        initialTab={(tab as string) || "dashboard"}
        latestUpdate={latestUpdate || null}
        mentorChatId={activeMentorChatId}
        pastQuizzes={pastQuizzes}
        profile={profile || null}
        userPlan={userUsage?.plan || "free"}
      />
    </div>
  );
}