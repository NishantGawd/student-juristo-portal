CREATE TABLE IF NOT EXISTS "ExamProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"targetExam" varchar(100),
	"targetYear" varchar(4),
	"currentClass" varchar(50),
	"targetNlu" varchar(100),
	"weakestSection" varchar(100),
	"xp" integer DEFAULT 0,
	"streak" integer DEFAULT 0,
	"achievementLevel" varchar(100) DEFAULT 'NLU Aspirant',
	"optedInForUpdates" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ExamProfile_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ExamUpdate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"link" varchar(1024),
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "QuizQuestion" ADD COLUMN "timeTaken" integer;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "quizAnnouncementSeen" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ExamProfile" ADD CONSTRAINT "ExamProfile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "referralSource";