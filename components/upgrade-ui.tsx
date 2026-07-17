"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  GraduationCap,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RazorpayButton } from "@/components/razorpay-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarToggle } from "./sidebar-toggle";

type Plan = {
  id: string;
  name: string;
  eyebrow?: string;
  price: number;
  description: string;
  icon: LucideIcon;
  badge?: string;
  tokens: string;
  accent: string;
  features: string[];
};

const studentPlans: Plan[] = [
  {
    id: "clat_spark",
    name: "Spark",
    eyebrow: "Casual Prep",
    price: 99,
    description: "For casual CLAT prep and quick doubt-solving.",
    icon: Sparkles,
    badge: "Starter",
    tokens: "100,000 AI credits/month",
    accent: "text-sky-700 dark:text-sky-300 border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A]",
    features: [
      "100,000 monthly AI credits",
      "Mini-only doubt solving and quick quizzes",
      "5 personalized mini mocks",
      "20 guided doubt sessions",
      "Case-law and legal concept assistance",
      "Limited document and syllabus uploads",
    ],
  },
  {
    id: "clat_momentum",
    name: "Momentum",
    eyebrow: "Daily Prep",
    price: 299,
    description: "For serious aspirants using Juristo as a daily CLAT mentor.",
    icon: TrendingUp,
    badge: "Best for daily prep",
    tokens: "400,000 AI credits/month",
    accent: "text-emerald-700 dark:text-emerald-300 border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A]",
    features: [
      "400,000 monthly AI credits",
      "Mini + Macro model access",
      "15 personalized mocks",
      "PYQ explanations and study-plan support",
      "Daily CLAT current affairs and GK digest",
      "RAG-driven doubt solving across uploaded material",
    ],
  },
  {
    id: "clat_peak",
    name: "Peak",
    eyebrow: "Crunch Season",
    price: 499,
    description: "For the final push with mocks, analytics, and study pathing.",
    icon: BarChart3,
    badge: "Mock engine",
    tokens: "800,000 AI credits/month",
    accent: "text-amber-700 dark:text-amber-300 border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A]",
    features: [
      "800,000 monthly AI credits",
      "Mini + Macro + limited Max analytics",
      "30 full-length simulated CLAT mocks",
      "Sectional analytics and error pattern review",
      "Predictive AIR benchmarking",
      "Dynamic weekly study pathing",
    ],
  },
];

function getPlanWeight(planId: string) {
  switch (planId?.toLowerCase()) {
    case "clat_peak":
      return 6;
    case "clat_momentum":
      return 5;
    case "clat_spark":
      return 3;
    case "free":
    case "basic":
      return 1;
    default:
      return 1;
  }
}

function isCurrentPlan(planId: string, currentPlan: string) {
  const current = currentPlan?.toLowerCase() || "free";
  if (planId === "free") return current === "free" || current === "basic";
  return current === planId;
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  if (price === -1) return "Custom";
  return `Rs. ${price}`;
}

function PlanCard({
  plan,
  currentPlan,
  currentPlanWeight,
  onSuccess,
}: {
  plan: Plan;
  currentPlan: string;
  currentPlanWeight: number;
  onSuccess: () => void;
}) {
  const Icon = plan.icon;
  const current = isCurrentPlan(plan.id, currentPlan);
  const isUpgrade = getPlanWeight(plan.id) > currentPlanWeight;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-none border bg-white dark:bg-[#0C1222] p-6 text-left transition-colors duration-150",
        current
          ? "border-[#4169E1] dark:border-[#4169E1] bg-zinc-50/20 dark:bg-white/[0.02]"
          : "border-zinc-200 dark:border-white/5 hover:border-[#4169E1] dark:hover:border-[#4169E1] hover:bg-zinc-50/30 dark:hover:bg-white/[0.01]"
      )}
    >
      <div className="w-full space-y-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-none border transition-colors duration-150",
              current
                ? "border-[#4169E1] text-[#4169E1] bg-white dark:bg-[#080D1A]"
                : "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] text-zinc-400 group-hover:border-[#4169E1]"
            )}
          >
            <Icon className="size-4" />
          </span>
          {current ? (
            <span className="inline-flex items-center gap-1 rounded-none border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Check className="size-3" />
              Current
            </span>
          ) : plan.badge ? (
            <span className="rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] px-2.5 py-0.5 font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {plan.badge}
            </span>
          ) : null}
        </div>

        <div>
          {plan.eyebrow ? (
            <p className="mb-0.5 font-mono font-bold text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              {plan.eyebrow}
            </p>
          ) : null}
          <h3 className="font-bold text-lg tracking-tight font-serif text-zinc-900 dark:text-white">{plan.name}</h3>
          <p className="mt-1.5 min-h-10 text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-normal">
            {plan.description}
          </p>
        </div>

        <div className="flex items-baseline gap-1 border-b border-zinc-100 dark:border-white/5 pb-4 select-none font-sans">
          <span className="font-bold text-3xl tracking-tight text-zinc-900 dark:text-white">
            {formatPrice(plan.price)}
          </span>
          {plan.price > 0 ? (
            <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium tracking-wide">/month</span>
          ) : null}
        </div>

        <div className="inline-flex rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] px-2.5 py-1 font-mono text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-fit">
          {plan.tokens}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-6">
        <ul className="space-y-3.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {plan.features.map((feature) => (
            <li className="flex gap-3 items-start" key={feature}>
              <Check className="mt-0.5 size-4 shrink-0 text-[#4169E1]" />
              <span className="leading-normal">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-8 w-full">
        {plan.price === 0 || current ? (
          <Button
            disabled={current}
            variant={current ? "outline" : "default"}
            className={cn(
              "h-11 w-full gap-2 font-medium text-xs uppercase tracking-wider rounded-none",
              current
                ? "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
                : "bg-[#4169E1] hover:bg-[#3454c5] text-white"
            )}
            asChild={!current}
          >
            {current ? (
              "Your current plan"
            ) : (
              <Link href="/">
                Start free
                <ArrowRight className="size-4" />
              </Link>
            )}
          </Button>
        ) : (
          <RazorpayButton
            amount={plan.price}
            className={cn(
              "h-11 w-full gap-2 font-medium text-xs uppercase tracking-wider rounded-none cursor-pointer",
              isUpgrade
                ? "bg-[#4169E1] hover:bg-[#3454c5] text-white"
                : "border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5"
            )}
            itemId={plan.id}
            itemName={`Juristo ${plan.name} Plan`}
            onSuccess={onSuccess}
            type="plan_upgrade"
            variant={isUpgrade ? "default" : "outline"}
          >
            {isUpgrade ? "Upgrade now" : "Switch plan"}
            <ArrowRight className="size-4" />
          </RazorpayButton>
        )}
      </div>
    </div>
  );
}

function PricingSection({
  id,
  eyebrow,
  title,
  description,
  plans,
  columns,
  currentPlan,
  currentPlanWeight,
  onSuccess,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  plans: Plan[];
  columns: string;
  currentPlan: string;
  currentPlanWeight: number;
  onSuccess: () => void;
}) {
  return (
    <section className="w-full scroll-mt-20 animate-in fade-in duration-300" id={id}>
      <div className={cn("grid gap-5", columns)}>
        {plans.map((plan) => (
          <PlanCard
            currentPlan={currentPlan}
            currentPlanWeight={currentPlanWeight}
            key={plan.id}
            onSuccess={onSuccess}
            plan={plan}
          />
        ))}
      </div>
    </section>
  );
}

interface UpgradeUIProps {
  currentPlan: string;
}

export function UpgradeUI({ currentPlan }: UpgradeUIProps) {
  const router = useRouter();
  const currentPlanWeight = getPlanWeight(currentPlan);

  const handleSuccess = () => {
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0C1222] font-sans text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── PREMIUM OUTLINED TOP NAVIGATION HEADER ─── */}
      <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] px-4 py-3 md:px-6 md:py-4 select-none transition-colors">
        <div className="flex items-center gap-4 ml-0.5 text-left">
          <SidebarToggle />
        </div>
      </header>

      {/* ─── MAIN PRICING MATRICES VIEWPORT ─── */}
      <main className="mx-auto max-w-7xl px-6 py-8 md:py-12 space-y-12">

        {/* Header Directive Block */}
        <div className="max-w-3xl text-left space-y-2 select-none">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4169E1]/20 bg-[#4169E1]/10 px-3 py-1 text-xs font-bold text-[#4169E1] shadow-none uppercase tracking-wider">
            <GraduationCap className="h-3.5 w-3.5" />
            Verified Student Training Domain Active
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-serif md:text-4xl">
              Pick the plan that matches your study workflow.
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-relaxed">
              Professional legal layers have been fully eliminated. Scale your capacities using dedicated CLAT student training bundles optimized entirely for prep-focused law entrance workspace tracking.
            </p>
          </div>
        </div>

        {/* Dynamic Pricing Layout Section Grid Track */}
        <div className="w-full min-h-[400px]">
          <PricingSection
            columns="md:grid-cols-3"
            currentPlan={currentPlan}
            currentPlanWeight={currentPlanWeight}
            description=""
            eyebrow="Student plans"
            id="student-plans"
            onSuccess={handleSuccess}
            plans={studentPlans}
            title="CLAT student bundles"
          />
        </div>

        {/* Bottom Safety Parameter Policy Ribbon */}
        <div className="border-t border-zinc-100 dark:border-white/5 pt-6 text-center select-none">
          <p className="text-zinc-400 dark:text-zinc-500 font-sans text-xs font-medium">
            Paid learning tiers are handled on a rolling monthly cycle. Transaction scripts process completely securely via Razorpay gateways.
          </p>
        </div>
      </main>
    </div>
  );
}