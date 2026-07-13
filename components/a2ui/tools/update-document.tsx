import { DocumentPreview } from "@/components/document-preview";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function UpdateDocumentTool({
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
        Something went wrong while updating the document. Please try again.
      </div>
    );
  }

  return (
    <div className="relative" key={toolCallId}>
      <DocumentPreview
        args={{ ...output, isUpdate: true }}
        isReadonly={context.isReadonly}
        result={output}
      />
    </div>
  );
}
