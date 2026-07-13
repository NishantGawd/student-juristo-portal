import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

export interface ToolRenderContext {
  chatId: string;
  messageId: string;
  isReadonly: boolean;
  isLoading: boolean;
  isStopped?: boolean;
  status?: string;
  sendMessage?: UseChatHelpers<ChatMessage>["sendMessage"];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  deleteTrailingMessages?: (payload: { id: string }) => Promise<void>;
  regenerate?: UseChatHelpers<ChatMessage>["regenerate"];
  setMessages?: UseChatHelpers<ChatMessage>["setMessages"];
}

export interface ToolPartProps {
  part: any;
  toolCallId: string;
  toolName: string;
  state: string;
  input: any;
  output: any;
  context: ToolRenderContext;
}
