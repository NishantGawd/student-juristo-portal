"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  MapIcon,
  MessageCircle,
  PlayCircle,
  Zap,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  History
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toggleOptInForUpdatesAction } from "../actions";

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
  const [activeWeekBlock, setActiveWeekBlock] = useState<number | null>(1);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

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
        title: `Practice weak area: ${weakSection}`,
        isCompleted: hasWeakSectionQuizToday,
        points: 50,
        action: () => router.push("/clat-exam?tab=mock"),
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
        title: totalCompleted < 5 ? "Complete 5 total quizzes" : "Attempt a full mock test",
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
    { title: "Mock Simulator", desc: "Full-length mock blueprints & sectional setups.", metric: `${stats.mocks} run`, icon: PlayCircle, action: () => router.push("/clat-exam?tab=mock"), cols: "md:col-span-2" },
    { title: "Interactive PYQs", desc: "Convert official past papers.", metric: `${stats.pyqs} direct`, icon: ClipboardCheck, action: () => router.push("/clat-exam?tab=pyq"), cols: "md:col-span-1" },
    { title: "AI Mentor Coach", desc: "Granular vector path insights.", metric: "On-demand", icon: MessageCircle, action: handleAIAnalysisRequest, cols: "md:col-span-1" },
    { title: "Study Roadmap", desc: "Personalized CLAT milestones planner.", metric: profile?.weakestSection || "Adaptive", icon: MapIcon, action: () => router.push("/clat-exam?tab=roadmap"), cols: "md:col-span-1" },
    { title: "Quick Custom Quiz", desc: "Generate text sub-drills fast.", metric: "5-20 Qs", icon: Zap, action: () => router.push("/clat-exam?tab=quick"), cols: "md:col-span-1" },
    { title: "Performance Reports", desc: "Historical analytical diagnostics log.", metric: `${stats.activeCount} active`, icon: BarChart3, action: () => router.push("/clat-exam?tab=reports"), cols: "md:col-span-2" },
    { title: "Accountability Hub", desc: "Discussion streams with law peers.", metric: "Connect", icon: Users, action: () => router.push("/clat-exam?tab=community"), cols: "md:col-span-1" },
  ];

  const next7DaysVelocityTrack = [
    { day: "DAY 01", task: "Deconstruct 2 leading national editorials and map out core structural premises.", done: true },
    { day: "DAY 02", task: "Review fundamental legal maxims and complete baseline retention quiz.", done: true },
    { day: "DAY 03", task: "Execute 30-minute timed logical reasoning module focused on assumption identification.", done: false },
    { day: "DAY 04", task: "Synthesize error log from Week 1 and generate target areas for weekend review.", done: false },
    { day: "DAY 05", task: "Run simulated mock sectional check for Quantitative Techniques parameters.", done: false },
    { day: "DAY 06", task: "Isolate fragile logic nodes with automated AI assistant feedback loop arrays.", done: false },
    { day: "DAY 07", task: "Execute target milestone objective verification test parameters.", done: false }
  ];

  const pipelineMilestones = [
    {
      week: 1,
      title: "Accuracy Foundation",
      tasks: [
        "Master core reading comprehension passage types (Science vs. Humanities).",
        "Establish baseline pacing strategy for Legal Reasoning sets.",
        "Complete fundamental conditional logic terminology review."
      ],
      metric: "Keep wrong selections under 3 per section."
    },
    {
      week: 2,
      title: "Velocity & Endurance Building",
      tasks: [
        "Practice multi-passage legal liability matrices under strict 8-minute cycles.",
        "Stabilize reading stamina thresholds across concurrent argument paths."
      ],
      metric: "Maintain strict pacing thresholds across successive modules."
    },
    {
      week: 3,
      title: "Peak Performance Synchronization",
      tasks: [
        "Run micro-diagnostic runs against weak modules.",
        "Minimize error recurrence on structural fallback loops."
      ],
      metric: "Zero error recurrence on identified fragile core items."
    }
  ];

  return (
    <div className="w-full px-6 py-0.5 space-y-12 animate-in fade-in duration-300 text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── SYSTEM SUBHEAD USER FOCUS ROW ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-0.5 text-left">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-serif">
            Welcome back, Learner.
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            System active for target node: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{profile?.targetNlu || "NLSIU Bangalore"} ({profile?.targetYear || "2026"})</span>.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-[#0C1222] border border-zinc-200 dark:border-white/5 p-1.5 px-3 rounded-none self-start sm:self-auto">
          <Switch
            checked={optedIn}
            disabled={isPending}
            id="update-opt-in"
            onCheckedChange={handleToggleOptIn}
            className="data-[state=checked]:bg-[#4169E1] data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-800 h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
          />
          <Label className="cursor-pointer text-[9px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 select-none" htmlFor="update-opt-in">
            {optedIn ? "Alerts Muted" : "Exam Alerts"}
          </Label>
        </div>
      </div>

      {/* ─── NEW HIGH-VISIBILITY AI HUB BANNER ─── */}
      <div className="w-full border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#0C1222] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
        <div className="text-left space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4169E1] animate-pulse" />
            <span className="text-[9px] font-bold tracking-widest text-[#4169E1] uppercase">
              AI Reasoning Workspace Engine
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Calibrate your baseline performance datasets with deep algorithmic diagnostic arrays.
          </p>
        </div>

        <button
          onClick={handleAIAnalysisRequest}
          className="w-full sm:w-auto h-9 px-4 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs rounded-none transition-all flex items-center justify-center gap-2 shrink-0 active:scale-[0.99] tracking-wide shadow-sm border border-transparent"
        >
          Initialize AI Core Diagnostic Matrix
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ─── ASYMMETRIC BENTO GRID: FOCUS HUB & ALERTS STREAM ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* RECOMMENDED CORE DIRECTIVE (8/12 Width) */}
        <Card className="lg:col-span-8 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-6 rounded-none shadow-none flex flex-col justify-between text-left space-y-5">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#4169E1] tracking-widest uppercase block">
              Recommended Action Rigor
            </span>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white font-serif tracking-tight">
              Execute 3 Timed Reading Drills
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
              Targeting your self-identified weak node in <span className="text-zinc-800 dark:text-zinc-200 font-medium">{profile?.weakestSection || "Legal Reasoning"}</span> passage comprehension vectors will stabilize pacing metrics.
            </p>
          </div>
          <button
            onClick={() => router.push("/clat-exam?tab=mock")}
            className="w-fit bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs rounded-none px-5 py-2.5 transition-colors active:scale-[0.99] tracking-wide border border-transparent"
          >
            Launch Active Drill
          </button>
        </Card>

        {/* BROADCAST TELEMETRY HUB (4/12 Width) */}
        <Card className="lg:col-span-4 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-6 rounded-none shadow-none text-left flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block border-b border-zinc-100 dark:border-white/5 pb-1 mb-3">
              System Broadcast Stream
            </span>
            {latestUpdate ? (
              <div className="space-y-1.5">
                <h4 className="font-bold text-zinc-900 dark:text-white text-sm line-clamp-2 tracking-tight">
                  {latestUpdate.title}
                </h4>
                <p className="text-zinc-500 dark:text-zinc-400 textxs leading-relaxed line-clamp-3">
                  {latestUpdate.content}
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">No telemetry notifications transmitted.</p>
            )}
          </div>
          {latestUpdate?.link && (
            <a
              href={latestUpdate.link}
              target="_blank"
              className="text-[11px] text-[#4169E1] dark:text-[#4169E1] font-bold flex items-center gap-1 hover:underline mt-4 pt-2 w-fit"
            >
              View Document <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </Card>
      </div>

      {/* ─── DENSE CORE HUD ANALYTICS MODULES ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* XP Telemetry Widget */}
        <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 rounded-none shadow-none text-left flex flex-col justify-between space-y-4">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">Ecosystem Practice XP</span>
            <span className="text-3xl font-bold font-serif text-zinc-900 dark:text-white">{profile?.xp || 25} Points</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
              <span>Track Progress</span>
              <span className="font-bold text-zinc-600 dark:text-zinc-300">{stats.totalCompleted} / 50</span>
            </div>
            <div className="h-1.5 rounded-none w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-[#4169E1] transition-all" style={{ width: `${Math.min((stats.totalCompleted / 50) * 100, 100)}%` }} />
            </div>
          </div>
        </Card>

        {/* Accuracy Matrix Widget */}
        <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 rounded-none shadow-none text-left flex flex-col justify-between space-y-4">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">Accuracy Quotient</span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold font-serif text-zinc-900 dark:text-white">{stats.accuracy || 25}%</span>
              <span className="text-[9px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wide">Live</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
              <span>Current Precision</span>
              <span className="font-bold text-zinc-600 dark:text-zinc-300">{stats.accuracy || 25}%</span>
            </div>
            <div className="h-1.5 rounded-none w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stats.accuracy || 25}%` }} />
            </div>
          </div>
        </Card>

        {/* Daily Tasks Dynamic Execution Widget */}
        <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 rounded-none shadow-none text-left flex flex-col justify-between space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-white/5 pb-1">
            <span className="text-[9px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">Daily Targets</span>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">{tasks.filter(t => t.isCompleted).length}/{tasks.length} Done</span>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-2.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={task.action}
                className="flex items-center justify-between text-xs cursor-pointer group/item"
              >
                <div className="flex items-center gap-2.5 truncate pr-1">
                  {task.isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 border border-zinc-300 dark:border-zinc-700 rounded-none shrink-0 group-hover/item:border-[#4169E1] transition-colors" />
                  )}
                  <span className={`truncate ${task.isCompleted ? "text-zinc-400 dark:text-zinc-500 line-through font-normal" : "text-zinc-700 dark:text-zinc-300 font-medium group-hover/item:text-[#4169E1] transition-colors"}`}>
                    {task.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">+{task.points}X</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── NEW INTERACTIVE INTERFACE: 7-DAY VELOCITY TRACK CAROUSEL ─── */}
      <div className="space-y-3 w-full text-left bg-zinc-50/40 dark:bg-[#0C1222]/40 p-5 border border-zinc-200/60 dark:border-white/5">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#4169E1]" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">
              Immediate 7-Day Velocity Track
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentTrackIndex(prev => Math.max(0, prev - 1))}
              disabled={currentTrackIndex === 0}
              className="p-1 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setCurrentTrackIndex(prev => Math.min(next7DaysVelocityTrack.length - 4, prev + 1))}
              disabled={currentTrackIndex >= next7DaysVelocityTrack.length - 4}
              className="p-1 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Horizontal Card Layout Grid Track */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden transition-all duration-300">
          {next7DaysVelocityTrack.slice(currentTrackIndex, currentTrackIndex + 4).map((item, idx) => (
            <div key={idx} className="p-4 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] flex flex-col justify-between min-h-[130px] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#4169E1] uppercase tracking-wider">
                  {item.day}
                </span>
                {item.done && <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />}
              </div>
              <p className={`text-[11.5px] leading-relaxed flex-1 ${item.done ? "text-zinc-400 dark:text-zinc-500 line-through decoration-zinc-300 dark:decoration-zinc-700" : "text-zinc-700 dark:text-zinc-300 font-medium"}`}>
                {item.task}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── NEW INTERACTIVE INTERFACE: MACRO MILESTONE PIPELINE ─── */}
      <div className="space-y-3 w-full text-left">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-1">
          <History className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">
            Macro Milestone Pipeline Schedules
          </span>
        </div>

        <div className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] divide-y divide-zinc-200 dark:divide-white/5">
          {pipelineMilestones.map((block) => {
            const isExpanded = activeWeekBlock === block.week;
            return (
              <div key={block.week} className="w-full">
                <button
                  onClick={() => setActiveWeekBlock(isExpanded ? null : block.week)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group"
                >
                  <h4 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200 font-serif">
                    Block 0{block.week} • {block.title}
                  </h4>
                  {isExpanded ? (
                    <ChevronLeft className="h-4 w-4 text-zinc-400 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-1 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul className="space-y-2">
                      {block.tasks.map((task, tIdx) => (
                        <li key={tIdx} className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 rounded-none border-zinc-300 dark:border-zinc-700 text-[#4169E1] focus:ring-0 cursor-pointer bg-white dark:bg-[#0C1222]"
                          />
                          <span className="leading-relaxed">{task}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-[#0C1222]/60 border border-zinc-100 dark:border-white/5 p-2.5 px-3">
                      <div className="h-3 w-3 rounded-full border border-[#4169E1] flex items-center justify-center shrink-0">
                        <div className="h-1 w-1 rounded-full bg-[#4169E1]" />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        Target Metric: {block.metric}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── ECOSYSTEM WORKSPACE BENTO CARDS MATRIX ─── */}
      <div className="space-y-3 text-left pt-2">
        <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block border-b border-zinc-100 dark:border-white/5 pb-1">
          Ecosystem Workspace Array Options
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {bentoWorkspaceCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                onClick={card.action}
                type="button"
                className={`group border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 flex flex-col justify-between text-left transition-all hover:border-[#4169E1] dark:hover:border-[#4169E1] hover:bg-zinc-50/20 dark:hover:bg-white/5 min-h-[125px] rounded-none ${card.cols}`}
              >
                <div className="flex justify-between items-start w-full gap-2">
                  <div className="p-2 border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0C1222] text-zinc-500 dark:text-zinc-400 group-hover:bg-[#4169E1] group-hover:border-[#4169E1] group-hover:text-white transition-all">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-mono bg-zinc-100 dark:bg-white/5 px-2 py-0.5 uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold border border-zinc-200/40 dark:border-white/10">
                    {card.metric}
                  </span>
                </div>
                <div className="space-y-0.5 mt-3">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-serif group-hover:text-[#4169E1] transition-colors flex items-center gap-1">
                    {card.title}
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#4169E1]" />
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-2 leading-relaxed font-normal">
                    {card.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}