import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function AddMemoryTool({ toolCallId, state, output, part }: ToolPartProps) {
  if (!output || ["call", "partial-call", "input-streaming"].includes(state)) {
    return (
      <div className="mb-2 flex flex-col gap-2" key={toolCallId}>
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-pink-500" />
          <span>Saving to memory…</span>
        </div>
      </div>
    );
  }

  if (output?.error) {
    return (
      <div className="mb-3 w-full max-w-[400px]" key={toolCallId}>
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/40 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500 dark:text-red-400" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-red-800 dark:text-red-300">
              Memory failed to save
            </span>
            <span className="text-[11px] leading-relaxed text-red-700/80 dark:text-red-400/70">
              {output.error}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const ti = part.toolInvocation || part;
  const parsedArgs = ti.args;
  const savedText = parsedArgs?.memory || "Memory saved";

  return (
    <div
      className="fade-in slide-in-from-bottom-2 mb-3 w-full max-w-[400px] animate-in duration-300"
      key={toolCallId}
    >
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Memory Saved
          </span>
          <span className="text-[11px] leading-relaxed text-emerald-700/80 dark:text-emerald-400/70">
            {savedText}
          </span>
        </div>
      </div>
    </div>
  );
}
