CREATE TABLE IF NOT EXISTS "ContractReviewRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(256) NOT NULL,
	"userEmail" varchar(255) NOT NULL,
	"lawyerId" varchar(255) NOT NULL,
	"documentId" uuid NOT NULL,
	"documentTitle" varchar(512) NOT NULL,
	"contractSlug" varchar(255),
	"userNotes" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"proposedPrice" varchar(50),
	"proposedTimeline" varchar(100),
	"proposalNotes" text,
	"proposedAt" timestamp,
	"clientApprovedAt" timestamp,
	"clientDeclinedAt" timestamp,
	"completedAt" timestamp,
	"lawyerSummary" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LawyerConsultation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyerId" varchar(256) NOT NULL,
	"lawyerName" varchar(256) NOT NULL,
	"lawyerEmail" varchar(256) NOT NULL,
	"userName" varchar(256) NOT NULL,
	"userEmail" varchar(256) NOT NULL,
	"userPhone" varchar(30) NOT NULL,
	"subject" varchar(512) NOT NULL,
	"description" text,
	"caseType" varchar(100) NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"duration" varchar(10) DEFAULT '30',
	"amount" varchar(20) NOT NULL,
	"paymentStatus" varchar DEFAULT 'pending' NOT NULL,
	"razorpayOrderId" varchar(256),
	"razorpayPaymentId" varchar(256),
	"razorpaySignature" varchar(512),
	"meetLink" varchar(512),
	"status" varchar DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LawyerContract" (
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
	"fileUrl" varchar(512),
	"previewContent" text,
	"downloads" varchar(20) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "LawyerContract_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LawyerMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewRequestId" uuid NOT NULL,
	"senderRole" varchar NOT NULL,
	"senderId" varchar(255) NOT NULL,
	"senderName" varchar(255),
	"content" text NOT NULL,
	"attachmentUrl" varchar(512),
	"attachmentName" varchar(255),
	"isRead" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Stream" DROP CONSTRAINT IF EXISTS "Stream_id_pk";--> statement-breakpoint
ALTER TABLE "Lawyer" ALTER COLUMN "profileImage" SET DATA TYPE text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_id_pk" PRIMARY KEY("chatId","id");
EXCEPTION
 WHEN others THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LawyerMessage" ADD CONSTRAINT "LawyerMessage_reviewRequestId_ContractReviewRequest_id_fk" FOREIGN KEY ("reviewRequestId") REFERENCES "public"."ContractReviewRequest"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
