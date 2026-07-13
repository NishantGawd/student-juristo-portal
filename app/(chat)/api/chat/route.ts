import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { auth, type UserType } from "@/app/(auth)/auth";
import { generateTitleFromUserMessage } from "@/app/(chat)/chat-actions";
import {
  createTextPreview,
  extractKeywordsFromText,
  extractTextFromParts,
} from "@/lib/activity/keywords";
import { trackUserActivity } from "@/lib/activity/tracking";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  classifyLegalAction,
  classifyLegalQuery,
} from "@/lib/ai/legal-response-profile";
import {
  canUseJuristoModel,
  getModelAccessError,
  getUsageDiffForJuristoModel,
} from "@/lib/ai/model-access";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getFallbackModels, getLanguageModel } from "@/lib/ai/providers";
import { askContractDetails } from "@/lib/ai/tools/ask-contract-details";
import { createDocument } from "@/lib/ai/tools/create-document";
import { createResearchReport } from "@/lib/ai/tools/create-research-report";
import { draftContract } from "@/lib/ai/tools/draft-contract";
import { findLawyer } from "@/lib/ai/tools/find-lawyer";
import { getWeather } from "@/lib/ai/tools/get-weather";
import {
  addMemoryTool,
  deleteMemoryTool,
  searchMemoryTool,
} from "@/lib/ai/tools/memory";
import { offerNextSteps } from "@/lib/ai/tools/offer-next-steps";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { runLegalResearch } from "@/lib/ai/tools/run-legal-research";
import { searchContractTemplates } from "@/lib/ai/tools/search-templates";
import { showPrecedents } from "@/lib/ai/tools/show-precedents";
import { suggestQuizCreation } from "@/lib/ai/tools/suggest-quiz";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { createWebSearchTool } from "@/lib/ai/tools/web-search";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getUserUsage,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
  updateUserUsage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { getMemories, searchMemories } from "@/lib/mem0/client";
import type { ChatMessage } from "@/lib/types";
import { isWithinLimit } from "@/lib/usage/plan-limits";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 300;

// NOTE: avoid fragile top-level imports for optional libs (geolocation, resumable-stream, next/server.after).
// We'll dynamically import these where needed and fall back gracefully.

type S3ObjectLocation = {
  bucket: string;
  key: string;
  region?: string;
};

function parseS3ObjectLocation(urlStr: string): S3ObjectLocation | null {
  try {
    const url = new URL(urlStr);
    const hostnameParts = url.hostname.split(".");
    const rawPath = url.pathname.startsWith("/")
      ? url.pathname.slice(1)
      : url.pathname;

    if (!rawPath) return null;

    const s3Index = hostnameParts.indexOf("s3");

    if (s3Index > 0 && url.hostname.includes("amazonaws.com")) {
      return {
        bucket: hostnameParts.slice(0, s3Index).join("."),
        key: decodeURIComponent(rawPath),
        region: hostnameParts[s3Index + 1],
      };
    }

    if (hostnameParts[0] === "s3" && url.hostname.includes("amazonaws.com")) {
      const [bucket, ...keyParts] = rawPath.split("/");
      if (!bucket || keyParts.length === 0) return null;
      return {
        bucket,
        key: decodeURIComponent(keyParts.join("/")),
        region: hostnameParts[1],
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function downloadAttachmentArrayBuffer(urlStr: string) {
  const s3Location = parseS3ObjectLocation(urlStr);

  if (s3Location) {
    try {
      const s3Client = new S3Client({
        region: s3Location.region || process.env.AWS_REGION || "eu-north-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        },
      });

      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: s3Location.bucket,
          Key: s3Location.key,
        })
      );

      if (response.Body) {
        const byteArray = await response.Body.transformToByteArray();
        return byteArray.buffer.slice(
          byteArray.byteOffset,
          byteArray.byteOffset + byteArray.byteLength
        ) as ArrayBuffer;
      }
    } catch (error) {
      console.error("[CHAT DEBUG] S3 attachment download error:", {
        bucket: s3Location.bucket,
        key: s3Location.key,
        region: s3Location.region || process.env.AWS_REGION || "eu-north-1",
        error,
      });
    }
  }

  try {
    const response = await fetch(urlStr);
    if (response.ok) {
      return await response.arrayBuffer();
    }
    console.error("[CHAT DEBUG] Attachment fetch failed:", {
      url: urlStr,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    console.error("[CHAT DEBUG] Attachment fetch error:", error);
  }

  return null;
}

type ResumableStreamContext = {
  resumableStream: (
    streamId: string,
    getStream: () => ReadableStream
  ) => Promise<ReadableStream | null>;
};

const globalStreamContext: ResumableStreamContext | null = null;
const streamContextInitialized = false;

/** Try to obtain a 'waitUntil' function (Next's `after`), else provide a no-op fallback. */
async function getWaitUntilFallback() {
  try {
    const ns = await import("next/server");
    if (typeof (ns as any).after === "function") {
      return (ns as any).after;
    }
  } catch {
    /* ignore */
  }
  // fallback: a no-op that accepts a promise and doesn't error
  return (p: Promise<any>) => {
    // Intentionally don't throw — just run it
    void p.catch(() => {});
  };
}

/** Try to call geolocation(request) if the module exists, else return empty geo. */
async function getRequestGeolocation(request: Request) {
  try {
    const vf = await import("@vercel/functions");
    if (typeof vf.geolocation === "function") {
      return vf.geolocation(request);
    }
  } catch {
    // ignore
  }

  // Fallbacks: try common headers (Vercel may set geo headers) or empty
  const headers = Object.fromEntries(request.headers.entries());
  return {
    longitude: undefined,
    latitude: undefined,
    city: headers["x-vercel-ip-city"] || undefined,
    country: headers["x-vercel-ip-country"] || undefined,
  };
}

/** Initialize resumable stream context only once, guarded to avoid build failures if library is missing */
export async function getStreamContext(): Promise<ResumableStreamContext | null> {
  // TEMPORARILY DISABLED: Redis causes socket errors that crash the AI stream
  // To re-enable: set ENABLE_REDIS_STREAM=true and provide a valid REDIS_URL
  console.log("[REDIS] Resumable streams disabled - using standard streaming");
  return null;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log(
      "[CHAT DEBUG] Received request body:",
      JSON.stringify(json, null, 2)
    );
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    console.error("[CHAT DEBUG] Schema validation failed:", error);
    if (error instanceof Error) {
      console.error("[CHAT DEBUG] Error message:", error.message);
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      selectedChatModel,
      selectedVisibilityType,
      context,
      researchMode,
      webSearchEnabled,
    } = requestBody;

    const session = await auth();

    if (!session?.user)
      return new ChatSDKError("unauthorized:chat").toResponse();

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const user = await getUserUsage(session.user.id);
    if (user) {
      const tokensUsedCount = Number(user.tokensUsed || 0);
      if (!isWithinLimit(user.plan, "tokens", tokensUsedCount)) {
        return Response.json(
          {
            cause:
              "LIMIT_REACHED:AI credit limit reached. Please upgrade to continue using Juristo.",
            code: "forbidden:chat",
            error: "LIMIT_REACHED",
            limitType: "tokens",
            message: "AI credit limit reached. Please upgrade to continue using Juristo.",
          },
          { status: 403 }
        );
      }

      // Check chat limit
      const chatCount = Number(user.chatCount || 0);
      const isChatsWithinLimit = isWithinLimit(user.plan, "chats", chatCount);
      if (!isChatsWithinLimit) {
        return Response.json(
          {
            cause:
              "LIMIT_REACHED:Limit reached. Please upgrade to continue using Juristo.",
            code: "forbidden:chat",
            error: "LIMIT_REACHED",
            limitType: "chats",
            message: "Limit reached please upgrade to continue using service.",
          },
          { status: 403 }
        );
      }

      const plan = user.plan?.toLowerCase() || "free";
      const isAutoModel =
        selectedChatModel === "auto" || selectedChatModel === "juristo/auto";
      if (!isAutoModel && !canUseJuristoModel(plan, selectedChatModel)) {
        return Response.json(
          {
            cause:
              "PREMIUM_MODEL:This Juristo model requires a higher plan.",
            code: "forbidden:chat",
            error: "PREMIUM_MODEL",
            message: getModelAccessError(plan, selectedChatModel),
          },
          { status: 403 }
        );
      }
    }

    const isRequestedToolDisabledModel =
      selectedChatModel.includes("reasoning") ||
      selectedChatModel.includes("thinking") ||
      selectedChatModel.includes(":free");

    if (researchMode && isRequestedToolDisabledModel) {
      return Response.json(
        {
          cause:
            "RESEARCH_MODE:Research Mode needs live research tools. Please switch to Juristo Mini, Macro, or Max.",
          code: "bad_request:chat",
          error: "RESEARCH_MODE_UNSUPPORTED_MODEL",
          message:
            "Research Mode needs live research tools. Please switch to Juristo Mini, Macro, or Max.",
        },
        { status: 400 }
      );
    }

    if (webSearchEnabled && isRequestedToolDisabledModel) {
      return Response.json(
        {
          cause:
            "WEB_SEARCH:Web Search needs live tools. Please switch to Juristo Mini, Macro, or Max.",
          code: "bad_request:chat",
          error: "WEB_SEARCH_UNSUPPORTED_MODEL",
          message:
            "Web Search needs live tools. Please switch to Juristo Mini, Macro, or Max.",
        },
        { status: 400 }
      );
    }

    const isToolApprovalFlow = Boolean(messages);

    // ROBUST FALLBACK: If explicit 'message' object is missing (sometimes stripped by Zod/SDK version mismatch),
    // grab the latest user message from the 'messages' array for initialization logic.
    let latestUserMsg = message;
    if (!latestUserMsg && messages && messages.length > 0) {
      const candidates = [...messages]
        .reverse()
        .filter((m) => m.role === "user");
      if (candidates.length > 0) {
        latestUserMsg = candidates[0] as any;
      }
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      if (!isToolApprovalFlow) {
        messagesFromDb = await getMessagesByChatId({ id });
      }
    } else if (latestUserMsg?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });
      await trackUserActivity({
        userId: session.user.id,
        chatId: id,
        eventType: "chat_created",
        sourceTable: "Chat",
        sourceId: id,
        userPlan: user?.plan || "free",
        model: selectedChatModel,
        textPreview: "New chat created",
        metadata: {
          visibility: selectedVisibilityType,
        },
      });
      titlePromise = generateTitleFromUserMessage({
        message: latestUserMsg as any,
      });
    }

    const uiMessages = isToolApprovalFlow
      ? (messages as ChatMessage[])
      : [...convertToUIMessages(messagesFromDb), latestUserMsg as ChatMessage];

    // Safe geolocation retrieval
    const geo = await getRequestGeolocation(request);
    const { longitude, latitude, city, country } = geo;

    const requestHints: RequestHints = { longitude, latitude, city, country };

    if (latestUserMsg?.role === "user") {
      // NEW: Check if message already exists to prevent crashes during 'Regenerate'
      const existingMessage = await getMessageById({ id: latestUserMsg.id });

      if (!existingMessage || existingMessage.length === 0) {
        // Handle potentially stringified parts or simple text schemas sent by messages array
        let rawParts = latestUserMsg.parts || [];
        // If the message has no parts but has content (fallback)
        if (rawParts.length === 0 && (latestUserMsg as any).content) {
          rawParts = [{ type: "text", text: (latestUserMsg as any).content }];
        }

        const attachments = rawParts
          .filter((part: any) => part.type === "file" || part.type === "image")
          .map((part: any) => ({
            url: (part as any).url || (part as any).image,
            name: (part as any).name || "file",
            mediaType: ((part as any).mediaType ||
              (part as any).mimeType ||
              "application/octet-stream") as string,
          }));

        const cleanedParts = rawParts.map((p: any) => {
          if (p.type === "image") {
            return {
              type: p.type,
              image: p.image || p.url,
              mimeType: p.mediaType || p.mimeType || "image/jpeg",
              mediaType: p.mediaType || p.mimeType || "image/jpeg",
            };
          }
          if (p.type === "file") {
            return {
              type: p.type,
              url: p.url,
              mimeType: p.mediaType || p.mimeType || "application/octet-stream",
              name: p.name || "file",
            };
          }
          return p;
        });

        await saveMessages({
          messages: [
            {
              chatId: id,
              id: latestUserMsg.id,
              role: "user",
              parts: cleanedParts,
              attachments,
              createdAt: new Date(),
            },
          ],
        });

        const userText = extractTextFromParts(cleanedParts);
        const keywords = extractKeywordsFromText(userText);
        const legalResponseProfile = classifyLegalQuery({
          text: userText,
          hasAttachments: attachments.length > 0,
          userPlan: user?.plan,
        });
        const legalActionProfile = classifyLegalAction({
          text: userText,
          hasAttachments: attachments.length > 0,
          responseProfile: legalResponseProfile,
        });

        await trackUserActivity({
          userId: session.user.id,
          chatId: id,
          messageId: latestUserMsg.id,
          eventType: "chat_message",
          sourceTable: "Message_v2",
          sourceId: latestUserMsg.id,
          userPlan: user?.plan || "free",
          model: selectedChatModel,
          textPreview: createTextPreview(userText),
          keywords,
          metadata: {
            attachmentCount: attachments.length,
            textLength: userText.length,
            selectedVisibilityType,
            researchMode,
            webSearchEnabled,
            legalResponseProfile,
            legalActionProfile,
          },
        });

        // Track analysis usage if message has attachments
        if (attachments.length > 0) {
          console.log(
            "[CHAT DEBUG] Message has attachments, tracking analysis usage"
          );
          await updateUserUsage({
            id: session.user.id,
            analysisDiff: 1,
          });
        }
      }
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        console.log("[CHAT DEBUG] Starting stream execution");
        console.log("[CHAT DEBUG] Model:", selectedChatModel);
        console.log("[CHAT DEBUG] Messages count:", uiMessages.length);

        const titleUpdatePromise = titlePromise
          ? titlePromise
              .then(async (title) => {
                await updateChatTitleById({ chatId: id, title });
                dataStream.write({ type: "data-chat-title", data: title });
              })
              .catch((err) => console.error("Title generation failed", err))
          : Promise.resolve();

        try {
          const isReasoningModel =
            selectedChatModel.includes("reasoning") ||
            selectedChatModel.includes("thinking");

          const isFreeModel = selectedChatModel.includes(":free");
          const shouldDisableTools = isReasoningModel || isFreeModel;

          console.log("[CHAT DEBUG] Getting language model...");

          const hasLegalAttachments = uiMessages.some((m: any) =>
            m.parts?.some((p: any) => p.type === "file" || p.type === "image")
          );
          const latestUserText =
            [...uiMessages]
              .reverse()
              .find((m) => m.role === "user")
              ?.parts?.filter((p: any) => p.type === "text")
              .map((p: any) => p.text)
              .join(" ") || "";
          const legalResponseProfile = classifyLegalQuery({
            text: latestUserText,
            hasAttachments: hasLegalAttachments,
            userPlan: user?.plan,
          });
          const legalActionProfile = classifyLegalAction({
            text: latestUserText,
            hasAttachments: hasLegalAttachments,
            responseProfile: legalResponseProfile,
          });
          const effectiveWebSearchEnabled =
            webSearchEnabled || legalResponseProfile.needsWebSearch;

          let computedModelId = selectedChatModel;
          if (
            computedModelId === "auto" ||
            computedModelId === "juristo/auto"
          ) {
            if (researchMode) {
              computedModelId = "google/gemini-3-pro-preview";
              console.log(
                "[CHAT LOGIC] Auto-routed to Juristo Macro (Research Mode)"
              );
            } else {
              // Basic heuristic: check for attachments or long context payload
              const hasAttachments = uiMessages.some((m: any) =>
                m.parts?.some(
                  (p: any) => p.type === "file" || p.type === "image"
                )
              );
              // Approximate character length of user messages
              const userTextLen = uiMessages
                .filter((m) => m.role === "user")
                .reduce(
                  (acc, m: any) =>
                    acc + JSON.stringify(m.parts || m.content).length,
                  0
                );

              if (hasAttachments || userTextLen > 3000) {
                computedModelId = "google/gemini-3-pro-preview"; // Macro
                console.log(
                  "[CHAT LOGIC] Auto-routed to Juristo Macro (Complex context)"
                );
              } else {
                computedModelId = "google/gemini-2.0-flash"; // Maps → gemini-3.1-flash-lite-preview via providers.ts
                console.log(
                  "[CHAT LOGIC] Auto-routed to Juristo Standard (Simple query)"
                );
              }
            }
          }

          if (
            !researchMode &&
            (selectedChatModel === "auto" ||
              selectedChatModel === "juristo/auto")
          ) {
            computedModelId = legalResponseProfile.suggestedModelId;
            console.log(
              "[CHAT LOGIC] Auto-routed by legal response profile:",
              legalResponseProfile
          );
        }

          if (user && !canUseJuristoModel(user.plan, computedModelId)) {
            throw new ChatSDKError(
              "forbidden:chat",
              getModelAccessError(user.plan, computedModelId)
            );
          }

          const model = getLanguageModel(computedModelId);
          console.log("[CHAT DEBUG] Model obtained");

          // Normalize mimeType on all parts before converting to model messages
          // The AI SDK's convertToModelMessages reads `mimeType`, but Zod may have
          // stripped it (only preserving `mediaType`). Without this, images get
          // sent as application/octet-stream which Gemini rejects.
          for (const uiMsg of uiMessages) {
            if (Array.isArray(uiMsg.parts)) {
              for (const part of uiMsg.parts) {
                const p = part as any;
                if (p.type === "image" || p.type === "file") {
                  const defaultMime =
                    p.type === "image"
                      ? "image/jpeg"
                      : "application/octet-stream";
                  const mt = p.mimeType || p.mediaType || defaultMime;
                  p.mimeType = mt;
                  p.mediaType = mt;
                }
              }
            }
          }

          const modelMessages = await convertToModelMessages(uiMessages);
          console.log("[CHAT DEBUG] Converted messages:", modelMessages.length);

          // Workaround for Vercel AI Gateway error: 'Cannot fetch content from the provided URL'
          for (let mIndex = 0; mIndex < modelMessages.length; mIndex++) {
            const msg = modelMessages[mIndex];
            if (Array.isArray(msg.content)) {
              for (let i = 0; i < msg.content.length; i++) {
                const part = msg.content[i];
                if (part.type === "file" || part.type === "image") {
                  try {
                    // Extract URL string from the part
                    let urlStr: string | null = null;
                    if (
                      typeof (part as any).data === "string" &&
                      (part as any).data.startsWith("http")
                    ) {
                      urlStr = (part as any).data;
                    } else if ((part as any).data instanceof URL) {
                      urlStr = (part as any).data.href;
                    } else if (
                      typeof (part as any).image === "string" &&
                      (part as any).image.startsWith("http")
                    ) {
                      urlStr = (part as any).image;
                    } else if ((part as any).image instanceof URL) {
                      urlStr = (part as any).image.href;
                    }

                    if (!urlStr) continue;

                    const defaultMime =
                      part.type === "image"
                        ? "image/jpeg"
                        : "application/octet-stream";
                    const partMediaType: string =
                      (part as any).mimeType ||
                      (part as any).mediaType ||
                      defaultMime;
                    console.log(
                      `[CHAT DEBUG] Downloading attachment (${partMediaType}) from:`,
                      urlStr
                    );

                    const arrayBuffer =
                      await downloadAttachmentArrayBuffer(urlStr);

                    if (arrayBuffer) {
                      // ── MIME TYPE ROUTING ─────────────────────────────────────
                      // Gemini/Vertex only supports: images, application/pdf
                      // DOCX, XLSX, TXT, CSV must be extracted to text first.

                      if (partMediaType === "application/pdf") {
                        const { extractTextFromPdf } = await import(
                          "@/lib/pdf"
                        );
                        let text = "";
                        try {
                          text = await extractTextFromPdf(
                            Buffer.from(arrayBuffer)
                          );
                        } catch (e) {
                          console.error(
                            "[CHAT DEBUG] pdf-parse failed, falling back to base64 encoding",
                            e
                          );
                        }

                        if (text && text.trim().length > 50) {
                          msg.content[i] = {
                            type: "text",
                            text: `[Extracted content of PDF attachment]:\n\n${text}`,
                          } as any;
                        } else {
                          // Scanned PDF — pass as native file for OCR
                          const base64String =
                            Buffer.from(arrayBuffer).toString("base64");
                          const dataUrl = `data:${partMediaType};base64,${base64String}`;
                          msg.content[i] = {
                            type: "file",
                            data: dataUrl,
                            mimeType: partMediaType,
                            mediaType: partMediaType,
                          } as any;
                        }
                      } else if (
                        partMediaType ===
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                        partMediaType === "application/msword"
                      ) {
                        // DOCX/DOC → extract text via mammoth
                        try {
                          const mammoth = await import("mammoth");
                          const result = await mammoth.extractRawText({
                            buffer: Buffer.from(arrayBuffer),
                          });
                          const text = result.value?.trim() || "";
                          msg.content[i] = {
                            type: "text",
                            text: text
                              ? `[Extracted content of Word document]:\n\n${text}`
                              : "[Word document attached — no readable text could be extracted]",
                          } as any;
                        } catch (e) {
                          console.error(
                            "[CHAT DEBUG] mammoth DOCX extraction failed:",
                            e
                          );
                          msg.content[i] = {
                            type: "text",
                            text: "[Word document attached — text extraction failed]",
                          } as any;
                        }
                      } else if (
                        partMediaType ===
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                        partMediaType === "application/vnd.ms-excel"
                      ) {
                        // XLSX/XLS → decode as UTF-8 text (best-effort; real parse needs `xlsx` pkg)
                        try {
                          const text = Buffer.from(arrayBuffer)
                            .toString("utf-8")
                            .replace(/[^\x20-\x7E\n\r\t]/g, " ")
                            .trim();
                          msg.content[i] = {
                            type: "text",
                            text: text
                              ? `[Extracted content of Excel spreadsheet]:\n\n${text.slice(0, 8000)}`
                              : "[Excel spreadsheet attached — no readable text could be extracted]",
                          } as any;
                        } catch (e) {
                          msg.content[i] = {
                            type: "text",
                            text: "[Excel file attached — text extraction failed]",
                          } as any;
                        }
                      } else if (
                        partMediaType === "text/plain" ||
                        partMediaType === "text/csv" ||
                        partMediaType?.startsWith("text/")
                      ) {
                        // Plain text / CSV — just decode UTF-8
                        const text = Buffer.from(arrayBuffer)
                          .toString("utf-8")
                          .slice(0, 20_000);
                        const label =
                          partMediaType === "text/csv" ? "CSV" : "text";
                        msg.content[i] = {
                          type: "text",
                          text: `[Attached ${label} file content]:\n\n${text}`,
                        } as any;
                      } else if (
                        part.type === "image" ||
                        partMediaType?.startsWith("image/")
                      ) {
                        // Native image (JPEG, PNG, GIF, WebP) — pass as image part
                        const base64String =
                          Buffer.from(arrayBuffer).toString("base64");
                        const dataUrl = `data:${partMediaType};base64,${base64String}`;
                        msg.content[i] = {
                          type: "image",
                          image: dataUrl,
                          mimeType: partMediaType,
                          mediaType: partMediaType,
                        } as any;
                      } else {
                        // Unknown type — pass as file (model will reject if unsupported)
                        const base64String =
                          Buffer.from(arrayBuffer).toString("base64");
                        const dataUrl = `data:${partMediaType};base64,${base64String}`;
                        msg.content[i] = {
                          type: "file",
                          data: dataUrl,
                          mimeType: partMediaType,
                          mediaType: partMediaType,
                        } as any;
                      }
                      console.log(
                        `[CHAT DEBUG] Successfully processed attachment as ${partMediaType}`
                      );
                    } else {
                      console.error(
                        "[CHAT DEBUG] Failed to retrieve valid ArrayBuffer for attachment."
                      );
                      msg.content[i] = {
                        type: "text",
                        text: `[System Error: Failed to retrieve attachment from ${urlStr}]`,
                      } as any;
                    }
                  } catch (err) {
                    console.error(
                      "[CHAT DEBUG] Error processing attachment:",
                      err
                    );
                    msg.content[i] = {
                      type: "text",
                      text: "[System Error: Attachment processing crashed]",
                    } as any;
                  }
                }
              }
            }
          }

          const validModelMessages = modelMessages.map((msg) => {
            if (msg.role === "system") {
              return {
                role: "system",
                content:
                  typeof msg.content === "string"
                    ? msg.content
                    : JSON.stringify(msg.content),
              };
            }

            if (Array.isArray(msg.content)) {
              // Strip reasoning/thought parts from history to prevent "Corrupted thought signature"
              // API Gateway crashes, and ensure text is never undefined.
              let cleanedContent = msg.content
                .filter(
                  (part: any) =>
                    part.type !== "reasoning" && part.type !== "thought"
                )
                .map((part: any) => {
                  // Prevent "expected string, received undefined" text errors
                  if (part.type === "text" && typeof part.text !== "string") {
                    part.text = String(part.text || " ");
                  }
                  if (
                    part.type === "tool-result" &&
                    part.result === undefined
                  ) {
                    part.result =
                      part.output !== undefined
                        ? part.output
                        : "Execution interrupted.";
                  }
                  if (part.type === "tool-call" && part.args === undefined) {
                    part.args = {};
                  }

                  // Format historical database strings into Data URLs
                  if (
                    part.type === "file" &&
                    typeof part.data === "string" &&
                    !part.data.startsWith("http") &&
                    !part.data.startsWith("data:")
                  ) {
                    part.data = `data:${part.mimeType || "application/octet-stream"};base64,${part.data}`;
                  }
                  if (
                    part.type === "image" &&
                    typeof part.image === "string" &&
                    !part.image.startsWith("http") &&
                    !part.image.startsWith("data:")
                  ) {
                    part.image = `data:${part.mimeType || "image/jpeg"};base64,${part.image}`;
                  }

                  // Guarantee mimeType exists to satisfy both old and new SDK expectations
                  if (part.type === "file" || part.type === "image") {
                    const defaultMime =
                      part.type === "image"
                        ? "image/jpeg"
                        : "application/octet-stream";
                    const mt = part.mimeType || part.mediaType || defaultMime;
                    part.mimeType = mt;
                    part.mediaType = mt;
                  }
                  return part;
                });

              // Prevent Vertex/Google "must include at least one parts field" crash
              if (cleanedContent.length === 0) {
                cleanedContent = [{ type: "text", text: " " }];
              }

              return { ...msg, content: cleanedContent };
            }

            return msg;
          }) as any[];

          // ─── Inject Mem0 Memory Context ─────────────────────────────────
          let memoryContext = "";
          try {
            console.log(
              "[CHAT MEMORY] Searching contextual memories for user:",
              session.user.id
            );
            // Get the latest user message text for memory search
            const lastUserText =
              [...uiMessages]
                .reverse()
                .find((m) => m.role === "user")
                ?.parts?.filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join(" ") || "";

            console.log(
              "[CHAT MEMORY] Extracted user query for memory lookup:",
              !!lastUserText
            );

            if (lastUserText && session.user.id) {
              let memories = await searchMemories(
                session.user.id,
                lastUserText,
                5
              );
              console.log(
                `[CHAT MEMORY] Found ${memories.length} relevant memories from search`
              );

              // Score-based filtering: only keep semantically relevant memories
              if (memories.length > 0) {
                const preFilterCount = memories.length;
                memories = memories.filter((m: any) => (m.score ?? 1) >= 0.3);
                console.log(
                  `[CHAT MEMORY] After score filtering (>=0.3): ${memories.length}/${preFilterCount}`
                );
              }

              // Fallback: If vector search fails on vague queries like "who am I?", just grab recent memories
              if (memories.length === 0) {
                console.log(
                  "[CHAT MEMORY] Vector search returned 0. Falling back to getMemories..."
                );
                const allMemories = await getMemories(session.user.id);
                // take the 5 most recent if we have any
                memories = allMemories.slice(0, 5) as any[];
                console.log(
                  `[CHAT MEMORY] Fallback retrieved ${memories.length} total memories`
                );
              }

              if (memories.length > 0) {
                memoryContext = `\n\n═══ USER MEMORY CONTEXT ═══\nThe following are strict facts you know about the user from past conversations:\n${memories.map((m: any, i: number) => `${i + 1}. [Memorized on ${new Date(m.created_at).toLocaleDateString()}]: ${m.memory}`).join("\n")}\n\nCRITICAL INSTRUCTION: ACT ON THESE MEMORIES. If the user asks "who am I" or anything about themselves, answer confidently using the Memory Context above instead of denying knowledge.\n═══════════════════════════\n`;
              }
            }
          } catch (memErr) {
            console.error("[CHAT MEMORY] Search failed (non-fatal):", memErr);
          }

          const queuedWebSearch = createWebSearchTool();

          console.log("[CHAT DEBUG] Calling streamText...");
          const result = streamText({
            model,
            system:
              systemPrompt({
                selectedChatModel: computedModelId,
                requestHints,
                context,
                researchMode,
                webSearchEnabled: effectiveWebSearchEnabled,
                legalPromptMode: legalResponseProfile.promptMode,
                signatureAnswerMode: shouldDisableTools
                  ? "none"
                  : legalActionProfile.signatureAnswerMode,
                legalActionProfile,
              }) + memoryContext,
            messages: validModelMessages,
            // Keep enough budget for multi-source legal searches plus the final
            // synthesis step. A hard cap of 5 can stop immediately after the
            // fifth tool call, leaving the user with only tool UI and no answer.
            stopWhen: stepCountIs(researchMode ? 14 : 10),
            experimental_activeTools: shouldDisableTools
              ? []
              : researchMode
                ? [
                    "runLegalResearch",
                    "createResearchReport",
                    "findLawyer",
                    "searchMemory",
                    "addMemory",
                    "deleteMemory",
                  ]
                : [
                    "getWeather",
                    "createDocument",
                    "createResearchReport",
                    "runLegalResearch",
                    "updateDocument",
                    "askContractDetails",
                    "requestSuggestions",
                    "draftContract",
                    "findLawyer",
                    "searchContractTemplates",
                    "offerNextSteps",
                    "webSearch",
                    "searchMemory",
                    "addMemory",
                    "deleteMemory",
                    "showPrecedents",
                    "suggestQuizCreation",
                  ],
            experimental_transform: undefined,
            providerOptions: {
              ...(isReasoningModel
                ? {
                    anthropic: {
                      thinking: { type: "enabled", budgetTokens: 10_000 },
                    },
                  }
                : {}),
              gateway: {
                models: getFallbackModels(computedModelId),
              },
            },
            tools: shouldDisableTools
              ? undefined
              : {
                  getWeather,
                  createDocument: createDocument({ session, dataStream }),
                  createResearchReport: createResearchReport({
                    session,
                    dataStream,
                  }),
                  runLegalResearch: runLegalResearch({
                    chatId: id,
                    session,
                    dataStream,
                  }),
                  updateDocument: updateDocument({ session, dataStream }),
                  askContractDetails: askContractDetails(),
                  requestSuggestions: requestSuggestions({
                    session,
                    dataStream,
                  }),
                  draftContract: draftContract({ session, dataStream }),
                  findLawyer: findLawyer(),
                  searchContractTemplates: searchContractTemplates(),
                  offerNextSteps: offerNextSteps(),
                  webSearch: queuedWebSearch,
                  searchMemory: searchMemoryTool(session.user.id),
                  addMemory: addMemoryTool(session.user.id),
                  deleteMemory: deleteMemoryTool(session.user.id),
                  showPrecedents: showPrecedents(),
                  suggestQuizCreation: suggestQuizCreation(),
                },
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: "stream-text",
            },
          });

          console.log("[CHAT DEBUG] Merging to dataStream...");
          await Promise.all([
            titleUpdatePromise,
            dataStream.merge(result.toUIMessageStream({ sendReasoning: true })),
          ]);

          Promise.resolve(result.usage)
            .then(async (usage) => {
              console.log(
                "[CHAT DEBUG] Stream finished! Usage from SDK:",
                usage
              );

              let tokenCount = usage?.totalTokens || 0;

              const finalModelId = computedModelId || selectedChatModel;
              const usageArgs = (count: number) => ({
                id: session.user.id,
                ...getUsageDiffForJuristoModel(finalModelId, count),
              });

              // If SDK provides token count, use it directly
              if (tokenCount > 0) {
                console.log("[CHAT DEBUG] Using SDK token count:", tokenCount);
                await updateUserUsage(usageArgs(tokenCount));
                return;
              }

              // Try to get response ID and fetch from gateway. Gateway
              // accounting is best-effort only; it must never affect the
              // already-finished user stream.
              try {
                const response = await result.response;
                const generationId = response?.id;

                if (generationId) {
                  console.log(
                    "[CHAT DEBUG] Fetching from gateway, generation ID:",
                    generationId
                  );
                  const mod: any = await import("@/lib/ai/gateway-usage");
                  const gatewayUsage =
                    await mod.getGenerationUsage(generationId);

                  if (gatewayUsage && gatewayUsage.totalTokens > 0) {
                    console.log(
                      "[CHAT DEBUG] Gateway tokens:",
                      gatewayUsage.totalTokens
                    );
                    await updateUserUsage(usageArgs(gatewayUsage.totalTokens));
                    return;
                  }
                }
              } catch (gatewayErr) {
                console.warn(
                  "[CHAT DEBUG] Gateway fetch failed, using estimation:",
                  gatewayErr
                );
              }

              // Fallback: estimate based on text length (~4 chars per token)
              const inputText = uiMessages
                .map((m) => {
                  if (m.parts) {
                    return m.parts
                      .map((p) => {
                        if (typeof p === "string") return p;
                        if ("text" in p) return (p as { text: string }).text;
                        return JSON.stringify(p);
                      })
                      .join(" ");
                  }
                  return "";
                })
                .join(" ");
              const inputTokens = Math.ceil(inputText.length / 4);

              Promise.resolve(result.text)
                .then(async (outputText) => {
                  const outputTokens = Math.ceil((outputText?.length || 0) / 4);
                  tokenCount = inputTokens + outputTokens;
                  console.log("[CHAT DEBUG] Estimated tokens:", {
                    inputTokens,
                    outputTokens,
                    total: tokenCount,
                  });

                  if (tokenCount > 0) {
                    try {
                      await updateUserUsage(usageArgs(tokenCount));
                    } catch (usageUpdateErr) {
                      console.warn(
                        "[CHAT DEBUG] Estimated usage update failed:",
                        usageUpdateErr
                      );
                    }
                  }
                })
                .catch((estimateErr) => {
                  console.warn(
                    "[CHAT DEBUG] Output estimation failed, charging input estimate only:",
                    estimateErr
                  );
                  if (inputTokens > 0) {
                    updateUserUsage(usageArgs(inputTokens)).catch(
                      (usageUpdateErr) => {
                        console.warn(
                          "[CHAT DEBUG] Input-only usage update failed:",
                          usageUpdateErr
                        );
                      }
                    );
                  }
                });
            })
            .catch((err: unknown) => {
              console.error("[CHAT DEBUG] Error getting usage:", err);
            });
        } catch (error: any) {
          console.error("[CHAT DEBUG] EXECUTION ERROR:", error);
          if (error instanceof ChatSDKError) {
            throw error;
          }
          throw new Error(
            "An internal system error occurred. Please try again later."
          );
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
        }
      },
      onError: (error) => {
        console.error("[CHAT DEBUG] Stream error:", error);
        return "Something went wrong. Please try again.";
      },
    });

    const streamContext = await getStreamContext();

    if (streamContext) {
      try {
        const resumableStream = await streamContext.resumableStream(
          streamId,
          () => stream.pipeThrough(new JsonToSseTransformStream())
        );
        if (resumableStream) return new Response(resumableStream);
      } catch (err) {
        console.warn(
          "Resumable stream failed (likely Redis connection), falling back to standard stream:",
          err
        );
      }
    }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return new ChatSDKError("bad_request:api").toResponse();

  const session = await auth();

  if (!session?.user) return new ChatSDKError("unauthorized:chat").toResponse();

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id)
    return new ChatSDKError("forbidden:chat").toResponse();

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
