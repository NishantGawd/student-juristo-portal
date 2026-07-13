"use client";

import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Globe2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ToolPartProps } from "@/lib/a2ui/types";
import { cn } from "@/lib/utils";

type ResearchProgress = {
  chatId: string;
  runId: string;
  legalIssue: string;
  jurisdiction: string;
  startedAt: number;
  status: "running" | "complete";
  stage:
    | "issue-graph"
    | "authorities"
    | "treatment"
    | "forum"
    | "citation-audit"
    | "ready-for-writing";
  message: string;
  activeQuery?: string;
  plan?: Array<{
    id: string;
    label: string;
    query: string;
    issueNodeId?: string;
  }>;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    content?: string;
    publishedDate?: string;
    sourceType?: string;
    query?: string;
    status?: "found" | "used";
  }>;
  issueGraph?: Array<{
    id: string;
    parentId?: string;
    issue: string;
    subQuestion: string;
    forum: string;
    confidence: string;
  }>;
  authorities?: Array<{
    id: string;
    title: string;
    sourceRole: string;
    authorityType: string;
  }>;
  claims?: Array<{
    claimId: string;
    proposition: string;
    confidence: string;
    loadBearing: boolean;
  }>;
  audits?: {
    status: "pass" | "needs_revision";
    citationAudit?: Array<{ status: string; message: string }>;
    sourceHierarchyAudit?: Array<{ status: string; message: string }>;
    treatmentAudit?: Array<{ status: string; message: string }>;
    completenessAudit?: Array<{ status: string; message: string }>;
  };
};

const stageOrder = [
  "issue-graph",
  "authorities",
  "treatment",
  "forum",
  "citation-audit",
  "ready-for-writing",
];

function getStageIndex(stage?: ResearchProgress["stage"]) {
  return Math.max(0, stageOrder.indexOf(stage || "issue-graph"));
}

function getStepState(index: number, currentIndex: number, isDone: boolean) {
  if (isDone || index < currentIndex) {
    return "completed";
  }
  if (index === currentIndex) {
    return "active";
  }
  return "pending";
}

function getSourceIcon(domain?: string) {
  return domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    : undefined;
}

function getResearchStageText(
  stage?: ResearchProgress["stage"],
  isDone = false
) {
  if (isDone) {
    return "Research checks are complete";
  }

  switch (stage) {
    case "issue-graph":
      return "Breaking the question into key legal points";
    case "authorities":
      return "Finding reliable legal sources";
    case "treatment":
      return "Checking whether key cases are still reliable";
    case "forum":
      return "Checking the right court or forum";
    case "citation-audit":
      return "Checking support for important points";
    case "ready-for-writing":
      return "Preparing the final research packet";
    default:
      return "Research is in progress";
  }
}

function StatusDot({ state }: { state: "completed" | "active" | "pending" }) {
  if (state === "completed") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckCircle2 className="size-4" />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full border bg-background shadow-[0_0_0_4px_hsl(var(--primary)/0.1)]">
        <Loader2 className="size-4 animate-spin text-primary" />
      </span>
    );
  }

  return <span className="size-6 rounded-full border bg-background" />;
}

function ResearchSection({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-xl border bg-card/70 px-3 py-2 text-left transition-colors hover:bg-muted/50">
        <div className="min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          {description ? (
            <p className="truncate text-muted-foreground text-xs">
              {description}
            </p>
          ) : null}
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pt-3 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ResearchSidebar({
  open,
  onOpenChange,
  progress,
  output,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress?: ResearchProgress;
  output?: any;
}) {
  const isDone = progress?.status === "complete" || Boolean(output);
  const stage =
    progress?.stage || (isDone ? "ready-for-writing" : "issue-graph");
  const stageIndex = getStageIndex(stage);
  const sources = output?.sources || progress?.sources || [];
  const issueGraph = progress?.issueGraph || output?.issueGraph || [];
  const audits = progress?.audits || output?.audits;
  const auditIssues = audits
    ? [
        ...(audits.citationAudit || []),
        ...(audits.sourceHierarchyAudit || []),
        ...(audits.treatmentAudit || []),
        ...(audits.completenessAudit || []),
      ].filter((item: any) => item.status === "fail")
    : [];

  const steps = [
    {
      label: "Key questions",
      description: "Break the problem into legal points",
      stage: "issue-graph",
    },
    {
      label: "Legal sources",
      description: "Find statutes, cases, and official materials",
      stage: "authorities",
    },
    {
      label: "Case status",
      description: "Check whether important cases are still reliable",
      stage: "treatment",
    },
    {
      label: "Forum check",
      description: "Identify the likely court, tribunal, or route",
      stage: "forum",
    },
    {
      label: "Quality check",
      description: "Check support for important points",
      stage: "citation-audit",
    },
    {
      label: "Final packet",
      description: "Prepare the research for the final answer or report",
      stage: "ready-for-writing",
    },
  ];

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex h-[100dvh] w-[100dvw] max-w-[100dvw] flex-col gap-0 p-0 sm:w-[92vw] sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start gap-2.5 pr-10 sm:gap-3 sm:pr-12">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10 sm:rounded-xl">
              {isDone ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <Loader2 className="size-5 animate-spin" />
              )}
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">
                Juristo Deep Research
              </SheetTitle>
              <SheetDescription>
                Checking sources, case status, and the right legal route
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          <div className="mb-3 rounded-xl border bg-card/70 p-3 sm:mb-4 sm:rounded-2xl sm:p-4">
            <div className="mb-4 flex items-start justify-between gap-2 sm:items-center sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">
                  {isDone ? "Research packet ready" : "Research in progress"}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {getResearchStageText(stage, isDone)}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted px-1.5 py-1 text-[10px] text-muted-foreground sm:px-2 sm:text-[11px]">
                <Globe2 className="size-3" />
                {sources.length} sources
              </span>
            </div>

            <ol className="space-y-3">
              {steps.map((step, index) => {
                const state = getStepState(index, stageIndex, isDone);
                return (
                  <li className="flex gap-3" key={step.stage}>
                    <StatusDot
                      state={state as "completed" | "active" | "pending"}
                    />
                    <div
                      className={cn(
                        "min-w-0 flex-1 rounded-lg px-2 py-1",
                        state === "active" && "bg-muted/70"
                      )}
                    >
                      <p className="font-medium text-sm">{step.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="space-y-3">
            <ResearchSection
              defaultOpen
              description={`${issueGraph.length || 0} legal point${
                issueGraph.length === 1 ? "" : "s"
              }`}
              title="Key Questions"
            >
              {issueGraph.length ? (
                <div className="space-y-2">
                  {issueGraph.map((node: any) => (
                    <div
                      className="rounded-lg border bg-background p-3"
                      key={node.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{node.issue}</p>
                          <p className="mt-1 text-muted-foreground text-xs">
                            {node.subQuestion}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                          {node.forum}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-2 text-muted-foreground text-sm">
                  Key legal questions are being prepared.
                </p>
              )}
            </ResearchSection>

            <ResearchSection
              defaultOpen
              description={`${sources.length} websites and documents`}
              title="Sources Reviewed"
            >
              {sources.length ? (
                <div className="space-y-2">
                  {sources.map((source: any) => (
                    <a
                      className="group block rounded-lg border bg-background p-3 transition-colors hover:bg-muted/40"
                      href={source.url}
                      key={source.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          {getSourceIcon(source.domain) ? (
                            <span
                              aria-label={`${source.domain} logo`}
                              className="mt-0.5 size-6 shrink-0 rounded-md border bg-center bg-cover bg-muted"
                              role="img"
                              style={{
                                backgroundImage: `url(${getSourceIcon(source.domain)})`,
                              }}
                            />
                          ) : (
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                              <Globe2 className="size-3.5" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-medium text-sm">
                              {source.title}
                            </p>
                            <p className="mt-1 truncate text-muted-foreground text-xs">
                              {source.domain}
                              {source.sourceType
                                ? ` - ${source.sourceType}`
                                : ""}
                              {source.publishedDate
                                ? ` - ${source.publishedDate}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                      </div>
                      {source.content ? (
                        <p className="mt-2 line-clamp-3 text-muted-foreground text-xs">
                          {source.content}
                        </p>
                      ) : null}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="px-2 text-muted-foreground text-sm">
                  Sources will appear here as Juristo reads them.
                </p>
              )}
            </ResearchSection>

            <ResearchSection
              defaultOpen={Boolean(audits)}
              description={
                audits?.status === "pass"
                  ? "Passed"
                  : audits?.status === "needs_revision"
                    ? "Needs review"
                    : "Pending"
              }
              title="Quality Checks"
            >
              <div className="rounded-lg border bg-background p-3">
                <p className="font-medium text-sm">
                  {audits?.status === "pass"
                    ? "All checks passed"
                    : audits?.status === "needs_revision"
                      ? "A few points need more support"
                      : "Checks pending"}
                </p>
                {auditIssues.length ? (
                  <div className="mt-2 space-y-1 text-muted-foreground text-xs">
                    {auditIssues.slice(0, 4).map((issue: any) => (
                      <p key={issue.message}>{issue.message}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Juristo checks citations, source reliability, case status,
                    and completeness before writing.
                  </p>
                )}
              </div>
            </ResearchSection>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function RunLegalResearchTool({
  toolCallId,
  state,
  output,
  context,
}: ToolPartProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: progress } = useSWR<ResearchProgress>(
    `research-progress-${context.chatId}`,
    null,
    { fallbackData: undefined }
  );

  const isDone =
    Boolean(output) &&
    !["call", "partial-call", "input-streaming", "input-available"].includes(
      state
    );
  const sources = output?.sources || progress?.sources || [];
  const previewSources = sources
    .filter((source: any) => source.domain)
    .slice(0, 4);
  const statusLabel = useMemo(() => {
    return getResearchStageText(progress?.stage, isDone);
  }, [isDone, progress?.stage]);

  if (output && "error" in output) {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-sm dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
        key={toolCallId}
      >
        Research could not finish. Please try again.
      </div>
    );
  }

  return (
    <div className="my-3 w-full max-w-full sm:max-w-xl" key={toolCallId}>
      <button
        className="flex w-full items-center justify-between gap-2 overflow-hidden rounded-xl border bg-card/80 p-3 text-left shadow-sm transition-colors hover:bg-muted/40 sm:gap-3 sm:rounded-2xl sm:p-4"
        onClick={() => setIsSidebarOpen(true)}
        type="button"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10 sm:rounded-xl">
            {isDone ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <Loader2 className="size-5 animate-spin" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm">{statusLabel}</p>
            <p className="truncate text-muted-foreground text-xs">
              Review progress, sources, and quality checks
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          {previewSources.length ? (
            <span className="-space-x-1 mr-1 hidden sm:flex">
              {previewSources.map((source: any) => (
                <span
                  aria-label={`${source.domain || "source"} logo`}
                  className="size-4 rounded-full border bg-center bg-cover bg-muted"
                  key={source.url || source.domain}
                  role="img"
                  style={{
                    backgroundImage: `url(${getSourceIcon(source.domain)})`,
                  }}
                />
              ))}
            </span>
          ) : (
            <Sparkles className="size-3" />
          )}
          {sources.length} sources
        </span>
      </button>

      <ResearchSidebar
        onOpenChange={setIsSidebarOpen}
        open={isSidebarOpen}
        output={output}
        progress={progress}
      />
    </div>
  );
}
