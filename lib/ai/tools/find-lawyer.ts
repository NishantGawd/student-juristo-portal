import { z } from "zod";
import { tool } from "ai";
import { db } from "@/lib/db/queries";
import { lawyer } from "@/lib/db/schema";
import { eq, or, and, sql } from "drizzle-orm";

export const findLawyer = () => tool({
    description: "Find lawyers based on specialization, location, or name. Use this when the user asks to find a lawyer, get legal vetting, or connect with a legal professional.",
    inputSchema: z.object({
        specialization: z.string().optional().describe("The legal specialization to search for (e.g., 'Criminal', 'Divorce', 'Corporate', 'Rental')"),
        location: z.string().optional().describe("The city or state to search in"),
        name: z.string().optional().describe("The name of the lawyer to search for"),
        query: z.string().optional().describe("A general search query"),
        fetchAll: z.boolean().optional().describe("Set to true ONLY if the user explicitly asks to see ALL lawyers available in the marketplace."),
    }),
    execute: async ({ specialization, location, name, query, fetchAll }) => {
        console.log("[FindLawyer] Tool triggered with:", { specialization, location, name, query, fetchAll });
        try {
            // Build search query from inputs
            const searchTerms: string[] = [];
            if (specialization) searchTerms.push(specialization);
            if (location) searchTerms.push(location);
            if (name) searchTerms.push(name);
            if (query) searchTerms.push(query);
            const searchQuery = searchTerms.join(" ").trim();

            let whereClause;
            if (searchQuery) {
                const searchPattern = `%${searchQuery.toLowerCase()}%`;
                whereClause = and(
                    eq(lawyer.isVerified, true),
                    or(
                        sql`lower(${lawyer.name}) LIKE ${searchPattern}`,
                        sql`lower(${lawyer.specializations}) LIKE ${searchPattern}`,
                        sql`lower(${lawyer.bio}) LIKE ${searchPattern}`,
                        sql`lower(${lawyer.state}) LIKE ${searchPattern}`
                    )
                );
            } else {
                whereClause = eq(lawyer.isVerified, true);
            }

            const [{ total = 0 } = { total: 0 }] = await db
                .select({ total: sql<number>`count(*)` })
                .from(lawyer)
                .where(whereClause);

            // Keep chat output lightweight. The full directory is loaded by the side panel.
            const limitAmount = fetchAll ? 20 : 3;

            const results = await db
                .select()
                .from(lawyer)
                .where(whereClause)
                .limit(limitAmount);

            console.log(`[FindLawyer: DEBUG] Raw response from SQL:`, {
                totalLawyers: results.length,
                limitApplied: limitAmount,
                firstLawyerId: results[0]?.id
            });

            if (!results.length) {
                return {
                    success: true,
                    message: "No lawyers found matching the criteria. Try broadening your search.",
                    lawyers: [],
                    count: Number(total) || 0,
                    total: Number(total) || 0,
                    hasMore: false,
                    page: 1,
                    query: searchQuery,
                };
            }

            // Map to consistent shape for the UI
            const mappedLawyers = results.map((l: any) => {
                let specs: string[] = [];
                if (l.specializations) {
                    try {
                        specs = JSON.parse(l.specializations);
                    } catch {
                        specs = [l.specializations];
                    }
                }
                return {
                    id: l.id,
                    name: l.name,
                    specializations: specs,
                    experience: l.experience,
                    state: l.state,
                    bio: l.bio,
                    rating: l.rating,
                    isLive: l.isAvailable,
                    profileImage: l.profileImage,
                    uploadedContracts: [], // Not joined in this query for simplicity
                };
            });

            console.log(`[FindLawyer: DEBUG] Successfully mapped lawyers for UI output.`);

            return {
                success: true,
                count: Number(total) || mappedLawyers.length,
                total: Number(total) || mappedLawyers.length,
                lawyers: mappedLawyers,
                hasMore: (Number(total) || mappedLawyers.length) > mappedLawyers.length,
                page: 1,
                query: searchQuery,
                instruction: "Display a compact 'See lawyers' receipt that opens the paginated lawyer directory. Do not show fees or rates.",
            };
        } catch (error) {
            console.error("[FindLawyer] Error:", error);
            return {
                success: false,
                error: "Failed to search for lawyers due to a connection error. Please try again.",
                lawyers: [],
            };
        }
    },
});
