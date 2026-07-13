"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Zap,
  Sliders,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="fade-in slide-in-from-bottom-4 flex animate-in flex-col gap-6 pb-16 duration-500 w-full text-zinc-900 dark:text-zinc-100 select-none">
      
      {/* ─── CUSTOM GENERATOR REGION (Asymmetric 2-Column Split for Full Screen Filling) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
        
        {/* Main Parameters Configuration Form (Takes 7/12 width) */}
        <Card className="lg:col-span-7 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 backdrop-blur-md shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 px-5 py-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center border border-[#4169E1]/20 shadow-3xs">
              <Zap className="h-4 w-4 fill-[#4169E1]/10" />
            </div>
            <div>
              <h3 className="font-extrabold text-[15px] tracking-tight text-zinc-900 dark:text-white">
                Quick Custom Quiz Studio
              </h3>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs font-normal">
                Instantly deploy a targeted, pattern-matching diagnostic module.
              </p>
            </div>
          </div>

          <CardContent className="p-5 xl:p-6 space-y-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Optional Context/Topic Input Field */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500" htmlFor="quick-topic">
                  Focus Keyword / Sub-Topic (Optional)
                </Label>
                <Input
                  id="quick-topic"
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Fundamental Rights, Syllogisms, Contracts..."
                  value={customTopic}
                  className="rounded-xl border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] h-10 text-sm shadow-3xs focus-visible:ring-[#4169E1]/20 text-zinc-800 dark:text-zinc-200"
                />
              </div>

              {/* Subject Dropdown Select */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500" htmlFor="quick-subject">
                  Target Domain Subject
                </Label>
                <Select onValueChange={setCustomSubject} value={customSubject}>
                  <SelectTrigger id="quick-subject" className="rounded-xl border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] h-10 text-sm font-semibold shadow-3xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl dark:bg-[#080D1A] dark:border-white/10">
                    {sections.map((s) => (
                      <SelectItem key={s} value={s} className="text-sm font-medium focus:bg-[#4169E1]/10 focus:text-[#4169E1]">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Question Count Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500" htmlFor="quick-count">
                  Volume Parameter
                </Label>
                <Select onValueChange={setCustomCount} value={customCount}>
                  <SelectTrigger id="quick-count" className="rounded-xl border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] h-10 text-sm font-bold shadow-3xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl dark:bg-[#080D1A] dark:border-white/10">
                    <SelectItem value="5" className="font-mono font-bold focus:bg-[#4169E1]/10 focus:text-[#4169E1]">5 Questions</SelectItem>
                    <SelectItem value="10" className="font-mono font-bold focus:bg-[#4169E1]/10 focus:text-[#4169E1]">10 Questions</SelectItem>
                    <SelectItem value="20" className="font-mono font-bold focus:bg-[#4169E1]/10 focus:text-[#4169E1]">20 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model Select Element */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500" htmlFor="quick-model">
                  Processing Engine Model
                </Label>
                <Select
                  onValueChange={(value) =>
                    onSelectedModelChange(value as ClatModelTier)
                  }
                  value={selectedModel}
                >
                  <SelectTrigger id="quick-model" className="rounded-xl border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] h-10 text-sm font-semibold shadow-3xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl dark:bg-[#080D1A] dark:border-white/10">
                    {CLAT_MODEL_OPTIONS.map((model) => {
                      const disabled = !allowedModels.includes(model.id);
                      return (
                        <SelectItem
                          disabled={disabled}
                          key={model.id}
                          value={model.id}
                          className="text-sm font-medium focus:bg-[#4169E1]/10 focus:text-[#4169E1]"
                        >
                          {model.label}{disabled ? " (Upgrade Plan)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Launch Action Controller Button */}
            <div className="pt-2">
              <Button
                className="w-full h-10.5 rounded-xl bg-[#4169E1] hover:bg-[#4169E1]/90 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
                disabled={isGenerating}
                onClick={handleGenerate}
              >
                <PlayCircle
                  className={`h-4 w-4 ${activeGenerationKey === activeQuickKey ? "animate-pulse" : ""}`}
                />
                Initialize Diagnostic Engine Custom Drill
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informational Sprint Strategies Card (Takes 5/12 width to fill empty blank space) */}
        <Card className="lg:col-span-5 border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/20 p-5 xl:p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#4169E1]/5 to-transparent pointer-events-none" />
          
          <div className="space-y-3.5 relative z-10 h-full flex flex-col justify-between">
            <div className="space-y-1 border-b border-zinc-200 dark:border-white/5 pb-3">
              <h4 className="flex items-center gap-2 font-bold text-[#4169E1] text-[10px] uppercase tracking-widest">
                <Sliders className="h-3.5 w-3.5" /> Pacing Architecture
              </h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-normal font-normal pt-1">
                Calibrate custom volume metrics optimized for targeted focus drills depending on your available review limits.
              </p>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <div className="flex items-start gap-3 rounded-xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 p-3 shadow-3xs">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 text-xs font-mono font-bold shrink-0">5Q</div>
                <div className="space-y-0.5">
                  <span className="text-[12px] font-bold block leading-none">Micro Agility Drill</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium leading-none block pt-0.5">Ideal for highly concentrated rapid vocabulary or rule checking.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 p-3 shadow-3xs">
                <div className="h-7 w-7 rounded-lg bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center border border-[#4169E1]/20 text-xs font-mono font-bold shrink-0">10Q</div>
                <div className="space-y-0.5">
                  <span className="text-[12px] font-bold block leading-none">Standard Sprint Matrix</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium leading-none block pt-0.5">Perfect balance evaluating cross-sectional logic workflows.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 p-3 shadow-3xs">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 text-xs font-mono font-bold shrink-0">20Q</div>
                <div className="space-y-0.5">
                  <span className="text-[12px] font-bold block leading-none">Stamina Builder Set</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium leading-none block pt-0.5">Designed to benchmark sustained comprehension under simulated pacing constraints.</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── HISTORY REGION ─── */}
      <section className="space-y-4 w-full mt-2">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-white/5 pb-2.5">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="h-4.5 w-4.5 text-[#4169E1]" />
              Historical Evaluation Logs
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-[13.5px]">
              Review past customized sprints, section scores, and question parameter breakdowns.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-3 py-0.5 font-mono text-zinc-500 dark:text-zinc-400 text-xs">
            {safeQuizzes.length} total entries
          </span>
        </div>

        {/* Logs Grid Array */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {safeQuizzes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 p-8 text-center text-zinc-400 dark:text-zinc-500 text-sm md:col-span-2 flex flex-col items-center justify-center gap-2 bg-zinc-50/30 dark:bg-transparent">
              <HelpCircle className="h-6 w-6 opacity-40" />
              <span>No custom diagnostic arrays initialized inside this workspace profile yet.</span>
            </div>
          ) : (
            currentQuizzes.map((quiz: any) => (
              <Card
                className="rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 hover:border-[#4169E1] hover:shadow-sm group"
                key={quiz.id}
              >
                <div className="flex w-full flex-col gap-1 min-w-0">
                  <h4 className="font-bold text-[14.5px] text-zinc-900 dark:text-white truncate group-hover:text-[#4169E1] transition-colors">
                    {quiz.title}
                  </h4>
                  
                  <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-[11px] font-semibold select-none">
                    <span className="capitalize px-1.5 py-0.2 bg-zinc-100 dark:bg-white/5 rounded border border-zinc-200/50 dark:border-white/5 tracking-wide">
                      {quiz.quizType}
                    </span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(quiz.createdAt))} ago
                    </span>
                  </div>
                </div>

                <div className="flex w-full sm:w-auto shrink-0 items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-zinc-100 dark:border-white/5 pt-3 sm:pt-0">
                  {quiz.status === "completed" ? (
                    <div className="flex flex-col items-end shrink-0 text-right min-w-[50px]">
                      <span className="font-black text-emerald-500 text-[17px] font-mono leading-none">
                        {quiz.score}<span className="text-zinc-400 font-normal text-xs">/{quiz.totalQuestions}</span>
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 block">
                        Net Score
                      </span>
                    </div>
                  ) : (
                    <Badge
                      className="rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shrink-0 shadow-3xs"
                      variant="outline"
                    >
                      In Progress
                    </Badge>
                  )}

                  <Button
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
                    className="h-8 rounded-xl font-bold text-xs uppercase tracking-wider border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-[#4169E1] text-zinc-800 dark:text-zinc-200 hover:text-white hover:border-[#4169E1] transition-all px-4 cursor-pointer shadow-3xs"
                    variant="ghost"
                  >
                    {quiz.status === "completed" ? "Review" : "Resume"}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pagination Navigation Elements Layout */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 select-none">
            <Button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 font-bold text-xs tracking-wide cursor-pointer transition-all disabled:opacity-40 shadow-3xs"
              variant="outline"
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
            </Button>
            
            <span className="text-zinc-400 dark:text-zinc-500 text-xs font-bold font-mono">
              Page {currentPage} / {totalPages}
            </span>
            
            <Button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 font-bold text-xs tracking-wide cursor-pointer transition-all disabled:opacity-40 shadow-3xs"
              variant="outline"
            >
              Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </section>

    </div>
  );
}