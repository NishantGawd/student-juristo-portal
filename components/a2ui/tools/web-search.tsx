"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Loader2,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ToolPartProps, ToolRenderContext } from "@/lib/a2ui/types";
import { cn } from "@/lib/utils";

const WWW_PREFIX_RE = /^www\./;

function parseToolPayload(part: any) {
  const ti = part.toolInvocation || part;
  let input = ti.args || part.args || part.input || {};

  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      input = {};
    }
  }

  return {
    input,
    output: ti.result || ti.output || part.output || part.result,
    state: ti.state || part.state,
    toolCallId: ti.toolCallId || part.toolCallId,
  };
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX_RE, "");
  } catch {
    return url;
  }
}

function faviconFor(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function isErrorOutput(output: any) {
  return (
    output &&
    (typeof output === "string"
      ? output.toLowerCase().includes("error")
      : "error" in output)
  );
}

function getErrorMessage(_output: any) {
  return "Source search could not finish. Please try again.";
}

function getSearchRowTitle(index: number) {
  return `Source check ${index + 1}`;
}

function getSearchRowDescription(search: any, isRunning: boolean) {
  if (search.isError) {
    return "This check could not finish.";
  }
  if (search.isDone) {
    return `${search.results.length} source${
      search.results.length === 1 ? "" : "s"
    } reviewed`;
  }
  return isRunning ? "Checking sources..." : "Search ended before completion.";
}

const ACTIVE_TOOL_STATES = new Set([
  "call",
  "partial-call",
  "input-streaming",
  "input-available",
]);

function isStreamActive(context?: Partial<ToolRenderContext>) {
  return (
    context?.isLoading ||
    context?.status === "submitted" ||
    context?.status === "streaming"
  );
}

function getSearchStatus({
  allDone,
  context,
  failed,
  searches,
}: {
  allDone: boolean;
  context?: Partial<ToolRenderContext>;
  failed?: any;
  searches: any[];
}) {
  if (failed) {
    return "error";
  }
  if (allDone) {
    return "complete";
  }
  const hasStreamContext =
    context &&
    ("isLoading" in context || "status" in context || "isStopped" in context);
  const appearsActive = hasStreamContext
    ? isStreamActive(context)
    : searches.some((search) => ACTIVE_TOOL_STATES.has(search.state));

  if (!context?.isStopped && appearsActive) {
    return "running";
  }
  return "stopped";
}

function SourceIcon({
  domain,
  size = "md",
}: {
  domain?: string;
  size?: "sm" | "md";
}) {
  if (!domain) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground",
          size === "sm" ? "size-4 rounded-full" : "size-6"
        )}
      >
        <Globe2 className={size === "sm" ? "size-3" : "size-3.5"} />
      </span>
    );
  }

  return (
    <span
      aria-label={`${domain} logo`}
      className={cn(
        "shrink-0 border bg-center bg-cover bg-muted",
        size === "sm" ? "size-4 rounded-full" : "size-6 rounded-md"
      )}
      role="img"
      style={{ backgroundImage: `url(${faviconFor(domain)})` }}
    />
  );
}

export function WebSearchGroup({
  context,
  parts,
}: {
  context?: Partial<ToolRenderContext>;
  parts: any[];
}) {
  const [open, setOpen] = useState(false);

  const searches = useMemo(
    () =>
      parts.map((part) => {
        const payload = parseToolPayload(part);
        const query =
          payload.output?.query || payload.input?.query || "Searching";
        const results = Array.isArray(payload.output?.results)
          ? payload.output.results
          : [];

        return {
          ...payload,
          query,
          results,
          isDone: Boolean(payload.output) && !isErrorOutput(payload.output),
          isError: payload.state === "error" || isErrorOutput(payload.output),
        };
      }),
    [parts]
  );

  const failed = searches.find((search) => search.isError);
  const allResults = searches.flatMap((search) =>
    search.results.map((result: any) => ({
      ...result,
      query: search.query,
      domain: getDomain(result.url),
    }))
  );
  const uniqueResults = Array.from(
    new Map(allResults.map((result: any) => [result.url, result])).values()
  );
  const doneCount = searches.filter((search) => search.isDone).length;
  const allDone = searches.length > 0 && doneCount === searches.length;
  const groupStatus = getSearchStatus({
    allDone,
    context,
    failed,
    searches,
  });
  const isRunning = groupStatus === "running";
  const isStopped = groupStatus === "stopped";
  const queryPreview = allDone
    ? "Sources reviewed"
    : isStopped
      ? "Search ended before all checks completed"
      : "Checking sources step by step";
  const previewSources = uniqueResults
    .filter((result: any) => result.domain)
    .slice(0, 4);

  if (failed) {
    return (
      <>
        <button
          className="my-2 block w-full max-w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-red-600 text-xs transition-colors hover:bg-red-100 sm:max-w-xl dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="size-3.5" /> Source search failed
          </span>
          <span className="mt-1 block opacity-90">
            {getErrorMessage(failed.output)}
          </span>
        </button>
        <WebSearchSidebar
          allDone={allDone}
          onOpenChange={setOpen}
          open={open}
          searches={searches}
          status="error"
          uniqueResults={uniqueResults}
        />
      </>
    );
  }

  return (
    <>
      <button
        className={cn(
          "my-2 flex w-full max-w-full items-center justify-between gap-2 overflow-hidden rounded-lg border border-border/70 bg-card/70 px-2.5 py-2.5 text-left shadow-sm transition-colors hover:bg-muted/40 sm:max-w-xl sm:gap-3 sm:rounded-xl sm:px-3",
          isRunning && "bg-muted/30",
          isStopped &&
            "border-amber-200/70 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/15"
        )}
        onClick={() => setOpen(true)}
        type="button"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:rounded-lg">
            {allDone ? (
              <CheckCircle2 className="size-4" />
            ) : isStopped ? (
              <AlertCircle className="size-4 text-amber-500" />
            ) : (
              <Loader2 className="size-4 animate-spin" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">
              {allDone
                ? `Juristo searched ${uniqueResults.length} source${
                    uniqueResults.length === 1 ? "" : "s"
                  }`
                : isStopped
                  ? "Source search ended"
                  : "Juristo is searching sources"}
            </p>
            <p className="truncate text-muted-foreground text-xs">
              {queryPreview}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs sm:gap-2">
          {previewSources.length ? (
            <span className="-space-x-1 hidden sm:flex">
              {previewSources.map((source: any) => (
                <SourceIcon
                  domain={source.domain}
                  key={source.url || source.domain}
                  size="sm"
                />
              ))}
            </span>
          ) : null}
          <span>
            {searches.length} search{searches.length === 1 ? "" : "es"}
          </span>
        </span>
      </button>

      <WebSearchSidebar
        allDone={allDone}
        onOpenChange={setOpen}
        open={open}
        searches={searches}
        status={groupStatus}
        uniqueResults={uniqueResults}
      />
    </>
  );
}

function WebSearchSidebar({
  allDone,
  onOpenChange,
  open,
  status,
  searches,
  uniqueResults,
}: {
  allDone: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  status: "running" | "complete" | "stopped" | "error";
  searches: any[];
  uniqueResults: any[];
}) {
  const isRunning = status === "running";
  const isStopped = status === "stopped";
  const isError = status === "error";

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex h-[100dvh] w-[100dvw] max-w-[100dvw] flex-col gap-0 p-0 sm:w-[92vw] sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start gap-2.5 pr-10 sm:gap-3 sm:pr-12">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10 sm:rounded-xl">
              {allDone ? (
                <CheckCircle2 className="size-5" />
              ) : isStopped || isError ? (
                <AlertCircle
                  className={cn(
                    "size-5",
                    isError ? "text-red-500" : "text-amber-500"
                  )}
                />
              ) : (
                <Loader2 className="size-5 animate-spin" />
              )}
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">Source Search</SheetTitle>
              <SheetDescription>
                {allDone
                  ? `${uniqueResults.length} unique source${
                      uniqueResults.length === 1 ? "" : "s"
                    } reviewed`
                  : isStopped
                    ? "Search ended before every source returned"
                    : isError
                      ? "Search hit an error"
                      : "Juristo is checking live sources"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          <section className="mb-3 rounded-lg border bg-card/70 p-3 sm:mb-4 sm:rounded-xl sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <Search className="size-4 text-primary" />
              <p className="font-semibold text-sm">Search trail</p>
            </div>
            <div className="space-y-2">
              {searches.map((search, index) => (
                <div
                  className="rounded-lg border bg-background p-3"
                  key={`${search.toolCallId || index}-${search.query}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">
                        {getSearchRowTitle(index)}
                      </p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {getSearchRowDescription(search, isRunning)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border bg-muted px-1.5 py-1 text-[10px] text-muted-foreground sm:px-2 sm:text-[11px]">
                      {search.isError
                        ? "error"
                        : search.isDone
                          ? `${search.results.length} results`
                          : isRunning
                            ? "searching"
                            : "stopped"}
                    </span>
                  </div>
                  <details className="group/details mt-2">
                    <summary className="cursor-pointer select-none text-muted-foreground text-xs hover:text-foreground">
                      Search terms
                    </summary>
                    <p className="mt-2 max-h-28 overflow-y-auto break-words rounded-md bg-muted/50 p-2 text-muted-foreground text-xs">
                      {search.query}
                    </p>
                  </details>
                  {!search.isError && search.output?.answer ? (
                    <p className="mt-2 text-muted-foreground text-xs">
                      {search.output.answer}
                    </p>
                  ) : null}
                  {search.isError ? (
                    <p className="mt-2 text-red-500 text-xs">
                      {getErrorMessage(search.output)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-card/70 p-3 sm:rounded-xl sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <Globe2 className="size-4 text-primary" />
              <p className="font-semibold text-sm">Sources visited</p>
            </div>

            {uniqueResults.length > 0 ? (
              <div className="space-y-2">
                {uniqueResults.map((result: any) => (
                  <a
                    className="group block rounded-lg border bg-background p-3 transition-colors hover:bg-muted/40"
                    href={result.url}
                    key={result.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex min-w-0 flex-1 gap-2 sm:gap-3">
                        <SourceIcon domain={result.domain} />
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-medium text-sm">
                            {result.title || result.domain}
                          </p>
                          <p className="mt-1 truncate text-muted-foreground text-xs">
                            {result.domain}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    {result.content ? (
                      <p className="mt-2 line-clamp-3 text-muted-foreground text-xs">
                        {result.content}
                      </p>
                    ) : null}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Sources will appear here once Juristo reads them.
              </p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function WebSearchTool({
  context,
  toolCallId,
  state,
  output,
  part,
}: ToolPartProps) {
  if (state === "error" || isErrorOutput(output)) {
    return (
      <div key={toolCallId}>
        <WebSearchGroup context={context} parts={[part]} />
      </div>
    );
  }

  return <WebSearchGroup context={context} key={toolCallId} parts={[part]} />;
}
