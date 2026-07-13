ALTER TABLE "LawyerContract" ADD COLUMN "fileKey" varchar(512);--> statement-breakpoint
ALTER TABLE "LawyerContract" ADD COLUMN "status" varchar DEFAULT 'pending';