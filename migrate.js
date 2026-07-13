require('dotenv').config({ path: __dirname + '/.env' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  try {
    console.log('Connecting to database...');
    const sql = neon(process.env.POSTGRES_URL);
    
    await sql.query(`
      CREATE TABLE IF NOT EXISTS "PhoneVerification" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" varchar(255) NOT NULL,
        "otp" varchar(10) NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "verified" boolean DEFAULT false,
        "createdAt" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created PhoneVerification table');

    await sql.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" boolean DEFAULT false;`);
    await sql.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" boolean DEFAULT false;`);
    await sql.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workArea" varchar(255);`);
    await sql.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralSource" varchar(255);`);
    console.log('Added onboarding columns to User table');

    console.log('Migration completed safely without data loss!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
run();
