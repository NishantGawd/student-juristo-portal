CREATE TABLE IF NOT EXISTS "IntegrationToken" (
	"provider" varchar(64) PRIMARY KEY NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text NOT NULL,
	"expiresAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
