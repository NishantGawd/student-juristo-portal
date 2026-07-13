import * as dotenv from "dotenv";
dotenv.config();

import { vectorIndex, ContractVectorMetadata } from "./lib/db/upstash";

async function listContracts() {
    try {
        console.log("Fetching contracts from Upstash Vector...");
        // Since it's a vector DB, we can just do a broad query to get recent chunks
        // A better approach if supported is range()
        
        const results = await vectorIndex.query<ContractVectorMetadata>({
            data: "legal contract template agreement",
            topK: 1000,
            includeMetadata: true,
        });

        const uniqueContracts = new Map<string, any>();
        
        for (const res of results) {
            if (res.metadata && res.metadata.slug) {
                if (!uniqueContracts.has(res.metadata.slug)) {
                    uniqueContracts.set(res.metadata.slug, {
                        title: res.metadata.title,
                        slug: res.metadata.slug,
                        state: res.metadata.state,
                        category: res.metadata.category,
                        sourceUrl: res.metadata.sourceUrl,
                        chunks: 1
                    });
                } else {
                    const existing = uniqueContracts.get(res.metadata.slug);
                    existing.chunks += 1;
                }
            }
        }

        console.log(`\nFound ${uniqueContracts.size} unique contracts in RAG database:\n`);
        console.table(Array.from(uniqueContracts.values()));

    } catch (error) {
        console.error("Error fetching from Upstash:", error);
    }
}

listContracts();
