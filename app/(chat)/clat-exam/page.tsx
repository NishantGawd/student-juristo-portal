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

// Helper function to ensure slow connections don't block render execution loops
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  });
}

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

  // Wrapped Data Engine Core: If database stalls over 4 seconds, break loop and load dashboard
  const dbDataResult = await withTimeout(
    Promise.all([
      db.select().from(quiz).where(eq(quiz.userId, session.user.id)).orderBy(desc(quiz.createdAt)).limit(100),
      db.select().from(examProfile).where(eq(examProfile.userId, session.user.id)).limit(1),
      db.select().from(examUpdate).orderBy(desc(examUpdate.createdAt)).limit(1),
      getUserUsage(session.user.id)
    ]),
    4000, // 4 Second Maximum Latency Ceiling Threshold
    [[], [], [], {
      plan: "free",
      id: "",
      email: "",
      password: null,
      firstName: null,
      lastName: null,
      phone: null,
      subscriptionId: null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      tokensUsed: null,
      miniTokensUsed: null,
      macroTokensUsed: null,
      maxTokensUsed: null,
      chatCount: null,
      draftCount: null,
      analysisCount: null,
      odrPacketCount: null,
      lastReset: null,
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
      userType: null,
      onboardingCompleted: null,
      phoneVerified: null,
      workArea: null,
      quizAnnouncementSeen: null,
      audience: null
    }] // Immediate runtime hydration defaults if database drops
  );

  const pastQuizzes = dbDataResult[0];
  const profile = dbDataResult[1][0] || null;
  const latestUpdate = dbDataResult[2][0] || null;
  const userUsage = dbDataResult[3];

  let activeMentorChatId: string;
  let initialMessages: any[] = [];

  try {
    if (queryChatId && typeof queryChatId === "string") {
      activeMentorChatId = queryChatId;
      const dbMessages = await getMessagesByChatId({ id: activeMentorChatId });
      initialMessages = convertToUIMessages(dbMessages);
    } else {
      const [existingMentorChat] = await db
        .select()
        .from(chat)
        .where(and(eq(chat.userId, session.user.id), eq(chat.title, "CLAT AI Mentor")))
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
  } catch {
    activeMentorChatId = generateUUID();
  }

  return (
    <div className="flex h-[calc(100vh)] w-full overflow-hidden bg-background">
      <QuizHubClient
        initialMessages={initialMessages}
        initialTab={(tab as string) || "dashboard"}
        latestUpdate={latestUpdate}
        mentorChatId={activeMentorChatId}
        pastQuizzes={pastQuizzes}
        profile={profile}
        userPlan={userUsage?.plan || "free"}
      />
    </div>
  );
}