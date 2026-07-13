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
  description:
    "Take a private Juristo AI CLAT mock test or practice quiz with timed questions and performance tracking.",
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

  // Fetch quiz and its questions
  const quizData = await db.query.quiz.findFirst({
    where: eq(quiz.id, id),
  });

  if (!quizData || quizData.userId !== session.user.id) {
    redirect("/clat-exam");
  }

  if (quizData.status === "completed") {
    redirect(`/clat-exam/${id}`); // Redirect to results if already completed
  }

  const questions = await db
    .select()
    .from(quizQuestion)
    .where(eq(quizQuestion.quizId, id));

  return (
    <div
      className="min-h-screen bg-[#eaf3fb] text-slate-950"
      data-clat-test-room="true"
      data-theme="light"
      style={
        {
          colorScheme: "light",
          "--accent": "hsl(240 4.8% 95.9%)",
          "--accent-foreground": "hsl(240 5.9% 10%)",
          "--background": "hsl(0 0% 100%)",
          "--border": "hsl(240 5.9% 90%)",
          "--card": "hsl(0 0% 100%)",
          "--card-foreground": "hsl(240 10% 3.9%)",
          "--foreground": "hsl(240 10% 3.9%)",
          "--input": "hsl(240 5.9% 90%)",
          "--muted": "hsl(240 4.8% 95.9%)",
          "--muted-foreground": "hsl(240 3.8% 46.1%)",
          "--popover": "hsl(0 0% 100%)",
          "--popover-foreground": "hsl(240 10% 3.9%)",
          "--primary": "hsl(240 5.9% 10%)",
          "--primary-foreground": "hsl(0 0% 98%)",
          "--ring": "hsl(240 10% 3.9%)",
          "--secondary": "hsl(240 4.8% 95.9%)",
          "--secondary-foreground": "hsl(240 5.9% 10%)",
        } as CSSProperties
      }
    >
      <QuizSessionClient questions={questions} quiz={quizData} />
    </div>
  );
}
