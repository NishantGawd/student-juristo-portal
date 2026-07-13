import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db/queries";
import { lawyerContract, adminContracts } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";

function extractTemplatePlaceholders(text: string): string[] {
    if (!text) return [];
    const regex = /\{\{\s*([^}]+)\s*\}\}|\[\s*([^\]]+)\s*\]|<<\s*([^>]+)\s*>>/g;
    const matches = new Set<string>();
    let match;

    while ((match = regex.exec(text)) !== null) {
        // match[1] is from {{}}, match[2] is from [], match[3] is from <<>>
        const val = match[1] || match[2] || match[3];

        // Filter out empty strings or excessively long matches (safety boundary)
        if (val && val.trim().length > 0 && val.trim().length < 60) {
            matches.add(val.trim());
        }
    }
    return Array.from(matches);
}

/**
 * INTELLIGENT FIELD INFERENCE:
 * Guesses the input type based on the placeholder name to provide the best UI experience.
 */
function inferFieldType(placeholder: string): string {
    const lower = placeholder.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (lower.includes('signature') || lower.includes('signed') || lower.includes('sign')) {
        return "image_signature"; // New specific type for the frontend uploader
    }
    if (lower.includes('date')) return "date";
    if (lower.includes('email')) return "email";
    if (lower.includes('amount') || lower.includes('price') || lower.includes('salary') || lower.includes('fee')) return "number";
    if (lower.includes('state') || lower.includes('country') || lower.includes('jurisdiction')) return "select";
    if (lower.includes('description') || lower.includes('purpose') || lower.includes('details')) return "textarea";
    return "text"; // Standard Text Input fallback
}

// --- TOOL DEFINITION ---

export const askContractDetails = () => tool({
    description: "Triggers a structured form UI for the user to input precise contract details (e.g., Party Names, Rent Amount, Date, Jurisdiction). Use this AFTER a contract template has been confirmed. Supports text, number, date, textarea, and select field types.",
    inputSchema: z.object({
        contractType: z.string().describe("The EXACT slug of the contract template being drafted (e.g., '11-month-rental-agreement'). Do NOT pass the display name."),
        fieldsToRequest: z.array(z.object({
            id: z.string().describe("Unique identifier for the field (e.g., 'partyA', 'rentAmount')"),
            label: z.string().describe("Human readable label for the field (e.g., 'Landlord Name')"),
            type: z.enum(["text", "number", "date", "textarea", "select"]).describe("Type of input required. Use 'select' for dropdown choices like jurisdiction/state."),
            description: z.string().optional().describe("Help text for the user on what this field means"),
            options: z.array(z.object({
                value: z.string(),
                label: z.string(),
            })).optional().describe("Options for 'select' type fields. Each option has a value and display label."),
            section: z.string().optional().describe("Section group name for visual grouping (e.g., 'Party Details', 'Commercial Terms', 'Legal Details')"),
            required: z.boolean().optional().default(true).describe("Whether this field is required"),
        })).describe("List of exact fields you need from the user to fill out the contract template.")
    }),
    execute: async ({ contractType, fieldsToRequest }) => {
        return {
            status: "form_rendered",
            contractType,
            fields: fieldsToRequest,
            message: `Rendered an input form for '${contractType}'. Waiting for the user to submit it. DO NOT call 'draftContract' until the user responds with the filled data.`,
        };
    }
});
