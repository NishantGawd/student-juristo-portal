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
  HelpCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8 text-zinc-900 dark:text-zinc-100 select-none">

      {/* ─── TOP CONTROL NAVIGATION STRIP ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/60 dark:border-white/5 pb-4.5">
        <Link href="/clat-exam?tab=reports">
          <Button className="gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-all h-9 px-3 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A]" variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 font-bold px-2.5 py-0.5 uppercase tracking-wide text-[10px]" variant="secondary">
            {quizData.quizType}
          </Badge>
          <Badge className="rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 font-bold px-2.5 py-0.5 uppercase tracking-wide text-[10px]" variant="outline">
            {quizData.totalQuestions} Questions
          </Badge>
          <Badge className="rounded-md border border-[#4169E1]/20 bg-[#4169E1]/10 text-[#4169E1] font-bold px-2.5 py-0.5 uppercase tracking-wide text-[10px]" variant="outline">
            CLAT Scoring Index
          </Badge>
          {quizData.documentUrl && (
            <Button asChild size="sm" className="h-7.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 font-bold text-xs" variant="outline">
              <a href={quizData.documentUrl} rel="noreferrer" target="_blank">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Source PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* ─── EXECUTIVE SUITE HERO BLOCK ─── */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A]/40 backdrop-blur-md relative">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#4169E1]/5 to-transparent pointer-events-none" />
        <div className="p-6 md:p-8 relative z-10 space-y-1.5">
          <h1 className="font-black text-2xl md:text-3xl tracking-tight text-zinc-900 dark:text-white">
            {quizData.title}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal">
            Ecosystem metrics audit trace verified. Parameter values apply +1.0 for validated items, -0.25 for incorrect entries, and 0.00 for skipped configurations.
          </p>
        </div>
      </section>

      {/* ─── UNIFIED PERFORMANCE TELEMETRY & BREAKDOWN MATRIX (Zero-Whitespace Bento Layout) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">

        {/* Core Telemetry Cards Deck (Takes 8/12 Columns) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">

          {/* Core Metric 1: Net Score */}
          <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 shadow-xs rounded-2xl overflow-hidden relative group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#4169E1]" />
            <CardContent className="flex flex-col items-center justify-center gap-1.5 p-5 text-center h-full">
              <Award className="h-5 w-5 text-[#4169E1] fill-[#4169E1]/5" />
              <div className="font-black text-3xl text-zinc-900 dark:text-white tracking-tight font-mono">
                {formatClatScore(scoreSummary.netScore)}
              </div>
              <div className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">
                CLAT Net Score
              </div>
            </CardContent>
          </Card>

          {/* Core Metric 2: Accuracy */}
          <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 shadow-xs rounded-2xl overflow-hidden relative group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-emerald-500" />
            <CardContent className="flex flex-col items-center justify-center gap-1.5 p-5 text-center h-full">
              <Target className="h-5 w-5 text-emerald-500 fill-emerald-500/5" />
              <div className="font-black text-3xl text-emerald-500 tracking-tight font-mono">
                {scoreSummary.accuracy}%
              </div>
              <div className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">
                Attempt Accuracy
              </div>
            </CardContent>
          </Card>

          {/* Core Metric 3: Errors */}
          <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 shadow-xs rounded-2xl overflow-hidden relative group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-red-500" />
            <CardContent className="flex flex-col items-center justify-center gap-1.5 p-5 text-center h-full">
              <XCircle className="h-5 w-5 text-red-500 fill-red-500/5" />
              <div className="font-black text-3xl text-red-500 tracking-tight font-mono">
                {scoreSummary.wrong}
              </div>
              <div className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">
                Wrong Answers
              </div>
            </CardContent>
          </Card>

          {/* Core Metric 4: Runtime Interval */}
          <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 shadow-xs rounded-2xl overflow-hidden relative group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-amber-500" />
            <CardContent className="flex flex-col items-center justify-center gap-1.5 p-5 text-center h-full">
              <Clock className="h-5 w-5 text-amber-500 fill-amber-500/5" />
              <div className="font-black text-2xl text-zinc-800 dark:text-zinc-200 tracking-tight font-mono py-0.5">
                {totalTimeStr}
              </div>
              <div className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">
                Time Recorded
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Balanced Sectional Matrix Panel (Takes 4/12 Columns side-by-side with metrics) */}
        <Card className="lg:col-span-4 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 backdrop-blur-md shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between p-5">
          <div className="w-full space-y-3 flex-1 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block border-b border-zinc-100 dark:border-white/5 pb-2">
              Sectional Breakdown Analytics
            </span>

            <div className="space-y-4 flex-1 overflow-y-auto max-h-[240px] pr-1 pt-1 scrollbar-none">
              {scoreSummary.sections.map((section) => (
                <div key={section.name} className="space-y-2">
                  <div className="flex items-center justify-between font-semibold text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider block max-w-[170px] truncate">
                      {section.name}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-zinc-800 dark:text-zinc-100">
                        {formatClatScore(section.netScore)}
                      </span>
                      <span className="text-zinc-400 text-[10px] font-medium">
                        ({section.accuracy}%)
                      </span>
                    </div>
                  </div>

                  <div className="[&>div]:bg-[#4169E1]">
                    <Progress className="h-1.5 bg-zinc-100 dark:bg-zinc-800" value={section.accuracy} />
                  </div>

                  <p className="text-zinc-400 dark:text-zinc-500 font-medium text-[10px] select-none text-right">
                    {section.correct} correct • {section.wrong} wrong • {section.unanswered} skipped
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ─── DEEP ANALYTICAL QUESTION REVIEW MODULE ─── */}
      <section className="space-y-4 w-full mt-2">
        <div className="border-b border-zinc-200 dark:border-white/5 pb-2.5">
          <h2 className="font-black text-xl tracking-tight text-zinc-900 dark:text-white uppercase text-xs">Structural Question Review</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-[13.5px] font-normal leading-relaxed">
            Audit core text matrices, compare active response variants, and review verified system explanations.
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
                  "rounded-2xl border bg-white dark:bg-[#080D1A]/40 backdrop-blur-md shadow-xs overflow-hidden transition-all duration-300",
                  isCorrect
                    ? "border-zinc-200 dark:border-white/5 border-l-4 border-l-emerald-500"
                    : isUnanswered
                      ? "border-zinc-200 dark:border-white/5 border-l-4 border-l-zinc-400 dark:border-l-zinc-600"
                      : "border-zinc-200 dark:border-white/5 border-l-4 border-l-red-500"
                ].join(" ")}
                key={question.id}
              >

                {/* Block Item Sub-Header Context Area */}
                <CardHeader className="border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 px-5 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between w-full">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-1 shrink-0">
                        {isCorrect ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                        ) : isUnanswered ? (
                          <MinusCircle className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-red-500" />
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2 select-none">
                          <Badge className="rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-500 dark:text-zinc-400 text-[10px] font-bold px-2 py-0.2" variant="outline">Q{index + 1}</Badge>
                          <Badge className="rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-500 dark:text-zinc-400 text-[10px] font-bold px-2 py-0.2" variant="secondary">{stripped.section}</Badge>
                        </div>
                        <CardTitle className="text-[15px] font-bold leading-relaxed text-zinc-800 dark:text-zinc-200 tracking-tight">
                          {parsed.question}
                        </CardTitle>
                      </div>
                    </div>

                    {question.timeTaken !== null &&
                      question.timeTaken !== undefined && (
                        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] px-2.5 py-1 font-bold font-mono text-zinc-400 dark:text-zinc-500 text-[11px] shrink-0 shadow-3xs select-none">
                          <Timer className="h-3 w-3" />
                          {question.timeTaken}s
                        </div>
                      )}
                  </div>
                </CardHeader>

                {/* Main Content Node: Text Elements & Options Mapping */}
                <CardContent className="space-y-4 p-5 xl:p-6 w-full">
                  {parsed.passage && (
                    <div className="max-h-[260px] overflow-y-auto rounded-xl border border-zinc-200/60 dark:border-white/5 bg-zinc-50 dark:bg-black/20 p-4 text-zinc-500 dark:text-zinc-400 text-[13.5px] leading-relaxed font-normal">
                      <p className="mb-2 font-bold text-zinc-400 dark:text-zinc-500 text-[9px] uppercase tracking-widest block select-none">
                        {parsed.label} Matrix
                      </p>
                      <p className="whitespace-pre-line font-serif leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {parsed.passage}
                      </p>
                    </div>
                  )}

                  {/* Options Selections Stack */}
                  <div className="grid gap-2 w-full">
                    {options.map((option, optionIndex) => {
                      const selected = option === question.userAnswer;
                      const actualCorrect = option === question.correctAnswer;

                      return (
                        <div
                          className={[
                            "flex items-center gap-3.5 rounded-xl border p-3.5 text-[13.5px] transition-colors",
                            actualCorrect
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-semibold"
                              : selected
                                ? "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300 font-semibold"
                                : "border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/20 text-zinc-600 dark:text-zinc-400",
                          ].join(" ")}
                          key={`${question.id}-${option}`}
                        >
                          <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] font-bold text-[11px] font-mono shadow-3xs select-none text-zinc-800 dark:text-zinc-200">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="flex-1 leading-relaxed">{option}</span>

                          {actualCorrect && (
                            <Badge className="rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.2 shadow-3xs" variant="secondary">
                              Correct Variant
                            </Badge>
                          )}
                          {selected && (
                            <Badge className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-[#080D1A] text-zinc-600 dark:text-zinc-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.2 shadow-3xs" variant="outline">
                              Your Option Choice
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* High-Grade Rational System Explanation Box */}
                  <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-zinc-50 dark:bg-black/20 p-4 text-[13.5px] leading-relaxed">
                    <span className="mb-1.5 font-bold text-[10px] uppercase tracking-widest text-[#4169E1] block select-none">
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
      </section>

    </div>
  );
}