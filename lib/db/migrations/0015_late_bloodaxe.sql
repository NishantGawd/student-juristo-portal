CREATE TABLE IF NOT EXISTS "Coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(255) NOT NULL,
	"description" text,
	"discountPercentage" integer DEFAULT 0 NOT NULL,
	"maxUsage" integer DEFAULT 0 NOT NULL,
	"currentUsage" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PhoneVerification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp" varchar(10) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "plan" SET DEFAULT 'free';--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "LawyerContract" ADD COLUMN "fileUrl" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "LawyerContract" ADD COLUMN "fileKey" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "firstName" varchar(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "lastName" varchar(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "phone" varchar(20); EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "passwordResetToken" varchar(255); EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "passwordResetTokenExpiry" timestamp; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "onboardingCompleted" boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "phoneVerified" boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "workArea" varchar(255); EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "referralSource" varchar(255); EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_email_unique" UNIQUE("email"); EXCEPTION WHEN OTHERS THEN NULL; END $$;