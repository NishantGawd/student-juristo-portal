import equal from "fast-deep-equal";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { Action, Actions } from "./elements/actions";
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";
import { Share2, RefreshCw, AlignLeft, Minimize2, ArrowUp, Volume2, Square, GitFork, MoreHorizontal } from "lucide-react";
import { ShareMessageDialog } from "./share-message-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  setMode,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMode?: (mode: "view" | "edit") => void;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);


  if (isLoading) {
    return null;
  }

  const handleRegenerate = async (prompt?: string) => {
    setIsRegenerateOpen(false);
    setCustomPrompt("");

    // ALWAYS clean up the previous response from the DB for an inline replacement
    const loadingToast = toast.loading("Preparing inline regeneration...");
    try {
      await fetch("/api/chat/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          messageId: message.id, // The ID of the assistant message to replace
        }),
      });
      toast.dismiss(loadingToast);
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error("Failed to prepare regeneration.");
      return; // Stop execution if DB cleanup fails
    }

    // Trigger the main chat.tsx handler inline
    window.dispatchEvent(
      new CustomEvent(`trigger-ai-action-${chatId}`, {
        detail: {
          action: "regenerate",
          promptText: prompt, // Will be passed as promptOverride if present
        },
      })
    );
  };

  // --- READ ALOUD LOGIC ---
  const handleReadAloud = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech is not supported in your browser.");
      return;
    }

    // If already speaking this message, stop it
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Cancel any current speech and start new
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textFromParts || "");

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // --- BRANCHING LOGIC ---
  const handleBranch = async () => {
    const loadingToast = toast.loading("Branching conversation...");
    try {
      const res = await fetch("/api/chat/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalChatId: chatId, messageId: message.id }),
      });

      if (!res.ok) throw new Error("Failed to branch chat.");

      const { newChatId } = await res.json();

      toast.dismiss(loadingToast);
      toast.success("Successfully branched chat!");

      // Redirect to the newly created branched chat
      router.push(`/chat/${newChatId}`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to create a new branch.");
    }
  };

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = async () => {
    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  };

  // User messages get edit (on hover) and copy actions
  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end">
        <div className="relative">
          {setMode && (
            <Action
              className="-left-10 absolute top-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/message:opacity-100"
              data-testid="message-edit-button"
              onClick={() => setMode("edit")}
              tooltip="Edit"
            >
              <PencilEditIcon />
            </Action>
          )}
          <Action onClick={handleCopy} tooltip="Copy">
            <CopyIcon />
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <>
      <Actions className="-ml-0.5">
        <Action onClick={handleCopy} tooltip="Copy">
          <CopyIcon />
        </Action>

        <Action
          data-testid="message-upvote"
          disabled={vote?.isUpvoted}
          onClick={() => {
            const upvote = fetch("/api/vote", {
              method: "PATCH",
              body: JSON.stringify({
                chatId,
                messageId: message.id,
                type: "up",
              }),
            });

            toast.promise(upvote, {
              loading: "Upvoting Response...",
              success: () => {
                mutate<Vote[]>(
                  `/api/vote?chatId=${chatId}`,
                  (currentVotes) => {
                    if (!currentVotes) {
                      return [];
                    }

                    const votesWithoutCurrent = currentVotes.filter(
                      (currentVote) => currentVote.messageId !== message.id
                    );

                    return [
                      ...votesWithoutCurrent,
                      {
                        chatId,
                        messageId: message.id,
                        isUpvoted: true,
                      },
                    ];
                  },
                  { revalidate: false }
                );

                return "Upvoted Response!";
              },
              error: "Failed to upvote response.",
            });
          }}
          tooltip="Upvote Response"
        >
          <ThumbUpIcon />
        </Action>

        <Action
          data-testid="message-downvote"
          disabled={vote && !vote.isUpvoted}
          onClick={() => {
            const downvote = fetch("/api/vote", {
              method: "PATCH",
              body: JSON.stringify({
                chatId,
                messageId: message.id,
                type: "down",
              }),
            });

            toast.promise(downvote, {
              loading: "Downvoting Response...",
              success: () => {
                mutate<Vote[]>(
                  `/api/vote?chatId=${chatId}`,
                  (currentVotes) => {
                    if (!currentVotes) {
                      return [];
                    }

                    const votesWithoutCurrent = currentVotes.filter(
                      (currentVote) => currentVote.messageId !== message.id
                    );

                    return [
                      ...votesWithoutCurrent,
                      {
                        chatId,
                        messageId: message.id,
                        isUpvoted: false,
                      },
                    ];
                  },
                  { revalidate: false }
                );

                return "Downvoted Response!";
              },
              error: "Failed to downvote response.",
            });
          }}
          tooltip="Downvote Response"
        >
          <ThumbDownIcon />
        </Action>
        <Action
          onClick={() => setIsShareOpen(true)}
          tooltip="Share"
        >
          <Share2 className="size-4 text-muted-foreground" />
        </Action>

        {/* NEW: Enhanced Regenerate Popover */}
        <Popover open={isRegenerateOpen} onOpenChange={setIsRegenerateOpen}>
          <PopoverTrigger asChild>
            <Action tooltip="Regenerate">
              <RefreshCw className="size-4 text-muted-foreground" />
            </Action>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            sideOffset={10}
            className="w-64 p-2 bg-zinc-950 border-zinc-800 text-white shadow-xl rounded-xl"
          >
            <div className="flex flex-col gap-1">
              {/* Custom Input */}
              <div className="relative mb-1 flex items-center">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ask to change response"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-600 rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPrompt.trim()) {
                      handleRegenerate(customPrompt);
                    }
                  }}
                />
                <button
                  onClick={() => customPrompt.trim() && handleRegenerate(customPrompt)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white transition-colors disabled:opacity-50"
                  disabled={!customPrompt.trim()}
                >
                  <ArrowUp className="size-3.5" />
                </button>
              </div>

              <div className="h-px bg-zinc-800 w-full my-1" />

              {/* Options */}
              <button onClick={() => handleRegenerate()} className="flex items-center gap-3 w-full p-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors text-left">
                <RefreshCw className="size-4" /> Try again
              </button>
              <button onClick={() => handleRegenerate("Please regenerate the previous response but add more details and elaborate further.")} className="flex items-center gap-3 w-full p-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors text-left">
                <AlignLeft className="size-4" /> Add details
              </button>
              <button onClick={() => handleRegenerate("Please regenerate the previous response but make it much more concise and brief.")} className="flex items-center gap-3 w-full p-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors text-left">
                <Minimize2 className="size-4" /> More concise
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* NEW: More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Action tooltip="More actions">
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Action>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-zinc-950 border-zinc-800 text-zinc-300 rounded-xl shadow-xl">
            <DropdownMenuItem
              onClick={handleBranch}
              className="flex items-center gap-2 py-2.5 cursor-pointer focus:bg-zinc-800 focus:text-white"
            >
              <GitFork className="size-4" />
              <span>Branch in new chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleReadAloud}
              className="flex items-center gap-2 py-2.5 cursor-pointer focus:bg-zinc-800 focus:text-white"
            >
              {isSpeaking ? (
                <><Square className="size-4 fill-current" /><span>Stop reading</span></>
              ) : (
                <><Volume2 className="size-4" /><span>Read aloud</span></>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Actions>
      <ShareMessageDialog
        isOpen={isShareOpen}
        onOpenChange={setIsShareOpen}
        textToShare={textFromParts || "Check out this legal response from Juristo AI!"}
      />
    </>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    return true;
  }
);

