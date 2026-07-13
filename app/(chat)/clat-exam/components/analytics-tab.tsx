"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Layers3,
  PlayCircle,
  Trophy,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestTestRoomFullscreen } from "../test-room-fullscreen";

const ITEMS_PER_PAGE = 12;

function getTypeLabel(type?: string | null) {
  const normalized = (type || "").toLowerCase();
  if (normalized === "mock") return "Mock";
  if (normalized === "pyq") return "PYQ";
  if (normalized === "mcq") return "Quick Quiz";
  return type || "Quiz";
}

function getStatusBadge(status?: string | null) {
  if (status === "completed") {
    return (
      <Badge className="rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 shadow-3xs">
        Completed
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className="rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 shadow-3xs">
        In Progress
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Pending</Badge>;
}

export function AnalyticsTab({ pastQuizzes }: { pastQuizzes: any[] }) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const safeQuizzes = useMemo(
    () => (Array.isArray(pastQuizzes) ? pastQuizzes : []),
    [pastQuizzes]
  );

  const stats = useMemo(() => {
    const completed = safeQuizzes.filter((quiz) => quiz.status === "completed");
    const active = safeQuizzes.filter((quiz) => quiz.status !== "completed");
    const mocks = safeQuizzes.filter(
      (quiz) => quiz.quizType?.toLowerCase() === "mock"
    );
    const pyqs = safeQuizzes.filter(
      (quiz) => quiz.quizType?.toLowerCase() === "pyq"
    );

    return {
      total: safeQuizzes.length,
      completed: completed.length,
      active: active.length,
      mocks: mocks.length,
      pyqs: pyqs.length,
    };
  }, [safeQuizzes]);

  const totalPages = Math.max(
    1,
    Math.ceil(safeQuizzes.length / ITEMS_PER_PAGE)
  );
  const currentQuizzes = safeQuizzes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToQuiz = (quiz: any) => {
    if (quiz.status !== "completed") {
      requestTestRoomFullscreen();
    }
    router.push(
      quiz.status === "completed"
        ? `/clat-exam/${quiz.id}`
        : `/clat-exam/${quiz.id}/take`
    );
  };

  return (
    <div className="fade-in slide-in-from-bottom-4 flex animate-in flex-col gap-6 duration-500 w-full text-zinc-900 dark:text-zinc-100 select-none">
      
      {/* ─── INTEL INFRASTRUCTURE HERO CONTROLLER (Asymmetric Layout With Vector Art) ─── */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A]/40 backdrop-blur-md relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4169E1]/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-8 items-center relative z-10">
          
          {/* Left Text Column Block (Takes 7/12 Width) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4169E1]/20 bg-[#4169E1]/10 px-3 py-1 text-xs font-bold text-[#4169E1] shadow-3xs uppercase tracking-wider">
              <History className="h-3.5 w-3.5" />
              Ecosystem Performance Tracking Matrix
            </div>
            <div className="space-y-1.5">
              <h2 className="font-black text-2xl md:text-3xl tracking-tight text-zinc-900 dark:text-white">
                Quiz & Test Auditing Logs
              </h2>
              <p className="max-w-xl text-zinc-500 dark:text-zinc-400 text-[14px] leading-relaxed font-normal">
                Review verified execution records, metric data clusters, historical mock sequences, and customized diagnostics provisioned inside your workspace shell.
              </p>
            </div>
          </div>

          {/* Right Vector Graphics Node: Code-Native SaaS Vector Art (Takes 5/12 Width) */}
          <div className="lg:col-span-5 hidden lg:flex items-center justify-end relative h-full min-h-[110px]">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-full max-w-[280px] h-[95px] opacity-80 dark:opacity-40">
              <svg viewBox="0 0 280 100" className="w-full h-full text-[#4169E1]" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 80 L50 65 L90 75 L130 40 L170 55 L210 20 L250 35 L270 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 80 L50 65 L90 75 L130 40 L170 55 L210 20 L250 35 L270 10 L270 95 L10 95 Z" fill="currentColor" fillOpacity="0.04" />
                <circle cx="210" cy="20" r="4" className="fill-white stroke-[#4169E1]" strokeWidth="2" />
                <circle cx="130" cy="40" r="3" className="fill-white stroke-[#4169E1]" strokeWidth="2" />
                <circle cx="270" cy="10" r="4" className="fill-[#4169E1]" />
                <line x1="10" y1="95" x2="270" y2="95" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DOCK PERFORMANCE STATISTICS HUD STRIP ─── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/50 p-4 shadow-3xs flex items-center gap-3.5 group">
          <div className="h-9 w-9 rounded-xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] flex items-center justify-center text-zinc-400 group-hover:text-[#4169E1] transition-colors shadow-3xs">
            <Layers3 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Total Quizes</span>
            <p className="font-black text-2xl text-zinc-800 dark:text-zinc-100 tracking-tight font-mono mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/50 p-4 shadow-3xs flex items-center gap-3.5 group">
          <div className="h-9 w-9 rounded-xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 transition-colors shadow-3xs">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Completed</span>
            <p className="font-black text-2xl text-emerald-500 tracking-tight font-mono mt-0.5">{stats.completed}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/50 p-4 shadow-3xs flex items-center gap-3.5 group">
          <div className="h-9 w-9 rounded-xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] flex items-center justify-center text-zinc-400 group-hover:text-amber-500 transition-colors shadow-3xs">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Mocks Build</span>
            <p className="font-black text-2xl text-zinc-800 dark:text-zinc-100 tracking-tight font-mono mt-0.5">{stats.mocks}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#080D1A]/50 p-4 shadow-3xs flex items-center gap-3.5 group">
          <div className="h-9 w-9 rounded-xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] flex items-center justify-center text-zinc-400 group-hover:text-[#4169E1] transition-colors shadow-3xs">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Real PYQs</span>
            <p className="font-black text-2xl text-zinc-800 dark:text-zinc-100 tracking-tight font-mono mt-0.5">{stats.pyqs}</p>
          </div>
        </div>
      </section>

      {/* ─── MAIN ATTEMPTS COMPONENT ROW LISTING ─── */}
      <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/40 backdrop-blur-md rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
        <CardHeader className="border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 px-5 py-4 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="flex items-center gap-2 text-[14px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              <Clock3 className="h-4 w-4 text-[#4169E1]" />
              Ecosystem Activity Stream
            </CardTitle>
            <CardDescription className="text-zinc-400 dark:text-zinc-500 text-xs font-normal">
              {stats.active > 0
                ? `${stats.active} diagnostic block${stats.active === 1 ? "" : "s"} cached in transient state.`
                : "No pending run blocks cached."}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 flex flex-col justify-center divide-y divide-zinc-100 dark:divide-white/5">
          {currentQuizzes.length > 0 ? (
            currentQuizzes.map((quiz) => {
              const percentage =
                quiz.totalQuestions > 0
                  ? Math.round(((quiz.score || 0) / quiz.totalQuestions) * 100)
                  : 0;

              return (
                <div
                  className="flex flex-col gap-4 p-4.5 transition-colors hover:bg-zinc-500/5 lg:flex-row lg:items-center lg:justify-between group/row"
                  key={quiz.id}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      <Badge className="rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-2 py-0.2 text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shadow-3xs" variant="secondary">
                        {getTypeLabel(quiz.quizType)}
                      </Badge>
                      {getStatusBadge(quiz.status)}
                      {quiz.subject && (
                        <Badge className="rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] px-2 py-0.2 text-[9px] font-bold tracking-wide text-zinc-400 dark:text-zinc-500 shadow-3xs" variant="outline">
                          {quiz.subject}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="line-clamp-1 font-bold text-[14.5px] text-zinc-900 dark:text-white group-hover/row:text-[#4169E1] transition-colors">
                        {quiz.title}
                      </h3>
                      <p className="line-clamp-1 text-zinc-400 dark:text-zinc-500 text-xs font-medium mt-0.5">
                        {quiz.topic || "CLAT practice"} • {formatDistanceToNow(new Date(quiz.createdAt))} ago
                      </p>
                    </div>
                  </div>

                  {/* Quantitative Parameters & Output Controls */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:justify-end shrink-0 border-t lg:border-t-0 border-zinc-100 dark:border-white/5 pt-3.5 lg:pt-0">
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold sm:min-w-36 select-none">
                      <div>
                        <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Questions</span>
                        <p className="font-bold text-[13.5px] mt-0.5 font-mono">{quiz.totalQuestions}</p>
                      </div>
                      <div>
                        <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider block">Score Index</span>
                        <p className="font-black text-[13.5px] mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">
                          {quiz.status === "completed"
                            ? `${quiz.score || 0}/${quiz.totalQuestions}`
                            : "—"}
                        </p>
                        {quiz.status === "completed" && (
                          <span className="text-zinc-400 dark:text-zinc-500 font-medium text-[10px] font-mono block leading-none mt-0.5">
                            {percentage}% net
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {quiz.documentUrl && (
                        <Button asChild className="h-8 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 font-bold text-xs uppercase tracking-wider shadow-3xs cursor-pointer text-zinc-700 dark:text-zinc-300" variant="outline">
                          <a
                            href={quiz.documentUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            PDF
                          </a>
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => goToQuiz(quiz)} 
                        className="h-8 rounded-xl font-bold text-xs uppercase tracking-wider border border-transparent bg-zinc-100 dark:bg-white/5 group-hover/row:bg-[#4169E1] text-zinc-800 dark:text-zinc-200 group-hover/row:text-white shadow-3xs px-4 cursor-pointer transition-all active:scale-[0.98]"
                      >
                        {quiz.status === "completed" ? (
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                          <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {quiz.status === "completed" ? "Review" : "Continue"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 p-8 text-center text-zinc-400 dark:text-zinc-500 text-sm flex flex-col items-center justify-center gap-2 my-4 select-none">
              <HelpCircle className="h-6 w-6 opacity-40" />
              <div className="space-y-0.5">
                <p className="font-bold text-zinc-700 dark:text-zinc-300 text-[14px]">No historical execution traces found.</p>
                <p className="text-xs font-normal">Generated mock variations, sectional modules, and custom drills compile here.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── PAGINATION ELEMENTS CONTROLLER ─── */}
      {safeQuizzes.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center gap-4 pt-2 select-none">
          <Button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="h-8.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 font-bold text-xs tracking-wide cursor-pointer transition-all disabled:opacity-40 shadow-3xs"
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-bold font-mono">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            className="h-8.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 font-bold text-xs tracking-wide cursor-pointer transition-all disabled:opacity-40 shadow-3xs"
            variant="outline"
          >
            Next
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}