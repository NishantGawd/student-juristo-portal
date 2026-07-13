import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not set");
  }

  const sql = postgres(process.env.POSTGRES_URL);
  
  try {
    console.log("Adding optedInForUpdates to ExamProfile...");
    await sql`ALTER TABLE "ExamProfile" ADD COLUMN IF NOT EXISTS "optedInForUpdates" boolean DEFAULT false;`;
    
    console.log("Creating ExamUpdate table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "ExamUpdate" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "link" varchar(1024),
        "content" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
    `;
    console.log("Checking if column exists...");
    const cols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ExamProfile' AND column_name = 'optedInForUpdates';
    `;
    console.log("Found columns:", cols.map(c => c.column_name));
    
    console.log("✅ Successfully applied schema changes!");
  } catch (err) {
    console.error("❌ Error applying schema changes:", err);
  } finally {
    await sql.end();
  }
}

main();
