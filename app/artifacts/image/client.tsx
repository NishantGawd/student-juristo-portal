import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { CopyIcon, RedoIcon, UndoIcon } from "@/components/icons";

export const imageArtifact = new Artifact<"image", any>({
  kind: "image",
  description: "Useful for rendering visual reference charts and concept diagrams.",
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-imageDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: draftArtifact.isDismissed ? draftArtifact.isVisible : true,
        status: "streaming",
      }));
    }
  },
  content: ({ content }) => {
    if (!content) return null;
    return (
      <div className="flex items-center justify-center p-4 w-full h-full min-h-[300px] bg-[#fbfaf7]">
        <img
          src={content.startsWith("data:") ? content : `data:image/png;base64,${content}`}
          alt="Reference Diagram"
          className="max-w-full max-h-[70vh] object-contain rounded-xl border border-[#17140f]/10 shadow-sm"
        />
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
      description: "Copy image to clipboard",
      onClick: ({ content }) => {
        const img = new Image();
        img.src = content.startsWith("data:") ? content : `data:image/png;base64,${content}`;

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
            }
          }, "image/png");
        };

        toast.success("Copied image to clipboard!");
      },
    },
  ],
  toolbar: [],
});