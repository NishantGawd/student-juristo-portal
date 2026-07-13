import { tool } from "ai";
import { z } from "zod";

export const offerNextSteps = () => tool({
    description: "Presents the final options to the user after a contract has been successfully generated: 'Pay & Download' or 'Connect with Lawyer'. You MUST pass the documentId returned from the createDocument tool.",
    inputSchema: z.object({
        contractSlug: z.string().describe("The slug of the contract that was generated"),
        templateName: z.string().describe("The human-readable name of the contract"),
        price: z.number().optional().describe("The price to pay for the contract (if applicable)"),
        documentId: z.string().optional().describe("The UUID of the document that was just created by the createDocument tool"),
    }),
    execute: async ({ contractSlug, templateName, price, documentId }) => {
        const paymentRequired = price ? price > 0 : false;

        // This will trigger a specific generative UI block on the frontend
        return {
            status: "next_steps_presented",
            contractSlug,
            templateName,
            price,
            documentId,
            paymentRequired,
            lawyerMarketplaceUrl: process.env.NEXT_PUBLIC_LAWYER_SERVICE_URL || "http://localhost:3001",
            message: "Presented final next steps to the user.",
        };
    }
});

