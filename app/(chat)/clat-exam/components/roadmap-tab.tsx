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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="overflow-hidden border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/20 backdrop-blur-md rounded-2xl">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto space-y-6">
        <div className="relative h-20 w-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-xl border border-[#4169E1]/30 animate-spin [animation-duration:3s]" />
          <BrainCircuit className="h-8 w-8 text-[#4169E1]" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-lg text-zinc-900 dark:text-white">Assembling Study Architecture</h4>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Auditing mock matrices, scaling sectional priority values, and mapping your NLU target blueprint...
          </p>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-[#4169E1] rounded-full w-2/3 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

// 2. Clear out the floating hooks that were here, and declare the component:
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

  // ✨ PASTE THE SLIDER LOGIC HERE INSIDE THE COMPONENT SCOPE ✨
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [activeWeekBlock, setActiveWeekBlock] = useState<number | null>(1);

  const nextTrackCard = () => {
    // Optional chaining added to safely check roadmap arrays during dynamic async load states
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
    <div className="fade-in slide-in-from-bottom-4 flex animate-in flex-col gap-6 pb-16 duration-500 w-full text-zinc-900 dark:text-zinc-100 select-none">

      {/* ─── TITLE CORE CONTROLLER BANNER ─── */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A]/40 backdrop-blur-md relative">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#4169E1]/5 to-transparent pointer-events-none" />

        <div className="flex flex-col gap-6 p-6 md:p-8 md:flex-row md:items-center md:justify-between relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4169E1]/20 bg-[#4169E1]/10 px-3 py-1 text-xs font-bold text-[#4169E1] shadow-3xs uppercase tracking-wider">
              <BrainCircuit className="h-3.5 w-3.5" />
              Adaptive Study Optimization Architecture Active
            </div>

            <div className="space-y-1.5">
              <h2 className="font-black text-2xl md:text-3xl tracking-tight text-zinc-900 dark:text-white">
                Personalized Learning Roadmap
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-[14px] leading-relaxed font-normal">
                Continuous timeline generation calibrated by your target campus tier, identified fragile subjects, recorded baseline mistake logs, and negative-marking risk vectors.
              </p>
            </div>
          </div>

          <Button
            disabled={status === "loading"}
            onClick={() => loadRoadmap(false, true)}
            className="h-10 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] hover:bg-zinc-50 dark:hover:bg-white/5 font-bold text-xs uppercase tracking-wider shadow-2xs flex items-center gap-2 cursor-pointer text-zinc-800 dark:text-zinc-200 shrink-0"
          >
            {status === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Regenerate Plan
          </Button>
        </div>
      </section>

      {status === "loading" && !roadmap ? (
        <StudyRoadmapLoader />
      ) : roadmap ? (
        <>
          {status === "error" && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-3xs">
              System running cached local directive baseline arrays.
            </div>
          )}

          {/* ─── HIGH-GRADE ASYMMETRIC PIPELINE INTERFACE ─── */}
          {/* Changed items-stretch to items-start to prevent left panel cards from layout-stretching */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">

            {/* LEFT COMMAND SIDEBAR PANEL (Takes 4/12 width) */}
            <div className="lg:col-span-4 flex flex-col gap-5 h-auto w-full">

              {/* Executive Objectives Node (Text loosened for premium feel) */}
              <Card className="border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/30 rounded-2xl shadow-3xs p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#4169E1]/5 to-transparent pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/5 pb-2">
                    <MapIcon className="h-4 w-4 text-[#4169E1]" />
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Directives Core</span>
                  </div>
                  <div className="space-y-4 pt-0.5">
                    <p className="text-zinc-600 dark:text-zinc-300 text-[14.5px] leading-relaxed tracking-wide font-normal">
                      {roadmap.overview}
                    </p>
                    <div className="rounded-xl border border-[#4169E1]/10 bg-white dark:bg-[#080D1A]/60 px-4 py-3 font-bold text-xs leading-relaxed text-[#4169E1] shadow-3xs">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">Target Milestone Objective</span>
                      {roadmap.targetScore}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Real-Time Metrics Anchor Blocks (Populated to fill the layout gaps) */}
              <Card className="border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/30 rounded-2xl shadow-3xs p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/5 pb-2 w-full">
                  <Target className="h-4 w-4 text-emerald-500" />
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Telemetry Metrics</span>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full py-1">
                  <div className="flex justify-between items-center rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/60 px-4 py-3 shadow-3xs">
                    <div className="flex items-center gap-2.5">
                      <Activity className="h-4 w-4 text-[#4169E1]" />
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Finalized Runs</span>
                    </div>
                    <strong className="font-mono text-sm font-black text-zinc-800 dark:text-zinc-200">{completedCount} Tests</strong>
                  </div>

                  <div className="flex justify-between items-center rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/60 px-4 py-3 shadow-3xs">
                    <div className="flex items-center gap-2.5">
                      <BrainCircuit className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Fragile Node</span>
                    </div>
                    <strong className="text-right text-xs font-black text-amber-500 dark:text-amber-400">{profile?.weakestSection || "Unset"}</strong>
                  </div>

                  <div className="flex justify-between items-center rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/60 px-4 py-3 shadow-3xs">
                    <div className="flex items-center gap-2.5">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Current XP</span>
                    </div>
                    <strong className="font-mono text-sm font-black text-zinc-800 dark:text-zinc-200">{profile?.xp || 0} XP</strong>
                  </div>

                  <div className="flex justify-between items-center rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/60 px-4 py-3 shadow-3xs">
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Rank Level</span>
                    </div>
                    <strong className="text-xs font-black text-zinc-800 dark:text-zinc-200">{profile?.achievementLevel || "Aspirant"}</strong>
                  </div>
                </div>
              </Card>

              {/* Allocation Weights Module (Vertically Stretched & Filled) */}
              <Card className="border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/30 rounded-2xl shadow-3xs p-5 flex-1 flex flex-col min-h-[320px]">
                <div className="flex flex-col h-full flex-1">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block border-b border-zinc-200 dark:border-white/5 pb-2 shrink-0">
                    Priority Hour Splits
                  </span>

                  {/* Flex distributed layout to fill inner vertical space perfectly */}
                  <div className="flex-1 flex flex-col justify-between gap-3 pt-3">
                    {roadmap.sectionPriorities.map((item) => (
                      <div
                        className="rounded-xl border border-zinc-200/40 dark:border-white/5 bg-white dark:bg-[#080D1A]/60 p-3.5 shadow-3xs flex items-center justify-between gap-4 flex-1 transition-all hover:border-[#4169E1]/20"
                        key={item.section}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-bold text-[13.5px] text-zinc-800 dark:text-zinc-200 truncate">{item.section}</p>
                          <p className="text-zinc-400 dark:text-zinc-500 text-[11px] font-normal line-clamp-1 leading-tight">{item.reason}</p>
                        </div>
                        <Badge className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 shrink-0 shadow-3xs" variant="secondary">
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

              {/* ─── IMMEDIATE 7-DAY VELOCITY TRACK CAROUSEL (Premium Widescreen Track layout) ─── */}
              <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 backdrop-blur-md rounded-2xl p-5 shadow-xs w-full relative overflow-hidden">
                <div className="space-y-4 w-full">

                  {/* Carousel Header Strip with Premium Integrated Control Switches */}
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2.5 select-none w-full">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#4169E1]" />
                      <h3 className="font-black text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Immediate 7-Day Velocity Track</h3>
                    </div>

                    {/* Directional Navigation Triggers */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        onClick={prevTrackCard}
                        disabled={currentTrackIndex === 0}
                        type="button"
                        className="h-7 w-7 rounded-lg p-0 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-zinc-700 dark:text-zinc-300"
                        variant="outline"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={nextTrackCard}
                        disabled={roadmap ? currentTrackIndex >= roadmap.next7Days.length - 1 : true}
                        type="button"
                        className="h-7 w-7 rounded-lg p-0 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-zinc-700 dark:text-zinc-300"
                        variant="outline"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Viewport Dynamic Sliding Windows Frame */}
                  <div className="w-full overflow-hidden relative rounded-xl">
                    <div
                      className="flex gap-4 transition-transform duration-300 ease-out w-full"
                      /* Fixed Math: (360px card width + 16px gap) = 376px translation multiplier */
                      style={{ transform: `translateX(-${currentTrackIndex * 376}px)` }}
                    >
                      {roadmap.next7Days.map((task, index) => (
                        <div
                          className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A] p-5 min-w-[360px] max-w-[360px] min-h-[120px] flex flex-col justify-between items-start shadow-3xs shrink-0 relative transition-all hover:border-[#4169E1]/20 group/card"
                          key={`${index}-${task}`}
                        >
                          {/* Top Metric Pillar Day Marker Capsule */}
                          <div className="h-5.5 px-2 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-mono text-[10px] font-black shadow-3xs select-none border border-emerald-500/10 tracking-wider">
                            DAY 0{index + 1}
                          </div>

                          {/* Loose Premium Tracking Copy (Completely stretched horizontally with ample breathing room) */}
                          <p className="text-zinc-700 dark:text-zinc-200 text-[13.5px] font-semibold leading-relaxed tracking-wide text-left mt-3.5 mb-0.5 whitespace-normal break-words w-full flex-1">
                            {task}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </Card>

              {/* ─── MACRO MILESTONE PIPELINE SCHEDULES (Premium SaaS Interactive Accordion Deck) ─── */}
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pt-10 pb-2 select-none w-full">
                  <div className="space-y-0.5">
                    <h3 className="font-black text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Macro Milestone Pipeline Schedules</h3>
                    <p className="text-zinc-400 dark:text-zinc-500 text-[11px]">Select a strategy block row below to expand granular milestones.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-md font-mono text-[10px] font-bold px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#080D1A]">
                    {roadmap.weeks.length} Phases Calibrated
                  </Badge>
                </div>

                {/* Clear block elements running in a zero-whitespace vertical sequence */}
                <div className="space-y-2.5 w-full">
                  {roadmap.weeks.map((week) => {
                    const isExpanded = activeWeekBlock === week.week;

                    return (
                      <div
                        key={`${week.week}-${week.title}`}
                        className="flex items-center gap-3.5 w-full group cursor-pointer"
                        onClick={() => setActiveWeekBlock(isExpanded ? null : week.week)}
                      >
                        {/* Timeline Status Dot Dynamic Indicator */}
                        <div
                          className={[
                            "h-3.5 w-3.5 rounded-full border-2 transition-all duration-300 shadow-3xs shrink-0",
                            isExpanded
                              ? "border-[#4169E1] bg-[#4169E1]"
                              : "border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#080D1A] group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
                          ].join(" ")}
                        />

                        {/* Interactive Accordion Panel Card Container */}
                        <Card
                          className={[
                            "rounded-xl border bg-white dark:bg-[#080D1A]/40 text-left transition-all duration-300 flex-1 min-w-0 shadow-3xs overflow-hidden",
                            isExpanded
                              ? "border-[#4169E1]/40 ring-1 ring-[#4169E1]/10 p-5"
                              : "border-zinc-200/70 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-500/5 px-4.5 py-3.5"
                          ].join(" ")}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">

                            {/* Left Content Column Matrix */}
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 select-none">
                                <span className={[
                                  "font-mono text-xs font-black uppercase tracking-wider transition-colors",
                                  isExpanded ? "text-[#4169E1]" : "text-zinc-400 dark:text-zinc-500"
                                ].join(" ")}>
                                  Block 0{week.week}
                                </span>

                                <Badge className="rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-2 py-0.2 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 shadow-3xs" variant="outline">
                                  {week.focus}
                                </Badge>

                                <span className="text-zinc-300 dark:text-zinc-700 text-xs hidden sm:inline">•</span>

                                <span className="text-[11px] font-medium font-mono text-zinc-400 dark:text-zinc-500 whitespace-normal normal-case">
                                  {week.mockPlan}
                                </span>
                              </div>

                              <h4 className="font-bold text-[14.5px] tracking-tight text-zinc-800 dark:text-zinc-200">
                                {week.title}
                              </h4>

                              {/* CONDITIONAL DROPDOWN CONTENT: Expands clean tasks only when active */}
                              {isExpanded && (
                                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200 w-full">
                                  <ul className="space-y-2 text-zinc-500 dark:text-zinc-400 text-[12.5px] font-normal leading-relaxed border-t border-zinc-100 dark:border-white/5 pt-3 w-full">
                                    {week.tasks.slice(0, 4).map((task, idx) => (
                                      <li className="flex items-start gap-2.5" key={`${idx}-${task}`}>
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4169E1]/70" />
                                        <span className="flex-1 whitespace-normal break-words">{task}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Right Dynamic Content Column Matrix */}
                            {isExpanded ? (
                              /* Expanded Layout: Full floating metric container box */
                              <div className="rounded-xl border border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 p-3 font-semibold text-[11px] text-zinc-500 dark:text-zinc-400 shadow-3xs select-none max-w-full sm:max-w-[175px] text-left sm:text-right shrink-0 flex flex-col justify-center gap-0.5 animate-in fade-in duration-200">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block leading-none">Target Metric</span>
                                <span className="leading-normal">{week.successMetric}</span>
                              </div>
                            ) : (
                              /* Collapsed Layout: Sub-badge variant indicating targeted rule outcomes */
                              <div className="hidden md:flex items-center gap-1.5 shrink-0 select-none text-zinc-400 dark:text-zinc-500 font-medium text-[11px]">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-400">Target:</span>
                                <span className="truncate max-w-[150px] font-semibold">{week.successMetric}</span>
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
        <Card className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 p-8 text-center text-zinc-400 dark:text-zinc-500 text-sm flex flex-col items-center justify-center gap-2 select-none bg-zinc-50/30 dark:bg-transparent">
          <MapIcon className="h-6 w-6 opacity-30" />
          <span>Set your core profile parameters to compile target roadmap layouts.</span>
        </Card>
      )}
    </div>
  );
}