import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
    throw new Error("POSTGRES_URL is not set");
}
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
    try {
        console.log("Altering Lawyer.profileImage to text...");
        await db.execute(sql`ALTER TABLE "Lawyer" ALTER COLUMN "profileImage" TYPE text;`);
        console.log("Success.");

        console.log("Altering ContractReviewRequest.userId to varchar(255)...");
        await db.execute(sql`ALTER TABLE "ContractReviewRequest" ALTER COLUMN "userId" TYPE varchar(255);`);
        console.log("Success.");

        // Also change ContractReviewRequest.documentId in case of similar UUID issues, but we'll leave it for now.

    } catch (error) {
        console.error("Error running migrations:", error);
    } finally {
        await client.end();
    }
}

main();
