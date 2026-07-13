CREATE TABLE IF NOT EXISTS "Consultation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"lawyerId" uuid NOT NULL,
	"subject" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"scheduledAt" timestamp,
	"duration" varchar(10),
	"amount" varchar(20),
	"paymentStatus" varchar DEFAULT 'unpaid' NOT NULL,
	"paymentId" varchar(256),
	"userNotes" text,
	"lawyerNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Lawyer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"phone" varchar(20),
	"barCouncilId" varchar(100) NOT NULL,
	"state" varchar(100),
	"specializations" text,
	"experience" varchar(10) DEFAULT '0',
	"bio" text,
	"profileImage" varchar(512),
	"hourlyRate" varchar(20),
	"isVerified" boolean DEFAULT true,
	"isAvailable" boolean DEFAULT true,
	"rating" varchar(10) DEFAULT '0',
	"totalConsultations" varchar(20) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"userEmail" varchar(255) NOT NULL,
	"subject" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"category" varchar DEFAULT 'general' NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"adminNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ContractPurchase" ADD COLUMN IF NOT EXISTS "razorpayOrderId" varchar(255);--> statement-breakpoint
ALTER TABLE "ContractPurchase" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" varchar DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionId" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokensUsed" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "chatCount" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "draftCount" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "analysisCount" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastReset" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "userType" varchar DEFAULT 'user';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_lawyerId_Lawyer_id_fk" FOREIGN KEY ("lawyerId") REFERENCES "public"."Lawyer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "ContractPurchase" DROP COLUMN IF EXISTS "cashfreeOrderId";--> statement-breakpoint
ALTER TABLE "ContractPurchase" DROP COLUMN IF EXISTS "cashfreePaymentSessionId";