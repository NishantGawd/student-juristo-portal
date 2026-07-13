"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStreamState, useDataStreamSetter } from "./data-stream-provider";
export function getChatHistoryPaginationKey(...args: any[]): string {
  return "sidebar-chat-history-pagination-default-key";
}

export function DataStreamHandler() {
  const dataStream = useDataStreamState();
  const setDataStream = useDataStreamSetter();
  const { mutate } = useSWRConfig();

  const { artifact, setArtifact, setMetadata } = useArtifact();

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    console.log("[STREAM DEBUG] Processing", newDeltas.length, "deltas");

    for (const delta of newDeltas) {
      console.log("[STREAM DEBUG] Delta type:", delta.type);

      // Handle chat title updates
      if (delta.type === "data-chat-title") {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        continue;
      }

      if (delta.type === "data-research-progress") {
        mutate(`research-progress-${delta.data.chatId}`, delta.data, {
          revalidate: false,
        });
        continue;
      }

      if (delta.type === "data-odr-progress") {
        mutate(`odr-progress-${delta.data.chatId}`, delta.data, {
          revalidate: false,
        });
        continue;
      }

      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        console.log("[STREAM DEBUG] Calling onStreamPart for:", artifact.kind);
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              isDismissed: false,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-propertyVisualizerDelta":
            return {
              ...draftArtifact,
              content: delta.data,
              isVisible: draftArtifact.isDismissed
                ? draftArtifact.isVisible
                : true,
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream, mutate]);

  return null;
}
