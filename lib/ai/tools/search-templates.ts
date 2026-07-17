import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { searchJuristoVectorTemplates } from "@/lib/db/upstash";
import { lawyerContract } from "@/lib/db/schema";
import { ilike, or, sql } from "drizzle-orm";

export const searchContractTemplates = () =>
  tool({
    description:
      "Search for contract templates in the Juristo repository. Searches Juristo's own state-wise templates first, then lawyer-published marketplace contracts as alternatives.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Search keywords for the contract type (e.g., 'NDA', 'Rental Agreement', 'Employment')."
        ),
      state: z
        .string()
        .optional()
        .describe(
          "Indian state for state-specific templates (e.g., 'Maharashtra', 'Delhi', 'Karnataka'). If known, helps find the most relevant template."
        ),
    }),
    execute: async ({ query, state }) => {
      try {
        // 1. Search Juristo's own state-wise templates via Upstash Vector Search
        // This performs a semantic search with automatic state abbreviation/metadata filtering 
        const vectorResults = await searchJuristoVectorTemplates(query, state, 3);

        // Group vectors by template slug so we can reconstruct the overall template
        const uniqueTemplates = new Map();
        for (const match of vectorResults) {
          if (!match.metadata) continue;
          if (!uniqueTemplates.has(match.metadata.slug)) {
            uniqueTemplates.set(match.metadata.slug, match.metadata);
          }
        }

        const juristoTemplates = Array.from(uniqueTemplates.values());

        // 2. Also search lawyer-published contracts as marketplace alternatives
        const searchPattern = `%${query.replace(/\s+/g, "%")}%`;
        const lawyerTemplates = await db
          .select()
          .from(lawyerContract)
          .where(
            or(
              ilike(lawyerContract.name, searchPattern),
              ilike(lawyerContract.category, searchPattern),
              ilike(lawyerContract.slug, searchPattern),
              sql`${lawyerContract.tags}::text ILIKE ${searchPattern}`
            )
          )
          .limit(3);

        // 3. Build response based on what was found
        const hasJuristo = juristoTemplates.length > 0;
        const hasLawyer = lawyerTemplates.length > 0;

        if (!hasJuristo && !hasLawyer) {
          return {
            status: "not_found",
            message: `No templates found matching "${query}". Ask the user if they want to generate a fully AI-drafted contract or connect with a Juristo lawyer.`,
          };
        }

        const result: any = { status: "found" };

        // Juristo template (primary — used for drafting)
        if (hasJuristo) {
          const match = juristoTemplates[0];
          result.juristoTemplate = {
            name: match.title || match.name, // Upstash uses 'title', Postgres used 'name'
            slug: match.slug,
            state: match.state,
            stateCode: match.stateCode,
            category: match.category,
            sourceUrl: match.sourceUrl, // Crucial for RAG citations
            description: match.description || "Verified Juristo Template",
            applicableActs: match.applicableActs,
          };
          // If there are state variants, include them
          if (juristoTemplates.length > 1) {
            result.stateVariants = juristoTemplates.slice(1).map((t) => ({
              name: t.name,
              slug: t.slug,
              state: t.state,
            }));
          }
        }

        // Lawyer marketplace contracts (secondary — suggest to browse/buy)
        if (hasLawyer) {
          result.lawyerContracts = lawyerTemplates.map((t) => ({
            name: t.name,
            slug: t.slug,
            lawyerName: t.lawyerName,
            price: t.price,
            tier: t.tier,
          }));
        }

        // Build message for the AI to explain the template match and next steps in plain text.
        let msg = "";
        if (hasJuristo) {
          const jt = juristoTemplates[0];
          msg += `Found a Juristo Standard Template: "${jt.title || jt.name}" for ${jt.state}. `;
          if (jt.applicableActs) msg += `Governed by: ${jt.applicableActs}. `;
          msg += `Tell the user they can use the Juristo template, browse lawyer-published marketplace contracts if available, or ask Juristo to generate a fresh AI draft.`;
          if (juristoTemplates.length > 1) {
            msg += `\nAlso available for other states: ${juristoTemplates.slice(1).map((t) => t.state).join(", ")}`;
          }
        } else {
          const lt = lawyerTemplates[0];
          msg += `No Juristo standard template found, but found lawyer-published contract "${lt.name}" by ${lt.lawyerName} in the marketplace. `;
          msg += `Tell the user they can browse the marketplace contract or ask Juristo to generate a fresh AI draft.`;
        }

        result.message = msg;
        return result;
      } catch (error) {
        console.error("[SearchTemplates Tool Error]:", error);
        return {
          status: "error",
          error: "Failed to query the contract template repository.",
        };
      }
    },
  });
