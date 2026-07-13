import dynamic from "next/dynamic";
import type { UseChatHelpers } from "@ai-sdk/react";
import { formatDistance } from "date-fns";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "framer-motion";
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { useDebounceCallback, useWindowSize } from "usehooks-ts";
import { codeArtifact } from "@/app/artifacts/code/client";
import { imageArtifact } from "@/app/artifacts/image/client";
import { textArtifact } from "@/app/artifacts/text/client";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import type { Document, Vote } from "@/lib/db/schema";
import type { Attachment, ChatMessage } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import { ArtifactActions } from "./artifact-actions";
import { ArtifactCloseButton } from "./artifact-close-button";
import { ArtifactMessages } from "./artifact-messages";
import { MultimodalInput } from "./multimodal-input";
import { SidebarToggle } from "./sidebar-toggle";
import { Toolbar } from "./toolbar";
import { useSidebar } from "./ui/sidebar";
import { VersionFooter } from "./version-footer";
import type { VisibilityType } from "./visibility-selector";

export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  imageArtifact,
];
export type ArtifactKind = (typeof artifactDefinitions)[number]["kind"];

export type UIArtifact = {
  chatId?: string;
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  isDismissed?: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  contractMeta?: {
    hasAccess?: boolean;
    contractSlug?: string;
  };
};

function PureArtifact({
  addToolApprovalResponse,
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  sendMessage,
  messages,
  setMessages,
  regenerate,
  votes,
  isReadonly,
  selectedVisibilityType,
  selectedModelId,
  researchModeEnabled,
  setResearchModeEnabled,
  webSearchEnabled,
  setWebSearchEnabled,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  votes: Vote[] | undefined;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  researchModeEnabled: boolean;
  setResearchModeEnabled: Dispatch<SetStateAction<boolean>>;
  webSearchEnabled: boolean;
  setWebSearchEnabled: Dispatch<SetStateAction<boolean>>;
}) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();

  const {
    data: documents,
    isLoading: isDocumentsFetching,
    mutate: mutateDocuments,
  } = useSWR<Document[]>(
    artifact.documentId !== "init" && artifact.status !== "streaming"
      ? `/api/document?id=${artifact.documentId}`
      : null,
    fetcher
  );

  const [mode, setMode] = useState<"edit" | "diff">("edit");
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

  const { open: isSidebarOpen } = useSidebar();

  useEffect(() => {
    setArtifact((currentArtifact) => {
      if (currentArtifact.documentId === "init") {
        return currentArtifact;
      }

      if (!currentArtifact.chatId || currentArtifact.chatId !== chatId) {
        return { ...initialArtifactData };
      }

      return currentArtifact;
    });
  }, [chatId, setArtifact]);

  useEffect(() => {
    if (artifact.documentId === "init" || artifact.chatId) {
      return;
    }

    setArtifact((currentArtifact) =>
      currentArtifact.documentId === artifact.documentId &&
      !currentArtifact.chatId
        ? { ...currentArtifact, chatId }
        : currentArtifact
    );
  }, [artifact.chatId, artifact.documentId, chatId, setArtifact]);

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? "",
        }));
      }
    }
  }, [documents, setArtifact]);

  useEffect(() => {
    mutateDocuments();
  }, [mutateDocuments]);

  const { mutate } = useSWRConfig();
  const [isContentDirty, setIsContentDirty] = useState(false);

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!artifact) {
        return;
      }

      mutate<Document[]>(
        `/api/document?id=${artifact.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) {
            return [];
          }

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            await fetch(`/api/document?id=${artifact.documentId}`, {
              method: "POST",
              body: JSON.stringify({
                title: artifact.title,
                content: updatedContent,
                kind: artifact.kind,
              }),
            });

            setIsContentDirty(false);

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false }
      );
    },
    [artifact, mutate]
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000
  );

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (document && updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange]
  );

  function getDocumentContentById(index: number) {
    if (!documents) {
      return "";
    }
    if (!documents[index]) {
      return "";
    }
    return documents[index].content ?? "";
  }

  const handleVersionChange = (type: "next" | "prev" | "toggle" | "latest") => {
    if (!documents) {
      return;
    }

    if (type === "latest") {
      setCurrentVersionIndex(documents.length - 1);
      setMode("edit");
    }

    if (type === "toggle") {
      setMode((currentMode) => (currentMode === "edit" ? "diff" : "edit"));
    }

    if (type === "prev") {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === "next" && currentVersionIndex < documents.length - 1) {
      setCurrentVersionIndex((index) => index + 1);
    }
  };

  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isLawyerPanelOpen, setIsLawyerPanelOpen] = useState(false);
  const [showEditHint, setShowEditHint] = useState(false);

  // Show hint when artifact becomes visible and content is ready
  useEffect(() => {
    if (artifact.isVisible && artifact.status === "idle" && artifact.content) {
      const showTimer = setTimeout(() => setShowEditHint(true), 600);
      const hideTimer = setTimeout(() => setShowEditHint(false), 6000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
    setShowEditHint(false);
  }, [artifact.isVisible, artifact.status, artifact.documentId]);

  /*
   * NOTE: if there are no documents, or if
   * the documents are being fetched, then
   * we mark it as the current version.
   */

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind
  );

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  useEffect(() => {
    if (artifact.documentId !== "init" && artifactDefinition.initialize) {
      artifactDefinition.initialize({
        documentId: artifact.documentId,
        setMetadata,
      });
    }
  }, [artifact.documentId, artifactDefinition, setMetadata]);

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 z-50 h-dvh w-dvw bg-transparent pointer-events-none"
          data-testid="artifact"
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          initial={{ opacity: 1 }}
          style={{ "--chat-width": "clamp(360px, 34vw, 560px)" } as React.CSSProperties}
        >
          <div
            className="fixed top-2 z-[70] pointer-events-auto"
            style={{
              left: isMobile
                ? 8
                : isSidebarOpen
                  ? "calc(var(--sidebar-width) + 8px)"
                  : 8,
            }}
          >
            <SidebarToggle className="border bg-background/95 shadow-sm backdrop-blur" />
          </div>

          {!isMobile && (
            <motion.div
              animate={{
                opacity: 1,
                width: isSidebarOpen ? "calc(100dvw - var(--sidebar-width))" : "100dvw",
                x: isSidebarOpen ? "var(--sidebar-width)" : "0px"
              }}
              className="absolute top-0 left-0 h-dvh bg-background pointer-events-none"
              exit={{
                opacity: 0,
                width: isSidebarOpen ? "calc(100dvw - var(--sidebar-width))" : "100dvw",
                x: isSidebarOpen ? "var(--sidebar-width)" : "0px",
                transition: { duration: 0.08 },
              }}
              initial={{
                opacity: 1,
                width: isSidebarOpen ? "calc(100dvw - var(--sidebar-width))" : "100dvw",
                x: isSidebarOpen ? "var(--sidebar-width)" : "0px",
              }}
            />
          )}

          {!isMobile && (
            <motion.div
              animate={{
                opacity: 1,
                x: isSidebarOpen ? "var(--sidebar-width)" : "0px",
                scale: 1,
                transition: {
                  delay: 0.1,
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                },
              }}
              className="absolute top-0 left-0 h-dvh w-[var(--chat-width)] shrink-0 border-r border-border/60 bg-background pointer-events-auto"
              exit={{
                opacity: 0,
                x: isSidebarOpen ? "var(--sidebar-width)" : "0px",
                scale: 1,
                transition: { duration: 0 },
              }}
              initial={{ opacity: 0, x: isSidebarOpen ? "calc(var(--sidebar-width) + 10px)" : "10px", scale: 1 }}
            >
              <AnimatePresence>
                {!isCurrentVersion && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="absolute top-0 left-0 z-50 h-dvh w-[var(--chat-width)] bg-zinc-900/50"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <div className="flex h-full w-full flex-col overflow-hidden">
                <div className="flex-1 min-h-0 w-full">
                  <ArtifactMessages
                    addToolApprovalResponse={addToolApprovalResponse}
                    artifactStatus={artifact.status}
                    chatId={chatId}
                    isReadonly={isReadonly}
                    messages={messages}
                    regenerate={regenerate}
                    sendMessage={sendMessage}
                    setMessages={setMessages}
                    status={status}
                    votes={votes}
                  />
                </div>

                <div className="relative flex w-full shrink-0 flex-row items-end gap-2 border-t border-border/50 bg-background/95 px-3 py-2 backdrop-blur">
                  <MultimodalInput
                    attachments={attachments}
                    chatId={chatId}
                    className="bg-background dark:bg-muted"
                    input={input}
                    messages={messages}
                    onResearchModeChange={setResearchModeEnabled}
                    onWebSearchChange={setWebSearchEnabled}
                    researchModeEnabled={researchModeEnabled}
                    selectedModelId={selectedModelId}
                    selectedVisibilityType={selectedVisibilityType}
                    sendMessage={sendMessage}
                    setAttachments={setAttachments}
                    setInput={setInput}
                    setMessages={setMessages}
                    status={status}
                    stop={stop}
                    webSearchEnabled={webSearchEnabled}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            animate={
              isMobile
                ? {
                  opacity: 1,
                  x: 0,
                  y: 0,
                  height: windowHeight,
                  width: windowWidth ? windowWidth : "calc(100dvw)",
                  borderRadius: 0,
                  transition: {
                    delay: 0,
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.8,
                  },
                }
                : {
                  opacity: 1,
                  x: isSidebarOpen ? "calc(var(--sidebar-width) + var(--chat-width))" : "var(--chat-width)",
                  y: 0,
                  height: windowHeight,
                  width: isSidebarOpen ? "calc(100dvw - var(--sidebar-width) - var(--chat-width))" : "calc(100dvw - var(--chat-width))",
                  borderRadius: 0,
                  transition: {
                    delay: 0,
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.8,
                  },
                }
            }
            className="fixed top-0 left-0 flex h-dvh flex-col overflow-hidden border-border bg-background md:border-l dark:bg-background pointer-events-auto"
            exit={{
              opacity: 0,
              scale: 0.5,
              transition: {
                delay: 0.1,
                type: "spring",
                stiffness: 600,
                damping: 30,
              },
            }}
            initial={
              isMobile
                ? {
                  opacity: 1,
                  x: artifact.boundingBox.left,
                  y: artifact.boundingBox.top,
                  height: artifact.boundingBox.height,
                  width: artifact.boundingBox.width,
                  borderRadius: 50,
                }
                : {
                  opacity: 1,
                  x: artifact.boundingBox.left,
                  y: artifact.boundingBox.top,
                  height: artifact.boundingBox.height,
                  width: artifact.boundingBox.width,
                  borderRadius: 50,
                }
            }
          >
            <div className="sticky top-0 z-20 flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-3 py-2 backdrop-blur sm:px-4 min-w-0">
              <div className="flex min-w-0 flex-1 flex-row items-center gap-2 overflow-hidden">
                <ArtifactCloseButton />

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="truncate font-semibold text-sm leading-5 sm:text-base">{artifact.title}</div>

                  {isContentDirty ? (
                    <div className="text-muted-foreground text-xs">
                      Saving changes...
                    </div>
                  ) : document ? (
                    <div className="truncate text-muted-foreground text-xs">
                      {`Updated ${formatDistance(
                        new Date(document.createdAt),
                        new Date(),
                        {
                          addSuffix: true,
                        }
                      )}`}
                    </div>
                  ) : (
                    <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
                  )}
                </div>
              </div>

              <ArtifactActions
                artifact={artifact}
                currentVersionIndex={currentVersionIndex}
                handleVersionChange={handleVersionChange}
                isCurrentVersion={isCurrentVersion}
                metadata={metadata}
                mode={mode}
                setMetadata={setMetadata}
              />
            </div>

            {/* Edit hint info popup */}
            <AnimatePresence>
              {showEditHint && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="mx-3 mb-2 overflow-hidden"
                >
                  <div className="flex items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 px-4 py-3 shadow-sm">
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.15, type: "spring", stiffness: 500, damping: 20 }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-500/20"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex-1 text-sm font-medium text-blue-700 dark:text-blue-300"
                    >
                      You can edit this document live on this panel
                    </motion.p>
                    <button
                      onClick={() => setShowEditHint(false)}
                      className="shrink-0 rounded-md p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-0 flex-1 max-w-full! items-start overflow-y-auto bg-background">
              <artifactDefinition.content
                content={
                  isCurrentVersion
                    ? artifact.content
                    : getDocumentContentById(currentVersionIndex)
                }
                currentVersionIndex={currentVersionIndex}
                getDocumentContentById={getDocumentContentById}
                isCurrentVersion={isCurrentVersion}
                isInline={false}
                isLoading={isDocumentsFetching && !artifact.content}
                metadata={metadata}
                mode={mode}
                onSaveContent={saveContent}
                setMetadata={setMetadata}
                status={artifact.status}
                suggestions={[]}
                title={artifact.title}
              />

              <AnimatePresence>
                {isCurrentVersion && (
                  <Toolbar
                    artifactKind={artifact.kind}
                    isToolbarVisible={isToolbarVisible}
                    sendMessage={sendMessage}
                    setIsToolbarVisible={setIsToolbarVisible}
                    setMessages={setMessages}
                    status={status}
                    stop={stop}
                  />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!isCurrentVersion && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }
  if (prevProps.input !== nextProps.input) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages.length)) {
    return false;
  }
  if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
    return false;
  }
  if (prevProps.researchModeEnabled !== nextProps.researchModeEnabled) {
    return false;
  }
  if (prevProps.webSearchEnabled !== nextProps.webSearchEnabled) {
    return false;
  }

  return true;
});
