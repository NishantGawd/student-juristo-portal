"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Zap,
  Sliders,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLAT_SECTIONS } from "../clat-config";
import {
  CLAT_MODEL_OPTIONS,
  type ClatModelTier,
  getAllowedClatModelTiers,
} from "@/lib/clat-model-access";
import { requestTestRoomFullscreen } from "../test-room-fullscreen";
import type { GenerateRequest } from "./practice-tab";

export function QuickQuizTab({
  activeGenerationKey,
  onGenerateQuiz,
  onSelectedModelChange,
  pastQuizzes,
  selectedModel,
  userPlan,
}: {
  activeGenerationKey?: string | null;
  onGenerateQuiz: (request: GenerateRequest) => void;
  onSelectedModelChange: (model: ClatModelTier) => void;
  pastQuizzes: any[];
  selectedModel: ClatModelTier;
  userPlan: string;
}) {
  const router = useRouter();

  // Quick Quiz State
  const [customTopic, setCustomTopic] = useState("");
  const [customSubject, setCustomSubject] = useState("Legal Reasoning");
  const [customCount, setCustomCount] = useState("10");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const safeQuizzes = Array.isArray(pastQuizzes) ? pastQuizzes : [];
  const totalPages = Math.max(1, Math.ceil(safeQuizzes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentQuizzes = safeQuizzes.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleGenerate = () => {
    onGenerateQuiz({
      difficulty: "medium",
      mode: "custom",
      modelTier: selectedModel,
      questions: Number.parseInt(customCount, 10) || 10,
      quizType: "MCQ",
      subject: customSubject,
      topic: customTopic || customSubject,
    });
  };

  const sections = CLAT_SECTIONS.map((section) => section.name);
  const activeQuickKey = `custom-${customTopic || customSubject}-${Number.parseInt(customCount, 10) || 10}`;
  const isGenerating = Boolean(activeGenerationKey);
  const allowedModels = getAllowedClatModelTiers(userPlan);

  return (
    <div className="w-full px-6 py-0.5 space-y-12 animate-in fade-in duration-300 text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">
      
      {/* ─── TITLE HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-zinc-100 dark:border-white/5 pb-6">
        <div className="space-y-1.5 text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-serif">
            Quick Custom Quiz Studio
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Deploy dynamic sub-drills on targeted focus keywords instantly.
          </p>
        </div>
      </div>

      {/* ─── ASYMMETRIC BENTO GRID CONFIGURATOR ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
        
        {/* CONFIGURATION PANEL (Takes 7/12 width) */}
        <Card className="lg:col-span-7 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] rounded-none shadow-none flex flex-col justify-between text-left">
          <div className="border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 p-5 flex items-center gap-3">
            <div className="h-9 w-9 border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] text-[#4169E1] flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Parameter Matrix Settings
              </h3>
              <p className="text-zinc-400 dark:text-zinc-500 text-[11px]">
                Instantly assemble pattern-matching diagnostic segments.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Focus Keyword Input Field */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500" htmlFor="quick-topic">
                  Focus Keyword / Sub-Topic (Optional)
                </Label>
                <Input
                  id="quick-topic"
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Fundamental Rights, Syllogisms, Contracts..."
                  value={customTopic}
                  className="rounded-none border-zinc-200 dark:border-white/10 bg-zinc-50/30 dark:bg-[#080D1A] h-10 text-xs focus-visible:ring-0 focus-visible:border-[#4169E1] text-zinc-800 dark:text-zinc-200"
                />
              </div>

              {/* Subject Domain Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500" htmlFor="quick-subject">
                  Target Domain Subject
                </Label>
                <Select onValueChange={setCustomSubject} value={customSubject}>
                  <SelectTrigger id="quick-subject" className="rounded-none border-zinc-200 dark:border-white/10 bg-zinc-50/30 dark:bg-[#080D1A] h-10 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-0 focus:border-[#4169E1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-[#080D1A] dark:border-white/10">
                    {sections.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-medium rounded-none focus:bg-[#4169E1]/10 focus:text-[#4169E1]">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Volume Parameter Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500" htmlFor="quick-count">
                  Volume Parameter
                </Label>
                <Select onValueChange={setCustomCount} value={customCount}>
                  <SelectTrigger id="quick-count" className="rounded-none border-zinc-200 dark:border-white/10 bg-zinc-50/30 dark:bg-[#080D1A] h-10 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:ring-0 focus:border-[#4169E1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-[#080D1A] dark:border-white/10">
                    <SelectItem value="5" className="font-mono rounded-none focus:bg-[#4169E1]/10 focus:text-[#4169E1] text-xs font-bold">5 Questions</SelectItem>
                    <SelectItem value="10" className="font-mono rounded-none focus:bg-[#4169E1]/10 focus:text-[#4169E1] text-xs font-bold">10 Questions</SelectItem>
                    <SelectItem value="20" className="font-mono rounded-none focus:bg-[#4169E1]/10 focus:text-[#4169E1] text-xs font-bold">20 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inference Processing Engine */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500" htmlFor="quick-model">
                  Processing Engine Model
                </Label>
                <Select
                  onValueChange={(value) => onSelectedModelChange(value as ClatModelTier)}
                  value={selectedModel}
                >
                  <SelectTrigger id="quick-model" className="rounded-none border-zinc-200 dark:border-white/10 bg-zinc-50/30 dark:bg-[#080D1A] h-10 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-0 focus:border-[#4169E1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-[#080D1A] dark:border-white/10">
                    {CLAT_MODEL_OPTIONS.map((model) => {
                      const disabled = !allowedModels.includes(model.id);
                      return (
                        <SelectItem
                          disabled={disabled}
                          key={model.id}
                          value={model.id}
                          className="text-xs font-medium rounded-none focus:bg-[#4169E1]/10 focus:text-[#4169E1]"
                        >
                          {model.label}{disabled ? " (Upgrade Plan)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={isGenerating}
                onClick={handleGenerate}
                className="w-full h-11 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99] disabled:opacity-50"
              >
                <PlayCircle className={`h-4 w-4 ${activeGenerationKey === activeQuickKey ? "animate-pulse" : ""}`} />
                Initialize Custom Diagnostic Run
              </button>
            </div>
          </div>
        </Card>

        {/* STRATEGIES PANEL (Takes 5/12 width) */}
        <Card className="lg:col-span-5 border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#0C1222] p-6 rounded-none flex flex-col justify-between shadow-none text-left">
          <div className="space-y-5 h-full flex flex-col justify-between">
            <div className="space-y-1.5 border-b border-zinc-100 dark:border-white/5 pb-3">
              <h4 className="flex items-center gap-2 font-bold text-[#4169E1] text-[10px] uppercase tracking-widest">
                <Sliders className="h-3.5 w-3.5" /> Pacing Architecture
              </h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-normal font-normal">
                Calibrate custom sub-drill sizes depending on your structural timing constraints.
              </p>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3.5 border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#080D1A] p-3.5 shadow-none rounded-none">
                <div className="h-7 w-7 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">5Q</div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block leading-none">Micro Agility Drill</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-normal block pt-0.5">Concentrated verification tracking logic loop checks.</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#080D1A] p-3.5 shadow-none rounded-none">
                <div className="h-7 w-7 border border-[#4169E1]/20 bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center text-xs font-mono font-bold shrink-0">10Q</div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block leading-none">Standard Sprint Matrix</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-normal block pt-0.5">Balanced metric evaluating structural parsing paths.</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#080D1A] p-3.5 shadow-none rounded-none">
                <div className="h-7 w-7 border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">20Q</div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block leading-none">Stamina Builder Set</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-normal block pt-0.5">Sustained text block endurance check simulation routines.</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── EVALUATION HISTORY LOGS ─── */}
      <div className="space-y-3 w-full mt-2">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/5 pb-2 select-none">
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">
              Historical Evaluation Logs
            </span>
            <p className="text-zinc-400 dark:text-zinc-500 text-[11px] font-normal leading-normal">
              Review custom session performance parameters, section records, and analytics.
            </p>
          </div>
          <span className="border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-1 font-mono text-zinc-400 dark:text-zinc-500 text-[11px] font-bold">
            {safeQuizzes.length} Entries Located
          </span>
        </div>

        {/* Logs List Grid Track */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {safeQuizzes.length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-white/10 p-12 text-center text-zinc-400 dark:text-zinc-500 text-xs md:col-span-2 flex flex-col items-center justify-center gap-2 bg-zinc-50/20 dark:bg-transparent rounded-none">
              <HelpCircle className="h-5 w-5 opacity-40" />
              <span>No custom verification indices generated inside this workspace footprint profile yet.</span>
            </div>
          ) : (
            currentQuizzes.map((quiz: any) => (
              <Card
                className="group border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-[#4169E1] dark:hover:border-[#4169E1] hover:bg-zinc-50/20 dark:hover:bg-white/5 rounded-none shadow-none"
                key={quiz.id}
              >
                <div className="flex w-full flex-col gap-1.5 min-w-0 text-left">
                  <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 font-serif truncate group-hover:text-[#4169E1] transition-colors">
                    {quiz.title}
                  </h4>
                  
                  <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 font-mono text-[9px] font-bold select-none">
                    <span className="capitalize px-1.5 py-0.5 bg-zinc-50 dark:bg-white/5 border border-zinc-200/40 dark:border-white/10 tracking-wider">
                      {quiz.quizType}
                    </span>
                    <span>•</span>
                    <span className="uppercase">
                      {formatDistanceToNow(new Date(quiz.createdAt))} ago
                    </span>
                  </div>
                </div>

                <div className="flex w-full sm:w-auto shrink-0 items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-zinc-100 dark:border-white/5 pt-3 sm:pt-0">
                  {quiz.status === "completed" ? (
                    <div className="flex flex-col items-end shrink-0 text-right min-w-[55px]">
                      <span className="font-bold text-emerald-500 text-lg font-mono leading-none">
                        {quiz.score}<span className="text-zinc-400 dark:text-zinc-500 font-normal text-xs">/{quiz.totalQuestions}</span>
                      </span>
                      <span className="text-[8px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1 block leading-none">
                        Net Score
                      </span>
                    </div>
                  ) : (
                    <Badge
                      className="rounded-none border border-amber-500/20 bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 shrink-0 shadow-none animate-pulse"
                      variant="outline"
                    >
                      In Progress
                    </Badge>
                  )}

                  <button
                    onClick={() => {
                      if (quiz.status !== "completed") {
                        requestTestRoomFullscreen();
                      }
                      router.push(
                        quiz.status === "completed"
                          ? `/clat-exam/${quiz.id}`
                          : `/clat-exam/${quiz.id}/take`
                      );
                    }}
                    className="h-9 px-4 border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-[#4169E1] text-zinc-700 dark:text-zinc-300 hover:text-white hover:border-[#4169E1] font-medium text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
                  >
                    {quiz.status === "completed" ? "Review" : "Resume"}
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* PAGINATION LAYOUT CONTROLS */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 select-none">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-9 px-3 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 font-medium text-xs tracking-wider uppercase transition-colors disabled:opacity-40 cursor-pointer rounded-none"
            >
              <ChevronLeft className="inline mr-1 h-3.5 w-3.5 -translate-y-0.5" /> Prev
            </button>
            
            <span className="text-zinc-400 dark:text-zinc-500 text-xs font-bold font-mono">
              Page {currentPage} / {totalPages}
            </span>
            
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 px-3 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 font-medium text-xs tracking-wider uppercase transition-colors disabled:opacity-40 cursor-pointer rounded-none"
            >
              Next <ChevronRight className="inline ml-1 h-3.5 w-3.5 -translate-y-0.5" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}