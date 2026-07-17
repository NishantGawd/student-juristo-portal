import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { quiz, quizQuestion } from "@/lib/db/schema";
import { createPageMetadata } from "@/lib/seo";
import { QuizSessionClient } from "./quiz-session-client";

export const metadata: Metadata = createPageMetadata({
  title: "Take CLAT Mock Test",
  description: "Take a private Juristo AI CLAT mock test or practice quiz with timed questions and performance tracking.",
  path: "/clat-exam/take",
  noIndex: true,
});

export default async function QuizSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const quizData = await db.query.quiz.findFirst({
    where: eq(quiz.id, id),
  });

  if (!quizData || quizData.userId !== session.user.id) {
    redirect("/clat-exam");
  }

  if (quizData.status === "completed") {
    redirect(`/clat-exam/${id}`);
  }

  const questions = await db
    .select()
    .from(quizQuestion)
    .where(eq(quizQuestion.quizId, id));

  return (
    <div
      className="min-h-screen bg-zinc-50 dark:bg-[#080D1A] text-zinc-900 dark:text-zinc-100"
      data-clat-test-room="true"
      style={
        {
          colorScheme: "light dark",
          "--background": "transparent",
          "--border": "hsl(240 5.9% 90%)",
        } as CSSProperties
      }
    >
      <QuizSessionClient questions={questions} quiz={quizData} />
    </div>
  );
}