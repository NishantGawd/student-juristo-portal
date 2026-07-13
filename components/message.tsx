"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { memo, useEffect, useState } from "react";
import type { Vote } from "@/lib/db/schema";
import loaderMessages from "@/lib/loader-messages.json" with { type: "json" };
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { PrecedentCards, parsePrecedents } from "./a2ui/text/precedents";
import { ToolRenderer } from "./a2ui/tool-renderer";
import { WebSearchGroup } from "./a2ui/tools/web-search";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { UploadFileProcessor } from "./upload-file-processor";

function normalizeStreamingMarkdown(text: string) {
  return text
    .replace(/^(\s*\d+\.)[ \t]*\n(?:[ \t]*\n)*[ \t]*(?=\S)/gm, "$1 ")
    .replace(/^(\s*[-*])[ \t]*\n(?:[ \t]*\n)*[ \t]*(?=\S)/gm, "$1 ")
    .replace(/\n{3,}/g, "\n\n");
}

function getToolName(part: any): string | null {
  const type = typeof part?.type === "string" ? part.type : "";
  const toolName =
    part?.toolName ??
    part?.toolInvocation?.toolName ??
    part?.tool?.toolName ??
    part?.name;

  if (typeof toolName === "string" && toolName) {
    return toolName;
  }
  if (type.startsWith("tool-")) {
    return type.slice("tool-".length);
  }

  return null;
}

function isWebSearchPart(part: any) {
  return getToolName(part) === "webSearch";
}

function isResearchWorkflowTool(toolName: string | null) {
  return toolName === "runLegalResearch" || toolName === "createResearchReport";
}

const PurePreviewMessage = ({
  addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  sendMessage,
  status,
  isStopped,
  deleteTrailingMessages,
}: {
  addToolApprovalResponse: UseChatHelpers<any>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<any>["setMessages"];
  regenerate: UseChatHelpers<any>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  sendMessage?: UseChatHelpers<any>["sendMessage"];
  status?: string;
  isStopped?: boolean;
  deleteTrailingMessages?: (payload: { id: string }) => Promise<void>;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file" || (part.type as string) === "image"
  );

  const hasVisibleContent = message.parts?.some(
    (p) =>
      ((p.type === "text" || p.type === "reasoning") &&
        p.text?.trim().length > 0) ||
      p.type.startsWith("tool-")
  );
  const isEffectivelyEmpty =
    !hasVisibleContent && message.parts && message.parts.length > 0;
  const hasResearchWorkflowTool = Boolean(
    message.parts?.some((part) => isResearchWorkflowTool(getToolName(part)))
  );
  const lastCreateResearchReportIndex =
    message.parts?.reduce(
      (lastIndex, part, index) =>
        getToolName(part) === "createResearchReport" ? index : lastIndex,
      -1
    ) ?? -1;

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": message.role === "user" && mode !== "edit",
          "justify-start": message.role === "assistant",
        })}
      >
        {message.role === "assistant" && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background ring-1 ring-border">
            <Image
              alt="Juristo"
              className="rounded-full object-contain"
              height={22}
              src="/logo_optimized_30.png"
              width={22}
            />
          </div>
        )}

        <div
          className={cn("flex flex-col", {
            "gap-2 md:gap-4": message.parts?.some(
              (p) => p.type === "text" && p.text?.trim()
            ),
            "w-full":
              (message.role === "assistant" &&
                (message.parts?.some(
                  (p) => p.type === "text" && p.text?.trim()
                ) ||
                  message.parts?.some((p) => p.type.startsWith("tool-")))) ||
              mode === "edit",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
              message.role === "user" && mode !== "edit",
          })}
        >
          {attachmentsFromMessage.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {attachmentsFromMessage.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name:
                      (attachment as any).filename ??
                      (attachment as any).name ??
                      "file",
                    contentType:
                      (attachment as any).mediaType ||
                      (attachment as any).mimeType ||
                      (attachment as any).contentType,
                    url: (attachment as any).url || (attachment as any).image,
                  }}
                  key={(attachment as any).url || (attachment as any).image}
                />
              ))}
            </div>
          )}

          {message.parts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            if (type === "reasoning" && part.text?.trim().length > 0) {
              return (
                <MessageReasoning
                  isLoading={isLoading}
                  key={key}
                  reasoning={part.text}
                />
              );
            }

            if (type === "text") {
              const fullText = part.text || "";
              if (fullText.includes("###SILENT_SUBMISSION###")) {
                return null;
              }

              if (
                message.role === "user" &&
                fullText.includes("Here are the details for the")
              ) {
                return (
                  <div
                    className="flex max-w-full items-center gap-2.5 rounded-xl bg-muted/60 px-4 py-2.5 text-muted-foreground text-sm"
                    key={key}
                  >
                    <CheckCircle2
                      className="shrink-0 text-emerald-500"
                      size={14}
                    />
                    <span className="min-w-0 break-words">
                      ODR details submitted. Filing packet...
                    </span>
                  </div>
                );
              }

              const normalizedText = normalizeStreamingMarkdown(fullText);
              const { cleanText: textAfterPrecedents, precedentsData } =
                parsePrecedents(normalizedText);
              const finalText = textAfterPrecedents;

              if (mode === "view") {
                return (
                  <div className="flex w-full flex-col gap-3" key={key}>
                    <MessageContent
                      className={cn({
                        "wrap-break-word w-fit rounded-2xl bg-muted px-4 py-2 text-left":
                          message.role === "user",
                        "wrap-break-word w-full max-w-[760px] px-0 py-0 text-left leading-7":
                          message.role === "assistant",
                      })}
                      data-testid="message-content"
                    >
                      <div
                        className={cn(
                          message.role === "assistant" &&
                            "w-full min-w-0 [&_li]:my-1 [&_ol]:my-3 [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:pl-6"
                        )}
                      >
                        <Response>{sanitizeText(finalText)}</Response>
                      </div>
                    </MessageContent>

                    {precedentsData && !hasResearchWorkflowTool && (
                      <PrecedentCards
                        cases={precedentsData.cases}
                        messageId={message.id}
                        otherText={precedentsData.otherText}
                        rawText={precedentsData.rawText}
                      />
                    )}
                  </div>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        deleteTrailingMessages={
                          deleteTrailingMessages ?? (() => Promise.resolve())
                        }
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            const isCustomTool =
              (type as string) === "tool-invocation" ||
              (typeof type === "string" && type.startsWith("tool-"));

            if (isCustomTool) {
              const toolContext = {
                chatId,
                messageId: message.id,
                isReadonly,
                isLoading,
                isStopped,
                status,
                sendMessage,
                addToolApprovalResponse,
                deleteTrailingMessages,
                regenerate,
                setMessages,
              };

              if (isWebSearchPart(part)) {
                const webSearchParts =
                  message.parts?.filter(isWebSearchPart) ?? [];
                const firstWebSearchIndex =
                  message.parts?.findIndex(isWebSearchPart) ?? -1;

                if (index !== firstWebSearchIndex) {
                  return null;
                }

                return (
                  <WebSearchGroup
                    context={toolContext}
                    key={`${message.id}-web-search-group`}
                    parts={webSearchParts}
                  />
                );
              }

              const toolName = getToolName(part);
              if (toolName === "showPrecedents" && hasResearchWorkflowTool) {
                return null;
              }
              if (
                toolName === "createResearchReport" &&
                index !== lastCreateResearchReportIndex
              ) {
                return null;
              }

              return (
                <ToolRenderer context={toolContext} key={key} part={part} />
              );
            }

            return null;
          })}

          {/* BULLETPROOF STOPPED MESSAGE LOGIC */}
          {message.role === "assistant" &&
            !isLoading &&
            (isStopped || isEffectivelyEmpty) && (
              <MessageContent
                className={cn(
                  "wrap-break-word fade-in slide-in-from-top-2 w-full animate-in rounded-xl border border-border/80 bg-muted/40 pt-1 pb-1 text-left shadow-sm backdrop-blur-sm duration-500 dark:border-white/10 dark:bg-[#1c1e24]/80",
                  isEffectivelyEmpty ? "" : "mt-2"
                )}
              >
                <div className="prose dark:prose-invert max-w-none">
                  <p className="m-0 text-muted-foreground/90 italic">
                    You stopped this response
                  </p>
                </div>
              </MessageContent>
            )}

          {!isReadonly && (
            <MessageActions
              chatId={chatId}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              setMode={setMode}
              vote={vote}
            />
          )}
        </div>

        {message.role === "user" && mode !== "edit" && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#006cff] text-white">
            <span className="font-semibold text-sm">U</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (nextProps.isLoading) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.message.id !== nextProps.message.id) {
      return false;
    }
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (prevProps.isStopped !== nextProps.isStopped) {
      return false;
    }

    return (
      equal(prevProps.message.parts, nextProps.message.parts) &&
      equal(prevProps.vote, nextProps.vote)
    );
  }
);

export const ThinkingMessage = ({
  status = "Processing legal context",
  attachments,
}: {
  status?: string;
  attachments?: Array<{ name?: string; contentType?: string }>;
}) => {
  const hasAttachments = attachments && attachments.length > 0;

  // Dynamic status rotation for non-attachment thinking state
  const [dynamicStatus, setDynamicStatus] = useState(status);

  useEffect(() => {
    if (hasAttachments) {
      return;
    }

    // Define rotating phrases based on the initial status
    const statusKey = status.toLowerCase();
    const phrases =
      statusKey === "odr"
        ? loaderMessages.odr
        : statusKey.includes("drafting")
          ? loaderMessages.drafting
          : statusKey === "research"
            ? loaderMessages.research
            : statusKey === "lawyer"
              ? loaderMessages.lawyer
              : statusKey === "pricing"
                ? loaderMessages.pricing
                : statusKey === "document"
                  ? loaderMessages.document
                  : loaderMessages.general;

    let idx = 0;
    const intervalId = setInterval(() => {
      idx = (idx + 1) % phrases.length;
      setDynamicStatus(phrases[idx]);
    }, 2500);

    return () => clearInterval(intervalId);
  }, [status, hasAttachments]);

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200 ease-in-out"
      data-role="assistant"
    >
      <div className="flex items-start justify-start gap-3">
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background shadow-sm ring-1 ring-border">
          <Image
            alt="Juristo"
            className="animate-pulse rounded-full object-contain"
            height={22}
            src="/logo_optimized_30.png"
            width={22}
          />
        </div>
        <div className="flex w-full flex-col gap-2">
          {hasAttachments ? (
            <UploadFileProcessor attachments={attachments} />
          ) : (
            <div className="flex items-center gap-2 px-1 text-muted-foreground/80 text-sm">
              <div className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary/40" />
              </div>
              <span
                className="fade-in slide-in-from-bottom-1 animate-in font-medium tracking-tight duration-300"
                key={dynamicStatus}
              >
                {dynamicStatus}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
