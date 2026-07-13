"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BellOff,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Link as LinkIcon,
  MapIcon,
  MessageCircle,
  PlayCircle,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toggleOptInForUpdatesAction } from "../actions";
import { AnimatedCounter, GlowCard, ShimmerButton } from "./animated-ui";

export function DashboardTab({
  profile,
  pastQuizzes,
  latestUpdate,
  onOpenMentor,
}: {
  profile: any;
  pastQuizzes: any[];
  latestUpdate?: any;
  onOpenMentor?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optedIn, setOptedIn] = useState(profile?.optedInForUpdates || false);

  const handleToggleOptIn = (checked: boolean) => {
    setOptedIn(checked);
    startTransition(async () => {
      const result = await toggleOptInForUpdatesAction(checked);
      if (result.error) {
        setOptedIn(!checked);
        toast.error(result.error);
      } else {
        toast.success(
          checked ? "Opted in for Exam Updates" : "Opted out of Exam Updates"
        );
      }
    });
  };

  const tasks = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayQuizzes = pastQuizzes.filter(
      (q) => new Date(q.createdAt) >= today
    );
    const completedToday = todayQuizzes.filter((q) => q.status === "completed");

    const weakSection = profile?.weakestSection || "Legal Reasoning";
    const hasWeakSectionQuizToday = completedToday.some(
      (q) => q.subject === weakSection
    );
    const hasMockToday = completedToday.some((q) => q.quizType === "mock");
    const hasAnyQuizToday = completedToday.length > 0;

    const totalCompleted = pastQuizzes.filter(
      (q) => q.status === "completed"
    ).length;

    return [
      {
        id: 1,
        title: `Practice your weak area: ${weakSection}`,
        isCompleted: hasWeakSectionQuizToday,
        points: 50,
        action: () => {
          router.push("/clat-exam?tab=mock");
        },
      },
      {
        id: 2,
        title: "Complete any quiz today",
        isCompleted: hasAnyQuizToday,
        points: 20,
        action: () => router.push("/clat-exam?tab=mock"),
      },
      {
        id: 3,
        title:
          totalCompleted < 5
            ? "Complete 5 total quizzes"
            : "Attempt a full mock test",
        isCompleted: totalCompleted < 5 ? totalCompleted >= 5 : hasMockToday,
        points: totalCompleted < 5 ? 100 : 80,
        action: () => router.push("/clat-exam?tab=mock"),
      },
    ];
  }, [pastQuizzes, profile, router]);

  const stats = useMemo(() => {
    const completed = pastQuizzes.filter((q) => q.status === "completed");
    const active = pastQuizzes.filter((q) => q.status !== "completed");
    const totalQs = completed.reduce((sum, q) => sum + q.totalQuestions, 0);
    const totalCorrect = completed.reduce((sum, q) => sum + (q.score || 0), 0);
    const accuracy =
      totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0;
    const mocks = pastQuizzes.filter((q) => q.quizType === "mock").length;
    const pyqs = pastQuizzes.filter((q) => q.quizType === "pyq").length;
    return {
      accuracy,
      activeCount: active.length,
      mocks,
      pyqs,
      totalCompleted: completed.length,
      totalQs,
    };
  }, [pastQuizzes]);

  const handleAIAnalysisRequest = () => {
    if (onOpenMentor) {
      onOpenMentor();
      toast.success("Opening AI mentor with your study analysis.");
      return;
    }
    router.push("/clat-exam?tab=reports");
  };

  const bentoWorkspaceCards = [
    {
      title: "Mock Prep",
      description: "Generate full mocks, mini mocks, and sectional drills.",
      metric: `${stats.mocks} mocks`,
      icon: PlayCircle,
      action: () => router.push("/clat-exam?tab=mock"),
      layoutClass: "md:col-span-2 lg:col-span-2 bg-gradient-to-r from-[#4169E1]/5 to-transparent",
    },
    {
      title: "Real PYQs",
      description: "Convert source PDFs into interactive previous-year drills.",
      metric: `${stats.pyqs} PYQs`,
      icon: ClipboardCheck,
      action: () => router.push("/clat-exam?tab=pyq"),
      layoutClass: "md:col-span-1 lg:col-span-1",
    },
    {
      title: "AI Mentor",
      description: "Open detailed study analysis and next-step guidance.",
      metric: "Coach",
      icon: MessageCircle,
      action: handleAIAnalysisRequest,
      layoutClass: "md:col-span-1 lg:col-span-1 border-[#4169E1]/20 dark:border-[#4169E1]/30 bg-[#4169E1]/5 dark:bg-[#4169E1]/5",
    },
    {
      title: "Roadmap",
      description: "Open your adaptive CLAT study plan and next 7 days.",
      metric: profile?.weakestSection || "Set profile",
      icon: MapIcon,
      action: () => router.push("/clat-exam?tab=roadmap"),
      layoutClass: "md:col-span-1 lg:col-span-1",
    },
    {
      title: "Quick Quiz",
      description: "Create a short custom drill on any CLAT topic.",
      metric: "5-20Q",
      icon: Zap,
      action: () => router.push("/clat-exam?tab=quick"),
      layoutClass: "md:col-span-1 lg:col-span-1",
    },
    {
      title: "Reports",
      description: "Review all quiz, mock, PYQ, and test history.",
      metric: `${stats.activeCount} active`,
      icon: BarChart3,
      action: () => router.push("/clat-exam?tab=reports"),
      layoutClass: "md:col-span-1 lg:col-span-1",
    },
    {
      title: "Community",
      description: "Find peers, discussion rooms, and prep accountability.",
      metric: "Discuss",
      icon: Users,
      action: () => router.push("/clat-exam?tab=community"),
      layoutClass: "md:col-span-2 lg:col-span-2 bg-gradient-to-l from-zinc-500/5 to-transparent dark:from-white/5",
    },
  ];

  return (
    <div className="fade-in slide-in-from-bottom-4 flex animate-in flex-col gap-6 duration-500 w-full text-zinc-900 dark:text-zinc-100 select-none">

      {/* ─── SECTION 1: ASYMMETRIC CONTROL COMMAND HUB ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">

        {/* The Radial Metric HUD Frame (Takes 8/12 of the horizontal row width) */}
        <GlowCard className="lg:col-span-8 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-white/5 relative overflow-hidden rounded-2xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#4169E1]/5 to-transparent pointer-events-none" />

          <CardContent className="p-6 xl:p-8 flex flex-col justify-between h-full gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/60 dark:border-white/5 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#4169E1] bg-[#4169E1]/10 px-2.5 py-0.5 rounded-md border border-[#4169E1]/20">
                  SYSTEM ACTIVE • TARGET {profile?.targetYear || "2026"}
                </span>
                <h2 className="text-3xl font-black tracking-tight mt-2 text-zinc-900 dark:text-white">
                  Welcome back, Future Lawyer!
                </h2>
              </div>

              {/* Asymmetric Pill Target Badge */}
              <div className="rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 flex flex-col justify-center shrink-0 shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none">Objective Target</span>
                <span className="text-xs font-black tracking-tight mt-0.5">{profile?.targetNlu || "Top Tier NLU"}</span>
              </div>
            </div>

            {/* Performance Metric Analytics Row Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-2">
              <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-[#080D1A]/40 border border-zinc-200/50 dark:border-white/5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Ecosystem XP</span>
                <span className="text-2xl font-black text-[#4169E1] tracking-tight flex items-center gap-1.5">
                  <Zap className="h-4 w-4 fill-[#4169E1]/10" />
                  <AnimatedCounter value={profile?.xp || 0} />
                </span>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-[#080D1A]/40 border border-zinc-200/50 dark:border-white/5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Diagnostic Runs</span>
                <span className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
                  <AnimatedCounter value={stats.totalCompleted || 0} />
                </span>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-[#080D1A]/40 border border-zinc-200/50 dark:border-white/5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Baseline Accuracy</span>
                <span className="text-2xl font-black text-emerald-500 tracking-tight flex items-center gap-1">
                  {stats.accuracy}%
                  <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 px-1 py-0.2 rounded-md tracking-normal align-middle ml-1">Live</span>
                </span>
              </div>
            </div>
          </CardContent>
        </GlowCard>

        {/* Dynamic Telemetry Notification Deck (Takes 4/12 of the horizontal row width) */}
        <Card className="lg:col-span-4 border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/20 p-5 xl:p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden h-full">
          <div className="z-10 flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-3">
            <h3 className="flex items-center gap-2 font-bold text-[#4169E1] text-[10px] uppercase tracking-widest">
              <Bell className="h-3.5 w-3.5" /> Broadcast Stream
            </h3>

            <div className="flex items-center space-x-2">
              <Switch
                checked={optedIn}
                disabled={isPending}
                id="update-opt-in"
                onCheckedChange={handleToggleOptIn}
                className="data-[state=checked]:bg-[#4169E1]"
              />
              <Label className="cursor-pointer text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500" htmlFor="update-opt-in">
                {optedIn ? "Mute" : "Alerts"}
              </Label>
            </div>
          </div>

          <div className="z-10 flex flex-1 flex-col justify-center my-4">
            {latestUpdate ? (
              <div className="space-y-1">
                <h4 className="line-clamp-2 font-extrabold text-zinc-900 dark:text-white text-[14.5px] leading-snug tracking-tight">
                  {latestUpdate.title}
                </h4>
                <p className="line-clamp-2 text-zinc-500 dark:text-zinc-400 text-[13px] leading-relaxed">
                  {latestUpdate.content}
                </p>
                {latestUpdate.link && (
                  <a
                    className="inline-flex items-center gap-1 font-bold text-[#4169E1] text-[11px] hover:underline pt-1.5"
                    href={latestUpdate.link}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <LinkIcon className="h-3 w-3" /> External Reference Link
                  </a>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-zinc-400 py-2">
                <BellOff className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                <p className="text-[12px] font-medium">No external data links transmitted.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ─── SECTION 2: INTERACTIVE DOCK TARGET RUNTIMES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">

        {/* Step-Indicator Dynamic Targets List (Takes 7/12 width) */}
        <Card className="lg:col-span-7 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 backdrop-blur-md shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 px-5 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[14px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                <Target className="h-4 w-4 text-emerald-500" />
                Daily Target Alignment
              </CardTitle>
              <span className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 font-bold text-emerald-600 dark:text-emerald-400 text-[10px] tracking-widest uppercase">
                {tasks.filter((t) => t.isCompleted).length} / {tasks.length} Resolved
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col justify-center divide-y divide-zinc-100 dark:divide-white/5">
            {tasks.map((task) => (
              <button
                className="flex w-full items-center justify-between p-4.5 text-left transition-all hover:bg-zinc-500/5 group/task"
                key={task.id}
                onClick={task.action}
                type="button"
              >
                <div className="flex items-center gap-4">
                  {task.isCompleted ? (
                    <div className="h-5 w-5 rounded-lg bg-emerald-500/10 border border-emerald-500 flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/5" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-transparent group-hover/task:border-[#4169E1] group-hover/task:bg-[#4169E1]/5 transition-all shrink-0" />
                  )}
                  <span className={`text-[14px] transition-all duration-300 ${task.isCompleted
                    ? "text-zinc-400 dark:text-zinc-500 line-through font-normal"
                    : "font-bold text-zinc-700 dark:text-zinc-300 group-hover/task:text-[#4169E1]"
                    }`}>
                    {task.title}
                  </span>
                </div>
                <span className="font-extrabold text-amber-500 dark:text-amber-400 text-[11px] bg-amber-500/5 px-2.5 py-0.5 rounded-lg border border-amber-500/10 shrink-0 shadow-3xs">
                  +{task.points} XP
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Deep Matrix Progress Interface Panel (Takes 5/12 width) */}
        <Card className="lg:col-span-5 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 backdrop-blur-md shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="px-5 py-4 border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10">
            <CardTitle className="flex items-center gap-2 text-[14px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              <BookOpen className="h-4 w-4 text-[#4169E1]" />
              Progress Engine Tracker
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 xl:p-6 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4 w-full">
              {/* Type-Safe Custom Styled Target Metrics */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <span>Target Accuracy Scale</span>
                  <span className="text-[#4169E1] font-mono font-black">{stats.accuracy}%</span>
                </div>
                <div className="h-2 rounded-full w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-[#4169E1] rounded-full transition-all duration-500" style={{ width: `${stats.accuracy}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <span>Diagnostic Module Limiters</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-mono font-bold">
                    {stats.totalCompleted} <span className="text-zinc-400 dark:text-zinc-600 font-normal">/ 50 target</span>
                  </span>
                </div>
                <div className="h-2 rounded-full w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((stats.totalCompleted / 50) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            <ShimmerButton
              className="w-full text-xs font-bold bg-[#4169E1] text-white flex items-center justify-center h-10 rounded-xl tracking-wider uppercase shadow-md transition-all mt-2"
              onClick={handleAIAnalysisRequest}
            >
              Analyze Metrics Matrix <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </ShimmerButton>
          </CardContent>
        </Card>
      </div>

      {/* ─── SECTION 3: BENTO GRID PREP WORKSPACE DECK ─── */}
      <section className="space-y-4 w-full mt-2">
        <div className="flex items-end justify-between w-full border-b border-zinc-200 dark:border-white/5 pb-3">
          <div className="space-y-1">
            <h3 className="font-black text-xl tracking-tight text-zinc-900 dark:text-white uppercase text-xs">Ecosystem Workspace Deck</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-[13px] font-normal leading-none">
              Initialize modular specialized execution arrays instantly.
            </p>
          </div>
          <div className="h-5 rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-2.5 flex items-center text-[10px] font-mono text-zinc-400 select-none uppercase tracking-wider">
            {stats.totalCompleted} nodes locked
          </div>
        </div>

        {/* Dynamic Bento Board Framework Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {bentoWorkspaceCards.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                type="button"
                className={`group rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 p-5 text-left transition-all duration-300 hover:border-[#4169E1] hover:shadow-md flex flex-col justify-between min-h-[135px] relative overflow-hidden ${item.layoutClass || ""}`}
              >
                {/* Micro capsule graphics representing SaaS grid configurations */}
                <div className="flex items-start justify-between gap-4 w-full shrink-0">
                  <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] p-2 text-zinc-700 dark:text-zinc-300 group-hover:text-white group-hover:bg-[#4169E1] group-hover:border-[#4169E1] transition-all shadow-3xs">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-md border border-zinc-200/60 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shadow-3xs">
                    {item.metric}
                  </span>
                </div>

                <div className="mt-4 space-y-1 w-full">
                  <h4 className="font-black text-[15px] tracking-tight text-zinc-900 dark:text-white group-hover:text-[#4169E1] transition-colors flex items-center gap-1">
                    {item.title}
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#4169E1]" />
                  </h4>
                  <p className="line-clamp-2 text-zinc-500 dark:text-zinc-400 text-[12.5px] leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}