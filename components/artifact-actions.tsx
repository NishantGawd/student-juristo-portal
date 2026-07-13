import { type Dispatch, memo, type SetStateAction, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { artifactDefinitions, type UIArtifact } from "./artifact";
import type { ArtifactActionContext } from "./create-artifact";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type ArtifactActionsProps = {
  artifact: UIArtifact;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: "edit" | "diff";
  metadata: any;
  setMetadata: Dispatch<SetStateAction<any>>;
};

function PureArtifactActions({
  artifact,
  handleVersionChange,
  currentVersionIndex,
  isCurrentVersion,
  mode,
  metadata,
  setMetadata,
}: ArtifactActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind
  );

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  const actionContext: ArtifactActionContext = {
    content: artifact.content,
    artifact,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
  };

  return (
    <div className="flex shrink-0 flex-row flex-nowrap gap-1 overflow-x-auto">
      {artifactDefinition.actions.map((action) => (
        <Tooltip key={action.description}>
          <TooltipTrigger asChild>
            <Button
              className={cn("size-9 shrink-0 p-0 dark:hover:bg-zinc-700", {
                "px-2 py-1.5": action.label,
              })}
              disabled={
                isLoading || artifact.status === "streaming"
                  ? true
                  : action.isDisabled
                    ? action.isDisabled(actionContext)
                    : false
              }
              onClick={async () => {
                setIsLoading(true);

                try {
                  await Promise.resolve(action.onClick(actionContext));
                } catch (_error) {
                  toast.error("Failed to execute action");
                } finally {
                  setIsLoading(false);
                }
              }}
              variant="outline"
            >
              {action.icon}
              {action.label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{action.description}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export const ArtifactActions = memo(
  PureArtifactActions,
  (prevProps, nextProps) => {
    if (prevProps.artifact.status !== nextProps.artifact.status) {
      return false;
    }
    if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) {
      return false;
    }
    if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) {
      return false;
    }
    if (prevProps.artifact.content !== nextProps.artifact.content) {
      return false;
    }

    return true;
  }
);

