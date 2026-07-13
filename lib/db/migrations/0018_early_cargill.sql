CREATE TABLE IF NOT EXISTS "Quiz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"topic" varchar(255) NOT NULL,
	"quizType" varchar(50) NOT NULL,
	"difficulty" varchar(50) DEFAULT 'Medium',
	"score" integer DEFAULT 0,
	"totalQuestions" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"documentUrl" varchar(1024),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "QuizQuestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quizId" uuid NOT NULL,
	"question" text NOT NULL,
	"options" json NOT NULL,
	"correctAnswer" varchar(512) NOT NULL,
	"userAnswer" varchar(512),
	"isCorrect" boolean,
	"explanation" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_Quiz_id_fk" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
