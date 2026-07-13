"use client";

import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  MapIcon,
  MessageCircle,
  PenLine,
  PlayCircle,
  Plus,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDefaultClatModelTier } from "@/lib/clat-model-access";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { generateQuizAction, generateRealPyqQuizAction } from "./actions";
import { AnalyticsTab } from "./components/analytics-tab";
import { CommunityTab } from "./components/community-tab";
import { DashboardTab } from "./components/dashboard-tab";
import { OnboardingModal } from "./components/onboarding-modal";
import { type GenerateRequest, PracticeTab } from "./components/practice-tab";
import {
  getPyqGenerationKey,
  PyqTab,
  type RealPyqPaper,
} from "./components/pyq-tab";
import { QuickQuizTab } from "./components/quick-quiz-tab";
import { RoadmapTab } from "./components/roadmap-tab";
import { requestTestRoomFullscreen } from "./test-room-fullscreen";
import { generateUUID } from "@/lib/utils";

const Chat = dynamic(
  () => import("@/components/chat").then((module) => module.Chat),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Loading mentor...
      </div>
    ),
    ssr: false,
  }
);

type QuizHubClientProps = {
  initialTab: string;
  pastQuizzes: any[];
  profile: any;
  mentorChatId: string;
  initialMessages: any[];
  latestUpdate: any;
  userPlan: string;
};

function buildStudyAnalysisPrompt(profile: any, pastQuizzes: any[]) {
  const completed = pastQuizzes
    .filter((quiz) => quiz.status === "completed")
    .slice(0, 12);
  const totalQuestions = completed.reduce(
    (sum, quiz) => sum + (quiz.totalQuestions || 0),
    0
  );
  const totalCorrect = completed.reduce(
    (sum, quiz) => sum + (quiz.score || 0),
    0
  );
  const accuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const recentSummary =
    completed
      .slice(0, 8)
      .map(
        (quiz) =>
          `- ${quiz.title || quiz.topic}: ${quiz.score || 0}/${quiz.totalQuestions} (${quiz.quizType}, ${quiz.subject})`
      )
      .join("\n") || "- No completed quizzes yet.";

  return `Give me a detailed CLAT study analysis as my AI mentor.

Student profile:
- Target exam: ${profile?.targetExam || "CLAT UG"}
- Target year: ${profile?.targetYear || "upcoming attempt"}
- Dream NLU: ${profile?.targetNlu || "not set"}
- Current class/stage: ${profile?.currentClass || "not set"}
- Self-identified weakest section: ${profile?.weakestSection || "not set"}

Performance snapshot:
- Completed tests reviewed: ${completed.length}
- Questions attempted across reviewed tests: ${totalQuestions}
- Raw correct answers: ${totalCorrect}
- Raw accuracy: ${accuracy}%

Recent tests:
${recentSummary}

Please produce a detailed mentor-style analysis with:
1. Overall readiness and score trajectory.
2. Strongest and weakest areas inferred from the data.
3. Negative marking and attempt strategy.
4. Section-wise study plan for English, GK, Legal, Logical, and Quant.
5. Next 7 days of actions.
6. What mock/PYQ/quick quiz I should take next.

Be specific, practical, and CLAT-centric. Generated at ${new Date().toLocaleString()}.`;
}

const tabAliases: Record<string, string> = {
  practice: "mock",
  mocks: "mock",
  "mock-prep": "mock",
  pyqs: "pyq",
  analytics: "reports",
  review: "reports",
  roadmap: "roadmap",
};

function normalizeTab(tab?: string) {
  const value = (tab || "dashboard").toLowerCase();
  const mapped = tabAliases[value] || value;
  return [
    "dashboard",
    "mock",
    "pyq",
    "quick",
    "roadmap",
    "reports",
    "community",
  ].includes(mapped)
    ? mapped
    : "dashboard";
}

type GenerationDialogState = {
  description: string;
  error?: string;
  key: string;
  questions: number;
  status: "loading" | "error";
  title: string;
};

function getGenerationKey(request: GenerateRequest) {
  return `${request.mode}-${request.topic}-${request.questions}-${request.modelTier || "auto"}`;
}

function getGenerationTitle(request: GenerateRequest) {
  if (request.mode === "mock") {
    return request.questions >= 120
      ? "Generating your full CLAT mock"
      : "Generating your CLAT sprint";
  }

  if (request.mode === "sectional") {
    return `Generating ${request.subject} drill`;
  }

  return "Generating your quick quiz";
}

function getGenerationDescription(request: GenerateRequest) {
  if (request.mode === "mock") {
    return "We are preparing a CLAT-pattern test using the fast mock question bank first, then filling gaps only when needed.";
  }

  if (request.mode === "sectional") {
    return "We are preparing a focused CLAT sectional drill and preserving the generation even if you switch tabs.";
  }

  return "We are preparing your focused quiz and will open the test room as soon as it is ready.";
}

function TestGenerationDialog({
  generation,
  onClose,
}: {
  generation: GenerationDialogState | null;
  onClose: () => void;
}) {
  const isLoading = generation?.status === "loading";

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          onClose();
        }
      }}
      open={Boolean(generation)}
    >
      <DialogContent className="max-w-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <X className="h-5 w-5 text-destructive" />
            )}
            {generation?.title || "Generating test"}
          </DialogTitle>
          <DialogDescription>
            {generation?.description ||
              "Your test is being prepared in the background."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[180px_1fr]">
          <div className="relative mx-auto h-44 w-44">
            <div className="absolute inset-4 rounded-full border bg-muted/30" />
            <div className="-rotate-6 absolute top-8 left-10 h-20 w-24 rounded-md border bg-background shadow-sm">
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-9 w-9 text-primary" />
              </div>
            </div>
            <div className="absolute right-8 bottom-8 h-20 w-16 rotate-6 rounded-md border bg-card shadow-md">
              <div className="space-y-2 p-3">
                <div className="h-2 rounded bg-primary/50" />
                <div className="h-2 rounded bg-emerald-500/50" />
                <div className="h-2 rounded bg-amber-500/50" />
              </div>
            </div>
            <div className="absolute top-11 right-7 flex h-10 w-10 animate-pulse items-center justify-center rounded-full border bg-background shadow-sm">
              <PenLine className="h-4 w-4 text-amber-600" />
            </div>
            <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-3 w-3 animate-ping rounded-full bg-primary" />
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                <p className="text-sm">
                  You can switch tabs while this runs. The generation will stay
                  active and the test room will open automatically.
                </p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />
                <p className="text-sm">
                  The test room is requested in fullscreen mode and forced into
                  light mode before opening, so the CLAT exam window feels
                  focused from the start.
                </p>
              </div>
            </div>
            {generation?.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
                {generation.error}
              </div>
            )}
            <div className="text-muted-foreground text-xs">
              Questions requested: {generation?.questions || 0}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function QuizHubClient({
  initialTab,
  pastQuizzes,
  profile,
  mentorChatId,
  initialMessages,
  latestUpdate,
  userPlan,
}: QuizHubClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mentorPrompt, setMentorPrompt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [generation, setGeneration] = useState<GenerationDialogState | null>(null);
  const [selectedClatModel, setSelectedClatModel] = useState(() => getDefaultClatModelTier(userPlan));
  const [upgradePrompt, setUpgradePrompt] = useState<{ message: string; title: string; } | null>(null);

  // Read current active chatId query parameter from the URL search string
  const runtimeChatId = searchParams ? searchParams.get("chatId") : null;
  const currentChatId = runtimeChatId || mentorChatId;

  // Automatically slide open the AI Mentor panel layout whenever a link is chosen from history
  useEffect(() => {
    if (runtimeChatId) {
      setIsChatOpen(true);
    }
  }, [runtimeChatId]);

  const completedQuizzes = useMemo(
    () => pastQuizzes.filter((quiz) => quiz.status === "completed").length,
    [pastQuizzes]
  );

  useEffect(() => {
    if (!profile) {
      setShowOnboarding(true);
    }
  }, [profile]);

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get("tab") || initialTab);
    setActiveTab((currentTab) =>
      currentTab === nextTab ? currentTab : nextTab
    );
  }, [initialTab, searchParams]);

  const handleTabChange = (value: string) => {
    const nextTab = normalizeTab(value);
    setActiveTab(nextTab);
    const chatIdString = runtimeChatId ? `&chatId=${runtimeChatId}` : "";
    router.replace(`/clat-exam?tab=${nextTab}${chatIdString}`, { scroll: false });
  };

  // Instantiates a completely fresh session room inside the AI Mentor panel layout drawer
  const handleStartNewChatSession = () => {
    const brandNewId = generateUUID();
    const currentTab = searchParams?.get("tab") || "dashboard";

    setMentorPrompt(null);
    router.push(`/clat-exam?tab=${currentTab}&chatId=${brandNewId}`);
  };

  const openMentorForStudyAnalysis = () => {
    setMentorPrompt(buildStudyAnalysisPrompt(profile, pastQuizzes));
    setIsChatOpen(true);
  };

  const openGeneratedTestRoom = (quizId: string, generationKey: string) => {
    setGeneration((currentGeneration) =>
      currentGeneration?.key === generationKey ? null : currentGeneration
    );
    requestTestRoomFullscreen();
    router.push(`/clat-exam/${quizId}/take`);
  };

  const handleGenerateQuiz = async (request: GenerateRequest) => {
    if (generation?.status === "loading") {
      toast.info("A CLAT test is already being generated.");
      return;
    }

    requestTestRoomFullscreen();

    const nextGeneration = {
      description: getGenerationDescription(request),
      key: getGenerationKey(request),
      questions: request.questions,
      status: "loading" as const,
      title: getGenerationTitle(request),
    };
    setGeneration(nextGeneration);

    const formData = new FormData();
    formData.append("mode", request.mode);
    formData.append("subject", request.subject);
    formData.append("topic", request.topic);
    formData.append("difficulty", request.difficulty);
    formData.append("questionCount", request.questions.toString());
    formData.append("quizType", request.quizType || "MCQ");
    formData.append("modelTier", request.modelTier || selectedClatModel);

    try {
      const result = await generateQuizAction(formData);

      if (result?.error) {
        if ((result as any).upgradeRequired) {
          setUpgradePrompt({
            title: "Upgrade needed",
            message: result.error,
          });
        }
        setGeneration({
          ...nextGeneration,
          error: result.error,
          status: "error",
          title: "Test generation failed",
        });
        toast.error(result.error);
        return;
      }

      if (result?.quizId) {
        toast.success("CLAT test generated. Opening test room...");
        openGeneratedTestRoom(result.quizId, nextGeneration.key);
        return;
      }

      setGeneration({
        ...nextGeneration,
        error: "The test did not return a valid room. Please try again.",
        status: "error",
        title: "Test generation failed",
      });
    } catch {
      setGeneration({
        ...nextGeneration,
        error: "Failed to generate the test. Please try again.",
        status: "error",
        title: "Test generation failed",
      });
      toast.error("Failed to generate test");
    }
  };

  const handleCreatePyq = async (paper: RealPyqPaper) => {
    if (generation?.status === "loading") {
      toast.info("A CLAT test is already being generated.");
      return;
    }

    requestTestRoomFullscreen();

    const nextGeneration = {
      description:
        "We are converting the real CLAT paper and answer source into an interactive drill. You can switch tabs while this continues.",
      key: getPyqGenerationKey(paper),
      questions: 30,
      status: "loading" as const,
      title: `Converting ${paper.year} PYQ`,
    };
    setGeneration(nextGeneration);

    try {
      const result = await generateRealPyqQuizAction({
        year: paper.year,
        set: paper.set,
        paperUrl: paper.paperUrl,
        answerKeyUrl: paper.answerKeyUrl,
        questionCount: 30,
      });

      if (result?.error) {
        setGeneration({
          ...nextGeneration,
          error: result.error,
          status: "error",
          title: "PYQ conversion failed",
        });
        toast.error(result.error);
        return;
      }

      if (result?.quizId) {
        toast.success("Real PYQ drill created. Opening test room...");
        openGeneratedTestRoom(result.quizId, nextGeneration.key);
        return;
      }

      setGeneration({
        ...nextGeneration,
        error:
          "The PYQ conversion did not return a valid room. Please try again.",
        status: "error",
        title: "PYQ conversion failed",
      });
    } catch {
      setGeneration({
        ...nextGeneration,
        error: "Failed to convert the source PDF into an interactive PYQ.",
        status: "error",
        title: "PYQ conversion failed",
      });
      toast.error("Failed to create real PYQ drill");
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <OnboardingModal open={showOnboarding} setOpen={setShowOnboarding} />
      <TestGenerationDialog
        generation={generation}
        onClose={() => setGeneration(null)}
      />
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setUpgradePrompt(null);
          }
        }}
        open={Boolean(upgradePrompt)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{upgradePrompt?.title || "Upgrade needed"}</DialogTitle>
            <DialogDescription>
              {upgradePrompt?.message ||
                "Upgrade your plan to continue using this feature."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setUpgradePrompt(null)} variant="outline">
              Later
            </Button>
            <Button onClick={() => router.push("/upgrade#student-plans")}>
              View plans
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main
        className={`flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 transition-all duration-300 md:px-8 lg:px-12 ${isChatOpen ? "pr-4 md:pr-8" : ""}`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6 text-zinc-950 dark:text-zinc-50 select-none transition-colors duration-200">

          {/* Minimalist Header Engine Title */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center gap-2">
              CLAT Prep OS
              <span className="text-[10px] font-medium tracking-normal px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                Active
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal">
              Unified diagnostic metrics, mock pipelines, and adaptive learning vectors.
            </p>
          </div>

          {/* Premium Borderless SaaS Telemetry Ribbon */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium sm:justify-end shrink-0">

            {/* Module Metric Slot 01: Completed Iterations */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                Completed:
              </span>
              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {completedQuizzes}
              </span>
            </div>

            {/* Elegant Structural Divider Line */}
            <div className="hidden sm:block h-3.5 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

            {/* Module Metric Slot 02: Targeted Cycle */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                Target:
              </span>
              <span className="text-sm font-bold text-[#4169E1]">
                {profile?.targetYear || "2026"}
              </span>
            </div>

            {/* Elegant Structural Divider Line */}
            <div className="hidden sm:block h-3.5 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

            {/* Module Metric Slot 03: Full Fragile Performance Display Area */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px] font-bold shrink-0">
                Weak Area:
              </span>
              {/* Fixed: Truncate dropped, text allowed to flow naturally and completely */}
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                {profile?.weakestSection || "Set profile"}
              </span>
            </div>

          </div>
        </div>

        <Tabs
          className="mx-auto w-full max-w-7xl pb-8"
          onValueChange={handleTabChange}
          value={activeTab}
        >

          <div className="mt-6">
            <TabsContent
              className="m-0 focus-visible:outline-none"
              value="dashboard"
            >
              <DashboardTab
                latestUpdate={latestUpdate}
                onOpenMentor={openMentorForStudyAnalysis}
                pastQuizzes={pastQuizzes}
                profile={profile}
              />
            </TabsContent>
            <TabsContent
              className="m-0 focus-visible:outline-none"
              value="mock"
            >
              <PracticeTab
                activeGenerationKey={
                  generation?.status === "loading" ? generation.key : null
                }
                onGenerateQuiz={handleGenerateQuiz}
                profile={profile}
                selectedModel={selectedClatModel}
                userPlan={userPlan}
                onSelectedModelChange={setSelectedClatModel}
              />
            </TabsContent>
            <TabsContent className="m-0 focus-visible:outline-none" value="pyq">
              <PyqTab
                activeGenerationKey={
                  generation?.status === "loading" ? generation.key : null
                }
                onCreatePyq={handleCreatePyq}
              />
            </TabsContent>
            <TabsContent
              className="m-0 focus-visible:outline-none"
              value="quick"
            >
              <QuickQuizTab
                activeGenerationKey={
                  generation?.status === "loading" ? generation.key : null
                }
                onGenerateQuiz={handleGenerateQuiz}
                pastQuizzes={pastQuizzes}
                selectedModel={selectedClatModel}
                userPlan={userPlan}
                onSelectedModelChange={setSelectedClatModel}
              />
            </TabsContent>
            <TabsContent
              className="m-0 focus-visible:outline-none"
              value="roadmap"
            >
              <RoadmapTab
                isActive={activeTab === "roadmap"}
                pastQuizzes={pastQuizzes}
                profile={profile}
              />
            </TabsContent>
            <TabsContent
              className="m-0 focus-visible:outline-none"
              value="reports"
            >
              <AnalyticsTab pastQuizzes={pastQuizzes} />
            </TabsContent>
            <TabsContent
              className="m-0 focus-visible:outline-none"
              value="community"
            >
              <CommunityTab />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Dynamic Mentor Sidebar Sheet */}
      <aside
        className={`z-40 flex h-full flex-col border-l bg-background shadow-2xl transition-all duration-300 ease-in-out ${isChatOpen ? "w-full opacity-100 md:w-[460px]" : "w-0 overflow-hidden border-l-0 opacity-0"}`}
      >
        <div className="flex shrink-0 flex-row items-center justify-between border-b bg-muted/30 p-3 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-base">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
              <MessageCircle className="h-3.5 w-3.5" />
            </div>
            AI Mentor
          </div>

          <div className="flex items-center gap-2">
            {/* Styled + New Chat Action button inserted natively next to close action */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartNewChatSession}
              className="h-8 gap-1 rounded-full text-xs font-medium px-3 bg-background border-zinc-200 hover:border-zinc-300 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              New Chat
            </Button>

            <Button
              className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600 text-zinc-400"
              onClick={() => setIsChatOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden">
          {isChatOpen && (
            <TooltipProvider>
              {/* Force clean canvas re-renders when currentChatId parameters mutate */}
              <Chat
                key={currentChatId}
                autoResume={false}
                context="clat"
                externalPrompt={mentorPrompt}
                id={currentChatId}
                initialChatModel="google/gemini-2.0-flash"
                initialMessages={runtimeChatId ? initialMessages : (currentChatId === mentorChatId ? initialMessages : [])}
                initialVisibilityType="private"
                isReadonly={false}
                isWidget={true}
                onExternalPromptConsumed={() => setMentorPrompt(null)}
              />
            </TooltipProvider>
          )}
        </div>
      </aside>

      {!isChatOpen && (
        <button
          aria-label="Open CLAT AI mentor"
          className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-background shadow-xl transition-transform hover:scale-105"
          onClick={() => setIsChatOpen(true)}
          type="button"
        >
          <MessageCircle className="h-6 w-6 text-primary" />
        </button>
      )}
    </div>
  );
}