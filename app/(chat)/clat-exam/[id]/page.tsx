import { eq } from "drizzle-orm";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  MinusCircle,
  Target,
  Timer,
  XCircle,
  FileText,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { quiz, quizQuestion } from "@/lib/db/schema";
import { createPageMetadata } from "@/lib/seo";
import {
  calculateClatScore,
  formatClatScore,
  splitPassageQuestion,
  stripQuestionSection,
} from "../clat-config";

export const metadata: Metadata = createPageMetadata({
  title: "CLAT Test Results",
  description:
    "View private Juristo AI CLAT mock test results, section analysis, score summary, and answer review.",
  path: "/clat-exam/results",
  noIndex: true,
});

export default async function QuizResultsPage({
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

  if (quizData.status !== "completed") {
    redirect(`/clat-exam/${id}/take`);
  }

  const questions = await db
    .select()
    .from(quizQuestion)
    .where(eq(quizQuestion.quizId, id));

  const scoreSummary = calculateClatScore(
    questions.map((question) => ({
      question: question.question,
      section: quizData.subject,
      userAnswer: question.userAnswer,
      correctAnswer: question.correctAnswer,
    }))
  );

  const totalSeconds = questions.reduce(
    (acc, question) => acc + (question.timeTaken || 0),
    0
  );
  const totalTimeStr = `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;

  return (
    <div className="w-full px-6 py-8 space-y-12 animate-in fade-in duration-300 text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── TOP CONTROL NAVIGATION STRIP (Sharp, High-Contrast) ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 dark:border-white/5 pb-6 select-none">
        <Link href="/clat-exam?tab=reports" className="ml-12 md:ml-14">
          <button className="h-10 px-4 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-medium text-xs uppercase tracking-wider transition-colors rounded-none flex items-center gap-2 cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Reports
          </button>
        </Link>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] font-bold">
          <Badge className="rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-2.5 py-1" variant="secondary">
            {quizData.quizType}
          </Badge>
          <Badge className="rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-2.5 py-1" variant="outline">
            {quizData.totalQuestions} Questions
          </Badge>
          <Badge className="rounded-none border border-[#4169E1]/20 bg-[#4169E1]/10 text-[#4169E1] uppercase tracking-wider px-2.5 py-1" variant="outline">
            CLAT Scoring Index
          </Badge>
          {quizData.documentUrl && (
            <Button asChild className="h-9 rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 font-medium text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 shadow-none cursor-pointer" variant="outline">
              <a href={quizData.documentUrl} rel="noreferrer" target="_blank">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Source PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* ─── EXECUTIVE SUITE TITLE HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 select-none">
        <div className="space-y-1.5 text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-serif">
            {quizData.title}
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-4xl font-normal leading-relaxed">
            Ecosystem metrics audit trace verified. System parameters apply +1.0 for validated items, -0.25 for incorrect variations, and 0.00 for skipped configurations.
          </p>
        </div>
      </div>

      {/* ─── UNIFIED PERFORMANCE TELEMETRY & BREAKDOWN MATRIX (Sharp Bento Box Grid) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">

        {/* Core Telemetry Display Cards Deck (Takes 8/12 Columns) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4 items-shadow-none">

          {/* Core Metric 1: Net Score */}
          <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-[#4169E1]" />
            <div className="flex flex-col items-center justify-center gap-2 p-5 text-center h-full min-h-[120px]">
              <Award className="h-4.5 w-4.5 text-[#4169E1]" />
              <div className="font-bold text-3xl text-zinc-900 dark:text-white tracking-tight font-mono leading-none">
                {formatClatScore(scoreSummary.netScore)}
              </div>
              <div className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mt-1">
                CLAT Net Score
              </div>
            </div>
          </Card>

          {/* Core Metric 2: Accuracy */}
          <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-emerald-500" />
            <div className="flex flex-col items-center justify-center gap-2 p-5 text-center h-full min-h-[120px]">
              <Target className="h-4.5 w-4.5 text-emerald-500" />
              <div className="font-bold text-3xl text-emerald-500 tracking-tight font-mono leading-none">
                {scoreSummary.accuracy}%
              </div>
              <div className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mt-1">
                Attempt Accuracy
              </div>
            </div>
          </Card>

          {/* Core Metric 3: Errors */}
          <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-red-500" />
            <div className="flex flex-col items-center justify-center gap-2 p-5 text-center h-full min-h-[120px]">
              <XCircle className="h-4.5 w-4.5 text-red-500" />
              <div className="font-bold text-3xl text-red-500 tracking-tight font-mono leading-none">
                {scoreSummary.wrong}
              </div>
              <div className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mt-1">
                Wrong Answers
              </div>
            </div>
          </Card>

          {/* Core Metric 4: Runtime Interval */}
          <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-amber-500" />
            <div className="flex flex-col items-center justify-center gap-2 p-5 text-center h-full min-h-[120px]">
              <Clock className="h-4.5 w-4.5 text-amber-500" />
              <div className="font-bold text-2xl text-zinc-800 dark:text-zinc-200 tracking-tight font-mono leading-none">
                {totalTimeStr}
              </div>
              <div className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mt-1">
                Time Recorded
              </div>
            </div>
          </Card>

        </div>

        {/* Balanced Sectional Matrix Panel (Takes 4/12 Columns Side-by-Side) */}
        <Card className="lg:col-span-4 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none flex flex-col justify-between p-5 text-left">
          <div className="w-full space-y-3 flex-1 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block border-b border-zinc-100 dark:border-white/5 pb-2">
              Sectional Breakdown Analytics
            </span>

            <div className="space-y-4 flex-1 overflow-y-auto max-h-[240px] pr-1 pt-1 scrollbar-hide">
              {scoreSummary.sections.map((section) => (
                <div key={section.name} className="space-y-2">
                  <div className="flex items-center justify-between font-semibold text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider block max-w-[170px] truncate">
                      {section.name}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-zinc-800 dark:text-zinc-100">
                        {formatClatScore(section.netScore)}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold">
                        ({section.accuracy}%)
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-none overflow-hidden">
                    <Progress className="h-full bg-[#4169E1] transition-all rounded-none" value={section.accuracy} />
                  </div>

                  <p className="text-zinc-400 dark:text-zinc-500 font-mono font-bold text-[9px] select-none text-right uppercase tracking-wider">
                    {section.correct} C • {section.wrong} W • {section.unanswered} S
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ─── DEEP ANALYTICAL QUESTION REVIEW MODULE ─── */}
      <div className="space-y-3 w-full mt-2">
        <div className="space-y-1.5 border-b border-zinc-100 dark:border-white/5 pb-2 select-none text-left">
          <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">
            Structural Question Review Ledger
          </span>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-normal">
            Audit context text matrices, evaluate variant option paths, and review system analysis explanations.
          </p>
        </div>

        <div className="space-y-5 w-full">
          {questions.map((question, index) => {
            const stripped = stripQuestionSection(
              question.question,
              quizData.subject
            );
            const parsed = splitPassageQuestion(stripped.question);
            const isUnanswered = !question.userAnswer;
            const isCorrect = Boolean(
              question.userAnswer &&
              question.userAnswer === question.correctAnswer
            );
            const options = Array.isArray(question.options)
              ? (question.options as string[])
              : [];

            return (
              <Card
                className={[
                  "border bg-white dark:bg-[#0C1222] rounded-none shadow-none overflow-hidden transition-colors duration-200",
                  isCorrect
                    ? "border-zinc-200 dark:border-white/5 border-l-2 border-l-emerald-500"
                    : isUnanswered
                      ? "border-zinc-200 dark:border-white/5 border-l-2 border-l-zinc-400 dark:border-l-zinc-600"
                      : "border-zinc-200 dark:border-white/5 border-l-2 border-l-red-500"
                ].join(" ")}
                key={question.id}
              >

                {/* Question Row Sub-Header */}
                <CardHeader className="border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 px-5 py-4 text-left">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between w-full">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 shrink-0">
                        {isCorrect ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                        ) : isUnanswered ? (
                          <MinusCircle className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-red-500" />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 select-none font-mono text-[9px] font-bold">
                          <Badge className="rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-500 dark:text-zinc-400 px-2 py-0.5" variant="outline">Q{index + 1}</Badge>
                          <Badge className="rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-500 dark:text-zinc-400 px-2 py-0.5" variant="secondary">{stripped.section}</Badge>
                        </div>
                        <CardTitle className="text-base font-bold leading-relaxed text-zinc-800 dark:text-zinc-200 tracking-tight font-serif">
                          {parsed.question}
                        </CardTitle>
                      </div>
                    </div>

                    {question.timeTaken !== null &&
                      question.timeTaken !== undefined && (
                        <div className="flex items-center gap-1.5 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] px-2.5 py-1 font-bold font-mono text-zinc-400 dark:text-zinc-500 text-[10px] shrink-0 uppercase select-none leading-none h-6">
                          <Timer className="h-3 w-3" />
                          {question.timeTaken}s
                        </div>
                      )}
                  </div>
                </CardHeader>

                {/* Main Body Passage Block & Option Stack */}
                <CardContent className="space-y-5 p-5 xl:p-6 w-full text-left">
                  {parsed.passage && (
                    <div className="max-h-[260px] overflow-y-auto border border-zinc-200/60 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 p-4 text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-normal scrollbar-hide">
                      <p className="mb-2 font-bold text-zinc-400 dark:text-zinc-500 text-[9px] uppercase tracking-widest block select-none">
                        {parsed.label} Matrix
                      </p>
                      <p className="whitespace-pre-line font-serif leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {parsed.passage}
                      </p>
                    </div>
                  )}

                  {/* Multiple Choice Layout Stack */}
                  <div className="grid gap-2 w-full">
                    {options.map((option, optionIndex) => {
                      const selected = option === question.userAnswer;
                      const actualCorrect = option === question.correctAnswer;

                      return (
                        <div
                          className={[
                            "flex items-center gap-3.5 border p-3.5 text-xs transition-colors rounded-none",
                            actualCorrect
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-bold"
                              : selected
                                ? "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300 font-bold"
                                : "border-zinc-200 dark:border-white/5 bg-zinc-50/30 dark:bg-[#080D1A]/20 text-zinc-600 dark:text-zinc-400",
                          ].join(" ")}
                          key={`${question.id}-${option}`}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] font-bold text-[10px] font-mono select-none text-zinc-800 dark:text-zinc-200 rounded-none">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="flex-1 leading-relaxed font-medium">{option}</span>

                          {actualCorrect && (
                            <Badge className="rounded-none border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 shadow-none" variant="secondary">
                              Correct Variant
                            </Badge>
                          )}
                          {selected && (
                            <Badge className="rounded-none border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-[#080D1A] text-zinc-500 dark:text-zinc-400 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 shadow-none" variant="outline">
                              Your Selection
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Premium Logic Explanation Boundary Display Box */}
                  <div className="border border-zinc-200/60 dark:border-white/5 bg-zinc-50/30 dark:bg-black/20 p-4 text-xs leading-relaxed rounded-none">
                    <span className="mb-1 font-bold text-[9px] uppercase tracking-widest text-[#4169E1] block select-none">
                      Analytical Logic Explanation
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
                      {question.explanation}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}