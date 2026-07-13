CREATE TABLE IF NOT EXISTS "JuristoTemplate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"slug" varchar(512) NOT NULL,
	"category" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"stateCode" varchar(10) NOT NULL,
	"description" text NOT NULL,
	"outline" json NOT NULL,
	"contentTemplate" text NOT NULL,
	"requiredFields" json NOT NULL,
	"applicableActs" text,
	"registrationRequired" boolean DEFAULT false,
	"isActive" boolean DEFAULT true,
	"version" varchar(20) DEFAULT '1.0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "JuristoTemplate_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lawyer" (
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
	"profileImage" text,
	"hourlyRate" varchar(20),
	"isVerified" boolean DEFAULT true,
	"isAvailable" boolean DEFAULT true,
	"rating" varchar(10) DEFAULT '0',
	"totalConsultations" varchar(20) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyerId" varchar(256) NOT NULL,
	"balance" varchar(20) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Wallet_lawyerId_unique" UNIQUE("lawyerId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walletId" uuid NOT NULL,
	"type" varchar NOT NULL,
	"amount" varchar(20) NOT NULL,
	"status" varchar DEFAULT 'completed' NOT NULL,
	"description" text NOT NULL,
	"referenceId" varchar(256),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "Lawyer";--> statement-breakpoint
ALTER TABLE "Consultation" DROP CONSTRAINT IF EXISTS "Consultation_lawyerId_Lawyer_id_fk";
--> statement-breakpoint
ALTER TABLE "LawyerContract" ADD COLUMN IF NOT EXISTS "originalPrice" varchar(20);--> statement-breakpoint
ALTER TABLE "LawyerContract" ADD COLUMN IF NOT EXISTS "rating" varchar(10) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "LawyerContract" ADD COLUMN IF NOT EXISTS "reviews" varchar(20) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "LawyerContract" ADD COLUMN IF NOT EXISTS "features" json DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "LawyerContract" ADD COLUMN IF NOT EXISTS "popular" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "LawyerContract" ADD COLUMN IF NOT EXISTS "template" text;--> statement-breakpoint
ALTER TABLE "LawyerContract" ADD COLUMN IF NOT EXISTS "icon" varchar(50);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_Wallet_id_fk" FOREIGN KEY ("walletId") REFERENCES "public"."Wallet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_lawyerId_lawyer_id_fk" FOREIGN KEY ("lawyerId") REFERENCES "public"."lawyer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Stream" DROP CONSTRAINT IF EXISTS "Stream_chatId_id_pk";
--> statement-breakpoint
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_id_pk" PRIMARY KEY("id","chatId");