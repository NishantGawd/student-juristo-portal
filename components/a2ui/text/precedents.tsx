import { ChevronDown, Landmark } from "lucide-react";
import { Response } from "@/components/elements/response";
import { Citation } from "@/components/tool-ui/citation/citation";
import { sanitizeText } from "@/lib/utils";

const PRECEDENT_CASE_REGEX = /^[-*]\s+\*\*([^*]+)\*\*\s*(.*?):\s*(.*)$/;

export function PrecedentCards({ cases, otherText, messageId, rawText }: any) {
  const count = cases?.length || 0;

  return (
    <details className="group mt-2 w-full max-w-[600px] overflow-hidden rounded-xl border bg-card/80 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Landmark className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm">Key authorities</p>
            <p className="truncate text-muted-foreground text-xs">
              {count > 0
                ? `${count} precedent${count === 1 ? "" : "s"} available`
                : "Research notes available"}
            </p>
          </div>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-3 border-t bg-background/60 p-3">
        {otherText && otherText.length > 0 && (
          <div className="text-muted-foreground text-sm">
            <Response>{sanitizeText(otherText.join("\n"))}</Response>
          </div>
        )}
        {cases && cases.length > 0 ? (
          <div className="flex flex-col gap-2">
            {cases.map((c: any, i: number) => (
              <Citation
                className="w-full max-w-none shadow-sm"
                domain={c.cit || "Supreme Court"}
                href={`https://indiankanoon.org/search/?formInput=${encodeURIComponent(c.name)}`}
                id={`case-${messageId}-${i}`}
                key={`${c.name}-${c.cit || i}`}
                snippet={c.summary}
                title={c.name}
                type="document"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm [&>div>ul>li]:leading-relaxed [&>div>ul]:space-y-2">
            <Response>{sanitizeText(rawText)}</Response>
          </div>
        )}
      </div>
    </details>
  );
}

// Helper to parse precedents
export function parsePrecedents(text: string) {
  const delimiter = "### LANDMARK PRECEDENTS ###";
  const hasPrecedents = text.includes(delimiter);

  if (!hasPrecedents) {
    return { cleanText: text, precedentsData: null };
  }

  const parts = text.split(delimiter);
  const cleanText = parts[0] || "";
  const precedentsText = parts[1] || "";

  if (precedentsText.trim().length <= 20) {
    return { cleanText: text, precedentsData: null }; // Fallback to raw text if it's too short
  }

  const lines = precedentsText.split("\n");
  const cases: { name: string; cit: string; summary: string }[] = [];
  const otherText: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    if (
      (trimmed.startsWith("-") || trimmed.startsWith("*")) &&
      trimmed.includes("**")
    ) {
      const match = trimmed.match(PRECEDENT_CASE_REGEX);
      if (match) {
        cases.push({
          name: match[1].trim(),
          cit: match[2].trim(),
          summary: match[3].trim(),
        });
        continue;
      }
    }
    otherText.push(line);
  }

  return {
    cleanText,
    precedentsData: { cases, otherText, rawText: precedentsText },
  };
}
