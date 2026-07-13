import { Brain, Loader2 } from "lucide-react";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function SearchMemoryTool({ toolCallId, state, output }: ToolPartProps) {
  if (!output || ["call", "partial-call", "input-streaming"].includes(state)) {
    return (
      <div className="mb-2 flex flex-col gap-2" key={toolCallId}>
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-pink-500" />
          <span>Recalling your memories…</span>
        </div>
      </div>
    );
  }

  const results = output?.results || [];
  if (results.length === 0) return null; // Don't show UI if no memories found

  return (
    <div
      className="fade-in slide-in-from-bottom-2 mb-3 w-full max-w-[500px] animate-in duration-300"
      key={toolCallId}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="flex size-6 items-center justify-center rounded-md bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400">
          <Brain className="size-3.5" />
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Memory Recalled
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {results.map((mem: any, i: number) => (
          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50/50 px-2.5 py-1 text-[11px] font-medium text-pink-800 dark:border-pink-900/30 dark:bg-pink-950/20 dark:text-pink-300"
            key={i}
          >
            <Brain className="size-3 opacity-60" />
            <span className="max-w-[200px] truncate">{mem.memory}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
