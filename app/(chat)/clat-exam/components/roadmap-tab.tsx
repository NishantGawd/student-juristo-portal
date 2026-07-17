"use client";

import {
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MapIcon,
  PenLine,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
  Activity,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateRoadmapAction } from "../actions";
import { CLAT_SECTIONS } from "../clat-config";

type Roadmap = {
  overview: string;
  targetScore: string;
  next7Days: string[];
  sectionPriorities: {
    section: string;
    priority: string;
    reason: string;
    weeklyHours: number;
  }[];
  weeks: {
    week: number;
    title: string;
    focus: string;
    tasks: string[];
    mockPlan: string;
    successMetric: string;
  }[];
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

type RoadmapCacheEntry = {
  key: string;
  roadmap: Roadmap;
  status: Extract<LoadStatus, "ready" | "error">;
};

let cachedRoadmap: RoadmapCacheEntry | null = null;
let cachedRoadmapRequest: {
  key: string;
  promise: Promise<{
    roadmap: Roadmap;
    status: Extract<LoadStatus, "ready" | "error">;
    fallback?: boolean;
    error?: string;
  }>;
} | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const cleaned = value.filter(
    (item): item is string => typeof item === "string"
  );
  return cleaned.length > 0 ? cleaned : fallback;
}

function buildClientFallbackRoadmap(
  profile: any,
  completedCount: number
): Roadmap {
  const weakSection = profile?.weakestSection || "Legal Reasoning";
  const targetNlu = profile?.targetNlu || "your target NLU";

  return {
    overview: `Diagnostic indicators verify that optimizing your processing speed in ${weakSection} is your critical bottleneck to mitigating negative-marking leakage. This tactical configuration enforces structural isolation on passage-heavy comprehension vectors while systematically anchoring your cross-sectional pacing mechanics. Isolating these systemic error gaps will stabilize your framework path as we scale your baseline toward ${targetNlu}.`,
    targetScore:
      completedCount > 0
        ? "Push accuracy first, then increase attempts while keeping wrong answers under control."
        : "Start with a 20-question baseline, then move into weekly section drills and one full mock.",
    next7Days: [
      `Execute 3 high-intensity ${weakSection} sectional drills, log incorrect selections in an error journal, and isolate distractor traps.`,
      "Deconstruct 2 leading national editorials, map out primary assumptions, and draft a 5-line structural argument premise map.",
      "Review 30 premium current affairs index vectors from the past 6 months, prioritizing landmark Supreme Court judgments and bills.",
      "Solve 4 complex Quantitative Technique caselet tables under a strict 12-minute timer to eliminate rough calculator dependence.",
      "Run a 20-question mixed syllabus diagnostic sprint, managing pacing stress to leave no more than 2 items unattempted.",
      "Audit your weekly error ledger, re-attempt every failed option choice from scratch, and identify recurring logic flaws.",
      "Conduct a targeted deep-dive concept review on your weakest topic and validate your retention using an interactive custom drill."
    ],
    sectionPriorities: CLAT_SECTIONS.map((section) => ({
      section: section.name,
      priority: section.name === weakSection ? "High" : "Balanced",
      reason:
        section.name === weakSection
          ? "This is marked as your weak area and needs the first study block."
          : section.description,
      weeklyHours: section.name === weakSection ? 5 : 3,
    })),
    weeks: [1, 2, 3, 4, 5, 6].map((week) => ({
      week,
      title:
        week <= 2
          ? "Accuracy foundation"
          : week <= 4
            ? "Timed section control"
            : "Full mock refinement",
      focus:
        week % 3 === 1
          ? weakSection
          : CLAT_SECTIONS[week % CLAT_SECTIONS.length].name,
      tasks: [
        "Complete two sectional drills and review explanations.",
        "Keep a mistake notebook with trap type and corrected reasoning.",
        "Revise current affairs and legal vocabulary for 30 minutes daily.",
        "Attempt one timed mixed quiz and analyze skipped questions.",
      ],
      mockPlan:
        week % 2 === 0
          ? "Take one full-length mock this week."
          : "Take two 20-question mini mocks this week.",
      successMetric:
        "Improve attempted-question accuracy by 5% or reduce wrong answers by at least 3.",
    })),
  };
}

function sanitizeRoadmap(
  value: unknown,
  profile: any,
  completedCount: number
): Roadmap {
  const fallback = buildClientFallbackRoadmap(profile, completedCount);

  if (!isRecord(value)) {
    return fallback;
  }

  const sectionPriorities = Array.isArray(value.sectionPriorities)
    ? value.sectionPriorities.filter(isRecord).map((item, index) => ({
      section:
        typeof item.section === "string"
          ? item.section
          : CLAT_SECTIONS[index % CLAT_SECTIONS.length].name,
      priority:
        typeof item.priority === "string" ? item.priority : "Balanced",
      reason:
        typeof item.reason === "string"
          ? item.reason
          : CLAT_SECTIONS[index % CLAT_SECTIONS.length].description,
      weeklyHours:
        typeof item.weeklyHours === "number" &&
          Number.isFinite(item.weeklyHours)
          ? item.weeklyHours
          : 3,
    }))
    : fallback.sectionPriorities;

  const weeks = Array.isArray(value.weeks)
    ? value.weeks.filter(isRecord).map((item, index) => ({
      week:
        typeof item.week === "number" && Number.isFinite(item.week)
          ? item.week
          : index + 1,
      title:
        typeof item.title === "string" ? item.title : `Week ${index + 1}`,
      focus:
        typeof item.focus === "string" ? item.focus : fallback.weeks[0].focus,
      tasks: stringArray(item.tasks, fallback.weeks[0].tasks).slice(0, 6),
      mockPlan:
        typeof item.mockPlan === "string"
          ? item.mockPlan
          : fallback.weeks[0].mockPlan,
      successMetric:
        typeof item.successMetric === "string"
          ? item.successMetric
          : fallback.weeks[0].successMetric,
    }))
    : fallback.weeks;

  return {
    overview:
      typeof value.overview === "string" ? value.overview : fallback.overview,
    targetScore:
      typeof value.targetScore === "string"
        ? value.targetScore
        : fallback.targetScore,
    next7Days: stringArray(value.next7Days, fallback.next7Days).slice(0, 7),
    sectionPriorities:
      sectionPriorities.length > 0
        ? sectionPriorities
        : fallback.sectionPriorities,
    weeks: weeks.length > 0 ? weeks : fallback.weeks,
  };
}

function StudyRoadmapLoader() {
  return (
    <Card className="border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#0C1222] rounded-none shadow-none">
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto space-y-6">
        <div className="relative h-16 w-16 flex items-center justify-center">
          <div className="absolute inset-0 border border-[#4169E1]/30 animate-spin [animation-duration:3s] rounded-none" />
          <BrainCircuit className="h-6 w-6 text-[#4169E1]" />
        </div>
        <div className="space-y-1.5">
          <h4 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">Assembling Study Architecture</h4>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-normal">
            Auditing mock matrices, scaling sectional priority values, and mapping your NLU target blueprint...
          </p>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-none overflow-hidden">
          <div className="h-full bg-[#4169E1] w-2/3 animate-pulse rounded-none" />
        </div>
      </div>
    </Card>
  );
}

export function RoadmapTab({
  profile,
  pastQuizzes,
  isActive = true,
}: {
  profile: any;
  pastQuizzes: any[];
  isActive?: boolean;
}) {
  const completedCount = pastQuizzes.filter(
    (quiz) => quiz.status === "completed"
  ).length;
  const cacheKey = JSON.stringify({
    completedCount,
    targetExam: profile?.targetExam,
    targetNlu: profile?.targetNlu,
    targetYear: profile?.targetYear,
    weakestSection: profile?.weakestSection,
  });
  const [roadmap, setRoadmap] = useState<Roadmap | null>(() =>
    cachedRoadmap?.key === cacheKey ? cachedRoadmap.roadmap : null
  );
  const [status, setStatus] = useState<LoadStatus>(() =>
    cachedRoadmap?.key === cacheKey ? cachedRoadmap.status : "idle"
  );
  const inFlightRef = useRef(false);
  const hasAutoLoadedRef = useRef(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [activeWeekBlock, setActiveWeekBlock] = useState<number | null>(1);

  const nextTrackCard = () => {
    if (roadmap && currentTrackIndex < roadmap.next7Days.length - 1) {
      setCurrentTrackIndex((prev) => prev + 1);
    }
  };

  const prevTrackCard = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex((prev) => prev - 1);
    }
  };

  const loadRoadmap = useCallback(
    async (silent = false, force = false) => {
      if (inFlightRef.current) return;

      if (!force && cachedRoadmap?.key === cacheKey) {
        setRoadmap(cachedRoadmap.roadmap);
        setStatus(cachedRoadmap.status);
        return;
      }

      inFlightRef.current = true;
      setStatus("loading");

      try {
        if (!cachedRoadmapRequest || cachedRoadmapRequest.key !== cacheKey) {
          cachedRoadmapRequest = {
            key: cacheKey,
            promise: generateRoadmapAction().then((actionResult) => {
              if (actionResult?.roadmap) {
                return {
                  roadmap: sanitizeRoadmap(
                    actionResult.roadmap,
                    profile,
                    completedCount
                  ),
                  status: "ready" as const,
                  fallback: actionResult.fallback,
                };
              }
              return {
                roadmap: buildClientFallbackRoadmap(profile, completedCount),
                status: "error" as const,
                error:
                  actionResult?.error ||
                  "Using a local roadmap because AI output was unavailable.",
              };
            }),
          };
        }

        const result = await cachedRoadmapRequest.promise;
        cachedRoadmap = {
          key: cacheKey,
          roadmap: result.roadmap,
          status: result.status,
        };
        setRoadmap(result.roadmap);
        setStatus(result.status);

        if (!silent) {
          if (result.status === "ready") {
            toast.success(
              result.fallback
                ? "Roadmap generated from your quiz data."
                : "AI roadmap generated."
            );
          } else {
            toast.error(result.error);
          }
        }
      } catch {
        const fallback = buildClientFallbackRoadmap(profile, completedCount);
        cachedRoadmap = {
          key: cacheKey,
          roadmap: fallback,
          status: "error",
        };
        setRoadmap(fallback);
        setStatus("error");
        toast.error("Using a local roadmap because AI generation failed.");
      } finally {
        inFlightRef.current = false;
        if (cachedRoadmapRequest?.key === cacheKey) {
          cachedRoadmapRequest = null;
        }
      }
    },
    [cacheKey, completedCount, profile]
  );

  useEffect(() => {
    if (!isActive || hasAutoLoadedRef.current) return;
    hasAutoLoadedRef.current = true;
    loadRoadmap(true);
  }, [isActive, loadRoadmap]);

  return (
    <div className="w-full px-6 py-0.5 space-y-12 animate-in fade-in duration-300 text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── TITLE HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-zinc-100 dark:border-white/5 pb-6">
        <div className="space-y-1.5 text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-serif">
            Personalized Learning Roadmap
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Continuous timeline generation calibrated by your dynamic target parameters.
          </p>
        </div>
      </div>

      {/* ─── INTERACTIVE ENGINE CONTROL HEAD BAR ─── */}
      <div className="w-full border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#0C1222] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 select-none rounded-none shadow-2xs">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2.5">
            <BrainCircuit className="h-4 w-4 text-[#4169E1]" />
            <span className="text-[10px] font-bold tracking-widest text-[#4169E1] uppercase">
              Adaptive Study Optimization Architecture Active
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Continuous timeline optimization sequences calibrated by target campus parameters, subject mistake histories, and pacing risk elements.
          </p>
        </div>

        <button
          disabled={status === "loading"}
          onClick={() => loadRoadmap(false, true)}
          className="h-10 px-4 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] hover:bg-zinc-50 dark:hover:bg-white/5 font-medium text-xs uppercase tracking-wider transition-colors rounded-none flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] tracking-wide text-zinc-700 dark:text-zinc-300 shrink-0 select-none cursor-pointer shadow-none"
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Regenerate Plan
        </button>
      </div>

      {status === "loading" && !roadmap ? (
        <StudyRoadmapLoader />
      ) : roadmap ? (
        <>
          {status === "error" && (
            <div className="border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-none tracking-wide text-left select-none">
              System running cached local directive baseline arrays.
            </div>
          )}

          {/* ─── HIGH-GRADE ASYMMETRIC PIPELINE INTERFACE ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">

            {/* LEFT COMMAND SIDEBAR PANEL (Takes 4/12 width) */}
            <div className="lg:col-span-4 flex flex-col gap-5 h-auto w-full">

              {/* Executive Objectives Node */}
              <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none p-6 text-left space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-2 select-none">
                  <MapIcon className="h-4 w-4 text-[#4169E1]" />
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Directives Core</span>
                </div>
                <div className="space-y-4 pt-0.5">
                  <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed tracking-wide font-normal font-serif">
                    {roadmap.overview}
                  </p>
                  <div className="border border-[#4169E1]/10 bg-zinc-50 dark:bg-[#080D1A]/60 px-4 py-3 text-xs leading-relaxed text-[#4169E1] rounded-none font-bold">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1 font-sans">Target Milestone Objective</span>
                    {roadmap.targetScore}
                  </div>
                </div>
              </Card>

              {/* Real-Time Metrics Anchor Blocks */}
              <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none p-5 flex flex-col gap-4 text-left">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-2 w-full select-none">
                  <Target className="h-4 w-4 text-emerald-500" />
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Telemetry Metrics</span>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full py-1">
                  <div className="flex justify-between items-center border border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-[#080D1A]/60 px-4 py-3 rounded-none">
                    <div className="flex items-center gap-2.5 select-none">
                      <Activity className="h-4 w-4 text-[#4169E1]" />
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Finalized Runs</span>
                    </div>
                    <strong className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">{completedCount} Tests</strong>
                  </div>

                  <div className="flex justify-between items-center border border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-[#080D1A]/60 px-4 py-3 rounded-none">
                    <div className="flex items-center gap-2.5 select-none">
                      <BrainCircuit className="h-4 w-4 text-amber-500" />
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Fragile Node</span>
                    </div>
                    <strong className="text-right text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{profile?.weakestSection || "Unset"}</strong>
                  </div>

                  <div className="flex justify-between items-center border border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-[#080D1A]/60 px-4 py-3 rounded-none">
                    <div className="flex items-center gap-2.5 select-none">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Current XP</span>
                    </div>
                    <strong className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">{profile?.xp || 0} XP</strong>
                  </div>

                  <div className="flex justify-between items-center border border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-[#080D1A]/60 px-4 py-3 rounded-none">
                    <div className="flex items-center gap-2.5 select-none">
                      <GraduationCap className="h-4 w-4 text-emerald-500" />
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Rank Level</span>
                    </div>
                    <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{profile?.achievementLevel || "Aspirant"}</strong>
                  </div>
                </div>
              </Card>

              {/* Allocation Weights Module */}
              <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none p-5 shrink-0 flex flex-col w-full">
                <div className="flex flex-col h-full w-full">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block border-b border-zinc-100 dark:border-white/5 pb-2 shrink-0 select-none">
                    Priority Hour Splits
                  </span>

                  {/* Scrollable container restricted to exactly 3 visible elements */}
                  <div className="flex flex-col gap-3 pt-3 overflow-y-auto max-h-[265px] scrollbar-none">
                    {roadmap.sectionPriorities.map((item) => (
                      <div
                        className="border border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-[#080D1A]/60 p-3.5 rounded-none flex items-center justify-between gap-4 shrink-0 transition-colors hover:border-[#4169E1]/20"
                        key={item.section}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate font-serif">{item.section}</p>
                          <p className="text-zinc-400 dark:text-zinc-500 text-[11px] font-normal line-clamp-1 leading-tight">{item.reason}</p>
                        </div>
                        <Badge className="rounded-none border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 shrink-0 shadow-none" variant="secondary">
                          {item.weeklyHours}h
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

            </div>

            {/* RIGHT PIPELINE PANEL (Takes 8/12 width) */}
            <div className="lg:col-span-8 flex flex-col gap-6 h-full w-full">

              {/* ─── IMMEDIATE 7-DAY VELOCITY TRACK CAROUSEL ─── */}
              <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 shadow-none w-full relative overflow-hidden rounded-none">
                <div className="space-y-4 w-full">

                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2.5 select-none w-full">
                    <div className="flex items-center gap-2 text-left">
                      <CalendarDays className="h-4 w-4 text-[#4169E1]" />
                      <h3 className="font-bold text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Immediate 7-Day Velocity Track</h3>
                    </div>

                    {/* Directional Navigation Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={prevTrackCard}
                        disabled={currentTrackIndex === 0}
                        type="button"
                        className="h-7 w-7 rounded-none p-0 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-700 dark:text-zinc-300 flex items-center justify-center cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextTrackCard}
                        disabled={roadmap ? currentTrackIndex >= roadmap.next7Days.length - 1 : true}
                        type="button"
                        className="h-7 w-7 rounded-none p-0 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-700 dark:text-zinc-300 flex items-center justify-center cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Viewport Dynamic Sliding Windows Frame */}
                  <div className="w-full overflow-hidden relative rounded-none">
                    <div
                      className="flex gap-4 transition-transform duration-300 ease-out w-full"
                      style={{ transform: `translateX(-${currentTrackIndex * 376}px)` }}
                    >
                      {roadmap.next7Days.map((task, index) => (
                        <div
                          className="border border-zinc-200/60 dark:border-white/5 bg-zinc-50/40 dark:bg-[#080D1A] p-5 min-w-[360px] max-w-[360px] min-h-[130px] flex flex-col justify-between items-start rounded-none shrink-0 relative transition-colors hover:border-[#4169E1]/20 group/card"
                          key={`${index}-${task}`}
                        >
                          <div className="h-5.5 px-2 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono text-[9px] font-bold shadow-none select-none border border-emerald-500/10 tracking-widest uppercase">
                            DAY 0{index + 1}
                          </div>

                          <p className="text-zinc-700 dark:text-zinc-200 text-xs font-medium leading-relaxed tracking-wide text-left mt-3.5 mb-0.5 whitespace-normal break-words w-full flex-1">
                            {task}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </Card>

              {/* ─── MACRO MILESTONE PIPELINE SCHEDULES ─── */}
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pt-6 pb-1.5 select-none w-full text-left">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">Macro Milestone Pipeline Schedules</span>
                    <p className="text-zinc-400 dark:text-zinc-500 text-[11px]">Select a strategy block row below to expand operational milestones.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-none font-mono text-[10px] font-bold px-2.5 py-1 border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] shadow-none">
                    {roadmap.weeks.length} Blocks Calibrated
                  </Badge>
                </div>

                <div className="space-y-2.5 w-full">
                  {roadmap.weeks.map((week) => {
                    const isExpanded = activeWeekBlock === week.week;

                    return (
                      <div
                        key={`${week.week}-${week.title}`}
                        className="flex items-center gap-4 w-full group cursor-pointer"
                        onClick={() => setActiveWeekBlock(isExpanded ? null : week.week)}
                      >
                        {/* Timeline status indicator */}
                        <div
                          className={[
                            "h-3.5 w-3.5 rounded-full border-2 transition-all duration-300 shrink-0 shadow-none",
                            isExpanded
                              ? "border-[#4169E1] bg-[#4169E1]"
                              : "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
                          ].join(" ")}
                        />

                        {/* Interactive Accordion Panel Card Container */}
                        <Card
                          className={[
                            "border bg-white dark:bg-[#0C1222] text-left transition-colors duration-200 flex-1 min-w-0 rounded-none shadow-none overflow-hidden",
                            isExpanded
                              ? "border-[#4169E1]/40 p-5 bg-zinc-50/10 dark:bg-[#0C1222]/80"
                              : "border-zinc-200/70 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-500/5 px-5 py-4"
                          ].join(" ")}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">

                            {/* Left Content Column Matrix */}
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 select-none font-mono text-[9px] font-bold">
                                <span className={[
                                  "text-xs font-black uppercase tracking-wider transition-colors",
                                  isExpanded ? "text-[#4169E1]" : "text-zinc-400 dark:text-zinc-500"
                                ].join(" ")}>
                                  Block 0{week.week}
                                </span>

                                <Badge className="rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-2 py-0.5 uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shadow-none" variant="outline">
                                  {week.focus}
                                </Badge>

                                <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>

                                <span className="text-zinc-400 dark:text-zinc-500 tracking-wide normal-case font-sans font-medium text-[11px]">
                                  {week.mockPlan}
                                </span>
                              </div>

                              <h4 className="font-bold text-sm tracking-tight text-zinc-800 dark:text-zinc-200 font-serif">
                                {week.title}
                              </h4>

                              {/* CONDITIONAL DROPDOWN CONTENT */}
                              {isExpanded && (
                                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200 w-full">
                                  <ul className="space-y-2 text-zinc-500 dark:text-zinc-400 text-xs font-normal leading-relaxed border-t border-zinc-100 dark:border-white/5 pt-3.5 w-full font-sans">
                                    {week.tasks.slice(0, 4).map((task, idx) => (
                                      <li className="flex items-start gap-2.5" key={`${idx}-${task}`}>
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#4169E1]/70 rounded-none" />
                                        <span className="flex-1 whitespace-normal break-words">{task}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Right Dynamic Metric Block */}
                            {isExpanded ? (
                              <div className="border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-black/20 p-3 font-semibold text-[11px] text-zinc-500 dark:text-zinc-400 shadow-none select-none max-w-full sm:max-w-[175px] text-left sm:text-right shrink-0 flex flex-col justify-center gap-0.5 animate-in fade-in duration-200 rounded-none">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block leading-none">Target Metric</span>
                                <span className="leading-normal font-sans text-xs font-medium text-zinc-600 dark:text-zinc-400">{week.successMetric}</span>
                              </div>
                            ) : (
                              <div className="hidden md:flex items-center gap-1.5 shrink-0 select-none text-zinc-400 dark:text-zinc-500 font-medium text-[11px] font-sans">
                                <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Target:</span>
                                <span className="truncate max-w-[150px] font-semibold text-zinc-600 dark:text-zinc-400">{week.successMetric}</span>
                                <ChevronRight className="h-3.5 w-3.5 ml-1 text-zinc-300 dark:text-zinc-700 transition-transform group-hover:translate-x-0.5" />
                              </div>
                            )}

                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        </>
      ) : (
        <Card className="border border-dashed border-zinc-200 dark:border-white/10 p-12 text-center text-zinc-400 dark:text-zinc-500 text-xs flex flex-col items-center justify-center gap-2 select-none bg-zinc-50/10 rounded-none">
          <MapIcon className="h-5 w-5 opacity-30" />
          <span>Set your core profile parameters to compile target roadmap layouts.</span>
        </Card>
      )}
    </div>
  );
}