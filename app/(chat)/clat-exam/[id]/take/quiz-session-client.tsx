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
  { label: "Answered", className: "bg-emerald-500" },
  { label: "Not Answered", className: "bg-red-500" },
  { label: "Marked", className: "bg-purple-600" },
  { label: "Not Visited", className: "bg-slate-400" },
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
  const [markedForReview, setMarkedForReview] = useState<
    Record<string, boolean>
  >({});
  const [visitedQuestions, setVisitedQuestions] = useState<
    Record<string, boolean>
  >(() => (questions[0]?.id ? { [questions[0].id]: true } : {}));
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
  const submitRef = useRef<(autoSubmitted?: boolean) => Promise<void>>(
    async () => {
      // Assigned to handleSubmit after it is created.
    }
  );

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
  const options: string[] = Array.isArray(currentQuestion?.options)
    ? currentQuestion.options
    : [];
  const currentAnswer = currentQuestion
    ? userAnswers[currentQuestion.id]
    : undefined;
  const answeredCount = Object.keys(userAnswers).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const visitedCount = Object.keys(visitedQuestions).length;
  const notAnsweredCount = Math.max(visitedCount - answeredCount, 0);
  const isMarked = Boolean(
    currentQuestion && markedForReview[currentQuestion.id]
  );

  const sectionGroups = useMemo(
    () =>
      CLAT_SECTIONS.map((section) => {
        const firstIndex = parsedQuestions.findIndex(
          (question) => question.section === section.name
        );
        const count = parsedQuestions.filter(
          (question) => question.section === section.name
        ).length;

        return {
          ...section,
          firstIndex,
          count,
        };
      }).filter((section) => section.count > 0),
    [parsedQuestions]
  );

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const hadDarkClass = root.classList.contains("dark");
    const previousRootTheme = root.getAttribute("data-theme");
    const previousBodyTheme = body.getAttribute("data-theme");
    const previousRootColorScheme = root.style.colorScheme;
    const previousBodyColorScheme = body.style.colorScheme;

    root.classList.add("clat-test-room-active");
    body.classList.add("clat-test-room-active");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    body.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    body.style.colorScheme = "light";

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

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      root.classList.remove("clat-test-room-active");
      body.classList.remove("clat-test-room-active");

      if (hadDarkClass) {
        root.classList.add("dark");
      }

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
        document.exitFullscreen().catch(() => {
          // Ignore exit failures during route transitions.
        });
      }
    };
  }, []);

  useEffect(() => {
    if (isSubmitting || !isFullscreenReady) {
      return;
    }

    const timerId = window.setInterval(() => {
      setTimeLeft((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isSubmitting, isFullscreenReady]);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    setVisitedQuestions((current) => ({
      ...current,
      [currentQuestion.id]: true,
    }));
  }, [currentQuestion]);

  const recordCurrentQuestionTime = () => {
    if (!currentQuestion) {
      return;
    }

    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - questionStartRef.current) / 1000)
    );
    const nextTimes = {
      ...timesRef.current,
      [currentQuestion.id]:
        (timesRef.current[currentQuestion.id] || 0) + elapsed,
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
    if (!currentQuestion) {
      return;
    }

    const nextAnswers = { ...answersRef.current };
    delete nextAnswers[currentQuestion.id];
    answersRef.current = nextAnswers;
    setUserAnswers(nextAnswers);
  };

  const goToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length || index === currentIndex) {
      return;
    }
    recordCurrentQuestionTime();
    setCurrentIndex(index);
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const markForReviewAndNext = () => {
    if (!currentQuestion) {
      return;
    }

    setMarkedForReview((current) => ({
      ...current,
      [currentQuestion.id]: true,
    }));
    goToNextQuestion();
  };

  const saveAndNext = () => {
    goToNextQuestion();
  };

  const handleEnterFullscreen = () => {
    setFullscreenError(false);
    requestTestRoomFullscreen().then((enteredFullscreen) => {
      const isReady = enteredFullscreen || Boolean(document.fullscreenElement);
      setIsFullscreenReady(isReady);

      if (!isReady) {
        setFullscreenError(true);
        toast.error(
          "Fullscreen was blocked. Please allow fullscreen for the test room."
        );
      }
    });
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (isSubmitting) {
      return;
    }

    recordCurrentQuestionTime();
    setIsSubmitting(true);

    try {
      const result = await submitQuizAction(
        quiz.id,
        answersRef.current,
        timesRef.current
      );
      if (result?.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      toast.success(
        autoSubmitted
          ? "Time is up. Test submitted."
          : "Test submitted. Opening report..."
      );
      router.push(`/clat-exam/${quiz.id}`);
    } catch {
      toast.error("Failed to submit test");
      setIsSubmitting(false);
    }
  };

  submitRef.current = handleSubmit;

  useEffect(() => {
    if (timeLeft === 0 && !isSubmitting) {
      submitRef.current(true).catch(() => {
        // handleSubmit shows the user-facing failure toast.
      });
    }
  }, [timeLeft, isSubmitting]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const questionStatusClass = (question: Question) => {
    const answered = Boolean(userAnswers[question.id]);
    const marked = Boolean(markedForReview[question.id]);
    const visited = Boolean(visitedQuestions[question.id]);

    if (marked) {
      return "border-purple-300 bg-purple-100 text-purple-800";
    }
    if (answered) {
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    }
    if (visited) {
      return "border-red-300 bg-red-100 text-red-800";
    }

    return "border-slate-300 bg-slate-100 text-slate-700";
  };

  if (!currentQuestion || !currentParsed || questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6 text-center text-muted-foreground">
        No questions found for this test.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#eaf3fb] text-slate-950">
      {!isFullscreenReady && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#eaf3fb] p-4 text-slate-950">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <MonitorCheck className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-bold text-2xl">Enter Fullscreen</h2>
            <p className="mt-2 text-slate-600 text-sm">
              CLAT test room runs in fullscreen light mode so only the exam
              window is visible while you attempt the paper.
            </p>
            {fullscreenError && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
                Your browser blocked the automatic request. Click below to start
                the test in fullscreen.
              </p>
            )}
            <Button className="mt-5 w-full" onClick={handleEnterFullscreen}>
              <Maximize2 className="mr-2 h-4 w-4" />
              Enter Fullscreen & Continue
            </Button>
          </div>
        </div>
      )}

      <header className="border-b bg-white shadow-sm">
        <div className="flex flex-col gap-3 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-bold text-lg">
                {quiz.title || "CLAT Mock Test"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-slate-500 text-xs">
                <span>Candidate: CLAT Aspirant</span>
                <span>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {quiz.documentUrl && (
                  <a
                    className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                    href={quiz.documentUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Source PDF
                  </a>
                )}
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {sectionGroups.map((section) => (
              <button
                className={cn(
                  "h-8 shrink-0 rounded-md border px-4 font-semibold text-xs transition-colors",
                  currentParsed.section === section.name
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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

        <div className="flex items-center justify-center bg-blue-700 px-3 py-2 font-semibold text-sm text-white">
          Section: {currentParsed.section}
        </div>
      </header>

      <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[minmax(280px,0.95fr)_minmax(320px,0.95fr)_300px]">
        <section className="min-h-[320px] rounded-md border bg-white shadow-sm">
          <div className="border-b px-4 py-3 font-bold text-sm">
            {currentParsed.label || "Question Context"}
          </div>
          <div className="h-[calc(100vh-230px)] min-h-[300px] overflow-y-auto p-4 text-sm leading-6">
            {currentParsed.passage ? (
              <p className="whitespace-pre-line">{currentParsed.passage}</p>
            ) : (
              <div className="space-y-3 text-slate-600">
                <p>
                  Read the question carefully and choose one option. You can
                  mark the question for review, clear your response, or return
                  from the palette.
                </p>
                <p>
                  CLAT marking applies +1 for a correct answer and -0.25 for an
                  incorrect answer.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="min-h-[320px] rounded-md border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-base">
                Question {currentIndex + 1} of {questions.length}
              </h2>
              {isMarked && (
                <Badge className="bg-purple-600 text-white hover:bg-purple-600">
                  Marked
                </Badge>
              )}
            </div>
          </div>

          <div className="h-[calc(100vh-230px)] min-h-[300px] overflow-y-auto p-4">
            <p className="mb-5 font-semibold text-sm leading-6">
              {currentParsed.question}
            </p>

            <div className="space-y-3">
              {options.map((option, index) => {
                const selected = currentAnswer === option;
                return (
                  <button
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors",
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-950"
                        : "border-transparent hover:bg-slate-50"
                    )}
                    key={`${currentQuestion.id}-${option}`}
                    onClick={() => setAnswer(currentQuestion.id, option)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        selected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {selected ? <CheckCircle2 className="h-3 w-3" /> : null}
                    </span>
                    <span>
                      {String.fromCharCode(65 + index)}. {option}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button disabled={isSubmitting} onClick={saveAndNext}>
                Save & Next
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={markForReviewAndNext}
                variant="outline"
              >
                <Flag className="mr-2 h-4 w-4" />
                Mark for Review & Next
              </Button>
              <Button
                disabled={!currentAnswer || isSubmitting}
                onClick={clearAnswer}
                variant="outline"
              >
                <Eraser className="mr-2 h-4 w-4" />
                Clear Response
              </Button>
            </div>
          </div>
        </section>

        <aside className="rounded-md border bg-white shadow-sm">
          <div className="border-b p-4 text-center">
            <p className="font-semibold text-sm">Time Left:</p>
            <div
              className={cn(
                "mt-1 font-bold font-mono text-3xl tracking-wider",
                timeLeft < 300 ? "text-red-600" : "text-slate-950"
              )}
            >
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="border-b p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {statusLegend.map((item) => (
                <div className="flex items-center gap-2" key={item.label}>
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", item.className)}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <h3 className="mb-3 text-center font-bold text-sm">
              Question Palette
            </h3>
            <div className="grid max-h-[42vh] grid-cols-5 gap-2 overflow-y-auto pr-1">
              {questions.map((question, index) => {
                const isCurrent = index === currentIndex;
                return (
                  <button
                    className={cn(
                      "relative h-9 rounded-md border font-bold text-xs transition-colors",
                      questionStatusClass(question),
                      isCurrent && "ring-2 ring-blue-600 ring-offset-2"
                    )}
                    key={question.id}
                    onClick={() => goToQuestion(index)}
                    type="button"
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md border bg-emerald-50 p-2 text-emerald-700">
                <strong>{answeredCount}</strong>
                <span className="block">Answered</span>
              </div>
              <div className="rounded-md border bg-red-50 p-2 text-red-700">
                <strong>{notAnsweredCount}</strong>
                <span className="block">Not Ans</span>
              </div>
              <div className="rounded-md border bg-purple-50 p-2 text-purple-700">
                <strong>{markedCount}</strong>
                <span className="block">Marked</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <footer className="grid gap-3 border-t bg-white p-3 shadow-sm sm:grid-cols-3">
        <Button
          disabled={currentIndex === 0 || isSubmitting}
          onClick={() => goToQuestion(currentIndex - 1)}
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          disabled={currentIndex >= questions.length - 1 || isSubmitting}
          onClick={() => goToQuestion(currentIndex + 1)}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={isSubmitting}
          onClick={() => handleSubmit(false)}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Submit Test
        </Button>
      </footer>
    </div>
  );
}
