ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "miniTokensUsed" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "macroTokensUsed" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxTokensUsed" varchar(50) DEFAULT '0';