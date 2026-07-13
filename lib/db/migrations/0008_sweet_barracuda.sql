CREATE TABLE IF NOT EXISTS "ContractPurchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"userEmail" varchar(255) NOT NULL,
	"contractSlug" varchar(255) NOT NULL,
	"contractName" varchar(255) NOT NULL,
	"contractId" varchar(255),
	"tier" varchar NOT NULL,
	"price" varchar(50) NOT NULL,
	"paymentId" varchar(255) NOT NULL,
	"paymentStatus" varchar DEFAULT 'pending' NOT NULL,
	"cashfreeOrderId" varchar(255),
	"cashfreePaymentSessionId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ContractReview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractSlug" varchar(255) NOT NULL,
	"userId" uuid NOT NULL,
	"userName" varchar(255) NOT NULL,
	"userEmail" varchar(255) NOT NULL,
	"rating" varchar(10) NOT NULL,
	"comment" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ContractPurchase" ADD CONSTRAINT "ContractPurchase_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ContractReview" ADD CONSTRAINT "ContractReview_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "lastContext";