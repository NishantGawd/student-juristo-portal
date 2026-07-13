ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "isConfirmed" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "confirmedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "confirmationSentAt" timestamp;
--> statement-breakpoint
ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "unsubscribedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "marketingEmailsEnabled" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "newsletterEmailsEnabled" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "quizEmailsEnabled" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "onboardingReminderEmailsEnabled" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "NewsletterSubscribers" ADD COLUMN IF NOT EXISTS "emailPreferenceOrder" json DEFAULT '["transactional","account","quiz","newsletter","reminder","marketing"]'::json;
