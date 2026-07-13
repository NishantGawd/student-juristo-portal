CREATE TABLE IF NOT EXISTS "HelpdeskMessages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticketId" varchar(100) NOT NULL,
	"senderType" varchar(50) NOT NULL,
	"text" text NOT NULL,
	"attachment" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "HelpdeskTickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queryId" varchar(100) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"userEmail" varchar(255) NOT NULL,
	"userPlan" varchar(50) DEFAULT 'basic',
	"category" varchar(100) NOT NULL,
	"priority" varchar(50) DEFAULT 'medium',
	"status" varchar(50) DEFAULT 'Opened',
	"queryText" text NOT NULL,
	"attachment" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "HelpdeskTickets_queryId_unique" UNIQUE("queryId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "NewsletterSubscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"source" varchar(100) DEFAULT 'v1_chatbot',
	"type" varchar(100) DEFAULT 'Registered Member',
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "NewsletterSubscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" varchar;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "currentPeriodEnd" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "HelpdeskMessages" ADD CONSTRAINT "HelpdeskMessages_ticketId_HelpdeskTickets_queryId_fk" FOREIGN KEY ("ticketId") REFERENCES "public"."HelpdeskTickets"("queryId") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
