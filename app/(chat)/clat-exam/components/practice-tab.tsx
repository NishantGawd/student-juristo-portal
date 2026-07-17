"use client";

import {
  BarChart3,
  Clock,
  FileText,
  Layers,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLAT_MODEL_OPTIONS,
  type ClatModelTier,
  getAllowedClatModelTiers,
} from "@/lib/clat-model-access";
import {
  CLAT_SECTIONS,
  CLAT_TOTAL_QUESTIONS,
  getMockDistribution,
} from "../clat-config";

type GenerateMode = "mock" | "sectional" | "custom";
export type GenerateRequest = {
  mode: GenerateMode;
  subject: string;
  topic: string;
  questions: number;
  difficulty: string;
  quizType?: string;
  modelTier?: ClatModelTier;
};

export function PracticeTab({
  activeGenerationKey,
  onGenerateQuiz,
  onSelectedModelChange,
  profile,
  selectedModel,
  userPlan,
}: {
  activeGenerationKey?: string | null;
  onGenerateQuiz: (request: GenerateRequest) => void;
  onSelectedModelChange: (model: ClatModelTier) => void;
  profile: any;
  selectedModel: ClatModelTier;
  userPlan: string;
}) {
  const handleGenerate = ({
    mode,
    subject,
    topic,
    questions,
    difficulty,
    modelTier,
  }: GenerateRequest) => {
    onGenerateQuiz({
      difficulty,
      mode,
      modelTier: modelTier || selectedModel,
      questions,
      quizType: "MCQ",
      subject,
      topic,
    });
  };

  const isGenerating = Boolean(activeGenerationKey);
  const miniDistribution = getMockDistribution(20);
  const fullDistribution = getMockDistribution(CLAT_TOTAL_QUESTIONS);
  const targetNlu = profile?.targetNlu || "your target NLU";
  const weakSection = profile?.weakestSection || "your weakest section";
  const allowedModels = getAllowedClatModelTiers(userPlan);

  return (
    <div className="w-full px-6 py-0.5 space-y-12 animate-in fade-in duration-300 text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">
      
      {/* ─── TITLE HEADER BAR (Bigger, matches Dashboard layout scale) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-zinc-100 dark:border-white/5 pb-6">
        <div className="space-y-1.5 text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-serif">
            Mock Test Workspace Architecture
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            System dynamic target context simulation node: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{targetNlu}</span>.
          </p>
        </div>
      </div>

      {/* ─── INTERACTIVE FLOATING ENGINE HEADER CONTROL BAR ─── */}
      <div className="w-full border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#0C1222] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 select-none">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-[#4169E1]" />
            <span className="text-[10px] font-bold tracking-widest text-[#4169E1] uppercase">
              AI Personalized Mock Matrix Active
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Deploy advanced diagnostics examination blueprints capturing simulated stress metrics and complex logic variations calibrated across <span className="text-zinc-800 dark:text-zinc-200 font-medium">{weakSection}</span>.
          </p>
        </div>

        {/* Model Inference Choice Mechanism */}
        <div className="flex items-center gap-3.5 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 shrink-0 select-none" htmlFor="clat-model">
            Inference:
          </Label>
          <Select
            onValueChange={(value) => onSelectedModelChange(value as ClatModelTier)}
            value={selectedModel}
          >
            <SelectTrigger id="clat-model" className="rounded-none border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] h-10 text-xs font-semibold focus:ring-0 focus:border-[#4169E1] w-52 text-zinc-800 dark:text-zinc-200">
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
                    className="font-medium text-xs rounded-none focus:bg-[#4169E1]/10 focus:text-[#4169E1]"
                  >
                    {model.label}{disabled ? " (Upgrade)" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── INTEGRATED BENTO BOX GENERATOR GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* BENTO CELL 1: PRIMARY ACTION GENERATORS (Spans 8/12 Columns) */}
        <Card className="lg:col-span-8 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-6 rounded-none shadow-none flex flex-col justify-between text-left space-y-6">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-[#4169E1] tracking-widest uppercase block">
              Execution Triggers
            </span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
              Configure and initialize your active test execution parameters below. Matrix pipelines scale validation depth cleanly up to the authentic 120-question operational index blueprint parameters.
            </p>

            {/* Asymmetric Profile Endpoint Stats Mapping (Bigger, matches Dashboard style) */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 pt-2">
              <div className="border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A]/50 p-4 flex flex-col justify-center">
                <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Critical Focus</span>
                <span className="truncate font-bold text-base mt-1 text-zinc-800 dark:text-zinc-200">{weakSection}</span>
              </div>
              <div className="border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A]/50 p-4 flex flex-col justify-center">
                <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Target Endpoint</span>
                <span className="truncate font-bold text-base mt-1 text-zinc-800 dark:text-zinc-200">{targetNlu}</span>
              </div>
              <div className="border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A]/50 p-4 flex flex-col justify-center">
                <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Evaluation Rules</span>
                <span className="font-bold text-base mt-1 text-[#4169E1]">120Q / -0.25 Net</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
            <button
              disabled={isGenerating}
              onClick={() =>
                handleGenerate({
                  mode: "mock",
                  subject: "CLAT Full Syllabus",
                  topic: "CLAT Full Mock",
                  questions: CLAT_TOTAL_QUESTIONS,
                  difficulty: "Hard",
                  modelTier: selectedModel,
                })
              }
              className="h-11 px-5 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] tracking-wide"
            >
              {activeGenerationKey === `mock-CLAT Full Mock-${CLAT_TOTAL_QUESTIONS}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Generate Full Personalized Mock
            </button>
            <button
              disabled={isGenerating}
              onClick={() =>
                handleGenerate({
                  mode: "mock",
                  subject: "CLAT Full Syllabus",
                  topic: "CLAT Mini Mock",
                  questions: 20,
                  difficulty: "Medium",
                  modelTier: selectedModel,
                })
              }
              className="h-11 px-5 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] tracking-wide"
            >
              {activeGenerationKey === "mock-CLAT Mini Mock-20" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Generate 20Q Personalized Sprint
            </button>
          </div>
        </Card>

        {/* BENTO CELL 2: QUESTION SYLLABUS WEIGHT ANALYSIS (Spans 4/12 Columns) */}
        <Card className="lg:col-span-4 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-6 rounded-none shadow-none text-left flex flex-col justify-between">
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
              <div className="text-left">
                <p className="font-bold text-sm text-zinc-900 dark:text-white font-serif">
                  Full Paper Syllabus Mix
                </p>
                <p className="text-zinc-400 dark:text-zinc-500 text-[11px] mt-0.5">
                  Official weight distributions
                </p>
              </div>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            
            <div className="space-y-3.5 pt-1">
              {fullDistribution.map((item) => {
                const config = CLAT_SECTIONS.find(
                  (section) => section.name === item.section
                );
                const percent = (item.count / CLAT_TOTAL_QUESTIONS) * 100;
                return (
                  <div className="space-y-1.5" key={item.section}>
                    <div className="flex items-center justify-between font-medium text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {config?.shortName || item.section}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold font-mono">
                        {item.count}Q
                      </span>
                    </div>
                    <div className="h-1.5 rounded-none w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-[#4169E1] transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

      </div>

      {/* ─── DOCK DISTRIBUTION TELEMETRY MATRIX ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* BENTO CELL 3: SPRINT MIX PARAMETERS METRICS */}
        <Card className="md:col-span-1 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 rounded-none shadow-none text-left flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">Sprint Parameters</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">Accelerated balanced configuration matrix.</p>
          </div>
          <div className="grid grid-cols-5 gap-2 pt-1">
            {miniDistribution.map((item) => {
              const config = CLAT_SECTIONS.find(
                (section) => section.name === item.section
              );
              return (
                <div className="border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A] p-2.5 text-center shadow-none flex flex-col justify-between" key={item.section}>
                  <p className="text-zinc-400 dark:text-zinc-500 font-mono text-[9px] font-bold uppercase truncate">
                    {config?.shortName}
                  </p>
                  <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200 font-mono mt-1">
                    {item.count}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* BENTO CELL 4: DATA PROVISION MAPPING PACKET (Spans 2/3 columns) */}
        <Card className="md:col-span-2 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 rounded-none shadow-none text-left flex flex-col justify-between space-y-4">
          <div className="space-y-1 border-b border-zinc-100 dark:border-white/5 pb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">Analysis Metrics Provisioned</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-none">Every submitted dataset entry triggers automatic real-time evaluation loops.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 flex-1 items-center pt-1">
            {["Net Score Log", "Accuracy Ratio", "Mistake Vectors"].map((label) => (
              <div
                className="border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A] py-3.5 text-center text-xs font-serif font-bold text-zinc-600 dark:text-zinc-400 tracking-wide"
                key={label}
              >
                {label}
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* ─── SECTIONAL PRACTICE DRILLING DECK ARRAY ─── */}
      <div className="space-y-3 text-left pt-2">
        <div className="space-y-1.5 border-b border-zinc-100 dark:border-white/5 pb-2 select-none">
          <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">
            Sectional Practice Drilling Deck
          </span>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-normal leading-normal">
            Isolate specific conceptual parameter parameters, reinforcing focus nodes effectively.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {CLAT_SECTIONS.map((section) => {
            const key = `sectional-${section.name}-12`;
            const isWeak = profile?.weakestSection === section.name;

            return (
              <Card
                key={section.name}
                className="group border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-6 flex flex-col justify-between text-left transition-all hover:border-[#4169E1] dark:hover:border-[#4169E1] hover:bg-zinc-50/20 dark:hover:bg-white/5 min-h-[195px] rounded-none"
              >
                <div className="flex justify-between items-start w-full gap-4">
                  <div className="p-2.5 border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] text-zinc-500 dark:text-zinc-400 group-hover:bg-[#4169E1] group-hover:border-[#4169E1] group-hover:text-white transition-all shadow-none">
                    <Layers className="h-4 w-4" />
                  </div>
                  {isWeak && (
                    <Badge className="rounded-none border border-red-500/20 bg-red-500/10 dark:bg-red-500/20 text-red-500 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 shadow-none animate-pulse">
                      Critical Vector
                    </Badge>
                  )}
                </div>

                <div className="space-y-4 mt-4 w-full">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 font-serif group-hover:text-[#4169E1] transition-colors flex items-center gap-1">
                      {section.name}
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-2 leading-relaxed font-normal">
                      {section.description}
                    </p>
                  </div>

                  <div className="space-y-2.5 w-full pt-1">
                    <div className="flex items-center justify-between border border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-black/20 px-3 py-1.5 text-[11px] font-mono text-zinc-400 dark:text-zinc-500 select-none">
                      <span>{section.weight} Weight</span>
                      <span className="font-bold text-zinc-600 dark:text-zinc-400">{section.fullMockQuestions}Q Config</span>
                    </div>

                    <Button
                      disabled={isGenerating}
                      onClick={() =>
                        handleGenerate({
                          mode: "sectional",
                          subject: section.name,
                          topic: section.name,
                          questions: 12,
                          difficulty: isWeak ? "Hard" : "Medium",
                          modelTier: selectedModel,
                        })
                      }
                      className="w-full h-10 rounded-none bg-zinc-50 dark:bg-white/5 group-hover:bg-[#4169E1] text-zinc-700 dark:text-zinc-300 group-hover:text-white font-medium text-xs tracking-wider uppercase border border-zinc-200/60 dark:border-white/5 group-hover:border-[#4169E1] transition-all cursor-pointer shadow-none"
                      variant="secondary"
                    >
                      {activeGenerationKey === key ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Launch 12Q Drill
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}