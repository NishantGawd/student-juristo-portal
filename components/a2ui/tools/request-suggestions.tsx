import { DocumentToolResult } from "@/components/document";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function RequestSuggestionsTool({
  toolCallId,
  state,
  input,
  output,
  context,
}: ToolPartProps) {
  return (
    <Tool defaultOpen={true} key={toolCallId}>
      <ToolHeader state={state as any} type="tool-requestSuggestions" />
      <ToolContent>
        {state === "input-available" && <ToolInput input={input} />}
        {state === "output-available" && (
          <ToolOutput
            errorText={undefined}
            output={
              output && "error" in output ? (
                <div className="rounded border p-2 text-red-500">
                  Something went wrong. Please try again.
                </div>
              ) : (
                <DocumentToolResult
                  isReadonly={context.isReadonly}
                  result={output}
                  type="request-suggestions"
                />
              )
            }
          />
        )}
      </ToolContent>
    </Tool>
  );
}
