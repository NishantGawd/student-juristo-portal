CREATE TABLE IF NOT EXISTS "AdminAccessAudit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adminId" varchar(255),
	"adminEmail" varchar(255),
	"accessType" varchar(80) NOT NULL,
	"targetUserId" uuid,
	"chatId" uuid,
	"reason" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserActivityEvent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"chatId" uuid,
	"messageId" uuid,
	"eventType" varchar(80) NOT NULL,
	"sourceTable" varchar(80) NOT NULL,
	"sourceId" varchar(255) NOT NULL,
	"sourceKey" varchar(512) NOT NULL,
	"userPlan" varchar(80),
	"model" varchar(160),
	"textPreview" text,
	"keywords" json DEFAULT '[]'::json,
	"metadata" jsonb,
	"occurredAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserActivityEvent_sourceKey_unique" UNIQUE("sourceKey")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserKeywordInsight" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keywordKey" varchar(512) NOT NULL,
	"userId" uuid NOT NULL,
	"chatId" uuid,
	"messageId" uuid,
	"keyword" varchar(160) NOT NULL,
	"source" varchar(80) DEFAULT 'chat' NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"firstUsedAt" timestamp DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserKeywordInsight_keywordKey_unique" UNIQUE("keywordKey")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AdminAccessAudit" ADD CONSTRAINT "AdminAccessAudit_targetUserId_User_id_fk" FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AdminAccessAudit" ADD CONSTRAINT "AdminAccessAudit_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserActivityEvent" ADD CONSTRAINT "UserActivityEvent_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserActivityEvent" ADD CONSTRAINT "UserActivityEvent_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserKeywordInsight" ADD CONSTRAINT "UserKeywordInsight_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserKeywordInsight" ADD CONSTRAINT "UserKeywordInsight_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
