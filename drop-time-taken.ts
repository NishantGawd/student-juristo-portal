import { config } from "dotenv";
config({ path: ".env" });
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { max: 1 });

async function main() {
  try {
    await sql`ALTER TABLE "QuizQuestion" DROP COLUMN IF EXISTS "timeTaken";`;
    console.log("Migration successful: Dropped timeTaken from QuizQuestion");
  } catch (err: any) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

main();
