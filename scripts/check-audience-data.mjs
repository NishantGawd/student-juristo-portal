import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.POSTGRES_URL, { ssl: "prefer" });

async function checkData() {
  try {
    const res = await sql`SELECT audience, COUNT(*) FROM "User" GROUP BY audience;`;
    console.log("Audience groups in DB:");
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

checkData();
