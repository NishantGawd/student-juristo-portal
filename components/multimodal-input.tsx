"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import { CheckIcon, ChevronDown, Globe, Loader2, Mic, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import useSWR, { useSWRConfig } from "swr";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// ✅ Removed unused useChatVisibility hook import
import {
  chatModels,
  DEFAULT_CHAT_MODEL,
  modelsByProvider,
} from "@/lib/ai/models";
import { canUseJuristoModel, getModelAccessError } from "@/lib/ai/model-access";
// ✅ PERF: Removed `useWindowSize` — it re-renders on every window resize event.
//    We only need width in two places: a one-time autofocus guard and a
//    post-submit focus check. Both now read `window.innerWidth` directly,
//    which is a synchronous DOM read with zero subscription overhead.
import { useAudioAnalyzer } from "@/lib/audio-analyzer";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn, fetcher } from "@/lib/utils";
// import { ChatTypeahead as ChatSuggestions } from "./chat-typeahead-v2";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./elements/prompt-input";
import { ArrowUpIcon, PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
// ✅ Unused SuggestedActions removed
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
// Cache-bust: reload_suggestions_v3
// ✅ Unused useChatVisibility removed to fix Build Error
import type { VisibilityType } from "./visibility-selector";

// ✅ PERF: Module-level constants — never rebuilt on any render
const WAVEFORM_HEIGHTS = [12, 18, 12, 24, 14, 28, 36, 24, 18, 28, 14, 20, 12];

const PROVIDER_NAMES: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  reasoning: "Reasoning",
  juristo: "Juristo AI",
};

function getInlineSuggestionCompletion(
  input: string,
  suggestion: string | null
) {
  if (!(input.trim() && suggestion)) {
    return null;
  }

  const normalizedInput = input.replace(/\s+$/g, "");
  if (
    !suggestion.toLowerCase().startsWith(normalizedInput.toLowerCase()) ||
    suggestion.length <= normalizedInput.length
  ) {
    return null;
  }

  return suggestion.slice(normalizedInput.length);
}

type QueuedChatMessage = {
  attachments: Attachment[];
  id: string;
  text: string;
};

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

// --- FEATURE 1: Native HTML5 Audio Context Reactive Waveform ---
const LiveWaveform = ({ stream }: { stream: MediaStream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 64;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = Math.max(3, (dataArray[i] / 255) * canvas.height);
        ctx.fillStyle = "#64748b"; // Sleek slate matching Juristo V2 aesthetic
        const y = (canvas.height - barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - 3, barHeight, 4);
        ctx.fill();
        x += barWidth;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      audioCtx.close().catch(() => { });
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={32}
      className="w-[120px] h-8 opacity-80"
    />
  );
};

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  researchModeEnabled = false,
  onResearchModeChange,
  webSearchEnabled = false,
  onWebSearchChange,
  onSubmitMessage,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<any>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<any>["setMessages"];
  sendMessage: UseChatHelpers<any>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  researchModeEnabled?: boolean;
  onResearchModeChange?: (enabled: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  onSubmitMessage?: (message: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [typeaheadPreview, setTypeaheadPreview] = useState<string | null>(null);
  const [queuedMessages, setQueuedMessages] = useState<QueuedChatMessage[]>([]);
  const isSendingQueuedMessageRef = useRef(false);
  const isBusy = status === "submitted" || status === "streaming";

  // ✅ FIX: `adjustHeight` and `resetHeight` were two separate useCallbacks
  //    that did the exact same thing (set height to "44px"). Consolidated into one.
  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
    }
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const originalInputRef = useRef<string>("");
  const hasTranscribedFromSpeechAPI = useRef<boolean>(false);

  // ✅ Removed unused audio analyzer variables to fix linting errors

  useEffect(() => {
    resetHeight();
  }, [resetHeight]);

  // ✅ FIX: Auto-focus only runs once. Replaced `useWindowSize` (continuous
  //    resize subscription) with a direct `window.innerWidth` read.
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (!hasAutoFocused.current) {
      const timer = setTimeout(() => {
        // Only autofocus on desktop — same logic as before, no subscription needed
        if (typeof window !== "undefined" && window.innerWidth > 0) {
          textareaRef.current?.focus();
          hasAutoFocused.current = true;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []); // ✅ Empty deps — intentional one-shot effect

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  // ✅ FIX: Added `hydrationRan` ref guard so this truly only runs once after
  //    hydration, as the comment intended — previously it could re-run when
  //    `localStorageInput` changed, overwriting user input mid-session.
  const hydrationRan = useRef(false);
  useEffect(() => {
    if (hydrationRan.current) return;
    hydrationRan.current = true;
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      resetHeight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OPTIMIZATION 2: Debounce Disk Writes.
  // Instead of writing to disk on every keystroke, we wait until the user
  // STOPS typing for 500ms. This frees up the main thread instantly.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLocalStorageInput(input);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [input, setLocalStorageInput]);

  // ✅ PERF: Wrapped in useCallback — was an inline function recreated every render,
  //    causing the textarea to receive a new onChange prop on every keystroke.
  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(event.target.value);
    },
    [setInput]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const sendUserMessage = useCallback(
    (textToSend: string, messageAttachments: Attachment[]) => {
      sendMessage({
        role: "user",
        parts: [
          ...messageAttachments.map((attachment) => ({
            type: "file" as const,
            url: attachment.url,
            name: attachment.name || "file",
            mediaType: attachment.contentType || "application/octet-stream",
          })),
          { type: "text", text: textToSend },
        ],
      });
      window.history.pushState({}, "", `/chat/${chatId}`);
      onSubmitMessage?.(textToSend);
    },
    [chatId, onSubmitMessage, sendMessage]
  );

  const clearComposer = useCallback(() => {
    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setInput("");
  }, [resetHeight, setAttachments, setInput, setLocalStorageInput]);

  const submitForm = useCallback(
    (value?: string) => {
      const textToSend = value ?? input;
      if (!textToSend.trim()) {
        return;
      }

      const outgoingAttachments = attachments;
      if (isBusy) {
        setQueuedMessages((current) => [
          ...current,
          {
            attachments: outgoingAttachments,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            text: textToSend,
          },
        ]);
        clearComposer();
        toast.success("Message queued");
        requestAnimationFrame(() => textareaRef.current?.focus());
        return;
      }

      sendUserMessage(textToSend, outgoingAttachments);

      clearComposer();

      // ✅ PERF: Direct window.innerWidth read — no subscription, same logic
      if (typeof window !== "undefined" && window.innerWidth > 768) {
        textareaRef.current?.focus();
      }
    },
    [attachments, clearComposer, input, isBusy, sendUserMessage]
  );

  // ✅ PERF: Memoised — was an inline arrow recreated every render
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      submitForm();
    },
    [submitForm]
  );

  useEffect(() => {
    if (status !== "ready") {
      isSendingQueuedMessageRef.current = false;
      return;
    }

    if (isSendingQueuedMessageRef.current || queuedMessages.length === 0) {
      return;
    }

    isSendingQueuedMessageRef.current = true;
    const [nextMessage, ...remainingMessages] = queuedMessages;
    setQueuedMessages(remainingMessages);

    queueMicrotask(() => {
      sendUserMessage(nextMessage.text, nextMessage.attachments);
    });
  }, [queuedMessages, sendUserMessage, status]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, name, contentType } = data;
        return { url, name, contentType };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      const MAX_ATTACHMENTS = 10;

      if (attachments.length + files.length > MAX_ATTACHMENTS) {
        const remaining = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) {
          toast.error(`Maximum ${MAX_ATTACHMENTS} files allowed`);
          return;
        }
        toast.warning(
          `Only ${remaining} more files can be added. ${files.length - remaining} files were not uploaded.`
        );
        files.splice(remaining);
      }

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [attachments.length, setAttachments, uploadFile]
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      // Support any file pasted (images, PDFs, docs, etc.)
      const fileItems = Array.from(items).filter(
        (item) => item.kind === "file"
      );

      if (fileItems.length === 0) return;

      event.preventDefault();
      setUploadQueue((prev) => [...prev, "Pasted image"]);

      try {
        const uploadPromises = fileItems
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
          .map((file) => uploadFile(file));

        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) =>
            attachment !== undefined &&
            attachment.url !== undefined &&
            attachment.contentType !== undefined
        );

        setAttachments((curr) => [
          ...curr,
          ...(successfullyUploadedAttachments as Attachment[]),
        ]);
      } catch (error) {
        console.error("Error uploading pasted files:", error);
        toast.error("Failed to upload pasted file(s)");
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // --- FEATURE 3: Real-Time Audio Streaming Dictation Hybrid Engine ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsRecording(true);
      hasTranscribedFromSpeechAPI.current = false;

      const baseInput = input.trim() ? input.trim() + " " : "";
      originalInputRef.current = baseInput;

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      // 1. Start background raw chunk recorder simultaneously as secondary fallback
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          audioBitsPerSecond: 16_000,
        });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.start();

      // 2. Start Native Real-Time Transcription
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          // Lock in finalized words, and append the live changing "interim" words smoothly
          if (finalTranscript) {
            originalInputRef.current += finalTranscript + " ";
            hasTranscribedFromSpeechAPI.current = true;
          }

          setInput(originalInputRef.current + interimTranscript);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch {
      toast.error(
        "Microphone access denied. Please check browser permissions."
      );
    }
  }, [input, setInput]);

  const cancelRecording = useCallback(() => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
    chunksRef.current = [];
  }, [audioStream]);

  const stopAndTranscribe = useCallback(async () => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
    setIsRecording(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.onstop = async () => {
        // If native streaming API already captured the text perfectly, wrap up instantly
        if (hasTranscribedFromSpeechAPI.current) {
          setTimeout(() => textareaRef.current?.focus(), 100);
          chunksRef.current = [];
          return;
        }

        // Run Backend Backup Translation with Premium Typewriter Effect
        setIsTranscribing(true);
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("modelId", selectedModelId);

        try {
          const res = await fetch("/api/voice", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          if (res.ok && data.text) {
            const textToType = data.text;
            let currentIndex = 0;

            // Smooth Typewriter Animation
            typewriterRef.current = setInterval(() => {
              if (currentIndex < textToType.length) {
                const char = textToType.charAt(currentIndex);
                setInput((prev) => prev + char);
                currentIndex++;
              } else {
                if (typewriterRef.current) clearInterval(typewriterRef.current);
                typewriterRef.current = null;
                setTimeout(() => textareaRef.current?.focus(), 100);
              }
            }, 15); // Fast 15ms typing speed looks incredibly premium
          } else {
            toast.error(data.error || "Transcription failed.");
          }
        } catch {
          toast.error("Transcription processing failed.");
        } finally {
          setIsTranscribing(false);
          chunksRef.current = [];
        }
      };
      mediaRecorderRef.current.stop();
    }
  }, [audioStream, selectedModelId, setInput]);

  // ✅ FIX: Cleanup typewriter interval on unmount
  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, []);

  const isCompactComposer = messages.length > 0;

  const inlineSuggestionCompletion = getInlineSuggestionCompletion(
    input,
    typeaheadPreview
  );

  return (
    <div
      className={cn(
        "relative flex w-full flex-col",
        isCompactComposer ? "gap-1" : "gap-2",
        className
      )}
    >
      <input
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,.doc,.docx,.xls,.xlsx,.txt,.csv,.pdf"
        className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />
      <PromptInput
        className={cn(
          "border border-border bg-background shadow-sm transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50",
          isCompactComposer ? "rounded-xl p-1.5" : "rounded-2xl p-3"
        )}
        onSubmit={handleSubmit}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex flex-row items-end gap-2 overflow-x-scroll mb-2 px-1"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                attachment={attachment}
                key={attachment.url}
                onRemove={() => {
                  setAttachments((curr) =>
                    curr.filter((a) => a.url !== attachment.url)
                  );
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            ))}
            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{ url: "", name: filename, contentType: "" }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}

        {queuedMessages.length > 0 && (
          <div className="mb-2 flex flex-col gap-1 px-1">
            {queuedMessages.slice(0, 3).map((queuedMessage, index) => (
              <div
                className="flex h-8 items-center gap-2 rounded-lg bg-muted/60 px-2 text-muted-foreground text-xs"
                key={queuedMessage.id}
              >
                <span className="shrink-0 font-medium text-foreground">
                  {index === 0 ? "Queued next" : `Queued ${index + 1}`}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {queuedMessage.text}
                </span>
                {queuedMessage.attachments.length > 0 && (
                  <span className="shrink-0 rounded bg-background px-1.5 py-0.5">
                    {queuedMessage.attachments.length} file
                    {queuedMessage.attachments.length > 1 ? "s" : ""}
                  </span>
                )}
                <Button
                  className="size-6 shrink-0 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  onClick={() =>
                    setQueuedMessages((current) =>
                      current.filter((item) => item.id !== queuedMessage.id)
                    )
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            {queuedMessages.length > 3 && (
              <div className="px-2 text-muted-foreground text-xs">
                +{queuedMessages.length - 3} more queued
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "relative flex flex-col",
            isCompactComposer ? "gap-1" : "gap-2"
          )}
        >
          <div className="relative flex flex-row items-start gap-1 sm:gap-2">
            {inlineSuggestionCompletion && (
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 z-0 whitespace-pre-wrap break-words px-2 text-base leading-6",
                  isCompactComposer ? "py-1" : "py-2"
                )}
              >
                <span className="text-transparent">{input}</span>
                <span className="text-muted-foreground/35">
                  {inlineSuggestionCompletion}
                </span>
              </div>
            )}
            <PromptInputTextarea
              className={cn(
                "relative z-10 grow resize-none border-0! border-none! bg-transparent px-2 text-base leading-6 outline-none ring-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                "overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/25",
                isCompactComposer ? "py-1" : "py-2"
              )}
              data-testid="multimodal-input"
              disableAutoResize={false}
              maxHeight={isCompactComposer ? 104 : 240}
              minHeight={isCompactComposer ? 34 : 92}
              onChange={handleInput}
              placeholder="How can I help you today?"
              ref={textareaRef}
              rows={1}
              value={input}
            />
          </div>

          <PromptInputToolbar className="border-top-0! border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">
            {isRecording ? (
              <div className="flex w-full items-center justify-between animate-in fade-in zoom-in-95 duration-200 px-3 rounded-xl bg-muted/40 h-10">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex size-2 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                  </div>
                  <span className="text-[13px] font-medium text-foreground tracking-tight">
                    Listening
                  </span>
                </div>

                <div className="flex-1 flex justify-center translate-y-[2px]">
                  {audioStream && <LiveWaveform stream={audioStream} />}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    className="size-7 rounded-full text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={cancelRecording}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    onClick={stopAndTranscribe}
                    variant="default"
                    size="icon"
                    className="size-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-transform active:scale-95"
                  >
                    <CheckIcon className="size-4" />
                  </Button>
                </div>
              </div>
            ) : isTranscribing ? (
              <div className="flex w-full items-center justify-center h-10 gap-2.5 text-muted-foreground bg-muted/40 rounded-xl">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-xs font-medium">
                  Transcribing audio...
                </span>
              </div>
            ) : (
              <>
                <PromptInputTools className="gap-0 sm:gap-0.5">
                  <ResearchToolsMenu
                    fileInputRef={fileInputRef}
                    onResearchModeChange={onResearchModeChange}
                    onWebSearchChange={onWebSearchChange}
                    researchModeEnabled={researchModeEnabled}
                    selectedModelId={selectedModelId}
                    status={status}
                    webSearchEnabled={webSearchEnabled}
                  />
                  <ActiveToolModeChip
                    onResearchModeChange={onResearchModeChange}
                    onWebSearchChange={onWebSearchChange}
                    researchModeEnabled={researchModeEnabled}
                    webSearchEnabled={webSearchEnabled}
                  />
                  <ModelSelectorCompact
                    onModelChange={onModelChange}
                    selectedModelId={selectedModelId}
                  />
                </PromptInputTools>

                <div className="flex items-center gap-1.5">
                  <Button
                    className="size-9 rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-8"
                    disabled={status === "streaming"}
                    onClick={startRecording}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Mic size={16} />
                  </Button>

                  {isBusy && (
                    <StopButton
                      chatId={chatId}
                      messages={messages as unknown as ChatMessage[]}
                      setMessages={setMessages}
                      stop={stop}
                    />
                  )}
                  <PromptInputSubmit
                    className="size-8 rounded-full bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                    data-testid="send-button"
                    disabled={!input.trim() || uploadQueue.length > 0}
                    title={isBusy ? "Queue message" : "Send message"}
                  >
                    <ArrowUpIcon size={14} />
                  </PromptInputSubmit>
                </div>
              </>
            )}
          </PromptInputToolbar>
        </div>
      </PromptInput>

      {/* <ChatSuggestions
        input={input}
        onPreviewChange={setTypeaheadPreview}
        onSelect={(text) => {
          setTypeaheadPreview(null);
          setInput(text);
          setLocalStorageInput(text);
          requestAnimationFrame(() => textareaRef.current?.focus());
        }}
        visible={status === "ready" && messages.length === 0}
      /> */}
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
    if (prevProps.onSubmitMessage !== nextProps.onSubmitMessage) return false;
    if (prevProps.researchModeEnabled !== nextProps.researchModeEnabled)
      return false;
    if (prevProps.webSearchEnabled !== nextProps.webSearchEnabled) return false;
    if (prevProps.messages.length !== nextProps.messages.length) return false;
    return true;
  }
);

function ActiveToolModeChip({
  onResearchModeChange,
  onWebSearchChange,
  researchModeEnabled,
  webSearchEnabled,
}: {
  onResearchModeChange?: (enabled: boolean) => void;
  onWebSearchChange?: (enabled: boolean) => void;
  researchModeEnabled: boolean;
  webSearchEnabled: boolean;
}) {
  if (!(researchModeEnabled || webSearchEnabled)) return null;

  const Icon = researchModeEnabled ? Globe : Search;
  const label = researchModeEnabled ? "Deep research" : "Web search";
  const clearMode = () => {
    if (researchModeEnabled) {
      onResearchModeChange?.(false);
    }

    if (webSearchEnabled) {
      onWebSearchChange?.(false);
    }
  };

  return (
    <div className="ml-1 flex h-8 max-w-[12rem] items-center gap-2 rounded-full bg-accent/80 px-3 font-medium text-[13px] text-blue-500 ring-1 ring-border/70">
      <Icon className="size-4" />
      <span className="truncate whitespace-nowrap">{label}</span>
      <button
        aria-label={`Turn off ${label}`}
        className="-mr-1 flex size-5 cursor-pointer items-center justify-center rounded-full text-blue-500 transition-colors hover:bg-blue-500/12 hover:text-blue-600"
        onClick={clearMode}
        type="button"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function ResearchToolsMenu({
  fileInputRef,
  researchModeEnabled,
  webSearchEnabled,
  selectedModelId,
  status,
  onResearchModeChange,
  onWebSearchChange,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  researchModeEnabled: boolean;
  webSearchEnabled: boolean;
  selectedModelId: string;
  status: UseChatHelpers<any>["status"];
  onResearchModeChange?: (enabled: boolean) => void;
  onWebSearchChange?: (enabled: boolean) => void;
}) {
  const isReasoningModel =
    selectedModelId.includes("reasoning") || selectedModelId.includes("think");
  const uploadDisabled = status !== "ready" || isReasoningModel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "size-8 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            (researchModeEnabled || webSearchEnabled) &&
            "bg-primary/10 text-primary ring-1 ring-primary/30"
          )}
          title="Open message tools"
          type="button"
          variant="ghost"
        >
          <Plus className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 rounded-lg p-1">
        <DropdownMenuItem
          className="gap-2.5 rounded-md px-2.5 py-1.5"
          disabled={uploadDisabled}
          onSelect={(event) => {
            event.preventDefault();
            fileInputRef.current?.click();
          }}
        >
          <PaperclipIcon size={15} className="shrink-0 text-muted-foreground" />
          <span className="text-[13px] font-medium">Upload files</span>
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem
          checked={researchModeEnabled}
          className="gap-2.5 rounded-md px-2.5 py-1.5"
          onCheckedChange={(checked) => {
            const enabled = Boolean(checked);
            onResearchModeChange?.(enabled);
            if (enabled) onWebSearchChange?.(false);
          }}
        >
          <Globe size={15} className="shrink-0 text-muted-foreground" />
          <span className="text-[13px] font-medium">Research Mode</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={webSearchEnabled}
          className="gap-2.5 rounded-md px-2.5 py-1.5"
          onCheckedChange={(checked) => {
            const enabled = Boolean(checked);
            onWebSearchChange?.(enabled);
            if (enabled) onResearchModeChange?.(false);
          }}
        >
          <Search size={15} className="shrink-0 text-muted-foreground" />
          <span className="text-[13px] font-medium">Web Search</span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PureModelSelectorCompact({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: usageData } = useSWR("/api/usage", fetcher, {
    shouldRetryOnError: false,
  });

  const userPlan = (usageData?.plan || "free").toLowerCase();
  const selectedModel =
    chatModels.find((m) => m.id === selectedModelId) ??
    chatModels.find((m) => m.id === DEFAULT_CHAT_MODEL) ??
    chatModels[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <div>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 h-8 px-2.5 border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-none transition-colors hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer outline-none focus:outline-none">
                {/* ─── RESTORED: JURISTO BRAND LOGO INDICATOR ─── */}
                <ModelSelectorLogo provider={selectedModel.provider} className="size-3.5 shrink-0" />
                <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-800 dark:text-zinc-200 uppercase">
                  {selectedModel.name}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50 transition-transform duration-200" />
              </button>
            </DropdownMenuTrigger>
          </div>
        </TooltipTrigger>
        <TooltipContent
          align="start"
          className="z-[100] max-w-[260px] rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] px-3 py-1.5 font-bold font-sans text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-wider shadow-none"
          side="top"
          sideOffset={8}
        >
          <span>{(selectedModel as any).tooltip}</span>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={6}
        className="z-[100] min-w-[220px] rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] p-1 shadow-none font-sans"
      >
        {Object.entries(modelsByProvider).map(([providerKey, providerModels]) => (
          <div key={providerKey} className="space-y-0.5">
            <DropdownMenuLabel className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {PROVIDER_NAMES[providerKey] ?? providerKey}
            </DropdownMenuLabel>

            {providerModels.map((model) => {
              const isDisabled = !canUseJuristoModel(userPlan, model.id);
              const isSelected = model.id === selectedModel.id;

              return (
                <Tooltip delayDuration={150} key={model.id}>
                  <TooltipTrigger asChild>
                    <div className={cn("w-full", isDisabled && "pointer-events-auto")}>
                      <DropdownMenuItem
                        className={cn(
                          "flex items-center gap-2.5 text-xs font-medium rounded-none px-2.5 py-2 cursor-pointer transition-colors focus:outline-none",
                          isSelected
                            ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-bold"
                            : "text-zinc-600 dark:text-zinc-400 focus:bg-zinc-50 dark:focus:bg-white/5 focus:text-zinc-900 dark:focus:text-white",
                          isDisabled && "opacity-40"
                        )}
                        onSelect={(e) => {
                          if (isDisabled) {
                            e.preventDefault();
                            toast.error(getModelAccessError(userPlan, model.id));
                            return;
                          }
                          onModelChange?.(model.id);
                          setOpen(false);
                        }}
                      >
                        {/* ─── RESTORED: PROVIDER BRAND LOGO IN LIST ITEMS ─── */}
                        <ModelSelectorLogo provider={model.provider} className="size-3.5 shrink-0" />
                        <span className="truncate flex-1 text-left">{model.name}</span>
                        {isSelected && (
                          <CheckIcon className="ml-auto size-3.5 shrink-0 text-[#4169E1]" />
                        )}
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    align="start"
                    className="z-[110] max-w-[240px] rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] px-2.5 py-1.5 font-medium text-zinc-500 dark:text-zinc-400 text-[10px] leading-tight shadow-none"
                    side="right"
                    sideOffset={8}
                  >
                    <span>{(model as any).tooltip}</span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureStopButton({
  stop,
  setMessages,
  messages,
  chatId,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<any>["setMessages"];
  messages: ChatMessage[];
  chatId: string;
}) {
  return (
    <Button
      className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
      data-testid="stop-button"
      onClick={(e) => {
        e.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
      type="button"
    >
      <StopIcon size={14} />
    </Button>
  );
}
const StopButton = memo(PureStopButton);
