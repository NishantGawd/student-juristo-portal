import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { ArrowDownIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { memo } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDataStreamSetter } from "./data-stream-provider";

const PreviewMessage = dynamic(
  () => import("./message").then((mod) => mod.PreviewMessage),
  { ssr: false }
);

const ThinkingMessage = dynamic(
  () => import("./message").then((mod) => mod.ThinkingMessage),
  { ssr: false }
);

type MessagesProps = {
  addToolApprovalResponse: UseChatHelpers<any>["addToolApprovalResponse"];
  chatId: string;
  status: UseChatHelpers<any>["status"];
  votes: Vote[] | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<any>["setMessages"];
  regenerate: UseChatHelpers<any>["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  selectedModelId: string;
  sendMessage: UseChatHelpers<any>["sendMessage"];
  stoppedMessages?: Set<string>;
  deleteTrailingMessages: (payload: { id: string }) => Promise<void>;
};

function getTextFromMessage(message?: ChatMessage) {
  return (
    message?.parts
      ?.filter((part: any) => part.type === "text" && typeof part.text === "string")
      .map((part: any) => part.text)
      .join(" ") || ""
  );
}

function getAttachmentsFromMessage(message?: ChatMessage) {
  return (
    message?.parts
      ?.filter((part: any) => part.type === "file" || part.type === "image")
      .map((part: any) => ({
        name: part.filename ?? part.name,
        contentType: part.mediaType ?? part.mimeType ?? part.contentType,
      })) || []
  );
}

function getThinkingIntent(text: string, hasAttachments: boolean) {
  const prompt = text.toLowerCase();

  if (hasAttachments) return "document";
  if (/\bodr\b|online dispute|file.*complaint|consumer complaint|ecommerce dispute|cyber complaint|msme|banking complaint|insurance dispute|tenant dispute|employment dispute|commercial dispute|family mediation/.test(prompt)) {
    return "odr";
  }
  if (/draft|agreement|contract|notice|deed|nda|lease|rent agreement|termsheet|term sheet/.test(prompt)) {
    return "drafting";
  }
  if (/research|case law|judgment|judgement|precedent|section|act|statute|latest|recent|current law/.test(prompt)) {
    return "research";
  }
  if (/lawyer|advocate|attorney|consult|legal help|representation/.test(prompt)) {
    return "lawyer";
  }
  if (/price|pricing|plan|upgrade|limit|subscription|paywall|paid|free/.test(prompt)) {
    return "pricing";
  }
  return "general";
}

function PureMessages({
  addToolApprovalResponse,
  chatId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  selectedModelId: _selectedModelId,
  sendMessage,
  stoppedMessages = new Set(),
  deleteTrailingMessages,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
  } = useMessages({
    status,
  });

  useDataStreamSetter();

  // Helper to check if the AI message is just a blank shell
  const isMessageEmpty = (message: ChatMessage) => {
    if (!message.parts || message.parts.length === 0) return true;

    return message.parts.every((part: any) => {
      // 1. Invisible text/reasoning
      if (part.type === "text" || part.type === "reasoning") {
        return !part.text || part.text.trim().length === 0;
      }

      // 2. Invisible background data chunks
      if (part.type === "data") {
        const invisibleDataTypes = ["data-chat-title", "usage", "suggestion"];
        return (
          !part.data || invisibleDataTypes.includes((part.data as any).type)
        );
      }

      // 3. UNIVERSAL TOOL CHECK — never hides a tool
      const isTool =
        part.type === "tool-invocation" ||
        part.type === "tool-call" ||
        part.type === "tool-result" ||
        (typeof part.type === "string" && part.type.startsWith("tool-"));

      if (isTool) return false;

      return true;
    });
  };

  // --- V1 OPTIMISTIC UI LOGIC ---
  const lastMessage = messages[messages.length - 1];
  const isLastMessageUser = lastMessage?.role === "user";
  const isLastMessageEmptyAssistant =
    lastMessage?.role === "assistant" && isMessageEmpty(lastMessage);

  const isSilentSubmission = lastMessage?.parts?.some(
    (p: any) => p.type === "text" && p.text?.includes("###SILENT_SUBMISSION###")
  );

  const isOdrSubmission = lastMessage?.role === "user" && lastMessage?.parts?.some(
    (p: any) => p.type === "text" && p.text?.includes("Here are the details for the") && p.text?.includes("ODR filing")
  );
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const latestUserText = getTextFromMessage(latestUserMessage);
  const latestAttachments = getAttachmentsFromMessage(latestUserMessage);
  const thinkingIntent = getThinkingIntent(latestUserText, latestAttachments.length > 0);

  const showThinking =
    status === "submitted" ||
    (status === "streaming" &&
      (messages.length === 0 ||
        isLastMessageUser ||
        isLastMessageEmptyAssistant));

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        className={cn(
          "scroll-smooth-mobile touch-pan-y overflow-y-auto",
          messages.length > 0 ? "absolute inset-0" : "flex-1"
        )}
        ref={messagesContainerRef}
      >
        <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-2 sm:py-4 md:gap-4 md:px-4 md:py-4 lg:gap-6 lg:px-4 lg:py-5">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            const isAssistant = message.role === "assistant";
            const isEmpty = isMessageEmpty(message);

            // Prevent double logo: hide empty shell while ThinkingMessage is shown
            if (isLast && isAssistant && isEmpty && showThinking) {
              return null;
            }

            // Hide soft-deleted/regenerated messages
            const isSoftDeleted = !message.parts || message.parts.length === 0;
            if (isSoftDeleted && !isLast) {
              return null;
            }

            return (
              <PreviewMessage
                addToolApprovalResponse={addToolApprovalResponse}
                chatId={chatId}
                deleteTrailingMessages={deleteTrailingMessages}
                isLoading={status === "streaming" && isLast}
                isReadonly={isReadonly}
                isStopped={stoppedMessages.has(message.id)}
                key={`${message.id}-${index}`}
                message={message}
                regenerate={regenerate}
                requiresScrollPadding={hasSentMessage && isLast}
                sendMessage={sendMessage}
                setMessages={setMessages}
                status={status}
                vote={
                  votes
                    ? votes.find((vote) => vote.messageId === message.id)
                    : undefined
                }
              />
            );
          })}

          {/* Smart Thinking Indicator */}
          {showThinking && (
            <ThinkingMessage
              attachments={latestAttachments}
              status={
                isSilentSubmission
                  ? "Captured your details correctly and drafting your document"
                  : isOdrSubmission
                    ? "odr"
                    : thinkingIntent
              }
            />
          )}

          <div className="min-h-6 shrink-0" ref={messagesEndRef} />
        </div>
      </div>

      <button
        aria-label="Scroll to bottom"
        className={`-translate-x-1/2 touch-target absolute bottom-4 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-all hover:bg-muted sm:bottom-5 sm:p-2.5 md:bottom-6 ${
          isAtBottom
            ? "pointer-events-none scale-0 opacity-0"
            : "pointer-events-auto scale-100 opacity-100"
        }`}
        onClick={() => scrollToBottom("smooth")}
        type="button"
      >
        <ArrowDownIcon className="size-4" />
      </button>
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (nextProps.status === "streaming") {
    return false; // Don't skip render — streaming requires animation updates
  }

  // For non-streaming states, use memoization to avoid unnecessary renders
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.selectedModelId !== nextProps.selectedModelId) {
    return false;
  }
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }
  if (prevProps.isArtifactVisible !== nextProps.isArtifactVisible) {
    return false;
  }

  // Check stoppedMessages Set equality
  if (prevProps.stoppedMessages?.size !== nextProps.stoppedMessages?.size) {
    return false;
  }
  if (prevProps.stoppedMessages && nextProps.stoppedMessages) {
    for (const id of prevProps.stoppedMessages) {
      if (!nextProps.stoppedMessages.has(id)) {
        return false;
      }
    }
  }

  return true; // Skip render if everything is the same
});
