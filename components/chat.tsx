"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { deleteTrailingMessages } from "@/app/(chat)/chat-actions";
import { ChatHeader } from "@/components/chat-header";
import { Greeting } from "@/components/greeting";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useVisibilityState } from "@/hooks/use-chat-visibility";
import { chatModels, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { Vote } from "@/lib/db/schema";
// ✅ FIX: Removed unused `ChatSDKError` import (was triggering a TS warning)
import type { Attachment, ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { ChatUsageAlert } from "./chat-usage-alert";
import { useDataStreamSetter } from "./data-stream-provider";
import { FeatureSuggestionNudge } from "./feature-suggestion-nudge";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";
import { trackGA } from "@/lib/analytics/ga";

// ✅ PERF: Extracted outside component — pure utility, no reason to be recreated
// on every render or every prepareSendMessagesRequest call.
function sanitizeMessages(msgs: any[]) {
  return msgs.filter(Boolean).map((msg) => ({
    ...msg,
    parts: msg.parts?.map((part: any) => {
      if (part.type === "file" || part.type === "image") {
        return {
          ...part,
          mediaType:
            part.mediaType || part.mimeType || "application/octet-stream",
          mimeType:
            part.mimeType || part.mediaType || "application/octet-stream",
        };
      }
      return part;
    }),
  }));
}

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  chatTitle,
  deleteTrailingMessagesAction: _deleteTrailingMessagesAction,
  globalUpdateChatVisibilityAction,
  isWidget = false,
  context,
  externalPrompt,
  onExternalPromptConsumed,
  userName,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  chatTitle?: string;
  deleteTrailingMessagesAction?: (payload: { id: string }) => Promise<void>;
  globalUpdateChatVisibilityAction?: (payload: {
    chatId: string;
    visibility: VisibilityType;
  }) => Promise<void>;
  isWidget?: boolean;
  context?: string;
  externalPrompt?: string | null;
  onExternalPromptConsumed?: () => void;
  userName?: string | null;
}) {
  const router = useRouter();

  const { visibilityType, setVisibilityType } = useVisibilityState({
    chatId: id,
    initialVisibilityType,
    globalUpdateChatVisibilityAction,
  });

  // ✅ FIX: `router` changes identity on every navigation, so using it as a
  // dependency caused the listener to be torn down and re-added constantly.
  // router.refresh is stable — ref it once to keep the effect dependency-free.
  const refreshRef = useRef(router.refresh);
  useEffect(() => {
    refreshRef.current = router.refresh;
  }, [router.refresh]);

  useEffect(() => {
    const handlePopState = () => refreshRef.current();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // ✅ Empty deps — listener is registered once, calls latest refresh via ref

  const setDataStream = useDataStreamSetter();

  useEffect(() => {
    setDataStream([]);
  }, [id, setDataStream]);

  const [input, setInput] = useState<string>("");
  const [chatTitleState, setChatTitleState] = useState<string | undefined>(
    chatTitle
  );

  // Normalize legacy cookie model IDs to current models
  const normalizeModelId = (id: string): string => {
    // Check if it exactly matches a current model ID
    if (chatModels.find((m) => m.id === id)) {
      return id;
    }
    // Flash-class → Juristo Mini
    if (id.includes("flash")) {
      return "google/gemini-3.5-flash";
    }
    // Max (high-thinking) variants
    if (id.includes("-high") || id.includes("3.1-pro")) {
      return "google/gemini-3.1-pro-preview";
    }
    // Pro-class → Juristo Macro
    if (id.includes("pro") || id.includes("-low")) {
      return "google/gemini-3-pro-preview";
    }
    return DEFAULT_CHAT_MODEL;
  };

  const [currentModelId, setCurrentModelId] = useState(() =>
    normalizeModelId(initialChatModel)
  );
  const [researchModeEnabled, setResearchModeEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [stoppedMessages, setStoppedMessages] = useState<Set<string>>(
    new Set()
  );

  // ✅ FIX: Declared BEFORE useChat so onFinish/onError closures capture the
  const currentModelIdRef = useRef(currentModelId);
  const researchModeRef = useRef(researchModeEnabled);
  const webSearchRef = useRef(webSearchEnabled);
  const messagesRef = useRef(initialMessages);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  useEffect(() => {
    researchModeRef.current = researchModeEnabled;
  }, [researchModeEnabled]);

  useEffect(() => {
    webSearchRef.current = webSearchEnabled;
  }, [webSearchEnabled]);

  // ✅ PERF: Stable callbacks extracted with useCallback so they don't cause
  // useChat to re-initialise its transport on every parent re-render.
  const handleUserPromptSubmitted = useCallback(
    (promptText: string) => {
      // Fire GA4 event for every user message
      trackGA("chat_message_sent", {
        chat_id: id,
        model: currentModelIdRef.current,
        message_length: promptText.trim().length,
      });
    },
    [id]
  );

  const handleData = useCallback(
    (dataPart: any) => {
      // 1. Sync Streamed Chat Title
      const title =
        dataPart && typeof dataPart === "object"
          ? dataPart.type === "data-chat-title"
            ? dataPart.data
            : dataPart["data-chat-title"]
          : undefined;

      if (typeof title === "string" && title.length > 0) {
        setChatTitleState(title);
      }

      // 2. Propagate to standard data stream
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    [setDataStream]
  );

  const handleFinish = useCallback(
    (message: any) => {
      console.log("[CHAT DEBUG] Dispatching HISTORY_UPDATED event...");
      window.dispatchEvent(new CustomEvent("juristo-history-sync"));

      const payloadMessages = [...messagesRef.current];
      if (!payloadMessages.find((m) => m.id === message.id)) {
        payloadMessages.push(message as any);
      }

      // Fire GA4 event when AI finishes responding
      trackGA("ai_response_received", {
        chat_id: id,
        model: currentModelIdRef.current,
        message_count: payloadMessages.length,
      });
    },
    [id]
  );

  const handleError = useCallback((error: Error) => {
    console.warn("[CHAT] Response failed:", error);
    const friendlyMessage = "Something went wrong. Please try again.";

    toast({
      type: "error",
      description: friendlyMessage,
    });
    setMessages((prev) => [
      ...prev,
      {
        id: generateUUID(),
        role: "assistant",
        content: friendlyMessage,
        parts: [
          {
            type: "text",
            text: friendlyMessage,
          },
        ],
      } as ChatMessage,
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setMessages is stable from useChat; omitting to avoid stale closure

  const {
    messages,
    data,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100, // Throttles stream updates to keep UI smooth
    generateId: generateUUID,
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      return (
        lastMessage?.parts?.some(
          (part) =>
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false
      );
    },
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);

        const isToolApprovalContinuation =
          lastMessage?.role !== "user" ||
          lastMessage?.parts?.some((part) => {
            const state = (part as { state?: string }).state;
            return state === "approval-responded" || state === "output-denied";
          });

        return {
          body: {
            id: request.id,
            ...(isToolApprovalContinuation
              ? { messages: sanitizeMessages(request.messages) }
              : {
                messages: sanitizeMessages(request.messages),
                message:
                  lastMessage?.role === "user"
                    ? sanitizeMessages([lastMessage])[0]
                    : undefined,
              }),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            context: context,
            researchMode: researchModeRef.current,
            webSearchEnabled: webSearchRef.current,
            ...request.body,
          },
        };
      },
    }),
    onData: handleData,
    onFinish: handleFinish,
    onError: handleError,
  });

  // Sync memory status across tabs when AI adds/deletes memories
  useEffect(() => {
    const hasSuccessfulMemoryToolResult = messages.some((m) =>
      m.parts?.some((p) => {
        const part = p as any;
        return (
          part.type === "tool-result" &&
          (part.toolName === "addMemory" || part.toolName === "deleteMemory") &&
          part.result?.success === true
        );
      })
    );

    if (hasSuccessfulMemoryToolResult) {
      console.log("[CHAT] Broadcasting memory update");
      const channel = new BroadcastChannel("juristo-memory-sync");
      channel.postMessage("MEMORIES_UPDATED");
      channel.close();
    }
  }, [messages]);

  // Client-side stream listener for title updates
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Search for any data-chat-title chunk in the stream
    const titleChunk = [...data]
      .reverse()
      .find(
        (chunk) =>
          chunk &&
          typeof chunk === "object" &&
          ("type" in chunk
            ? chunk.type === "data-chat-title"
            : "data-chat-title" in chunk)
      );

    if (titleChunk) {
      const newTitle =
        (titleChunk as any).data || (titleChunk as any)["data-chat-title"];
      if (typeof newTitle === "string" && newTitle !== chatTitleState) {
        setChatTitleState(newTitle);
      }
    }
  }, [data, chatTitleState]);

  // Keep handleError up to date with latest setMessages (which is stable but
  // TypeScript doesn't know that — this is a safety net, not a hot path).
  useEffect(() => {
    // Nothing to do — handleError is memoised, setMessages won't change.
  }, [setMessages]);

// Listen for custom events fired by message-actions.tsx
useEffect(() => {
  const handleAIAction = (e: Event) => {
    const { action, promptText } = (e as CustomEvent).detail;
    
    // Intercept and rewrite response inline
    if (action === "regenerate" || action === "retry" || action === "steer") {
      if (promptText) {
        // Pass the modifier directly to the regenerate request body parameters
        // This updates the message inline without generating an extra user card
        regenerate?.({
          body: {
            promptOverride: promptText,
          },
        });
      } else {
        // Fallback for standard pure retries
        regenerate?.();
      }
    }
  };
  
  window.addEventListener(`trigger-ai-action-${id}`, handleAIAction);
  return () =>
    window.removeEventListener(`trigger-ai-action-${id}`, handleAIAction);
}, [id, regenerate]);

  // Track latest messages in a ref for use inside callbacks
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-send query from URL search param
  const searchParams = useSearchParams();
  const query = searchParams.get("query");
  const hasAppendedQueryRef = useRef(false);

  useEffect(() => {
    if (query && !hasAppendedQueryRef.current) {
      hasAppendedQueryRef.current = true;
      handleUserPromptSubmitted(query);
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, id, handleUserPromptSubmitted]);

  const lastExternalPromptRef = useRef<string | null>(null);
  useEffect(() => {
    const prompt = externalPrompt?.trim();
    if (!prompt || lastExternalPromptRef.current === prompt) {
      return;
    }

    lastExternalPromptRef.current = prompt;
    handleUserPromptSubmitted(prompt);
    sendMessage({
      role: "user" as const,
      parts: [{ type: "text", text: prompt }],
    });
    onExternalPromptConsumed?.();
  }, [externalPrompt, onExternalPromptConsumed, sendMessage, handleUserPromptSubmitted]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const handleStop = useCallback(() => {
    stop();
    const lastMsg = messagesRef.current.at(-1);
    if (lastMsg?.role === "assistant") {
      setStoppedMessages((prev) => new Set(prev).add(lastMsg.id));
    }
  }, [stop]);

  // Global Escape key stops streaming
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && status === "streaming") {
        handleStop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, handleStop]);

  useEffect(() => {
    const handleNewChatShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "n" &&
        !isTyping
      ) {
        event.preventDefault();
        router.push("/chat");
      }
    };

    window.addEventListener("keydown", handleNewChatShortcut);
    return () => window.removeEventListener("keydown", handleNewChatShortcut);
  }, [router]);

  return (
    <>
      {/* 1. Root container uses h-full to perfectly match its parent bounds without overflowing */}
      <div className={`flex w-full h-full min-w-0 flex-col overflow-hidden ${isWidget ? 'bg-transparent' : 'bg-background'}`}>
        {!isWidget && (
          <ChatHeader
            chatId={id}
            chatTitle={chatTitleState || chatTitle}
            globalUpdateChatVisibilityAction={({ visibility }) => {
              setVisibilityType(visibility);
              return Promise.resolve();
            }}
            isReadonly={isReadonly}
            selectedVisibilityType={visibilityType}
          />
        )}
        <div className="flex flex-1 min-w-0 overflow-hidden flex-row">
          <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            {/* 2. Scrollable Message Area */}
            {messages.length > 0 ? (
              <>
              {/* 2. Scrollable Message Area */}
              <Messages
                addToolApprovalResponse={addToolApprovalResponse}
                chatId={id}
                deleteTrailingMessages={deleteTrailingMessages}
                isArtifactVisible={isArtifactVisible}
                isReadonly={isReadonly}
                messages={messages}
                regenerate={regenerate}
                selectedModelId={currentModelId}
                sendMessage={sendMessage}
                setMessages={setMessages}
                status={status}
                stoppedMessages={stoppedMessages}
                votes={votes}
              />

              {/* 3. The usage alert sits right above the input bar */}
              <div className="shrink-0">
                <ChatUsageAlert />
              </div>

              {/* 4. Optimized Input Bar: Standard bottom positioning */}
              <div className="z-10 mx-auto w-full max-w-4xl shrink-0 px-3 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-2 sm:pt-1 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-4 md:pt-1.5 md:pb-2">
                {!isReadonly && (
                  <MultimodalInput
                    attachments={attachments}
                    chatId={id}
                    input={input}
                    messages={messages}
                    onModelChange={setCurrentModelId}
                    onResearchModeChange={setResearchModeEnabled}
                    onSubmitMessage={handleUserPromptSubmitted}
                    onWebSearchChange={setWebSearchEnabled}
                    researchModeEnabled={researchModeEnabled}
                    selectedModelId={currentModelId}
                    selectedVisibilityType={visibilityType}
                    sendMessage={sendMessage}
                    setAttachments={setAttachments}
                    setInput={setInput}
                    setMessages={setMessages}
                    status={status}
                    stop={handleStop}
                    webSearchEnabled={webSearchEnabled}
                  />
                )}
              </div>
            </>
          ) : (
            /* 5. Centered Empty State: Greeting at top, Input centered in remaining space */
            <>
              <div className="flex flex-1 flex-col items-center p-4">
                {/* Greeting Area - Fixed at top with some margin */}
                <div className={`w-full max-w-4xl shrink-0 ${isWidget ? 'mt-4' : 'mt-0'}`}>
                  <Greeting
                    context={context}
                    isWidget={isWidget}
                    userName={userName}
                  />
                </div>

                {/* Input Area - Centered in the remaining vertical space */}
                <div className={`flex w-full max-w-4xl flex-1 flex-col justify-center ${isWidget ? 'justify-end pb-4' : 'pb-[10vh]'}`}>
                  {!isReadonly && (
                    <div className="relative">
                      <MultimodalInput
                        attachments={attachments}
                        chatId={id}
                        input={input}
                        messages={messages}
                        onModelChange={setCurrentModelId}
                        onResearchModeChange={setResearchModeEnabled}
                        onSubmitMessage={handleUserPromptSubmitted}
                        onWebSearchChange={setWebSearchEnabled}
                        researchModeEnabled={researchModeEnabled}
                        selectedModelId={currentModelId}
                        selectedVisibilityType={visibilityType}
                        sendMessage={sendMessage}
                        setAttachments={setAttachments}
                        setInput={setInput}
                        setMessages={setMessages}
                        status={status}
                        stop={handleStop}
                        webSearchEnabled={webSearchEnabled}
                      />
                      {!isWidget && (
                        <FeatureSuggestionNudge
                          disabled={status !== "ready"}
                          input={input}
                          onResearchModeChange={setResearchModeEnabled}
                          onWebSearchChange={setWebSearchEnabled}
                          setInput={setInput}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      <Artifact
        addToolApprovalResponse={addToolApprovalResponse}
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        researchModeEnabled={researchModeEnabled}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        setResearchModeEnabled={setResearchModeEnabled}
        setWebSearchEnabled={setWebSearchEnabled}
        status={status}
        stop={stop}
        votes={votes}
        webSearchEnabled={webSearchEnabled}
      />

    </>
  );
}
