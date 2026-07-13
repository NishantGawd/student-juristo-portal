import type {
  AssistantModelMessage,
  ToolModelMessage,
  UIMessage,
  UIMessagePart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { formatISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import type { DBMessage, Document } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    // Guard against non-JSON error responses (e.g. HTML error pages, proxy 502s)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const { code, cause } = await response.json();
        throw new ChatSDKError(code as ErrorCode, cause);
      } catch (e) {
        if (e instanceof ChatSDKError) throw e;
        // JSON parse failed despite content-type header — fall through
      }
    }
    throw new ChatSDKError('offline:chat', `Server returned ${response.status}`);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      // Guard against non-JSON error responses (e.g. HTML error pages, proxy 502s, auth redirects)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const { code, cause } = await response.json();
          throw new ChatSDKError(code as ErrorCode, cause);
        } catch (e) {
          if (e instanceof ChatSDKError) throw e;
          // JSON parse failed despite content-type header — fall through
        }
      }
      throw new ChatSDKError('offline:chat', `Server returned ${response.status}`);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = ToolModelMessage | AssistantModelMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: UIMessage[]) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Document[],
  index: number,
) {
  if (!documents) { return new Date(); }
  if (index > documents.length) { return new Date(); }

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: ResponseMessage[];
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) { return null; }

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => {
    // Vercel AI SDK requires a `content: string` property.
    // If it's missing, some versions will strip the message from history.
    let content = "";
    if (Array.isArray(message.parts)) {
      content = message.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("");
    }

    return {
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      content,
      parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
      metadata: {
        createdAt: formatISO(message.createdAt),
      },
    };
  });
}

export function getTextFromMessage(message: ChatMessage | UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as { type: 'text'; text: string }).text)
    .join('');
}

