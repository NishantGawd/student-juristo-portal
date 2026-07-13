"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { VisibilityType } from "@/components/visibility-selector";

export function useVisibilityState({
  chatId,
  initialVisibilityType,
  globalUpdateChatVisibilityAction,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
  globalUpdateChatVisibilityAction?: (payload: {
    chatId: string;
    visibility: VisibilityType;
  }) => Promise<void>;
}) {
  const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
    `${chatId}-visibility`,
    null,
    {
      fallbackData: initialVisibilityType,
    }
  );

  const visibilityType = useMemo(() => {
    return localVisibility || "private";
  }, [localVisibility]);

  const setVisibilityType = async (updatedVisibilityType: VisibilityType) => {
    // Optimistically update local state view instantly
    setLocalVisibility(updatedVisibilityType);

    if (globalUpdateChatVisibilityAction) {
      await globalUpdateChatVisibilityAction({
        chatId,
        visibility: updatedVisibilityType,
      });
    }

    // Dispatch the custom synchronization event to tell our student sidebar history to refresh immediately
    window.dispatchEvent(new Event("juristo-history-sync"));
  };

  return { visibilityType, setVisibilityType };
}