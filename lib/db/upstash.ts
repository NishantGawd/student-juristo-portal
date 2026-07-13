import { Index } from "@upstash/vector";

// Initialize the Upstash Vector Index
// Note: We use the ! operator because we expect these to be present in .env
// when the user provisions their Upstash Vector index.
export const vectorIndex = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

export type ContractVectorMetadata = {
    title: string;
    slug: string;
    state: string;
    stateCode: string;
    category: string;
    sourceUrl: string; // AWS S3 URL to the PDF
    chunkIndex: number;
    totalChunks: number;
    text: string; // The actual content of the chunk
};

/**
 * Searches the Upstash Vector database for the most relevant contract chunks.
 */
export async function searchJuristoVectorTemplates(
    query: string,
    stateFilter?: string,
    topK = 5
): Promise<any[]> {
    try {
        const filter = stateFilter && stateFilter !== "Pan-India"
            ? `stateCode = '${stateFilter}' OR stateCode = 'IN-ALL'`
            : "";

        const results = await vectorIndex.query<ContractVectorMetadata>({
            data: query,
            topK,
            includeMetadata: true,
            includeData: true,
            filter: filter || undefined,
        });

        return results;
    } catch (error) {
        console.error("[Upstash Vector] Search error:", error);
        return [];
    }
}

/**
 * Retrieves all chunks for a specific template slug from Upstash Vector.
 * Used during the drafting phase to assemble the full contract context.
 */
export async function getTemplateChunksBySlug(slug: string, limit = 50): Promise<any[]> {
    try {
        const results = await vectorIndex.query<ContractVectorMetadata>({
            data: `Fetch all chunks for ${slug}`, // Semantic dummy text, filter does the real work
            topK: limit,
            includeMetadata: true,
            includeData: true,
            filter: `slug = '${slug}'`,
        });

        // Sort chunks by their index to maintain chronological template order
        return results.sort((a, b) =>
            (a.metadata?.chunkIndex || 0) - (b.metadata?.chunkIndex || 0)
        );
    } catch (error) {
        console.error(`[Upstash Vector] Error fetching chunks for slug ${slug}:`, error);
        return [];
    }
}
