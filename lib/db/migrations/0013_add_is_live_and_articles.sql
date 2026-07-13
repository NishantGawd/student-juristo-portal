CREATE TABLE IF NOT EXISTS "adminContracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"slug" varchar(512) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"price" varchar(20) DEFAULT '0',
	"accessLevel" varchar DEFAULT 'paid',
	"contentStructure" text,
	"tags" text,
	"lawyerId" varchar(256) NOT NULL,
	"lawyerName" varchar(256) NOT NULL,
	"tier" varchar DEFAULT 'lawyer-vetted',
	"previewContent" text,
	"downloads" varchar(20) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"status" varchar DEFAULT 'pending',
	"originalPrice" varchar(20),
	"rating" varchar(10) DEFAULT '0',
	"reviews" varchar(20) DEFAULT '0',
	"features" json DEFAULT '[]'::json,
	"popular" boolean DEFAULT false,
	"template" text,
	CONSTRAINT "adminContracts_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LawyerArticle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyerId" varchar(256) NOT NULL,
	"lawyerName" varchar(256) NOT NULL,
	"title" varchar(512) NOT NULL,
	"slug" varchar(512) NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"category" varchar(100),
	"tags" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"views" varchar(20) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "LawyerArticle_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LiveChatMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"senderId" varchar(256) NOT NULL,
	"senderType" varchar NOT NULL,
	"content" text NOT NULL,
	"isRead" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LiveChatSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"lawyerId" uuid NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"startTime" timestamp DEFAULT now() NOT NULL,
	"endTime" timestamp,
	"hourlyRateAtStart" varchar(20) NOT NULL,
	"calculatedAmount" varchar(20),
	"razorpayOrderId" varchar(256),
	"razorpayPaymentId" varchar(256),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lawyer" ALTER COLUMN "isAvailable" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "lawyer" ADD COLUMN IF NOT EXISTS "verificationStatus" varchar(50) DEFAULT 'Pending';--> statement-breakpoint
ALTER TABLE "lawyer" ADD COLUMN IF NOT EXISTS "isLive" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "lawyer" ADD COLUMN IF NOT EXISTS "rejectionReason" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_sessionId_LiveChatSession_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."LiveChatSession"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LiveChatSession" ADD CONSTRAINT "LiveChatSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LiveChatSession" ADD CONSTRAINT "LiveChatSession_lawyerId_lawyer_id_fk" FOREIGN KEY ("lawyerId") REFERENCES "public"."lawyer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "LawyerContract" DROP COLUMN IF EXISTS "fileUrl";--> statement-breakpoint
ALTER TABLE "LawyerContract" DROP COLUMN IF EXISTS "fileKey";--> statement-breakpoint
ALTER TABLE "LawyerContract" DROP COLUMN IF EXISTS "icon";