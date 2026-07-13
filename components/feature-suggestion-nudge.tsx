"use client";

import {
  ArrowRight,
  Briefcase,
  FileSearch,
  FileText,
  MapPinned,
  Scale,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { cn } from "@/lib/utils";

const FEATURE_UPDATE_LIVE_DAYS = 7;
const DISMISS_STORAGE_PREFIX = "juristo-feature-update-dismissed";

type FeatureUpdate = {
  id: string;
  label: string;
  title: string;
  description: string;
  launchedAt: string;
  icon: LucideIcon;
  actionLabel: string;
  prompt?: string;
  enablesResearch?: boolean;
};

type UseCaseSuggestion = {
  id: string;
  label: string;
  title: string;
  description: string;
  accentClassName: string;
  icon: LucideIcon;
  prompts: string[];
  enablesResearch?: boolean;
};

const FEATURE_UPDATES: FeatureUpdate[] = [
  {
    id: "property-case-workspace",
    label: "New workspace",
    title: "Property dispute visuals are live",
    description:
      "Create land maps, ownership chains, boundary visuals, map views, and PDF reports from structured facts.",
    launchedAt: "2026-07-01",
    icon: MapPinned,
    actionLabel: "Try it",
    prompt:
      "Create a property dispute visualizer. Ask me for missing details and prepare a land map, ownership chain, boundary comparison, encroachment visual, map view, summary, and PDF report.",
  },
  {
    id: "research-mode",
    label: "New mode",
    title: "Research Mode can now stay source-aware",
    description:
      "Use it for deeper legal research with statutes, cases, and cited reasoning.",
    launchedAt: "2026-07-01",
    icon: FileSearch,
    actionLabel: "Enable",
    enablesResearch: true,
    prompt:
      "Research the current Supreme Court position on injunctions in property boundary disputes. Include key cases, principles, and practical filing points.",
  },
];

const USE_CASE_SUGGESTIONS: UseCaseSuggestion[] = [
  {
    id: "drafting",
    label: "Drafting",
    title: "Start a legal draft",
    description: "Contracts, notices, petitions, replies, and case notes.",
    accentClassName: "from-amber-500 to-orange-500",
    icon: FileText,
    prompts: [
      "Draft a legal notice for breach of contract. Ask me for missing party, payment, timeline, and jurisdiction details first.",
      "Draft a rental agreement with clauses for rent, deposit, lock-in, maintenance, termination, and jurisdiction.",
      "Prepare a plaint outline for a civil property dispute using facts I provide. Ask clarifying questions before drafting.",
    ],
  },
  {
    id: "research",
    label: "Research",
    title: "Research a legal issue",
    description: "Find relevant law, cases, principles, and risks.",
    accentClassName: "from-sky-500 to-cyan-500",
    icon: FileSearch,
    enablesResearch: true,
    prompts: [
      "Research Indian case law on temporary injunctions in civil property disputes. Include principles, citations, and practical use.",
      "Find the latest legal position on limitation for filing a suit for possession. Ask me for missing facts first.",
      "Research consumer protection remedies for delayed service delivery and prepare a short strategy note.",
    ],
  },
  {
    id: "property-disputes",
    label: "Property disputes",
    title: "Create property visuals",
    description: "Land map, chain of title, boundaries, encroachment, report.",
    accentClassName: "from-emerald-500 to-teal-500",
    icon: MapPinned,
    prompts: [
      "Create a property dispute visualizer. Ask me for missing details and prepare a land map, ownership chain, boundary comparison, encroachment visual, map view, summary, and PDF report.",
      "I have a boundary dispute. Build a property visualizer for Survey No. 125/3 with official boundary, claimed boundary, and encroachment details.",
      "Generate a property case workspace from these facts: address, khasra number, owners, adjacent properties, dimensions, boundaries, and encroachment.",
    ],
  },
  {
    id: "odr",
    label: "Try ODR",
    title: "Prepare dispute filing",
    description: "Guided ODR intake, notice prep, and filing steps.",
    accentClassName: "from-violet-500 to-indigo-500",
    icon: Scale,
    prompts: [
      "Start an ODR filing workflow for my dispute. Ask only for missing details and prepare the filing packet.",
      "Create a legal notice for a consumer dispute and structure it for online dispute resolution.",
      "Help me assess whether this dispute is suitable for ODR and list the documents I should upload.",
    ],
  },
  {
    id: "connect-lawyer",
    label: "Connect lawyer",
    title: "Find the right lawyer",
    description: "Prepare matter details before matching with counsel.",
    accentClassName: "from-rose-500 to-pink-500",
    icon: Briefcase,
    prompts: [
      "Help me find the right lawyer for my case. Ask for location, case type, urgency, budget, and documents before suggesting next steps.",
      "Create a short lawyer brief for a property dispute consultation with facts, documents, issues, and questions to ask.",
      "Prepare a consultation checklist for speaking to a civil lawyer about my dispute.",
    ],
  },
];

function isUpdateLive(update: FeatureUpdate, now: Date) {
  const launchedAt = new Date(`${update.launchedAt}T00:00:00`);

  if (Number.isNaN(launchedAt.getTime())) {
    return false;
  }

  const expiresAt = new Date(launchedAt);
  expiresAt.setDate(expiresAt.getDate() + FEATURE_UPDATE_LIVE_DAYS);

  return now >= launchedAt && now < expiresAt;
}

function dismissKey(update: FeatureUpdate) {
  return `${DISMISS_STORAGE_PREFIX}:${update.id}:${update.launchedAt}`;
}

function wasDismissed(update: FeatureUpdate) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(dismissKey(update)) === "true";
}

export function FeatureSuggestionNudge({
  className,
  disabled,
  input,
  setInput,
  onResearchModeChange,
  onWebSearchChange,
}: {
  className?: string;
  disabled?: boolean;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  onResearchModeChange?: (enabled: boolean) => void;
  onWebSearchChange?: (enabled: boolean) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dismissedUpdateIds, setDismissedUpdateIds] = useState<Set<string>>(
    () => new Set()
  );
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setShowUpdate(true), 750);
    return () => window.clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    const expiryTimer = window.setInterval(
      () => setNow(new Date()),
      60 * 60 * 1000
    );
    return () => window.clearInterval(expiryTimer);
  }, []);

  const liveUpdates = useMemo(
    () =>
      FEATURE_UPDATES.filter(
        (update) =>
          isUpdateLive(update, now) &&
          !dismissedUpdateIds.has(update.id) &&
          !wasDismissed(update)
      ),
    [dismissedUpdateIds, now]
  );

  const activeUpdate = liveUpdates[0] ?? null;
  const activeSuggestion =
    USE_CASE_SUGGESTIONS.find((suggestion) => suggestion.id === activeId) ??
    null;

  if (input.trim() && input !== previewPrompt) {
    return null;
  }

  const fillPrompt = ({
    enablesResearch,
    prompt,
  }: {
    enablesResearch?: boolean;
    prompt?: string;
  }) => {
    if (disabled || !prompt) return;
    setPreviewPrompt(null);

    if (enablesResearch) {
      onResearchModeChange?.(true);
      onWebSearchChange?.(false);
    }

    setInput(prompt);
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }, 0);
  };

  const previewPromptInComposer = (prompt: string) => {
    if (disabled) return;
    setPreviewPrompt(prompt);
    setInput(prompt);
  };

  const clearPromptPreview = (prompt: string) => {
    if (previewPrompt !== prompt) {
      return;
    }

    setPreviewPrompt(null);
    setInput((currentInput) => (currentInput === prompt ? "" : currentInput));
  };

  const dismissUpdate = (update: FeatureUpdate) => {
    setShowUpdate(false);
    setDismissedUpdateIds((current) => new Set(current).add(update.id));

    try {
      window.localStorage.setItem(dismissKey(update), "true");
    } catch {
      // Dismiss for this session even when storage is unavailable.
    }
  };

  return (
    <div className={cn("relative z-20 mx-auto mt-3 w-full max-w-4xl", className)}>
      {activeUpdate && showUpdate ? (
        <FeatureUpdateCard
          disabled={disabled}
          onDismiss={() => dismissUpdate(activeUpdate)}
          onTry={() =>
            fillPrompt({
              enablesResearch: activeUpdate.enablesResearch,
              prompt: activeUpdate.prompt,
            })
          }
          update={activeUpdate}
        />
      ) : null}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {USE_CASE_SUGGESTIONS.map((suggestion) => {
          const Icon = suggestion.icon;
          const isActive = activeSuggestion?.id === suggestion.id;

          return (
            <button
              className={cn(
                "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 font-medium text-sm transition-all disabled:cursor-not-allowed",
                isActive
                  ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
                  : "border-border/60 bg-muted/70 text-foreground hover:border-border hover:bg-accent"
              )}
              disabled={disabled}
              key={suggestion.id}
              onClick={() =>
                setActiveId((current) =>
                  current === suggestion.id ? null : suggestion.id
                )
              }
              type="button"
            >
              <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              <span className="whitespace-nowrap">{suggestion.label}</span>
            </button>
          );
        })}
      </div>

      {activeSuggestion ? (
        <UseCasePromptPanel
          disabled={disabled}
          onClose={() => setActiveId(null)}
          onPrompt={(prompt) =>
            fillPrompt({
              enablesResearch: activeSuggestion.enablesResearch,
              prompt,
            })
          }
          onClearPreview={clearPromptPreview}
          onPreview={previewPromptInComposer}
          suggestion={activeSuggestion}
        />
      ) : null}
    </div>
  );
}

function FeatureUpdateCard({
  disabled,
  update,
  onDismiss,
  onTry,
}: {
  disabled?: boolean;
  update: FeatureUpdate;
  onDismiss: () => void;
  onTry: () => void;
}) {
  const Icon = update.icon;

  return (
    <div className="pointer-events-auto relative mx-auto mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border/80 bg-card/95 p-3 shadow-xl shadow-black/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-1 duration-300 sm:absolute sm:top-full sm:right-2 sm:mx-0">
      <button
        aria-label="Dismiss update"
        className="absolute right-2 top-2 z-10 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={onDismiss}
        type="button"
      >
        <X className="size-4" />
      </button>

      <div className="flex gap-3 pr-7">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted text-foreground shadow-sm">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{update.label}</p>
            <span className="rounded-md border border-border/70 bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
              This week
            </span>
          </div>
          <p className="mt-1 font-medium text-sm leading-5">{update.title}</p>
          <p className="mt-1 text-muted-foreground text-xs leading-5">
            {update.description}
          </p>
          {update.prompt || update.enablesResearch ? (
            <button
              className="mt-3 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-3 font-medium text-background text-xs transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled}
              onClick={onTry}
              type="button"
            >
              {update.actionLabel}
              <ArrowRight className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UseCasePromptPanel({
  disabled,
  suggestion,
  onClose,
  onClearPreview,
  onPrompt,
  onPreview,
}: {
  disabled?: boolean;
  suggestion: UseCaseSuggestion;
  onClose: () => void;
  onClearPreview: (prompt: string) => void;
  onPrompt: (prompt: string) => void;
  onPreview: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto mt-3 max-h-[min(20rem,42vh)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl shadow-black/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200 [scrollbar-width:thin]">
      <div className="flex items-start justify-between gap-3 border-border/60 border-b pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Sparkles className="size-3.5" />
            <span>{suggestion.label}</span>
          </div>
          <p className="mt-1 font-medium text-sm">{suggestion.title}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {suggestion.description}
          </p>
        </div>
        <button
          aria-label="Close suggestions"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="divide-y divide-border/60">
        {suggestion.prompts.map((prompt) => (
          <button
            className="block w-full cursor-pointer py-3 text-left text-sm leading-5 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            key={prompt}
            onBlur={() => onClearPreview(prompt)}
            onClick={() => onPrompt(prompt)}
            onFocus={() => onPreview(prompt)}
            onMouseEnter={() => onPreview(prompt)}
            onMouseLeave={() => onClearPreview(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
