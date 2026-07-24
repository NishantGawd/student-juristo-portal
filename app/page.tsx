"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MapIcon,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: PlayCircle,
    title: "Simulated Mock Tests",
    body: "Experience the exact CLAT interface in fullscreen mode with strict timers, negative marking, and section-wise breakdowns.",
  },
  {
    icon: ClipboardList,
    title: "Previous Year Papers",
    body: "Access and practice historical CLAT papers with instantaneous AI-driven explanations for every correct and incorrect option.",
  },
  {
    icon: BrainCircuit,
    title: "AI Legal Mentor",
    body: "Stuck on a legal reasoning passage? Ask the AI mentor to break down complex legal maxims and case laws into plain English.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    body: "Track your accuracy, identify weak sections, and monitor your time-per-question metrics across all your practice sessions.",
  },
  {
    icon: MapIcon,
    title: "Dynamic Roadmap",
    body: "Get a personalized daily study plan that adapts to your performance, pushing you to focus on high-yield exam topics.",
  },
];

const workspaceOutputs = [
  {
    icon: Target,
    title: "Precision Grading",
    body: "The AI evaluates your mock tests instantly, calculating your exact score with CLAT's +1.00 / -0.25 marking scheme.",
  },
  {
    icon: BookOpen,
    title: "Passage Analysis",
    body: "Break down dense reading comprehension and legal reasoning passages into actionable premises and conclusions.",
  },
  {
    icon: Zap,
    title: "Instant Doubt Resolution",
    body: "No need to wait for a tutor. Ask questions about any mock test syllabus topic and get verified answers immediately.",
  },
];

export default function StudentLandingPage() {
  return (
    <main className="min-h-dvh bg-white dark:bg-[#0C1222] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-[#0C1222]/80 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2" href="/">
            <div className="flex h-7 w-6 items-center justify-center shrink-0">
              <Image
                alt="Juristo AI Logo"
                src="/favicon.png"
                width={24}
                height={28}
                className="h-7 w-auto object-contain dark:brightness-[0.95]"
                priority
              />
            </div>
            <span className="font-bold text-[17px] tracking-tight font-serif pt-0.5">Juristo CLAT</span>
          </Link>

          <div className="hidden items-center md:flex gap-1">
            {[
              { label: "Features", href: "#features" },
              { label: "Engine", href: "#engine" },
              { label: "Pricing", href: "#pricing" },
            ].map((item) => (
              <a
                className="px-4 py-2 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="h-9 px-4 bg-[#4169E1] hover:bg-[#3454c5] text-white font-mono text-[11px] font-bold uppercase tracking-widest transition-colors rounded-none flex items-center justify-center gap-2"
            >
              Start Prep <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pb-3 overflow-hidden border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A]/50">
        {/* Architectural Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{
          backgroundImage: `linear-gradient(#4169E1 1px, transparent 1px), linear-gradient(90deg, #4169E1 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        <div className="relative mx-auto flex min-h-[70dvh] max-w-7xl flex-col items-center justify-center px-4 py-20 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 border border-[#4169E1]/30 bg-[#4169E1]/10 px-3 py-1.5 mb-8">
            <GraduationCap className="size-4 text-[#4169E1]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#4169E1]">
              The Legal Education OS
            </span>
          </div>

          <h1 className="max-w-4xl text-5xl font-bold font-serif leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
            Master the CLAT with <br className="hidden md:block" />
            <span className="text-[#4169E1]">AI-Powered Precision.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg font-sans">
            Your dedicated workspace for full-length mock tests, previous year papers, deep performance analytics, and a 24/7 AI legal mentor.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="h-12 w-full sm:w-auto px-8 bg-[#4169E1] hover:bg-[#3454c5] text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 rounded-none"
            >
              Create Free Account <ChevronRight className="size-4" />
            </Link>
            <Link
              href="#features"
              className="h-12 w-full sm:w-auto px-8 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 font-mono text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center rounded-none"
            >
              Explore Features
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 sm:gap-10">
            {[
              "Jurisdiction-Aware AI",
              "Strict Exam UI Protocol",
              "Instant Metric Grading",
              "Pattern Recognition",
            ].map((label) => (
              <div className="flex items-center gap-2" key={label}>
                <Check className="size-3.5 text-[#4169E1]" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OPTIMIZED UNIFORM BENTO GRID FEATURES ─── */}
      <section className="bg-white dark:bg-[#0C1222] py-20 border-b border-zinc-200 dark:border-white/10" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#4169E1] mb-2">
                Core Architecture
              </p>
              <h2 className="text-3xl font-bold font-serif tracking-tight sm:text-4xl md:text-5xl">
                One unified workspace for preparation and execution.
              </h2>
            </div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400 shrink-0 pb-1">
              6 Modules Active
            </span>
          </div>

          {/* Perfect 2x3 Uniform Bento Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {/* 1. Simulated Mocks */}
            <article className="flex flex-col justify-between border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A]/50 p-7 rounded-none transition-all duration-300 hover:border-[#4169E1]/50 hover:bg-white dark:hover:bg-[#0C1222] group min-h-[200px]">
              <div>
                <div className="h-11 w-11 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] flex items-center justify-center text-zinc-400 group-hover:text-[#4169E1] transition-colors mb-5">
                  <PlayCircle className="size-5" />
                </div>
                <h3 className="font-bold font-serif text-lg text-zinc-900 dark:text-white">Simulated Mock Tests</h3>
                <p className="mt-2.5 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  Experience the exact CLAT interface in fullscreen mode with strict timers, negative marking (-0.25), and section-wise breakdowns.
                </p>
              </div>
            </article>

            {/* 2. PYQ Papers */}
            <article className="flex flex-col justify-between border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A]/50 p-7 rounded-none transition-all duration-300 hover:border-[#4169E1]/50 hover:bg-white dark:hover:bg-[#0C1222] group min-h-[200px]">
              <div>
                <div className="h-11 w-11 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] flex items-center justify-center text-zinc-400 group-hover:text-[#4169E1] transition-colors mb-5">
                  <ClipboardList className="size-5" />
                </div>
                <h3 className="font-bold font-serif text-lg text-zinc-900 dark:text-white">Previous Year Papers</h3>
                <p className="mt-2.5 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  Access historical CLAT papers with instantaneous AI-driven explanations for every correct and incorrect option.
                </p>
              </div>
            </article>

            {/* 3. AI Legal Mentor */}
            <article className="flex flex-col justify-between border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A]/50 p-7 rounded-none transition-all duration-300 hover:border-[#4169E1]/50 hover:bg-white dark:hover:bg-[#0C1222] group min-h-[200px]">
              <div>
                <div className="h-11 w-11 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] flex items-center justify-center text-zinc-400 group-hover:text-[#4169E1] transition-colors mb-5">
                  <BrainCircuit className="size-5" />
                </div>
                <h3 className="font-bold font-serif text-lg text-zinc-900 dark:text-white">AI Legal Mentor</h3>
                <p className="mt-2.5 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  Stuck on a passage? Ask the AI mentor to break down complex legal maxims and case laws into plain English.
                </p>
              </div>
            </article>

            {/* 4. Deep Analytics */}
            <article className="flex flex-col justify-between border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A]/50 p-7 rounded-none transition-all duration-300 hover:border-[#4169E1]/50 hover:bg-white dark:hover:bg-[#0C1222] group min-h-[200px]">
              <div>
                <div className="h-11 w-11 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] flex items-center justify-center text-zinc-400 group-hover:text-[#4169E1] transition-colors mb-5">
                  <BarChart3 className="size-5" />
                </div>
                <h3 className="font-bold font-serif text-lg text-zinc-900 dark:text-white">Deep Analytics</h3>
                <p className="mt-2.5 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  Track overall accuracy, identify weak sub-sections (Torts, Criminal, Logic), and monitor time-per-question metrics.
                </p>
              </div>
            </article>

            {/* 5. Dynamic Roadmap */}
            <article className="flex flex-col justify-between border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A]/50 p-7 rounded-none transition-all duration-300 hover:border-[#4169E1]/50 hover:bg-white dark:hover:bg-[#0C1222] group min-h-[200px]">
              <div>
                <div className="h-11 w-11 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] flex items-center justify-center text-zinc-400 group-hover:text-[#4169E1] transition-colors mb-5">
                  <MapIcon className="size-5" />
                </div>
                <h3 className="font-bold font-serif text-lg text-zinc-900 dark:text-white">Dynamic Roadmap</h3>
                <p className="mt-2.5 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  Get a personalized study plan that adapts dynamically to your test performance, focusing on high-yield exam topics.
                </p>
              </div>
            </article>

            {/* 6. Sectional Drills & Quizzes */}
            <article className="flex flex-col justify-between border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A]/50 p-7 rounded-none transition-all duration-300 hover:border-[#4169E1]/50 hover:bg-white dark:hover:bg-[#0C1222] group min-h-[200px]">
              <div>
                <div className="h-11 w-11 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] flex items-center justify-center text-zinc-400 group-hover:text-[#4169E1] transition-colors mb-5">
                  <Zap className="size-5" />
                </div>
                <h3 className="font-bold font-serif text-lg text-zinc-900 dark:text-white">Quick Sectional Drills</h3>
                <p className="mt-2.5 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  Run targeted 10-minute micro-quizzes across Legal Reasoning, English, GK, and Quantitative Techniques.
                </p>
              </div>
            </article>

          </div>
        </div>
      </section>

      {/* ─── INTELLIGENCE ENGINE ─── */}
      <section className="relative border-y border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] py-24 overflow-hidden" id="engine">
        {/* Expanded Background Architectural Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{
          backgroundImage: `linear-gradient(#4169E1 1px, transparent 1px), linear-gradient(90deg, #4169E1 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-12 lg:gap-16 lg:grid-cols-2">

            {/* Left Column: Animated Visual Pipeline */}
            <div className="order-2 lg:order-1 relative border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] p-8 shadow-sm flex flex-col justify-between overflow-hidden">

              {/* Top animated bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-white/5 overflow-hidden">
                <div className="w-1/3 h-full bg-[#4169E1] transition-all duration-500" />
              </div>

              <div className="mb-8 flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-4">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Processing Pipeline</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">Active Engine</span>
                  <span className="flex h-1.5 w-1.5 rounded-none bg-emerald-500 animate-pulse" />
                </div>
              </div>

              <div className="relative flex-1 flex flex-col justify-between py-2 min-h-[360px]">
                {/* Vertical Track Line — Anchored precisely from top step center to bottom step center */}
                <div className="absolute left-[19px] top-5 bottom-5 w-px bg-zinc-200 dark:bg-white/10 z-0 overflow-hidden">
                  {/* Continuous Moving Light Pulse */}
                  <div className="w-full h-24 bg-gradient-to-b from-transparent via-[#4169E1] to-transparent animate-pipeline-flow will-change-transform" />
                </div>

                {/* Step 01 (Top) */}
                <div className="relative z-10 flex gap-5 group items-center">
                  <div className="h-10 w-10 shrink-0 bg-[#4169E1] text-white flex items-center justify-center font-mono text-xs font-bold outline outline-4 outline-white dark:outline-[#0C1222] shadow-sm transition-transform duration-300 group-hover:scale-105">
                    01
                  </div>
                  <div className="border border-[#4169E1]/30 bg-[#4169E1]/5 p-4 sm:p-5 flex-1 relative transition-all duration-300 group-hover:border-[#4169E1] group-hover:bg-[#4169E1]/10">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold font-serif text-sm text-zinc-900 dark:text-white">Passage Ingestion</h4>
                      <span className="font-mono text-[9px] text-[#4169E1] font-bold uppercase tracking-wider animate-step-pulse-1">Parsing</span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      AI engine parses the core legal texts, isolating definitions, premises, and logical conditions from raw text.
                    </p>
                  </div>
                </div>

                {/* Step 02 (Center) */}
                <div className="relative z-10 flex gap-5 group items-center">
                  <div className="h-10 w-10 shrink-0 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] flex items-center justify-center font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 outline outline-4 outline-white dark:outline-[#0C1222] transition-all duration-300 group-hover:bg-[#4169E1] group-hover:text-white group-hover:border-[#4169E1]">
                    02
                  </div>
                  <div className="border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] p-4 sm:p-5 flex-1 transition-all duration-300 group-hover:border-[#4169E1]/50 group-hover:bg-white dark:group-hover:bg-[#0C1222]">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold font-serif text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">Syllabus Mapping</h4>
                      <span className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider animate-step-pulse-2">Matching</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      Cross-references the extracted logical conditions against historical CLAT patterns and legal reasoning modules.
                    </p>
                  </div>
                </div>

                {/* Step 03 (Bottom) */}
                <div className="relative z-10 flex gap-5 group items-center">
                  <div className="h-10 w-10 shrink-0 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] flex items-center justify-center font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 outline outline-4 outline-white dark:outline-[#0C1222] transition-all duration-300 group-hover:bg-[#4169E1] group-hover:text-white group-hover:border-[#4169E1]">
                    03
                  </div>
                  <div className="border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] p-4 sm:p-5 flex-1 transition-all duration-300 group-hover:border-[#4169E1]/50 group-hover:bg-white dark:group-hover:bg-[#0C1222]">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold font-serif text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">Explanation Generation</h4>
                      <span className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider animate-step-pulse-3">Verifying</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      Outputs verified, step-by-step logic explaining exactly why the chosen option is legally and factually correct.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Output Terminal Bar */}
              <div className="mt-8 border border-[#4169E1]/20 bg-[#4169E1]/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 shrink-0 bg-[#4169E1] animate-ping" />
                  <p className="font-mono text-[10px] uppercase text-[#4169E1] font-bold tracking-wider">
                    Pipeline Operational
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Text and Outputs */}
            <div className="order-1 lg:order-2 flex flex-col justify-center py-4">
              <div className="mb-10">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#4169E1] mb-4">
                  The Evaluation Engine
                </p>
                <h3 className="text-4xl font-bold font-serif tracking-tight">
                  Not just answers. <br /> Comprehensive logic mapping.
                </h3>
                <p className="mt-6 text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
                  Juristo doesn't just tell you if you were right or wrong. It acts as an active tutor, breaking down the exact logical leap required to arrive at the correct legal or logical conclusion based on the provided passage.
                </p>
              </div>

              <div className="space-y-4">
                {workspaceOutputs.map((item) => (
                  <div className="border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] p-5 flex items-start gap-5 transition-colors hover:border-[#4169E1]/30 group cursor-default" key={item.title}>
                    <span className="shrink-0 h-12 w-12 border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A] flex items-center justify-center text-[#4169E1] group-hover:bg-[#4169E1] group-hover:text-white transition-colors duration-300">
                      <item.icon className="size-5" />
                    </span>
                    <div className="pt-0.5">
                      <p className="font-bold font-serif text-[15px] group-hover:text-[#4169E1] transition-colors">{item.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── PRICING SECTION ─── */}
      <section className="bg-white dark:bg-[#0C1222] py-24 border-b border-zinc-200 dark:border-white/10" id="pricing">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#4169E1] mb-3">
              Pricing Plans
            </p>
            <h2 className="text-4xl font-bold font-serif tracking-tight sm:text-5xl">
              Pick the plan that matches your study workflow.
            </h2>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-relaxed">
              Scale your learning capacities using dedicated CLAT student training bundles optimized entirely for exam preparation.
            </p>
          </div>

          {/* 3-Column Plan Grid */}
          <div className="grid gap-6 md:grid-cols-3 max-w-7xl mx-auto">

            {/* Plan 1: Spark */}
            <article className="flex flex-col justify-between border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-6 rounded-none transition-colors duration-150 hover:border-[#4169E1] hover:bg-zinc-50/30 dark:hover:bg-white/[0.01] group text-left">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="flex size-10 items-center justify-center border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] text-zinc-400 group-hover:border-[#4169E1] transition-colors">
                    <Sparkles className="size-4" />
                  </span>
                  <span className="rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] px-2.5 py-0.5 font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Starter
                  </span>
                </div>

                <div>
                  <p className="mb-0.5 font-mono font-bold text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Casual Prep
                  </p>
                  <h3 className="font-bold text-lg tracking-tight font-serif text-zinc-900 dark:text-white">Spark</h3>
                  <p className="mt-1.5 min-h-10 text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-normal">
                    For casual CLAT prep and quick doubt-solving.
                  </p>
                </div>

                <div className="flex items-baseline gap-1 border-b border-zinc-100 dark:border-white/5 pb-4 mt-4 select-none font-sans">
                  <span className="font-bold text-3xl tracking-tight text-zinc-900 dark:text-white">
                    Rs. 99
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium tracking-wide">/month</span>
                </div>

                <div className="inline-flex rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] px-2.5 py-1 font-mono text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-fit mt-4">
                  100,000 AI credits/month
                </div>

                <ul className="space-y-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-6">
                  {[
                    "100,000 monthly AI credits",
                    "Mini-only doubt solving and quick quizzes",
                    "5 personalized mini mocks",
                    "20 guided doubt sessions",
                    "Case-law and legal concept assistance",
                    "Limited document and syllabus uploads",
                  ].map((feature) => (
                    <li className="flex gap-3 items-start" key={feature}>
                      <Check className="mt-0.5 size-4 shrink-0 text-[#4169E1]" />
                      <span className="leading-normal">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8 w-full">
                <Link
                  href="/register?plan=clat_spark"
                  className="h-11 w-full flex items-center justify-center gap-2 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 font-mono text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                >
                  Upgrade Now <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>

            {/* Plan 2: Momentum (Featured / Popular) */}
            <article className="flex flex-col justify-between border-2 border-[#4169E1] bg-white dark:bg-[#0C1222] p-6 rounded-none relative shadow-sm text-left">
              <div className="absolute top-0 right-0 bg-[#4169E1] text-white px-3 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest">
                Recommended
              </div>

              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="flex size-10 items-center justify-center border border-[#4169E1] bg-white dark:bg-[#080D1A] text-[#4169E1]">
                    <TrendingUp className="size-4" />
                  </span>
                  <span className="rounded-none border border-[#4169E1]/20 bg-[#4169E1]/10 px-2.5 py-0.5 font-mono text-[9px] font-bold text-[#4169E1] uppercase tracking-wider">
                    Best for daily prep
                  </span>
                </div>

                <div>
                  <p className="mb-0.5 font-mono font-bold text-[9px] text-[#4169E1] uppercase tracking-widest">
                    Daily Prep
                  </p>
                  <h3 className="font-bold text-lg tracking-tight font-serif text-zinc-900 dark:text-white">Momentum</h3>
                  <p className="mt-1.5 min-h-10 text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-normal">
                    For serious aspirants using Juristo as a daily CLAT mentor.
                  </p>
                </div>

                <div className="flex items-baseline gap-1 border-b border-zinc-100 dark:border-white/5 pb-4 mt-4 select-none font-sans">
                  <span className="font-bold text-3xl tracking-tight text-zinc-900 dark:text-white">
                    Rs. 299
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium tracking-wide">/month</span>
                </div>

                <div className="inline-flex rounded-none border border-[#4169E1]/30 bg-[#4169E1]/5 px-2.5 py-1 font-mono text-[10px] font-bold text-[#4169E1] uppercase tracking-wider w-fit mt-4">
                  400,000 AI credits/month
                </div>

                <ul className="space-y-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-6">
                  {[
                    "400,000 monthly AI credits",
                    "Mini + Macro model access",
                    "15 personalized mocks",
                    "PYQ explanations and study-plan support",
                    "Daily CLAT current affairs and GK digest",
                    "RAG-driven doubt solving across uploaded material",
                  ].map((feature) => (
                    <li className="flex gap-3 items-start" key={feature}>
                      <Check className="mt-0.5 size-4 shrink-0 text-[#4169E1]" />
                      <span className="leading-normal">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8 w-full">
                <Link
                  href="/register?plan=clat_momentum"
                  className="h-11 w-full flex items-center justify-center gap-2 bg-[#4169E1] hover:bg-[#3454c5] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                >
                  Upgrade Now <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>

            {/* Plan 3: Peak */}
            <article className="flex flex-col justify-between border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-6 rounded-none transition-colors duration-150 hover:border-[#4169E1] hover:bg-zinc-50/30 dark:hover:bg-white/[0.01] group text-left">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="flex size-10 items-center justify-center border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] text-zinc-400 group-hover:border-[#4169E1] transition-colors">
                    <BarChart3 className="size-4" />
                  </span>
                  <span className="rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] px-2.5 py-0.5 font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Mock engine
                  </span>
                </div>

                <div>
                  <p className="mb-0.5 font-mono font-bold text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Crunch Season
                  </p>
                  <h3 className="font-bold text-lg tracking-tight font-serif text-zinc-900 dark:text-white">Peak</h3>
                  <p className="mt-1.5 min-h-10 text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-normal">
                    For the final push with mocks, analytics, and study pathing.
                  </p>
                </div>

                <div className="flex items-baseline gap-1 border-b border-zinc-100 dark:border-white/5 pb-4 mt-4 select-none font-sans">
                  <span className="font-bold text-3xl tracking-tight text-zinc-900 dark:text-white">
                    Rs. 499
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium tracking-wide">/month</span>
                </div>

                <div className="inline-flex rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] px-2.5 py-1 font-mono text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-fit mt-4">
                  800,000 AI credits/month
                </div>

                <ul className="space-y-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-6">
                  {[
                    "800,000 monthly AI credits",
                    "Mini + Macro + limited Max analytics",
                    "30 full-length simulated CLAT mocks",
                    "Sectional analytics and error pattern review",
                    "Predictive AIR benchmarking",
                    "Dynamic weekly study pathing",
                  ].map((feature) => (
                    <li className="flex gap-3 items-start" key={feature}>
                      <Check className="mt-0.5 size-4 shrink-0 text-[#4169E1]" />
                      <span className="leading-normal">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8 w-full">
                <Link
                  href="/register?plan=clat_peak"
                  className="h-11 w-full flex items-center justify-center gap-2 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 font-mono text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                >
                  Upgrade Now <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>

          </div>

          {/* Bottom Policy Subtitle */}
          <div className="mt-12 text-center select-none">
            <p className="text-zinc-400 dark:text-zinc-500 font-mono text-xs font-medium uppercase tracking-wider">
              Paid learning tiers are handled on a rolling monthly cycle. Transactions process securely via Razorpay.
            </p>
          </div>

        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-5 relative shrink-0">
              <Image src="/logo2.png" alt="Juristo Logo" fill className="object-contain grayscale opacity-60" />
            </div>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">Juristo AI Education Labs</span>
          </div>

          <div className="flex gap-6 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <Link className="hover:text-zinc-900 dark:hover:text-white transition-colors" href="/login">Log in</Link>
            <Link className="hover:text-zinc-900 dark:hover:text-white transition-colors" href="/register">Register</Link>
            <Link className="hover:text-zinc-900 dark:hover:text-white transition-colors" href="/terms">Terms</Link>
            <Link className="hover:text-zinc-900 dark:hover:text-white transition-colors" href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}