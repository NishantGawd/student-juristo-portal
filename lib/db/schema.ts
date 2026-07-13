import { relations, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  unique,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  // User Profile
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  // Plan & Usage
  plan: varchar("plan", { enum: ["free", "basic", "super", "advance", "advance_pro", "business", "super_yearly", "advance_yearly", "business_yearly", "clat_spark", "clat_momentum", "clat_peak"] })
    .notNull()
    .default("free"),
  subscriptionId: varchar("subscriptionId", { length: 255 }), // Stripe/Payment/Razorpay Sub ID
  subscriptionStatus: varchar("subscriptionStatus", { enum: ["active", "cancelled", "past_due", "created"] }),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  // Usage Counters
  tokensUsed: varchar("tokensUsed", { length: 50 }).default("0"), // Identifying as string to avoid big int issues if any, or just number
  miniTokensUsed: varchar("miniTokensUsed", { length: 50 }).default("0"),
  macroTokensUsed: varchar("macroTokensUsed", { length: 50 }).default("0"),
  maxTokensUsed: varchar("maxTokensUsed", { length: 50 }).default("0"),
  chatCount: varchar("chatCount", { length: 50 }).default("0"),
  draftCount: varchar("draftCount", { length: 50 }).default("0"),
  analysisCount: varchar("analysisCount", { length: 50 }).default("0"),
  odrPacketCount: varchar("odrPacketCount", { length: 50 }).default("0"),
  // Reset
  lastReset: timestamp("lastReset").defaultNow(),
  // Password Reset
  passwordResetToken: varchar("passwordResetToken", { length: 255 }),
  passwordResetTokenExpiry: timestamp("passwordResetTokenExpiry"),
  // User type
  userType: varchar("userType", { enum: ["user", "lawyer"] }).default("user"),
  // Onboarding
  onboardingCompleted: boolean("onboardingCompleted").default(false),
  phoneVerified: boolean("phoneVerified").default(false),
  workArea: varchar("workArea", { length: 255 }),
  // Quiz Features
  quizAnnouncementSeen: boolean("quizAnnouncementSeen").default(false),
  // Audience: student or professional (chosen at signup)
  audience: varchar("audience", { length: 20 }),
});

export type User = InferSelectModel<typeof user>;

export const phoneVerification = pgTable("PhoneVerification", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  otp: varchar("otp", { length: 10 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const voteV2 = pgTable("Vote_v2", {
  chatId: uuid().notNull(),
  messageId: uuid().notNull(),
  isUpvoted: boolean().notNull(),
},
  (table) => {
    return {
      voteV2ChatIdChatIdFk: foreignKey({
        columns: [table.chatId],
        foreignColumns: [chat.id],
        name: "Vote_v2_chatId_Chat_id_fk"
      }),
      voteV2MessageIdMessageV2IdFk: foreignKey({
        columns: [table.messageId],
        foreignColumns: [messageV2.id],
        name: "Vote_v2_messageId_Message_v2_id_fk"
      }),
      voteV2ChatIdMessageIdPk: primaryKey({ columns: [table.chatId, table.messageId], name: "Vote_v2_chatId_messageId_pk" }),
    }
  });

export const wallet = pgTable("Wallet", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  lawyerId: varchar({ length: 256 }).notNull(),
  balance: varchar({ length: 20 }).default('0').notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
  (table) => {
    return {
      walletLawyerIdUnique: unique("Wallet_lawyerId_unique").on(table.lawyerId),
    }
  });

export const walletTransaction = pgTable("WalletTransaction", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  walletId: uuid().notNull(),
  type: varchar().notNull(),
  amount: varchar({ length: 20 }).notNull(),
  status: varchar().default('completed').notNull(),
  description: text().notNull(),
  referenceId: varchar({ length: 256 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
  (table) => {
    return {
      walletTransactionWalletIdWalletIdFk: foreignKey({
        columns: [table.walletId],
        foreignColumns: [wallet.id],
        name: "WalletTransaction_walletId_Wallet_id_fk"
      }),
    }
  });

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet", "property-visualizer"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;


export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const messageV2 = pgTable("Message_v2", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  chatId: uuid().notNull(),
  role: varchar().notNull(),
  parts: json().notNull(),
  attachments: json().notNull(),
  createdAt: timestamp({ mode: 'string' }).notNull(),
},
  (table) => {
    return {
      messageV2ChatIdChatIdFk: foreignKey({
        columns: [table.chatId],
        foreignColumns: [chat.id],
        name: "Message_v2_chatId_Chat_id_fk"
      }),
    }
  });

export const stream = pgTable("Stream", {
  id: uuid().defaultRandom().notNull(),
  chatId: uuid().notNull(),
  createdAt: timestamp({ mode: 'string' }).notNull(),
},
  (table) => {
    return {
      streamChatIdChatIdFk: foreignKey({
        columns: [table.chatId],
        foreignColumns: [chat.id],
        name: "Stream_chatId_Chat_id_fk"
      }),
      streamChatIdIdPk: primaryKey({ columns: [table.id, table.chatId], name: "Stream_chatId_id_pk" }),
    }
  });

export type Stream = InferSelectModel<typeof stream>;

// Contract purchase tracking
export const contractPurchase = pgTable("ContractPurchase", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  userEmail: varchar("userEmail", { length: 255 }).notNull(),
  contractSlug: varchar("contractSlug", { length: 255 }).notNull(),
  contractName: varchar("contractName", { length: 255 }).notNull(),
  contractId: varchar("contractId", { length: 255 }),
  tier: varchar("tier", { enum: ["ready-made", "ai-generated", "lawyer-vetted"] }).notNull(),
  price: varchar("price", { length: 50 }).notNull(),
  paymentId: varchar("paymentId", { length: 255 }).notNull(),
  paymentStatus: varchar("paymentStatus", { enum: ["pending", "completed", "failed", "cancelled"] })
    .notNull()
    .default("pending"),
  razorpayOrderId: varchar("razorpayOrderId", { length: 255 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 255 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type ContractPurchase = InferSelectModel<typeof contractPurchase>;

// Contract reviews
export const contractReview = pgTable("ContractReview", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  contractSlug: varchar("contractSlug", { length: 255 }).notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  userName: varchar("userName", { length: 255 }).notNull(),
  userEmail: varchar("userEmail", { length: 255 }).notNull(),
  rating: varchar("rating", { length: 10 }).notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type ContractReview = InferSelectModel<typeof contractReview>;

// Lawyer profiles for marketplace
export const lawyer = pgTable("lawyer", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: varchar("userId", { length: 256 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  barCouncilId: varchar("barCouncilId", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }), // Bar council state
  specializations: text("specializations"), // JSON array as text: ["corporate", "family", "criminal"]
  experience: varchar("experience", { length: 10 }).default("0"), // years
  bio: text("bio"),
  profileImage: text("profileImage"),
  hourlyRate: varchar("hourlyRate", { length: 20 }), // in INR
  isVerified: boolean("isVerified").default(true), // auto-approved for MVP
  verificationStatus: varchar({ length: 50 }).default('Pending'),
  isAvailable: boolean("isAvailable").default(false),
  rating: varchar("rating", { length: 10 }).default("0"),
  rejectionReason: text("rejectionReason"),
  totalConsultations: varchar("totalConsultations", { length: 20 }).default("0"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Lawyer = InferSelectModel<typeof lawyer>;

// Consultation requests between users and lawyers
export const consultation = pgTable("Consultation", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  lawyerId: uuid("lawyerId")
    .notNull()
    .references(() => lawyer.id),
  subject: varchar("subject", { length: 256 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { enum: ["pending", "accepted", "completed", "cancelled"] })
    .notNull()
    .default("pending"),
  scheduledAt: timestamp("scheduledAt"),
  duration: varchar("duration", { length: 10 }), // in minutes
  amount: varchar("amount", { length: 20 }), // in INR
  paymentStatus: varchar("paymentStatus", { enum: ["unpaid", "paid", "refunded"] })
    .notNull()
    .default("unpaid"),
  paymentId: varchar("paymentId", { length: 256 }),
  userNotes: text("userNotes"),
  lawyerNotes: text("lawyerNotes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Consultation = InferSelectModel<typeof consultation>;

// Support tickets
export const ticket = pgTable("Ticket", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  userEmail: varchar("userEmail", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 256 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { enum: ["bug", "feature", "billing", "general"] })
    .notNull()
    .default("general"),
  priority: varchar("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  status: varchar("status", { enum: ["open", "in-progress", "resolved", "closed"] })
    .notNull()
    .default("open"),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Ticket = InferSelectModel<typeof ticket>;

// Contract review requests (user asks lawyer to vet a drafted contract)
export const contractReviewRequest = pgTable("ContractReviewRequest", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  // Who requested
  userId: varchar("userId", { length: 256 }).notNull(),
  userEmail: varchar("userEmail", { length: 255 }).notNull(),
  // Which lawyer (MongoDB ObjectId string)
  lawyerId: varchar("lawyerId", { length: 255 }).notNull(),
  // What document
  documentId: uuid("documentId").notNull(),
  documentTitle: varchar("documentTitle", { length: 512 }).notNull(),
  contractSlug: varchar("contractSlug", { length: 255 }),
  // Notes from the user about what they want reviewed
  userNotes: text("userNotes"),
  // Lifecycle
  status: varchar("status", {
    enum: ["pending", "proposed", "accepted", "declined", "in_progress", "completed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  // Lawyer's proposal
  proposedPrice: varchar("proposedPrice", { length: 50 }),
  proposedTimeline: varchar("proposedTimeline", { length: 100 }),
  proposalNotes: text("proposalNotes"),
  proposedAt: timestamp("proposedAt"),
  // Client's response
  clientApprovedAt: timestamp("clientApprovedAt"),
  clientDeclinedAt: timestamp("clientDeclinedAt"),
  // Completion
  completedAt: timestamp("completedAt"),
  lawyerSummary: text("lawyerSummary"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type ContractReviewRequest = InferSelectModel<typeof contractReviewRequest>;

// Messages in a lawyer-client chat thread (tied to a review request)
export const lawyerMessage = pgTable("LawyerMessage", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  reviewRequestId: uuid("reviewRequestId")
    .notNull()
    .references(() => contractReviewRequest.id),
  senderRole: varchar("senderRole", { enum: ["user", "lawyer"] }).notNull(),
  senderId: varchar("senderId", { length: 255 }).notNull(),
  senderName: varchar("senderName", { length: 255 }),
  content: text("content").notNull(),
  // Optional attachment (e.g. revised document)
  attachmentUrl: varchar("attachmentUrl", { length: 512 }),
  attachmentName: varchar("attachmentName", { length: 255 }),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type LawyerMessage = InferSelectModel<typeof lawyerMessage>;

// Contracts uploaded by lawyers to the marketplace
export const lawyerContract = pgTable("LawyerContract", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 512 }).notNull().unique(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: varchar("price", { length: 20 }).default("0"),
  accessLevel: varchar("accessLevel", { enum: ["free", "paid", "enterprise"] }).default("paid"),
  contentStructure: text("contentStructure"),
  tags: text("tags"),
  lawyerId: varchar("lawyerId", { length: 256 }).notNull(),
  lawyerName: varchar("lawyerName", { length: 256 }).notNull(),
  tier: varchar("tier", { enum: ["community", "lawyer-vetted", "premium"] }).default("lawyer-vetted"),
  status: varchar("status", { enum: ["pending", "published", "rejected"] }).default("pending"),
  previewContent: text("previewContent"),
  downloads: varchar("downloads", { length: 20 }).default("0"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  originalPrice: varchar("originalPrice", { length: 20 }),
  rating: varchar("rating", { length: 10 }).default("0"),
  reviews: varchar("reviews", { length: 20 }).default("0"),
  features: json("features").default("[]"),
  popular: boolean("popular").default(false),
  template: text("template"),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
});

export type LawyerContract = InferSelectModel<typeof lawyerContract>;

// Lawyer-authored articles / legal guides
export const lawyerArticle = pgTable("LawyerArticle", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  lawyerId: varchar({ length: 256 }).notNull(),
  lawyerName: varchar({ length: 256 }).notNull(),
  title: varchar({ length: 512 }).notNull(),
  slug: varchar({ length: 512 }).notNull(),
  content: text().notNull(),
  excerpt: text(),
  category: varchar({ length: 100 }),
  tags: text(),
  status: varchar({ length: 20 }).default('draft').notNull(),
  views: varchar({ length: 20 }).default('0'),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => ({
  lawyerArticleSlugUnique: unique("LawyerArticle_slug_unique").on(table.slug),
}));

export type LawyerArticle = InferSelectModel<typeof lawyerArticle>;

// Consultation bookings (with payment details)
export const lawyerConsultation = pgTable("LawyerConsultation", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  lawyerId: varchar("lawyerId", { length: 256 }).notNull(),
  lawyerName: varchar("lawyerName", { length: 256 }).notNull(),
  lawyerEmail: varchar("lawyerEmail", { length: 256 }).notNull(),
  userName: varchar("userName", { length: 256 }).notNull(),
  userEmail: varchar("userEmail", { length: 256 }).notNull(),
  userPhone: varchar("userPhone", { length: 30 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  description: text("description"),
  caseType: varchar("caseType", { length: 100 }).notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  duration: varchar("duration", { length: 10 }).default("30"),
  amount: varchar("amount", { length: 20 }).notNull(),
  paymentStatus: varchar("paymentStatus", { enum: ["pending", "paid", "refunded"] })
    .notNull()
    .default("pending"),
  razorpayOrderId: varchar("razorpayOrderId", { length: 256 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 256 }),
  razorpaySignature: varchar("razorpaySignature", { length: 512 }),
  meetLink: varchar("meetLink", { length: 512 }),
  status: varchar("status", { enum: ["pending", "confirmed", "completed", "cancelled"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type LawyerConsultation = InferSelectModel<typeof lawyerConsultation>;

// Juristo's own state-wise contract templates (used by AI for drafting)
export const juristoTemplate = pgTable("JuristoTemplate", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 512 }).notNull().unique(),
  category: varchar("category", { length: 100 }).notNull(), // e.g. "rental", "employment", "nda"
  state: varchar("state", { length: 100 }).notNull(), // e.g. "Maharashtra", "Delhi", "Pan-India"
  stateCode: varchar("stateCode", { length: 10 }).notNull(), // e.g. "IN-MH", "IN-DL", "IN-ALL"
  description: text("description").notNull(),
  outline: json("outline").notNull(), // JSON array of sections/clauses
  contentTemplate: text("contentTemplate").notNull(), // Full markdown body with {{placeholders}}
  requiredFields: json("requiredFields").notNull(), // JSON array of field definitions for the form
  applicableActs: text("applicableActs"), // Relevant statutes, comma-separated
  registrationRequired: boolean("registrationRequired").default(false),
  isActive: boolean("isActive").default(true),
  version: varchar("version", { length: 20 }).default("1.0"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type JuristoTemplate = InferSelectModel<typeof juristoTemplate>;

export const adminContracts = pgTable("adminContracts", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 256 }).notNull(),
  slug: varchar({ length: 512 }).notNull(),
  description: text().notNull(),
  category: varchar({ length: 100 }).notNull(),
  price: varchar({ length: 20 }).default('0'),
  accessLevel: varchar().default('paid'),
  contentStructure: text(),
  tags: text(),
  lawyerId: varchar({ length: 256 }).notNull(),
  lawyerName: varchar({ length: 256 }).notNull(),
  tier: varchar().default('lawyer-vetted'),
  previewContent: text(),
  downloads: varchar({ length: 20 }).default('0'),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  status: varchar().default('pending'),
  originalPrice: varchar({ length: 20 }),
  rating: varchar({ length: 10 }).default('0'),
  reviews: varchar({ length: 20 }).default('0'),
  features: json().default([]),
  popular: boolean().default(false),
  template: text(),
}, (table) => ({
  adminContractsSlugKey: unique("adminContracts_slug_key").on(table.slug),
}));

// ----------------------------------------------------------------------
// Live Ecosystem Entities (Shared with Lawyer Portal)
// ----------------------------------------------------------------------

export const liveChatSession = pgTable("LiveChatSession", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  lawyerId: uuid("lawyerId")
    .notNull()
    .references(() => lawyer.id),
  status: varchar("status", { enum: ["pending", "active", "quote_issued", "vetting", "ended", "awaiting_payment", "completed", "expired"] })
    .notNull()
    .default("pending"),
  startTime: timestamp("startTime").notNull().defaultNow(),
  vettingStartedAt: timestamp("vettingStartedAt"),
  endTime: timestamp("endTime"),
  quotedPrice: varchar("quotedPrice", { length: 20 }),
  gmeetLink: varchar("gmeetLink", { length: 512 }),
  hourlyRateAtStart: varchar("hourlyRateAtStart", { length: 20 }).notNull(),
  calculatedAmount: varchar("calculatedAmount", { length: 20 }),
  razorpayOrderId: varchar("razorpayOrderId", { length: 256 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 256 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const liveChatMessage = pgTable("LiveChatMessage", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  sessionId: uuid("sessionId")
    .notNull()
    .references(() => liveChatSession.id),
  senderId: varchar("senderId", { length: 256 }).notNull(),
  senderType: varchar("senderType", { enum: ["user", "lawyer"] }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  attachmentUrl: varchar("attachmentUrl", { length: 1000 }),
    attachmentName: varchar("attachmentName", { length: 255 }),
    attachmentType: varchar("attachmentType", { length: 100 }),
});


export const coupons = pgTable("Coupons", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  description: text("description"),
  discountPercentage: integer("discountPercentage").notNull().default(0),
  maxUsage: integer("maxUsage").notNull().default(0),
  currentUsage: integer("currentUsage").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("Active"),
  createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: 'string' }).defaultNow().notNull(),
});

export type Coupons = InferSelectModel<typeof coupons>;

export const helpdeskTickets = pgTable("HelpdeskTickets", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  queryId: varchar("queryId", { length: 100 }).notNull().unique(),
  userId: varchar("userId", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  userEmail: varchar("userEmail", { length: 255 }).notNull(),
  userPlan: varchar("userPlan", { length: 50 }).default("basic"),
  category: varchar("category", { length: 100 }).notNull(),
  priority: varchar("priority", { length: 50 }).default("medium"),
  platform: varchar("platform", { length: 50 }).default("v1"),
  status: varchar("status", { length: 50 }).default("Opened"),
  queryText: text("queryText").notNull(),
  attachment: jsonb("attachment"),
  createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: 'string' }).defaultNow().notNull(),
});

export const helpdeskMessages = pgTable("HelpdeskMessages", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  ticketId: varchar("ticketId", { length: 100 }).notNull().references(() => helpdeskTickets.queryId, { onDelete: 'cascade' }),
  senderType: varchar("senderType", { length: 50 }).notNull(),
  text: text("text").notNull(),
  attachment: jsonb("attachment"),
  createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow().notNull(),
});

export const helpdeskTicketsRelations = relations(helpdeskTickets, ({ many }) => ({
  messages: many(helpdeskMessages),
}));

export const helpdeskMessagesRelations = relations(helpdeskMessages, ({ one }) => ({
  ticket: one(helpdeskTickets, {
    fields: [helpdeskMessages.ticketId],
    references: [helpdeskTickets.queryId],
  }),
}));

export const userActivityEvent = pgTable("UserActivityEvent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  chatId: uuid("chatId").references(() => chat.id),
  messageId: uuid("messageId"),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  sourceTable: varchar("sourceTable", { length: 80 }).notNull(),
  sourceId: varchar("sourceId", { length: 255 }).notNull(),
  sourceKey: varchar("sourceKey", { length: 512 }).notNull().unique(),
  userPlan: varchar("userPlan", { length: 80 }),
  platform: varchar("platform", { length: 50 }).default("juristo"),
  model: varchar("model", { length: 160 }),
  textPreview: text("textPreview"),
  keywords: json("keywords").default([]),
  metadata: jsonb("metadata"),
  country: varchar("country", { length: 2 }),
  occurredAt: timestamp("occurredAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type UserActivityEvent = InferSelectModel<typeof userActivityEvent>;

export const userKeywordInsight = pgTable("UserKeywordInsight", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  keywordKey: varchar("keywordKey", { length: 512 }).notNull().unique(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  chatId: uuid("chatId").references(() => chat.id),
  messageId: uuid("messageId"),
  keyword: varchar("keyword", { length: 160 }).notNull(),
  source: varchar("source", { length: 80 }).notNull().default("chat"),
  count: integer("count").notNull().default(1),
  firstUsedAt: timestamp("firstUsedAt").notNull().defaultNow(),
  lastUsedAt: timestamp("lastUsedAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type UserKeywordInsight = InferSelectModel<typeof userKeywordInsight>;

export const adminAccessAudit = pgTable("AdminAccessAudit", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  adminId: varchar("adminId", { length: 255 }),
  adminEmail: varchar("adminEmail", { length: 255 }),
  accessType: varchar("accessType", { length: 80 }).notNull(),
  targetUserId: uuid("targetUserId").references(() => user.id),
  chatId: uuid("chatId").references(() => chat.id),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type AdminAccessAudit = InferSelectModel<typeof adminAccessAudit>;

export const newsletterSubscribers = pgTable("NewsletterSubscribers", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  source: varchar("source", { length: 100 }).default('v1_chatbot'), // Tracks V1 vs V2
  type: varchar("type", { length: 100 }).default('Registered Member'),
  isActive: boolean("isActive").default(true),
  isConfirmed: boolean("isConfirmed").default(true),
  confirmedAt: timestamp("confirmedAt", { mode: "string" }),
  confirmationSentAt: timestamp("confirmationSentAt", { mode: "string" }),
  unsubscribedAt: timestamp("unsubscribedAt", { mode: "string" }),
  marketingEmailsEnabled: boolean("marketingEmailsEnabled").default(true),
  newsletterEmailsEnabled: boolean("newsletterEmailsEnabled").default(true),
  quizEmailsEnabled: boolean("quizEmailsEnabled").default(true),
  onboardingReminderEmailsEnabled: boolean("onboardingReminderEmailsEnabled").default(true),
  emailPreferenceOrder: json("emailPreferenceOrder").default([
    "transactional",
    "account",
    "quiz",
    "newsletter",
    "reminder",
    "marketing",
  ]),
  createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: 'string' }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// Notification & Events Ecosystem
// ----------------------------------------------------------------------

export const notification = pgTable("Notification", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").references(() => user.id), // Can be null if it's an email-only guest
  userEmail: varchar("userEmail", { length: 255 }), // Fallback for email-only
  type: varchar("type", { enum: ["EMAIL", "IN_APP", "SMS"] }).notNull().default("IN_APP"),
  event: varchar("event", { length: 100 }).notNull(), // e.g. PAYMENT_ABANDONED, WELCOME
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { enum: ["PENDING", "SENT", "FAILED", "READ"] }).notNull().default("PENDING"),
  payload: json("payload"), // Any extra context needed for rendering or retry
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Notification = InferSelectModel<typeof notification>;

export const checkoutSession = pgTable("CheckoutSession", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").references(() => user.id),
  userEmail: varchar("userEmail", { length: 255 }).notNull(),
  targetType: varchar("targetType", { enum: ["subscription", "contract", "consultation"] }).notNull(),
  targetId: varchar("targetId", { length: 255 }), // ID of the thing they are buying
  targetName: varchar("targetName", { length: 255 }),
  price: varchar("price", { length: 50 }),
  status: varchar("status", { enum: ["OPEN", "COMPLETED", "ABANDONED"] }).notNull().default("OPEN"),
  abandonmentEmailSent: boolean("abandonmentEmailSent").default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type CheckoutSession = InferSelectModel<typeof checkoutSession>;

// ----------------------------------------------------------------------
// Quiz Ecosystem
// ----------------------------------------------------------------------

export const quiz = pgTable("Quiz", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  title: varchar("title", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  quizType: varchar("quizType", { length: 50 }).notNull(), // MCQ, Flashcards, Mixed
  difficulty: varchar("difficulty", { length: 50 }).default("Medium"),
  score: integer("score").default(0),
  totalQuestions: integer("totalQuestions").notNull(),
  status: varchar("status", { enum: ["pending", "in_progress", "completed"] })
    .notNull()
    .default("pending"),
  documentUrl: varchar("documentUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Quiz = InferSelectModel<typeof quiz>;

export const quizQuestion = pgTable("QuizQuestion", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  quizId: uuid("quizId")
    .notNull()
    .references(() => quiz.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: json("options").notNull(), // Array of strings e.g., ["A", "B", "C", "D"]
  correctAnswer: varchar("correctAnswer", { length: 512 }).notNull(),
  userAnswer: varchar("userAnswer", { length: 512 }),
  isCorrect: boolean("isCorrect"),
  explanation: text("explanation").notNull(),
  timeTaken: integer("timeTaken"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type QuizQuestion = InferSelectModel<typeof quizQuestion>;

// ----------------------------------------------------------------------
// Exam Prep OS Ecosystem
// ----------------------------------------------------------------------

export const examProfile = pgTable("ExamProfile", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id)
    .unique(),
  targetExam: varchar("targetExam", { length: 100 }), // e.g. CLAT, AILET
  targetYear: varchar("targetYear", { length: 4 }), // e.g. 2025
  currentClass: varchar("currentClass", { length: 50 }), // e.g. 11th, 12th, Dropper
  targetNlu: varchar("targetNlu", { length: 100 }), // e.g. NLSIU Bangalore
  weakestSection: varchar("weakestSection", { length: 100 }), // e.g. Legal Reasoning
  xp: integer("xp").default(0),
  streak: integer("streak").default(0),
  achievementLevel: varchar("achievementLevel", { length: 100 }).default("NLU Aspirant"),
  optedInForUpdates: boolean("optedInForUpdates").default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type ExamProfile = InferSelectModel<typeof examProfile>;

export const examUpdate = pgTable("ExamUpdate", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  link: varchar("link", { length: 1024 }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type ExamUpdate = InferSelectModel<typeof examUpdate>;

