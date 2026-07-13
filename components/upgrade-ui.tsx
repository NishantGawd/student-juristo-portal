"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    accent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
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
    accent:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
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
    accent:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
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

const professionalPlans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "For trying Juristo safely before upgrading.",
    icon: Sparkles,
    tokens: "25,000 AI credits/month",
    accent:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-300",
    features: [
      "25,000 monthly AI credits",
      "Juristo Mini access for basic legal chat",
      "3 contract drafts",
      "5 document analyses",
      "ODR eligibility preview and checklist",
      "Basic legal resources",
    ],
  },
  {
    id: "advance",
    name: "Advance",
    price: 299,
    description: "For routine legal work by solo users, founders, and freelancers.",
    icon: ShieldCheck,
    tokens: "300,000 AI credits/month",
    accent:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
    features: [
      "300,000 monthly AI credits",
      "Juristo Mini + limited Macro access",
      "10 contract drafts per month",
      "20 document analyses per month",
      "3 legal research reports per month",
      "Legal templates and bare acts",
      "1 ODR filing packet per month",
      "AI contract vetting",
    ],
  },
  {
    id: "advance_pro",
    name: "Advance Pro",
    price: 999,
    description: "For serious recurring legal work and power users.",
    icon: BriefcaseBusiness,
    badge: "Popular",
    tokens: "1,000,000 AI credits/month",
    accent:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    features: [
      "1,000,000 monthly AI credits",
      "Mini + Macro + limited Max access",
      "40 contract drafts per month",
      "100 document analyses per month",
      "10 legal research reports per month",
      "Full legal resources library",
      "5 ODR filing packets per month",
      "Priority lawyer matching",
      "Advanced exports",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: -1,
    description: "For law firms and larger organizations.",
    icon: BookOpenCheck,
    tokens: "Custom AI credits and seats",
    accent:
      "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    features: [
      "Team-enabled legal assistant",
      "Collaborative contract drafting",
      "Bulk document analysis",
      "Bulk ODR and dispute workflows",
      "Custom Mini, Macro, and Max access",
      "Dedicated support paths",
      "Dedicated account manager",
    ],
  },
];

function getPlanWeight(planId: string) {
  switch (planId?.toLowerCase()) {
    case "business":
      return 8;
    case "advance_pro":
      return 7;
    case "clat_peak":
      return 6;
    case "clat_momentum":
      return 5;
    case "advance":
      return 4;
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
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-lg border bg-card/70",
        current
          ? "border-primary shadow-sm"
          : "border-border/70 hover:border-border"
      )}
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -3 }}
    >
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              plan.accent
            )}
          >
            <Icon className="size-5" />
          </span>
          {current ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-medium text-[11px] text-emerald-700 dark:text-emerald-300">
              <Check className="size-3" />
              Current
            </span>
          ) : plan.badge ? (
            <span className="rounded-full border border-border bg-background px-2 py-1 font-medium text-[11px] text-muted-foreground">
              {plan.badge}
            </span>
          ) : null}
        </div>

        {plan.eyebrow ? (
          <p className="mb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
            {plan.eyebrow}
          </p>
        ) : null}
        <h3 className="font-semibold text-xl tracking-tight">{plan.name}</h3>
        <p className="mt-2 min-h-10 text-muted-foreground text-sm leading-5">
          {plan.description}
        </p>

        <div className="mt-5 flex items-end gap-1">
          <span className="font-semibold text-3xl tracking-tight">
            {formatPrice(plan.price)}
          </span>
          {plan.price > 0 ? (
            <span className="pb-1 text-muted-foreground text-sm">/month</span>
          ) : null}
        </div>

        <div className="mt-4 inline-flex rounded-md border border-border/70 bg-background px-2.5 py-1.5 font-medium text-[12px] text-muted-foreground">
          {plan.tokens}
        </div>
      </div>

      <div className="h-px bg-border/60" />

      <div className="flex flex-1 flex-col p-5">
        <ul className="space-y-2.5 text-sm">
          {plan.features.map((feature) => (
            <li className="flex gap-2.5" key={feature}>
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-5 text-foreground/90">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-border/60 border-t p-5">
        {plan.price === 0 || current ? (
          <Button
            disabled={current}
            variant={current ? "outline" : "default"}
            className="h-10 w-full gap-2 font-medium"
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
        ) : plan.price === -1 ? (
          <Button asChild className="h-10 w-full gap-2 font-medium">
            <a
              href="https://wa.me/7607557771"
              rel="noopener noreferrer"
              target="_blank"
            >
              Contact sales
              <ArrowRight className="size-4" />
            </a>
          </Button>
        ) : (
          <RazorpayButton
            amount={plan.price}
            className="h-10 w-full gap-2 font-medium"
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
    </motion.div>
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
    <section className="scroll-mt-20 animate-in fade-in duration-200" id={id}>
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-semibold text-2xl tracking-tight">
            {title}
          </h2>
        </div>
        <p className="max-w-2xl text-muted-foreground text-sm leading-6">
          {description}
        </p>
      </div>

      <div className={cn("grid gap-4", columns)}>
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

  const [activeTab, setActiveTab] = useState<"professional" | "student">("professional");

  // ─── Bulletproof Reactive Route Hash Observer ───
  useEffect(() => {
    const handleHashSync = () => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash === "#student-plans") {
        setActiveTab("student");
      } else if (hash === "#professional-plans" || hash === "") {
        setActiveTab("professional");
      }
    };

    // Evaluate initial path parameters
    handleHashSync();

    // Attach native cross-navigation event overrides
    window.addEventListener("hashchange", handleHashSync);
    window.addEventListener("popstate", handleHashSync);
    
    // Fallback polling cycle to sync internal Next.js single-page client routing clicks
    const hashInterval = setInterval(handleHashSync, 100);

    return () => {
      window.removeEventListener("hashchange", handleHashSync);
      window.removeEventListener("popstate", handleHashSync);
      clearInterval(hashInterval);
    };
  }, []);

  const handleTabChange = (target: "professional" | "student") => {
    setActiveTab(target);
    window.location.hash = target === "student" ? "student-plans" : "professional-plans";
  };

  const handleSuccess = () => {
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-border/50 border-b bg-background/95 px-4 py-2 backdrop-blur-md md:px-6">
        <SidebarToggle />
        <span className="font-medium text-sm">Upgrade</span>
        <div className="flex-1" />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 max-w-3xl"
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.4 }}
        >
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
            Juristo pricing
          </p>
          <h1 className="mt-2 font-semibold text-3xl tracking-tight md:text-4xl">
            Pick the plan that matches your legal workflow.
          </h1>
          <p className="mt-3 text-muted-foreground leading-6">
            Professional Legal AI plans are designed for general public workflows, with dedicated CLAT student bundles optimized for prep-focused law workspace tracking.
          </p>
        </motion.div>

        {/* Premium Tab Bar Controller Selector */}
        <div className="mb-10 flex justify-start">
          <div className="inline-flex rounded-xl bg-muted p-1 border border-border/40 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => handleTabChange("professional")}
              className={cn(
                "rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                activeTab === "professional"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Professional Legal AI
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("student")}
              className={cn(
                "rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                activeTab === "student"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Student Bundles & CLAT
            </button>
          </div>
        </div>

        {/* Workspace Panels Dynamic Rendering Engine */}
        <div className="space-y-12 min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === "professional" ? (
              <motion.div
                key="professional-panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <PricingSection
                  columns="md:grid-cols-2 lg:grid-cols-4"
                  currentPlan={currentPlan}
                  currentPlanWeight={currentPlanWeight}
                  description=""
                  eyebrow="Legal AI plans"
                  id="professional-plans"
                  onSuccess={handleSuccess}
                  plans={professionalPlans}
                  title="Professional legal AI"
                />
              </motion.div>
            ) : (
              <motion.div
                key="student-panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-10 border-border/60 border-t pt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Paid plans are billed monthly. Payments are processed securely by
            Razorpay.
          </p>
        </div>
      </main>
    </div>
  );
}
