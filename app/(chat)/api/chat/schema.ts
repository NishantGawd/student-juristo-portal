import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(50000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.string(), // Server SDK strictly requires mediaType
  name: z.string().min(1).max(255).default("file"),
  url: z.string().url(),
});

const imagePartSchema = z.object({
  type: z.enum(["image"]),
  image: z.string(), // URL or data URL for the image
  mediaType: z.string().optional(),
  mimeType: z.string().optional(),
});

const partSchema = z.union([textPartSchema, filePartSchema, imagePartSchema]);

const userMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user"]),
  parts: z.array(partSchema),
});

// For tool approval flows, we accept all messages (more permissive schema)
const messageSchema = z.object({
  id: z.string(),
  role: z.string(),
  parts: z.array(z.any()),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  // Either a single new message or all messages (for tool approvals)
  message: userMessageSchema.optional(),
  messages: z.array(messageSchema).optional(),
  selectedChatModel: z.string(),
  selectedVisibilityType: z.enum(["public", "private"]),
  context: z.string().optional(),
  researchMode: z.boolean().optional().default(false),
  webSearchEnabled: z.boolean().optional().default(false),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

