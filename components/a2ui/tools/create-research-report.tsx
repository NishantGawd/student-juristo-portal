"use client";

import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  Search,
} from "lucide-react";
import { CitationList } from "@/components/tool-ui/citation";
import { Button } from "@/components/ui/button";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import type { ToolPartProps } from "@/lib/a2ui/types";

const WWW_PREFIX_REGEX = /^www\./;

function getDomain(url: string, fallback?: string) {
  if (fallback) {
    return fallback;
  }
  try {
    return new URL(url).hostname.replace(WWW_PREFIX_REGEX, "");
  } catch {
    return url;
  }
}

export function CreateResearchReportTool({
  toolCallId,
  state,
  output,
}: ToolPartProps) {
  const { setArtifact } = useArtifact();

  if (output && "error" in output) {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-sm dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
        key={toolCallId}
      >
        Research report could not be created. Please try again.
      </div>
    );
  }

  const isDone =
    Boolean(output) &&
    !["call", "partial-call", "input-streaming", "input-available"].includes(
      state
    );

  if (!isDone) {
    return (
      <div
        className="my-2 inline-flex max-w-xl items-center gap-2 rounded-xl border bg-card/70 px-3 py-2 text-muted-foreground text-sm"
        key={toolCallId}
      >
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Preparing research report...</span>
      </div>
    );
  }

  if (output?.status === "needs_revision") {
    const validationErrors = Array.isArray(output.validationErrors)
      ? output.validationErrors.slice(0, 5)
      : [];

    return (
      <details
        className="group my-2 w-full max-w-xl overflow-hidden rounded-xl border bg-card/80 text-sm shadow-sm"
        key={toolCallId}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Search className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-sm">
                Research checks updated
              </p>
              <p className="truncate text-muted-foreground text-xs">
                Juristo is tightening the report before export
              </p>
            </div>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>

        {validationErrors.length > 0 ? (
          <div className="space-y-1 border-t bg-muted/20 p-3 text-muted-foreground text-xs">
            {validationErrors.map((error: string) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}
      </details>
    );
  }

  const sources = Array.isArray(output?.sources) ? output.sources : [];
  const qualityNotes = Array.isArray(output?.qualityNotes)
    ? output.qualityNotes.slice(0, 6)
    : [];
  const citationItems = sources
    .slice(0, 6)
    .map((source: any, index: number) => ({
      id: `research-source-${toolCallId}-${index}`,
      href: source.url,
      title: source.title || source.url,
      domain: getDomain(source.url, source.domain),
      favicon: `https://www.google.com/s2/favicons?domain=${getDomain(source.url, source.domain)}&sz=32`,
      snippet:
        source.note || source.sourceType || "Used in the research report.",
      publishedAt: source.publishedDate,
      type: "webpage" as const,
    }));
  const reportId = output?.id;
  const reportTitle = output?.title || "Legal Research Report";
  const openReport = () => {
    if (!reportId) {
      return;
    }

    setArtifact((currentArtifact) => ({
      ...initialArtifactData,
      ...currentArtifact,
      documentId: reportId,
      title: reportTitle,
      kind: "text",
      content:
        currentArtifact.documentId === reportId ? currentArtifact.content : "",
      isVisible: true,
      isDismissed: false,
      status: "idle",
      chatId: currentArtifact.chatId,
    }));
  };

  return (
    <div
      className="my-2 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border bg-card/80 p-3 shadow-sm sm:p-4"
      key={toolCallId}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm">Research report ready</p>
            <span className="inline-flex items-center gap-1 rounded-full border bg-emerald-50 px-2 py-0.5 font-medium text-[11px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="size-3" />
              Verified report
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            {output?.title || "Legal Research Report"} includes{" "}
            {output?.sourceCount || sources.length} source
            {(output?.sourceCount || sources.length) === 1 ? "" : "s"} and
            lawyer-facing analysis.
          </p>
        </div>
        {reportId ? (
          <Button
            className="shrink-0 gap-1.5"
            onClick={(event) => {
              event.stopPropagation();
              openReport();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <ExternalLink className="size-3.5" />
            Open report
          </Button>
        ) : null}
      </div>

      <details className="group overflow-hidden rounded-xl border bg-muted/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-left text-xs [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
            <Globe2 className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">
              Research details
              {qualityNotes.length
                ? ` - ${qualityNotes.length} note${qualityNotes.length === 1 ? "" : "s"}`
                : ""}
            </span>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>

        <div className="space-y-3 border-t bg-background/60 p-3">
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Search className="size-3.5 text-primary" />
              <span>Key questions checked</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe2 className="size-3.5 text-primary" />
              <span>Claims cited</span>
            </div>
          </div>

          {qualityNotes.length > 0 ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground text-xs">
              <p className="mb-1 font-medium text-foreground">Quality notes</p>
              <div className="space-y-1">
                {qualityNotes.map((note: string) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>
          ) : null}

          {citationItems.length > 0 && (
            <div>
              <p className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Sources used
              </p>
              <CitationList
                citations={citationItems}
                id={`research-citations-${toolCallId}`}
                maxVisible={3}
                variant="stacked"
              />
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
