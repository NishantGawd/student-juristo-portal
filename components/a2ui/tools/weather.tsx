import { Tool, ToolContent, ToolHeader, ToolInput } from "@/components/elements/tool";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function WeatherTool({ part, toolCallId, state, input, output, context }: ToolPartProps) {
  const approvalId = part.approval?.id;
  const isDenied =
    state === "output-denied" ||
    (state === "approval-responded" && part.approval?.approved === false);
  const widthClass = "w-[min(100%,450px)]";

  if (isDenied) {
    return (
      <div className={widthClass} key={toolCallId}>
        <Tool className="w-full" defaultOpen={true}>
          <ToolHeader state="output-denied" type="tool-getWeather" />
          <ToolContent>
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Weather lookup was denied.
            </div>
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (state === "approval-responded") {
    return (
      <div className={widthClass} key={toolCallId}>
        <Tool className="w-full" defaultOpen={true}>
          <ToolHeader state={state} type="tool-getWeather" />
          <ToolContent>
            <ToolInput input={input} />
          </ToolContent>
        </Tool>
      </div>
    );
  }

  return (
    <div className={widthClass} key={toolCallId}>
      <Tool className="w-full" defaultOpen={true}>
        <ToolHeader state={state} type="tool-getWeather" />
        <ToolContent>
          {(state === "input-available" || state === "approval-requested") && (
            <ToolInput input={input} />
          )}
          {state === "approval-requested" && approvalId && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  context.addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                    reason: "User denied weather lookup",
                  });
                }}
              >
                Deny
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={() => {
                  context.addToolApprovalResponse({
                    id: approvalId,
                    approved: true,
                  });
                }}
              >
                Allow
              </button>
            </div>
          )}
        </ToolContent>
      </Tool>
    </div>
  );
}
