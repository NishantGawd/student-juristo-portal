"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eraser,
  ExternalLink,
  Flag,
  Loader2,
  Maximize2,
  MonitorCheck,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitQuizAction } from "../../actions";
import {
  CLAT_SECTIONS,
  type ClatSectionName,
  getQuizDurationSeconds,
  splitPassageQuestion,
  stripQuestionSection,
} from "../../clat-config";
import { requestTestRoomFullscreen } from "../../test-room-fullscreen";

type Quiz = {
  id: string;
  title?: string;
  subject?: string;
  topic: string;
  totalQuestions: number;
  quizType: string;
  documentUrl?: string | null;
};

type Question = {
  id: string;
  question: string;
  options: any;
  correctAnswer: string;
  explanation: string;
};

type ParsedQuestion = {
  id: string;
  section: ClatSectionName;
  label: string | null;
  passage: string | null;
  question: string;
};

const statusLegend = [
  { label: "Answered", className: "bg-emerald-600 dark:bg-emerald-500" },
  { label: "Not Answered", className: "bg-red-600 dark:bg-red-500" },
  { label: "Marked", className: "bg-[#4169E1]" },
  { label: "Not Visited", className: "bg-zinc-400 dark:bg-zinc-600" },
];

export function QuizSessionClient({
  quiz,
  questions,
}: {
  quiz: Quiz;
  questions: Question[];
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, boolean>>(() =>
    (questions[0]?.id ? { [questions[0].id]: true } : {})
  );
  const [timesTaken, setTimesTaken] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreenReady, setIsFullscreenReady] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() =>
    getQuizDurationSeconds(quiz.quizType, questions.length)
  );

  const answersRef = useRef(userAnswers);
  const timesRef = useRef(timesTaken);
  const questionStartRef = useRef(Date.now());
  const submitRef = useRef<(autoSubmitted?: boolean) => Promise<void>>(async () => { });

  const parsedQuestions = useMemo<ParsedQuestion[]>(
    () =>
      questions.map((question) => {
        const stripped = stripQuestionSection(question.question, quiz.subject);
        const parsed = splitPassageQuestion(stripped.question);

        return {
          id: question.id,
          section: stripped.section,
          label: parsed.label,
          passage: parsed.passage,
          question: parsed.question,
        };
      }),
    [questions, quiz.subject]
  );

  const currentQuestion = questions[currentIndex];
  const currentParsed = parsedQuestions[currentIndex];
  const options: string[] = Array.isArray(currentQuestion?.options) ? currentQuestion.options : [];
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(userAnswers).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const visitedCount = Object.keys(visitedQuestions).length;
  const notAnsweredCount = Math.max(visitedCount - answeredCount, 0);
  const isMarked = Boolean(currentQuestion && markedForReview[currentQuestion.id]);

  const sectionGroups = useMemo(
    () =>
      CLAT_SECTIONS.map((section) => {
        const firstIndex = parsedQuestions.findIndex(q => q.section === section.name);
        const count = parsedQuestions.filter(q => q.section === section.name).length;

        return { ...section, firstIndex, count };
      }).filter((section) => section.count > 0),
    [parsedQuestions]
  );

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Cache previous layout styles if we ever need to transition out dynamically
    const hadDarkClass = root.classList.contains("dark");
    const previousRootTheme = root.getAttribute("data-theme");
    const previousBodyTheme = body.getAttribute("data-theme");
    const previousRootColorScheme = root.style.colorScheme;
    const previousBodyColorScheme = body.style.colorScheme;

    // Apply baseline theme defaults
    root.classList.add("clat-test-room-active");
    body.classList.add("clat-test-room-active");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    body.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    body.style.colorScheme = "light";

    // ─── CRITICAL OVERRIDE: FORCE HIDE THE APPSIDEBAR PARENT CONTAINERS ───
    // Dynamically inject structural override styles into the document head
    const styleElement = document.createElement("style");
    styleElement.id = "clat-fullscreen-sidebar-bypass";
    styleElement.innerHTML = `
      /* Completely vaporize the sidebar, trigger controls, and layout anchors */
      [data-sidebar="sidebar"],
      button[data-sidebar="toggle"],
      .sidebar-trigger,
      [data-clat-sidebar-toggle="true"],
      header.sticky,
      .border-b.bg-background\\/95,
      div.flex.items-center.gap-2.border-b {
        display: none !important;
        width: 0px !important;
        height: 0px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }

      /* Erase the parent layout toggle button wrapper frame from your screen snippet */
      div.flex.h-9.w-9.items-center.justify-center.border,
      .ml-12.md\\:ml-14,
      header > div > div.flex.items-center.gap-4 {
        display: none !important;
      }

      /* Force container layout alignment shift back to 0px */
      .sidebar-inset,
      [data-sidebar-provider] > main,
      div.flex-1.space-y-4,
      body,
      html {
        margin: 0px !important;
        margin-left: 0px !important;
        padding: 0px !important;
        padding-left: 0px !important;
        left: 0px !important;
        width: 100vw !important;
        max-width: 100vw !important;
        transform: none !important;
      }
      
      /* Reset layout bounds */
      div.flex.h-dvh.w-full,
      div.flex.min-h-screen.w-full {
        padding-left: 0px !important;
        margin-left: 0px !important;
      }
    `;
    document.head.appendChild(styleElement);

    const syncFullscreenState = () => {
      setIsFullscreenReady(Boolean(document.fullscreenElement));
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    requestTestRoomFullscreen().then((enteredFullscreen) => {
      const isReady = enteredFullscreen || Boolean(document.fullscreenElement);
      setIsFullscreenReady(isReady);
      setFullscreenError(!isReady);
    });

    // ─── CLEANUP ON UNMOUNT ───
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      root.classList.remove("clat-test-room-active");
      body.classList.remove("clat-test-room-active");

      // Tear down the structural style overrides immediately when exiting the test screen
      const targetingStyle = document.getElementById("clat-fullscreen-sidebar-bypass");
      if (targetingStyle) targetingStyle.remove();

      if (hadDarkClass) root.classList.add("dark");
      if (previousRootTheme) {
        root.setAttribute("data-theme", previousRootTheme);
      } else {
        root.removeAttribute("data-theme");
      }

      if (previousBodyTheme) {
        body.setAttribute("data-theme", previousBodyTheme);
      } else {
        body.removeAttribute("data-theme");
      }

      root.style.colorScheme = previousRootColorScheme;
      body.style.colorScheme = previousBodyColorScheme;

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    };
  }, []);

  useEffect(() => {
    if (isSubmitting || !isFullscreenReady) return;
    const timerId = window.setInterval(() => {
      setTimeLeft((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isSubmitting, isFullscreenReady]);

  useEffect(() => {
    if (!currentQuestion) return;
    setVisitedQuestions((current) => ({ ...current, [currentQuestion.id]: true }));
  }, [currentQuestion]);

  const recordCurrentQuestionTime = () => {
    if (!currentQuestion) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - questionStartRef.current) / 1000));
    const nextTimes = {
      ...timesRef.current,
      [currentQuestion.id]: (timesRef.current[currentQuestion.id] || 0) + elapsed,
    };
    timesRef.current = nextTimes;
    setTimesTaken(nextTimes);
    questionStartRef.current = Date.now();
  };

  const setAnswer = (questionId: string, option: string) => {
    const nextAnswers = { ...answersRef.current, [questionId]: option };
    answersRef.current = nextAnswers;
    setUserAnswers(nextAnswers);
  };

  const clearAnswer = () => {
    if (!currentQuestion) return;
    const nextAnswers = { ...answersRef.current };
    delete nextAnswers[currentQuestion.id];
    answersRef.current = nextAnswers;
    setUserAnswers(nextAnswers);
  };

  const goToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length || index === currentIndex) return;
    recordCurrentQuestionTime();
    setCurrentIndex(index);
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) goToQuestion(currentIndex + 1);
  };

  const markForReviewAndNext = () => {
    if (!currentQuestion) return;
    setMarkedForReview((current) => ({ ...current, [currentQuestion.id]: true }));
    goToNextQuestion();
  };

  const handleEnterFullscreen = () => {
    setFullscreenError(false);
    requestTestRoomFullscreen().then((enteredFullscreen) => {
      const isReady = enteredFullscreen || Boolean(document.fullscreenElement);
      setIsFullscreenReady(isReady);
      if (!isReady) {
        setFullscreenError(true);
        toast.error("Fullscreen protocol blocked. Verify dashboard parameters.");
      }
    });
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (isSubmitting) return;
    recordCurrentQuestionTime();
    setIsSubmitting(true);

    try {
      const result = await submitQuizAction(quiz.id, answersRef.current, timesRef.current);
      if (result?.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }
      toast.success(autoSubmitted ? "Duration limits exceeded. Metric trace logged." : "Test submission loop confirmed.");
      router.push(`/clat-exam/${quiz.id}`);
    } catch {
      toast.error("Failed to execute telemetry submission.");
      setIsSubmitting(false);
    }
  };

  submitRef.current = handleSubmit;

  useEffect(() => {
    if (timeLeft === 0 && !isSubmitting) {
      submitRef.current(true).catch(() => { });
    }
  }, [timeLeft, isSubmitting]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const questionStatusClass = (question: Question) => {
    const answered = Boolean(userAnswers[question.id]);
    const marked = Boolean(markedForReview[question.id]);
    const visited = Boolean(visitedQuestions[question.id]);

    if (marked) return "border-[#4169E1]/30 bg-[#4169E1]/10 text-[#4169E1]";
    if (answered) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (visited) return "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
    return "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] text-zinc-400 dark:text-zinc-500";
  };

  if (!currentQuestion || !currentParsed || questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-none border border-zinc-200 p-6 text-center text-zinc-400 font-mono text-xs uppercase tracking-wider">
        No active questions mapped inside this matrix node.
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-white dark:bg-[#0C1222] select-none font-sans font-medium text-zinc-900 dark:text-zinc-100 antialiased overflow-hidden">

      {/* ─── BLOCK INTERCEPTOR: FULLSCREEN COMPLIANCE ─── */}
      {!isFullscreenReady && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-[#0C1222] p-6">
          <div className="w-full max-w-md rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] p-6 text-center shadow-none">
            <div className="mx-auto flex h-12 w-12 items-center justify-center border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0C1222] text-[#4169E1]">
              <MonitorCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-bold text-lg font-serif">Secure Testing Session</h2>
            <p className="mt-2 text-zinc-400 dark:text-zinc-500 text-xs leading-relaxed font-normal">
              The CLAT exam room interface locks workspace parameters inside fullscreen parameters to preserve evaluation benchmarking conditions.
            </p>
            {fullscreenError && (
              <p className="mt-4 border border-amber-500/20 bg-amber-500/5 p-3 text-amber-600 dark:text-amber-400 text-[11px] font-mono font-bold uppercase tracking-wide">
                Automatic override restricted. Initialize configuration link manually.
              </p>
            )}
            <button
              className="mt-6 w-full h-11 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs uppercase tracking-wider rounded-none transition-colors cursor-pointer"
              onClick={handleEnterFullscreen}
            >
              Initialize Workspace Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ─── HEADER ROW ─── */}
      <header className="border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] shrink-0">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] text-[#4169E1] rounded-none">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-0.5 text-left">
              <h1 className="truncate font-bold text-base font-serif text-zinc-900 dark:text-white">
                {quiz.title || "CLAT Mock Evaluation Track"}
              </h1>
              <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <span>Verified Aspirant</span>
                <span className="text-zinc-200 dark:text-white/10">|</span>
                <span>Segment Index: {currentIndex + 1} / {questions.length}</span>
                {quiz.documentUrl && (
                  <>
                    <span className="text-zinc-200 dark:text-white/10">|</span>
                    <a className="inline-flex items-center gap-1 text-[#4169E1] hover:underline" href={quiz.documentUrl} rel="noreferrer" target="_blank">
                      <ExternalLink className="h-3 w-3" /> Core Ledger PDF
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top Tabs Grid */}
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none]">
            {sectionGroups.map((section) => (
              <button
                className={cn(
                  "h-8 shrink-0 border px-4 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors rounded-none cursor-pointer outline-none",
                  currentParsed.section === section.name
                    ? "border-[#4169E1] bg-[#4169E1] text-white"
                    : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5"
                )}
                key={section.name}
                onClick={() => goToQuestion(section.firstIndex)}
                type="button"
              >
                {section.shortName}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-center border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#4169E1] select-none">
          Active Domain Parameter: {currentParsed.section}
        </div>
      </header>

      {/* ─── GRID CONTAINER ─── */}
      <main className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(280px,1fr)_minmax(320px,1fr)_320px] min-h-0 overflow-hidden">

        {/* Left Card: Case Statement / Passage */}
        <section className="flex flex-col border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] rounded-none overflow-hidden">
          <div className="border-b border-zinc-200 dark:border-white/10 px-4 py-3 font-bold text-xs uppercase tracking-widest font-mono text-zinc-400 select-none text-left">
            {currentParsed.label || "Case File Analysis Log"}
          </div>
          <div className="flex-1 overflow-y-auto p-5 text-xs md:text-sm leading-relaxed font-normal text-zinc-700 dark:text-zinc-300 text-left tracking-wide space-y-4 [scrollbar-width:thin]">
            {currentParsed.passage ? (
              <p className="whitespace-pre-line font-sans">{currentParsed.passage}</p>
            ) : (
              <div className="space-y-4 font-sans text-zinc-400 dark:text-zinc-500">
                <p>Verify contextual parameters carefully prior to selecting evaluation choices.</p>
                <p>CLAT metric grading standards apply an absolute value distribution factor of +1.00 for target hits, and a negative vector index deduction penalty of -0.25 for incorrect submissions.</p>
              </div>
            )}
          </div>
        </section>

        {/* Center Card: Question & Options Radio Matrix */}
        <section className="flex flex-col border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] rounded-none overflow-hidden">
          <div className="border-b border-zinc-200 dark:border-white/10 px-4 py-3 bg-white dark:bg-[#0C1222] select-none">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold text-xs uppercase tracking-widest font-mono text-zinc-400 text-left">
                Item Frame {currentIndex + 1} / {questions.length}
              </h2>
              {isMarked && (
                <span className="border border-[#4169E1]/30 bg-[#4169E1]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text--[#4169E1] rounded-none">
                  Marked Log Trace
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between [scrollbar-width:thin]">
            <div className="space-y-5 w-full text-left">
              <p className="font-bold text-sm leading-relaxed font-serif text-zinc-900 dark:text-white">
                {currentParsed.question}
              </p>

              <div className="space-y-2.5 pt-2">
                {options.map((option, index) => {
                  const selected = currentAnswer === option;
                  return (
                    <button
                      className={cn(
                        "flex w-full items-start gap-3.5 border p-3.5 text-left text-xs font-medium tracking-wide transition-colors rounded-none outline-none cursor-pointer",
                        selected
                          ? "border-[#4169E1] bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white font-bold"
                          : "border-zinc-200 dark:border-white/5 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]"
                      )}
                      key={`${currentQuestion.id}-${option}`}
                      onClick={() => setAnswer(currentQuestion.id, option)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-none border text-[10px] transition-colors",
                          selected
                            ? "border-[#4169E1] bg-[#4169E1] text-white"
                            : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#080D1A]"
                        )}
                      >
                        {selected ? <CheckCircle2 className="h-3 w-3 text-white" /> : null}
                      </span>
                      <span className="flex-1 leading-normal">
                        {String.fromCharCode(65 + index)}. {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In-Card Operational Row */}
            <div className="mt-8 flex flex-wrap gap-2 select-none border-t border-zinc-100 dark:border-white/5 pt-4">
              <button
                disabled={isSubmitting}
                onClick={markForReviewAndNext}
                className="h-10 px-4 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 font-medium text-xs uppercase tracking-wider rounded-none transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Flag className="h-3.5 w-3.5 opacity-60" /> Mark for Review
              </button>
              <button
                disabled={!currentAnswer || isSubmitting}
                onClick={clearAnswer}
                className="h-10 px-4 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 text-zinc-400 hover:text-red-600 hover:bg-red-500/[0.02] font-medium text-xs uppercase tracking-wider rounded-none transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
        </section>

        {/* Right Aside: Timer and Question Matrix Status */}
        <aside className="flex flex-col border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] rounded-none overflow-hidden select-none text-center">

          {/* Timer Clock */}
          <div className="border-b border-zinc-200 dark:border-white/10 p-5 bg-zinc-50/50 dark:bg-[#080D1A]/50">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Duration Vector Remaining</p>
            <div className={cn(
              "mt-1.5 font-bold font-mono text-3xl tracking-widest leading-none",
              timeLeft < 300 ? "text-red-600 animate-pulse" : "text-zinc-900 dark:text-white"
            )}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Status Color Keys */}
          <div className="border-b border-zinc-200 dark:border-white/10 p-4 bg-white dark:bg-[#0C1222]">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono text-left pl-2">
              {statusLegend.map((item) => (
                <div className="flex items-center gap-2" key={item.label}>
                  <span className={cn("h-2 w-2 rounded-none shrink-0", item.className)} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Palette Token Map Container Block */}
          <div className="flex-1 p-5 flex flex-col min-h-0 justify-between text-center select-none">

            {/* Top Area: Group Header and Token Grid numbers tightly together */}
            <div className="space-y-4 flex flex-col min-h-0">
              <h3 className="font-bold text-xs uppercase tracking-widest font-mono text-zinc-400">
                Evaluation Question Palette
              </h3>

              <div className="grid grid-cols-5 gap-2 overflow-y-auto pr-1 content-start auto-rows-max max-h-[42vh] [scrollbar-width:thin]">
                {questions.map((question, index) => {
                  const isCurrent = index === currentIndex;
                  return (
                    <button
                      className={cn(
                        "relative h-9 rounded-none border font-mono font-bold text-xs transition-colors cursor-pointer outline-none",
                        questionStatusClass(question),
                        isCurrent && "border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white"
                      )}
                      key={question.id}
                      onClick={() => goToQuestion(index)}
                      type="button"
                    >
                      {(index + 1).toString().padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Area: Pushed to the absolute base edge of the card boundary */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-wider pt-4 border-t border-zinc-100 dark:border-white/5 mt-auto">
              <div className="border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] p-2 text-emerald-600 dark:text-emerald-400">
                <strong className="text-sm block leading-none font-sans font-black mb-0.5">{answeredCount}</strong>
                <span>Done</span>
              </div>
              <div className="border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] p-2 text-red-600 dark:text-red-400">
                <strong className="text-sm block leading-none font-sans font-black mb-0.5">{notAnsweredCount}</strong>
                <span>Omit</span>
              </div>
              <div className="border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] p-2 text-[#4169E1]">
                <strong className="text-sm block leading-none font-sans font-black mb-0.5">{markedCount}</strong>
                <span>Mark</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* ─── NAVIGATION ACTION BOTTOM FOOTER BAR ─── */}
      <footer className="grid gap-3 border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] p-4 shadow-none select-none sm:grid-cols-3 shrink-0">
        <Button
          disabled={currentIndex === 0 || isSubmitting}
          onClick={() => goToQuestion(currentIndex - 1)}
          variant="outline"
          className="h-11 rounded-none text-xs uppercase tracking-wider font-semibold border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          disabled={currentIndex >= questions.length - 1 || isSubmitting}
          onClick={() => goToQuestion(currentIndex + 1)}
          className="h-11 rounded-none text-xs uppercase tracking-wider font-semibold border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-[#080D1A] hover:bg-zinc-100 dark:hover:bg-white/5"
          variant="outline"
        >
          Next Question <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          className="h-11 rounded-none text-xs uppercase tracking-wider font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-none"
          disabled={isSubmitting}
          onClick={() => handleSubmit(false)}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Finalize & Submit Test
        </Button>
      </footer>
    </div>
  );
}