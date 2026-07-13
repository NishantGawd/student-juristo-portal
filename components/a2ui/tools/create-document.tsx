import { DocumentPreview } from "@/components/document-preview";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function CreateDocumentTool({
  toolCallId,
  output,
  context,
}: ToolPartProps) {
  if (output && "error" in output) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
        key={toolCallId}
      >
        Something went wrong while preparing the document. Please try again.
      </div>
    );
  }

  return (
    <div key={toolCallId}>
      <DocumentPreview isReadonly={context.isReadonly} result={output} />
    </div>
  );
}
