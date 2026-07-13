import { config } from "dotenv";
config({ path: ".env" });
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { max: 1 });

async function main() {
  try {
    await sql`ALTER TABLE "User" DROP COLUMN IF EXISTS "quizAnnouncementSeen";`;
    console.log("Migration successful: Dropped quizAnnouncementSeen from User");
  } catch (err: any) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

main();
