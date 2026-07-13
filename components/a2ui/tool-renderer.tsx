import { toolCatalog } from "@/lib/a2ui/registry";
import type { ToolRenderContext } from "@/lib/a2ui/types";

export function ToolRenderer({
  part,
  context,
}: {
  part: any;
  context: ToolRenderContext;
}) {
  const type = part.type as string;
  const isCustomTool = type === "tool-invocation" || type.startsWith("tool-");

  if (!isCustomTool) return null;

  const ti = part.toolInvocation || part;
  const toolName = ti.toolName || (type.startsWith("tool-") ? type.replace("tool-", "") : "");
  const toolCallId = ti.toolCallId || part.toolCallId;
  const output = ti.result || ti.output || part.output || part.result;
  const state = ti.state || part.state;
  const input = ti.args || part.args || part.input;

  const Component = toolCatalog[toolName];

  if (!Component) {
    // Unknown tool in registry
    return null;
  }

  return (
    <Component
      part={part}
      toolCallId={toolCallId}
      toolName={toolName}
      state={state}
      input={input}
      output={output}
      context={context}
    />
  );
}
