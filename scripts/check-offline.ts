import * as dotenv from "dotenv";
dotenv.config();

import { db } from "../lib/db/queries";
import { lawyerContract } from "../lib/db/schema";
import { getContractsCollection } from "../lib/db/mongodb";

async function checkOffline() {
    try {
        console.log("Checking Postgres lawyerContract table...");
        const pgContracts = await db.select().from(lawyerContract);
        console.log(`Found ${pgContracts.length} lawyer contracts in Postgres.`);
        if (pgContracts.length > 0) {
            console.log("Sample:", pgContracts.map(c => c.slug).slice(0, 5));
        }

        console.log("\nChecking MongoDB contracts collection...");
        const contractsCol = await getContractsCollection();
        const mongoContracts = await contractsCol.find({}).toArray();
        console.log(`Found ${mongoContracts.length} templates in MongoDB.`);
        if (mongoContracts.length > 0) {
            console.log("Sample:", mongoContracts.map(c => c.slug).slice(0, 5));
        }

    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

checkOffline();
