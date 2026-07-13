"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  FileText,
  GraduationCap,
  Landmark,
  Newspaper,
  Scale,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const legalPhrases = [
  "draft a clean contract",
  "research a judgment",
  "summarize legal updates",
  "prepare a case note",
  "turn documents into next steps",
];

const clatPhrases = [
  "practice legal reasoning",
  "review a mock score",
  "build a weekly study path",
  "revise current affairs",
  "train your reading speed",
];

type ExploreCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  external?: boolean;
  prompt?: string;
  tone: string;
};

const legalExploreCards: ExploreCard[] = [
  {
    title: "File ODR",
    description: "Start a guided online dispute filing packet.",
    icon: Scale,
    prompt:
      "File an ODR for my dispute. Ask me only for the missing details, check my plan limits, track the filing status, and prepare the ODR packet.",
    tone: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  },
  {
    title: "Legal Updates",
    description: "Get a concise India-focused brief with legal relevance.",
    icon: Newspaper,
    prompt:
      "Give me a concise India-focused legal updates brief. Include the issue, institution involved, legal relevance, and why it matters. If you need a specific date range or source, ask me first.",
    tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  },
  {
    title: "Judgment Research",
    description: "Open Supreme Court summaries and case-law research.",
    icon: Landmark,
    href: "/legal/judgements/sc",
    tone: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  },
  {
    title: "Contract Draft",
    description: "Start a precise first draft with clauses and risks.",
    icon: FileText,
    prompt:
      "Draft a legal contract for: [describe parties, purpose, payment, term, jurisdiction, and key obligations]. Ask me for any missing details before drafting.",
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  {
    title: "Find a Lawyer",
    description: "Connect with verified lawyers for live help.",
    icon: Briefcase,
    href: "https://lawyer.juristo.in/",
    external: true,
    tone: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  },
];

const clatExploreCards: ExploreCard[] = [
  {
    title: "Current Affairs Drill",
    description: "Convert legal updates into CLAT-style revision.",
    icon: Newspaper,
    prompt:
      "Create a CLAT current affairs drill from recent legal and constitutional developments. Include short notes, likely question angles, and 5 MCQs. If you need a source or date range, ask me first.",
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  {
    title: "Mock Score Review",
    description: "Turn score, time, and mistakes into a next-week plan.",
    icon: BarChart3,
    prompt:
      "Analyze my CLAT mock performance. My section scores, time taken, and mistakes are: [paste details]. Give me a focused 7-day improvement plan.",
    tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  },
  {
    title: "Study Roadmap",
    description: "Open your adaptive CLAT roadmap workspace.",
    icon: CalendarDays,
    href: "/clat-exam?tab=roadmap",
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  {
    title: "Quick Quiz",
    description: "Generate a short legal reasoning or GK sprint.",
    icon: GraduationCap,
    href: "/clat-exam?tab=quick",
    tone: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  },
];

function setComposerPrompt(prompt: string) {
  const input = document.querySelector("textarea");
  if (!(input instanceof HTMLTextAreaElement)) return;

  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  setter?.call(input, prompt);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}

export const Greeting = memo(
  ({
    isWidget,
    context,
    userName,
  }: {
    isWidget?: boolean;
    context?: string;
    userName?: string | null;
  }) => {
    const firstName = userName?.trim().split(/\s+/)[0];
    const [text, setText] = useState("");
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const activePhrases = context === "clat" ? clatPhrases : legalPhrases;
    const currentPhrase = activePhrases[phraseIndex];

    useEffect(() => {
      const speed = isDeleting ? 34 : 62;
      const timer = setTimeout(() => {
        if (!isDeleting && text === currentPhrase) {
          setTimeout(() => setIsDeleting(true), 1050);
        } else if (isDeleting && text === "") {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % activePhrases.length);
        } else {
          setText(
            currentPhrase.substring(0, text.length + (isDeleting ? -1 : 1))
          );
        }
      }, speed);

      return () => clearTimeout(timer);
    }, [activePhrases.length, currentPhrase, isDeleting, text]);

    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-4xl flex-col px-4 text-center",
          isWidget ? "pt-2" : "pt-0 md:px-8"
        )}
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "font-semibold tracking-tight text-foreground",
            isWidget ? "text-lg md:text-xl" : "text-2xl md:text-4xl"
          )}
          initial={{ opacity: 0, y: 10 }}
        >
          {context === "clat"
            ? "Ready for your CLAT session?"
            : `Welcome${firstName ? `, ${firstName}` : ""}`}
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mt-2 text-muted-foreground",
            isWidget ? "text-sm md:text-base" : "text-sm md:text-base"
          )}
          initial={{ opacity: 0, y: 8 }}
        >
          I can help you{" "}
          <span className="font-medium text-foreground">{text}</span>
          <span className="ml-1 animate-pulse text-primary">|</span>
        </motion.div>
      </div>
    );
  }
);

Greeting.displayName = "Greeting";

function ExploreCardAction({
  card,
  onPrompt,
}: {
  card: ExploreCard;
  onPrompt: (prompt: string) => void;
}) {
  const Icon = card.icon;
  const content = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          card.tone
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium text-[13px] text-foreground leading-5">
          {card.title}
          {card.prompt ? <Sparkles className="size-3 text-primary/65" /> : null}
        </span>
        <span className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground leading-4">
          {card.description}
        </span>
      </span>
    </>
  );
  const className =
    "group flex min-h-[88px] w-full items-start gap-3 rounded-lg border border-border/70 bg-card/70 p-3 text-left transition-colors hover:border-border hover:bg-accent/40";

  if (card.prompt) {
    return (
      <button
        className={className}
        onClick={() => onPrompt(card.prompt!)}
        type="button"
      >
        {content}
      </button>
    );
  }

  if (card.external && card.href) {
    return (
      <a
        className={className}
        href={card.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={card.href || "/"}>
      {content}
    </Link>
  );
}

export const ExploreCards = memo(({ context }: { context?: string }) => {
  const cards = useMemo(
    () => (context === "clat" ? clatExploreCards : legalExploreCards),
    [context]
  );

  const handlePrompt = useCallback((prompt: string) => {
    setComposerPrompt(prompt);
  }, []);

  return (
    <div className="mx-auto mt-4 w-full max-w-5xl px-0">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Search className="size-3.5 text-muted-foreground" />
        <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
          Explore
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-2 pb-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 16 }}
            key={card.title}
            transition={{ delay: 0.18 + index * 0.06 }}
          >
            <ExploreCardAction card={card} onPrompt={handlePrompt} />
          </motion.div>
        ))}
      </div>
    </div>
  );
});

ExploreCards.displayName = "ExploreCards";
