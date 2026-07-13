import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function DeleteMemoryTool({ toolCallId, state, output }: ToolPartProps) {
  if (!output || ["call", "partial-call", "input-streaming"].includes(state)) {
    return (
      <div className="mb-2 flex flex-col gap-2" key={toolCallId}>
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-red-400" />
          <span>Removing memory…</span>
        </div>
      </div>
    );
  }

  if (output?.error || output?.success === false) {
    return (
      <div className="mb-3 w-full max-w-[400px]" key={toolCallId}>
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/40 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
          <AlertCircle className="size-4 shrink-0 text-red-500 dark:text-red-400" />
          <span className="text-xs font-medium text-red-700 dark:text-red-300">
            {output?.error || "Failed to remove memory"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fade-in slide-in-from-bottom-2 mb-3 w-full max-w-[400px] animate-in duration-300"
      key={toolCallId}
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/40 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
        <Trash2 className="size-4 shrink-0 text-red-500 dark:text-red-400" />
        <span className="text-xs font-medium text-red-700 dark:text-red-300">
          Memory removed successfully
        </span>
      </div>
    </div>
  );
}
