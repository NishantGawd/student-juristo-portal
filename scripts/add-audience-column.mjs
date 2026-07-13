import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.POSTGRES_URL, { ssl: "prefer" });

async function migrate() {
  console.log("🔍 Checking if 'audience' column exists on User table...");

  const result = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'audience'
  `;

  if (result.length > 0) {
    console.log("✅ Column 'audience' already exists. No changes needed.");
  } else {
    console.log("➕ Adding 'audience' column to User table...");
    await sql`ALTER TABLE "User" ADD COLUMN "audience" VARCHAR(20)`;
    console.log("✅ Column 'audience' added successfully. No data lost.");
  }

  await sql.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
