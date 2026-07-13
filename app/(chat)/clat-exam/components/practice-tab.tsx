"use client";

import {
  BarChart3,
  BookOpen,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    <div className="fade-in slide-in-from-bottom-4 flex animate-in flex-col gap-6 pb-16 duration-500 w-full text-zinc-900 dark:text-zinc-100 select-none">
      
      {/* ─── COGNITIVE CORE MOCK CONFIGURATOR ENGINE ─── */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A]/40 backdrop-blur-md relative">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#4169E1]/5 to-transparent pointer-events-none" />
        
        <div className="grid gap-6 p-6 md:grid-cols-[1.3fr_0.7fr] md:p-8 relative z-10">
          <div className="space-y-6">
            
            {/* SaaS Status Label Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4169E1]/20 bg-[#4169E1]/10 px-3 py-1 text-xs font-bold text-[#4169E1] shadow-3xs uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              AI Personalized Mock Matrix Active
            </div>

            <div className="space-y-2">
              <h2 className="font-black text-2xl md:text-3xl tracking-tight text-zinc-900 dark:text-white">
                Mock Test Workspace Architecture
              </h2>
              <p className="max-w-xl text-zinc-500 dark:text-zinc-400 text-[14px] leading-relaxed font-normal">
                Deploy customized diagnostic examination papers calibrated around <strong className="text-zinc-900 dark:text-white font-bold">{targetNlu}</strong> blueprints, capturing simulated stress metrics and complex logic variations across <strong className="text-[#4169E1] font-bold">{weakSection}</strong>. Fully adapts the authentic 120-question, 120-minute operational index rules.
              </p>
            </div>

            {/* Asymmetric Profile Target Summary Indicators */}
            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/60 p-4 shadow-3xs flex flex-col justify-center">
                <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Critical Focus</span>
                <span className="line-clamp-1 font-extrabold text-[15px] mt-0.5 text-zinc-800 dark:text-zinc-200">{weakSection}</span>
              </div>
              <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/60 p-4 shadow-3xs flex flex-col justify-center">
                <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Target Endpoint</span>
                <span className="line-clamp-1 font-extrabold text-[15px] mt-0.5 text-zinc-800 dark:text-zinc-200">{targetNlu}</span>
              </div>
              <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/60 p-4 shadow-3xs flex flex-col justify-center">
                <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Evaluation Index</span>
                <span className="font-extrabold text-[15px] mt-0.5 text-[#4169E1]">120Q / -0.25 Net</span>
              </div>
            </div>

            {/* Model Selector Interface Panel */}
            <div className="max-w-sm space-y-2 select-none">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500" htmlFor="clat-model">
                Ecosystem Inference Model
              </Label>
              <Select
                onValueChange={(value) =>
                  onSelectedModelChange(value as ClatModelTier)
                }
                value={selectedModel}
              >
                <SelectTrigger id="clat-model" className="rounded-xl border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] h-10 text-sm font-semibold shadow-2xs focus:ring-[#4169E1]/20">
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
                        className="font-medium text-sm focus:bg-[#4169E1]/10 focus:text-[#4169E1]"
                      >
                        {model.label}
                        {disabled ? " (Upgrade Plan)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium leading-normal">
                Ecosystem tiers scale access from basic mini evaluations to maximum contextual full drills.
              </p>
            </div>

            {/* Launch Action Configuration Controllers */}
            <div className="flex flex-col gap-3.5 sm:flex-row pt-1.5">
              <Button
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
                className="h-11 rounded-xl bg-[#4169E1] hover:bg-[#4169E1]/90 text-white font-bold text-sm tracking-wide shadow-md flex items-center gap-2 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {activeGenerationKey === `mock-CLAT Full Mock-${CLAT_TOTAL_QUESTIONS}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                Generate Full Personalized Mock
              </Button>
              <Button
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
                className="h-11 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] hover:bg-zinc-50 dark:hover:bg-white/5 font-bold text-sm tracking-wide shadow-2xs flex items-center gap-2 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50 text-zinc-800 dark:text-zinc-200"
                variant="outline"
              >
                {activeGenerationKey === "mock-CLAT Mini Mock-20" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                Generate 20Q Personalized Sprint
              </Button>
            </div>
          </div>

          {/* Right Side Matrix: Question Mix Weight Analysis Panel */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#080D1A]/60 p-5 shadow-2xs flex flex-col justify-between">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
              <div>
                <p className="font-extrabold text-[14px] text-zinc-900 dark:text-white">
                  Full Paper Syllabus Mix
                </p>
                <p className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium mt-0.5">
                  Official weighting algorithms
                </p>
              </div>
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/5" />
            </div>
            
            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {fullDistribution.map((item) => {
                const config = CLAT_SECTIONS.find(
                  (section) => section.name === item.section
                );
                const percent = (item.count / CLAT_TOTAL_QUESTIONS) * 100;
                return (
                  <div className="space-y-1" key={item.section}>
                    <div className="flex items-center justify-between font-semibold text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {config?.shortName || item.section}
                      </span>
                      <span className="text-zinc-900 dark:text-white font-bold font-mono">
                        {item.count}Q
                      </span>
                    </div>
                    {/* Fixed: Type-safe Shadcn UI progress component wrapping tracking colors */}
                    <div className="[&>div]:bg-[#4169E1]">
                      <Progress className="h-1.5 bg-zinc-100 dark:bg-zinc-800" value={percent} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* ─── DOCK DISTRIBUTION TELEMETRY MATRIX ─── */}
      <section className="grid gap-5 grid-cols-1 md:grid-cols-2 w-full items-stretch">
        
        {/* Mini Mock Distribution Capsule Row */}
        <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/50 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-between">
          <CardHeader className="border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-[14px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Sprint Mixed Parameters
            </CardTitle>
            <CardDescription className="text-zinc-400 dark:text-zinc-500 text-xs font-normal">
              Accelerated balanced evaluation when runtime constraints apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-wrap items-center justify-center gap-2.5">
            {miniDistribution.map((item) => {
              const config = CLAT_SECTIONS.find(
                (section) => section.name === item.section
              );
              return (
                <div
                  className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A] p-3 text-center min-w-[76px] flex-1 shadow-3xs"
                  key={item.section}
                >
                  <p className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">
                    {config?.shortName}
                  </p>
                  <p className="font-black text-lg text-zinc-800 dark:text-zinc-100 tracking-tight mt-0.5 font-mono">
                    {item.count}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Telemetry Output Metrics Mapping Panel */}
        <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/50 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-between">
          <CardHeader className="border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-[14px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              <FileText className="h-4 w-4 text-[#4169E1]" />
              Analysis Metrics Provisioned
            </CardTitle>
            <CardDescription className="text-zinc-400 dark:text-zinc-500 text-xs font-normal">
              Every submitted blueprint triggers full real-time analysis logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex items-center justify-center gap-3">
            {["Net Score Log", "Accuracy Ratio", "Mistake Vectors"].map((label) => (
              <div
                className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A] p-3.5 text-center font-bold text-xs flex-1 text-zinc-500 dark:text-zinc-400 shadow-3xs"
                key={label}
              >
                {label}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ─── WORKSPACE SECTIONAL DECK DRILLS ─── */}
      <section className="space-y-4 w-full mt-2">
        <div className="flex items-end justify-between w-full border-b border-zinc-200 dark:border-white/5 pb-2.5">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-white">
              Sectional Practice Drilling Deck
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-[13.5px]">
              Isolate focus parameters, systematically reinforcing fragile performance areas.
            </p>
          </div>
        </div>

        {/* Modular Sectional Drills Bento Grid Array */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
          {CLAT_SECTIONS.map((section) => {
            const key = `sectional-${section.name}-12`;
            const isWeak = profile?.weakestSection === section.name;

            return (
              <Card
                className="rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 p-5 text-left transition-all duration-300 hover:border-[#4169E1] hover:shadow-md flex flex-col justify-between min-h-[175px] relative overflow-hidden group"
                key={section.name}
              >
                <div className="flex items-start justify-between gap-4 w-full shrink-0">
                  <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] p-2.5 text-zinc-700 dark:text-zinc-300 group-hover:text-white group-hover:bg-[#4169E1] group-hover:border-[#4169E1] transition-all shadow-3xs">
                    <Layers className="h-4 w-4" />
                  </div>
                  {isWeak && (
                    <Badge className="rounded-md border border-red-500/20 bg-red-500/10 dark:bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-3xs">
                      Critical Vector
                    </Badge>
                  )}
                </div>
                
                <div className="mt-4 space-y-3.5 w-full flex-1 flex flex-col justify-end">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-[15px] tracking-tight text-zinc-900 dark:text-white group-hover:text-[#4169E1] transition-colors">
                      {section.name}
                    </h4>
                    <p className="line-clamp-2 text-zinc-500 dark:text-zinc-400 text-[12.5px] leading-relaxed font-normal">
                      {section.description}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-0.5">
                    <div className="flex items-center justify-between rounded-lg border border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 select-none">
                      <span>{section.weight} Weight</span>
                      <span className="font-bold text-zinc-600 dark:text-zinc-400 font-mono">{section.fullMockQuestions}Q Config</span>
                    </div>
                    
                    <Button
                      className="w-full h-9 rounded-xl bg-zinc-100 dark:bg-white/5 group-hover:bg-[#4169E1] text-zinc-800 dark:text-zinc-200 dark:hover:text-white hover:text-black font-bold text-xs tracking-wider uppercase shadow-3xs transition-all border border-zinc-200/50 dark:border-white/5 group-hover:border-[#4169E1] cursor-pointer"
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
      </section>

    </div>
  );
}