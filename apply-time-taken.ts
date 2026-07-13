import { config } from "dotenv";
config({ path: ".env" });
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { max: 1 });

async function main() {
  try {
    await sql`ALTER TABLE "QuizQuestion" ADD COLUMN "timeTaken" integer;`;
    console.log("Migration successful: Added timeTaken to QuizQuestion");
  } catch (err: any) {
    if (err.code === '42701') {
      console.log("Column already exists");
    } else {
      console.error("Migration failed:", err);
    }
  } finally {
    await sql.end();
  }
}

main();
