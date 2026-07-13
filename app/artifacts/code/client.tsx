import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DocumentSkeleton } from "@/components/document-skeleton";

// Lazy load heavy CodeEditor component - only loaded when code artifact is rendered
const CodeEditor = dynamic(() => import("@/components/code-editor").then(m => m.CodeEditor), {
  loading: () => <DocumentSkeleton artifactKind="code" />,
  ssr: true,
});

import {
  CopyIcon,
  LogsIcon,
  MessageIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";

type Metadata = Record<string, any>;

export const codeArtifact = new Artifact<"code", Metadata>({
  kind: "code",
  description: "Useful for displaying, analyzing, and editing code snippets.",
  initialize: () => {},
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-codeDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible:
          !draftArtifact.isDismissed &&
          draftArtifact.status === "streaming" &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: "streaming",
      }));
    }
  },
  content: ({ ...props }) => {
    return (
      <div className="px-1">
        <CodeEditor {...props} />
      </div>
    );
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy code to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageIcon />,
      description: "Add comments",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Add comments to the code snippet for understanding",
            },
          ],
        });
      },
    },
    {
      icon: <LogsIcon />,
      description: "Add logs",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Add logs to the code snippet for debugging",
            },
          ],
        });
      },
    },
  ],
});