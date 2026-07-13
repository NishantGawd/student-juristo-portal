"use client";

import {
  Check,
  ChevronDown,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ProcessorAttachment = {
  name?: string;
  contentType?: string;
};

type UploadKind =
  | "image"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "text"
  | "csv"
  | "file"
  | "mixed";

function getExtension(name?: string) {
  return name?.split(".").pop()?.toLowerCase() ?? "";
}

function getAttachmentKind(attachment: ProcessorAttachment): UploadKind {
  const contentType = attachment.contentType ?? "";
  const extension = getExtension(attachment.name);

  if (contentType.startsWith("image/")) {
    return "image";
  }
  if (contentType === "application/pdf" || extension === "pdf") {
    return "pdf";
  }
  if (
    contentType.includes("word") ||
    extension === "doc" ||
    extension === "docx"
  ) {
    return "document";
  }
  if (
    contentType.includes("excel") ||
    contentType.includes("spreadsheet") ||
    extension === "xls" ||
    extension === "xlsx"
  ) {
    return "spreadsheet";
  }
  if (contentType === "text/csv" || extension === "csv") {
    return "csv";
  }
  if (contentType === "text/plain" || extension === "txt") {
    return "text";
  }

  return "file";
}

function getUploadKind(attachments: ProcessorAttachment[]): UploadKind {
  const kinds = attachments.map(getAttachmentKind);
  const uniqueKinds = [...new Set(kinds)];

  if (uniqueKinds.length === 0) {
    return "file";
  }
  if (uniqueKinds.length === 1) {
    return uniqueKinds[0];
  }

  return "mixed";
}

function pluralize(label: string, count: number) {
  if (count === 1) {
    return label;
  }
  if (label === "PDF") {
    return "PDFs";
  }
  if (label === "CSV") {
    return "CSVs";
  }
  return `${label}s`;
}

function getProcessorCopy(kind: UploadKind, count: number) {
  switch (kind) {
    case "image":
      return {
        label: pluralize("image", count),
        stages: [
          "Reading image",
          "Extracting visual details",
          "Checking legal context",
          "Preparing answer",
        ],
        Icon: FileImage,
      };
    case "pdf":
      return {
        label: pluralize("PDF", count),
        stages: [
          "Reading PDF",
          "Parsing text",
          "Checking legal context",
          "Preparing answer",
        ],
        Icon: FileText,
      };
    case "document":
      return {
        label: pluralize("document", count),
        stages: [
          "Reading document",
          "Extracting clauses",
          "Checking legal context",
          "Preparing answer",
        ],
        Icon: FileText,
      };
    case "spreadsheet":
      return {
        label: pluralize("spreadsheet", count),
        stages: [
          "Reading spreadsheet",
          "Parsing tables",
          "Checking legal context",
          "Preparing answer",
        ],
        Icon: FileSpreadsheet,
      };
    case "csv":
      return {
        label: pluralize("CSV", count),
        stages: [
          "Reading CSV",
          "Parsing rows",
          "Checking legal context",
          "Preparing answer",
        ],
        Icon: FileSpreadsheet,
      };
    case "text":
      return {
        label: pluralize("text file", count),
        stages: [
          "Reading text",
          "Parsing content",
          "Checking legal context",
          "Preparing answer",
        ],
        Icon: FileText,
      };
    case "mixed":
      return {
        label: "attachments",
        stages: [
          "Reading attachments",
          "Parsing content",
          "Checking legal context",
          "Preparing answer",
        ],
        Icon: File,
      };
    default:
      return {
        label: pluralize("file", count),
        stages: [
          "Reading file",
          "Parsing content",
          "Checking legal context",
          "Preparing answer",
        ],
        Icon: File,
      };
  }
}

export function UploadFileProcessor({
  attachments,
  className,
}: {
  attachments: ProcessorAttachment[];
  className?: string;
}) {
  const { label, stages, Icon } = useMemo(() => {
    const count = Math.max(attachments.length, 1);
    return getProcessorCopy(getUploadKind(attachments), count);
  }, [attachments]);

  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveStage((current) => Math.min(current + 1, stages.length - 1));
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [stages.length]);

  const currentStage = stages[activeStage] ?? stages[0];
  const statusLabel =
    activeStage >= stages.length - 1
      ? `Finishing ${label} analysis`
      : currentStage;

  return (
    <output
      aria-busy="true"
      aria-label={`Preparing answer. ${statusLabel}`}
      aria-live="polite"
      className={cn("w-fit", className)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Show upload processing details. ${statusLabel}`}
            className="flex w-fit max-w-[min(520px,calc(100vw-5rem))] items-center gap-3 rounded-2xl border border-border/70 bg-background/95 py-2 pr-3 pl-2.5 text-left shadow-sm backdrop-blur transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            type="button"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-foreground ring-1 ring-border/60">
              <Icon className="size-5" strokeWidth={1.9} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold text-[15px] text-foreground leading-5">
                  Preparing answer
                </span>
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
              </span>
              <span className="block truncate text-muted-foreground text-sm leading-5">
                {statusLabel}
              </span>
            </span>

            <span
              aria-hidden="true"
              className="hidden shrink-0 items-center gap-1 sm:flex"
            >
              {stages.map((stage, index) => {
                const isDone = index < activeStage;
                const isActive = index === activeStage;

                return (
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border text-[10px] transition-colors",
                      isDone &&
                        "border-foreground bg-foreground text-background",
                      isActive &&
                        "border-muted-foreground/45 bg-background text-muted-foreground",
                      !isDone && !isActive && "border-border bg-background"
                    )}
                    key={stage}
                  >
                    {isDone ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : null}
                  </span>
                );
              })}
            </span>

            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 rounded-xl border-border/70 p-2 shadow-lg"
          sideOffset={8}
        >
          <div className="px-2 pt-1 pb-2">
            <p className="font-medium text-foreground text-sm">
              Upload processing
            </p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
          <div className="flex flex-col gap-1">
            {stages.map((stage, index) => {
              const isDone = index < activeStage;
              const isActive = index === activeStage;

              return (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                    isActive && "bg-muted/60"
                  )}
                  key={stage}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      isDone &&
                        "border-foreground bg-foreground text-background",
                      isActive &&
                        "border-muted-foreground/45 bg-background text-muted-foreground",
                      !isDone && !isActive && "border-border bg-background"
                    )}
                  >
                    {isDone ? (
                      <Check className="size-3" strokeWidth={3} />
                    ) : null}
                    {isActive ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "truncate",
                      isDone || isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </output>
  );
}
