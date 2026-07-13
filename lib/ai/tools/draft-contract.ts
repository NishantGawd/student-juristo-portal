import { z } from "zod";
import { tool, generateText, streamText } from "ai";
import { extractTextFromPdf } from "@/lib/pdf";
import { trackUserActivity } from "@/lib/activity/tracking";
import { extractKeywordsFromText, createTextPreview } from "@/lib/activity/keywords";
import {
  db,
  getContractBySlug,
  saveDocument,
  updateUserUsage,
} from "@/lib/db/queries";
import { getTemplateChunksBySlug } from "@/lib/db/upstash";
import { consultation, lawyerContract, contractReviewRequest } from "@/lib/db/schema";
import { eq, or, sql, ilike } from "drizzle-orm";
import { getContractDraftingModel } from "@/lib/ai/providers";
import { generateUUID } from "@/lib/utils";

// --- UTILITIES ---

/**
 * Generates a unique contract reference number.
 * Format: JUR/YYYY/TYPE/RANDOM
 */
function generateContractRef(contractType: string): string {
  const year = new Date().getFullYear();
  const typeCode = contractType
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase();
  const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `JUR / ${year} /${typeCode}/${randomId} `;
}

/**
 * Formats a date in Indian legal format.
 */
function formatLegalDate(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Parses "Key: Value" lines from text into a map.
 */
function parseKeyValuesFromText(text: string): Record<string, string> {
  let map: Record<string, string> = {};
  if (!text) return map;

  try {
    if (text.trim().startsWith('{')) {
      map = JSON.parse(text);
      return map;
    }

    const lineRegex = /([^:\n]+)\s*:\s*(.+)/g;
    let m: RegExpExecArray | null;
    while ((m = lineRegex.exec(text))) {
      const key = m[1].trim();
      const value = m[2].trim();
      if (key) map[key] = value;
    }
  } catch (error) {
    console.error("[DraftContract] Error parsing key-values:", error);
  }
  return map;
}

/**
 * Replaces {{ placeholder }} tags with provided values.
 */
function fillPlaceholders(
  template: string,
  values: Record<string, string>
): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, key) => {
    const k = key.trim();
    if (values[k]) return values[k];
    const lowerK = k.toLowerCase();
    for (const [vk, vv] of Object.entries(values)) {
      if (vk.toLowerCase() === lowerK) return vv;
    }
    return `{ {${k} } } `;
  });
}

/**
 * Handles content extraction from PDF URLs or Data URIs.
 */
async function getTemplateContentFromFile(
  url: string,
  templateName: string
): Promise<string> {
  try {
    console.log(
      `[DraftContract] Attempting file extraction: ${url.substring(0, 50)}...`
    );

    let buffer: Buffer;
    if (url.startsWith("data:")) {
      const base64Data = url.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
    } else {
      const res = await fetch(url);
      if (!res.ok)
        throw new Error(`Fetch failed with status: ${res.status} `);
      buffer = Buffer.from(await res.arrayBuffer());
    }

    const text = await extractTextFromPdf(buffer);
    return `\n-- - START OF TEMPLATE TEXT(${templateName})-- -\n${text} \n-- - END OF TEMPLATE TEXT-- -\n`;
  } catch (error) {
    console.error(
      `[DraftContract] PDF Extraction failed for ${templateName}: `,
      error
    );
    throw error;
  }
}

/**
 * Builds professional execution/signature block with initials placeholders.
 */
function buildExecutionBlock(params: {
  isSimulation: boolean;
  partyNames?: string[];
  contractTitle?: string;
}): string {
  const parties = params.partyNames || ["First Party", "Second Party"];

  let block = `

---

## EXECUTION

  ** IN WITNESS WHEREOF **, the Parties hereto have executed this Agreement on the date first written above.

`;

  for (const party of parties) {
    block += `
    ** For and on behalf of ${party}:**

| | |
| ---| ---|
| Signature | _________________________ |
| Name | _________________________ |
| Designation / Title | _________________________ |
| Company | _________________________ |
| Date | _________________________ |
| Place | _________________________ |

      `;
  }

  block += `
---

## WITNESSES

  ** Witness 1:**

| | |
| ---| ---|
| Signature | _________________________ |
| Name | _________________________ |
| Address | _________________________ |
| ID Proof No. | _________________________ |

** Witness 2:**

| | |
| ---| ---|
| Signature | _________________________ |
| Name | _________________________ |
| Address | _________________________ |
| ID Proof No. | _________________________ |

  ---

## NOTARY / ATTESTATION

  | | |
| ---| ---|
| Notarized By | _________________________ |
| Registration No. | _________________________ |
| Seal & Signature | _________________________ |
| Date of Notarization | _________________________ |

  ---

** Page Initials:** _______ / _______(Each party to initial every page)

---

* This document has been drafted using the ** Juristo Legal AI Platform **.The parties are advised to seek independent legal counsel before execution.Document Reference: Generated electronically.*

  `;

  return block;
}

// --- STANDARD CONTRACT STRUCTURE ---
const STANDARD_STRUCTURE = [
  "Preamble",
  "Recitals / Background",
  "Definitions",
  "Core Obligations",
  "Payment Terms",
  "Term & Termination",
  "Confidentiality",
  "Dispute Resolution",
  "Governing Law",
  "Signatures",
];

// --- TOOL DEFINITION ---

export const draftContract = ({ session, dataStream }: any = {}) =>
  tool({
    description:
      "Elite Drafting Engine: Finalizes a professional legal contract based on a Juristo template or lawyer-published template. Generates structured legal content and execution blocks. Use this after template confirmation and data collection.",
    inputSchema: z.object({
      contractType: z
        .string()
        .describe("The EXACT slug of the contract template (e.g., '11-month-rental-agreement'). Do NOT pass the display name."),
      userRequirements: z
        .string()
        .describe("The submitted form data or simulation parameters."),
      useDummyData: z
        .boolean()
        .default(false)
        .describe(
          "If true, triggers Simulation Mode with fictional data and non-enforceability disclaimers."
        ),
    }),
    execute: async ({ contractType, userRequirements, useDummyData }) => {
      const logContext = {
        contractType,
        useDummyData,
        timestamp: new Date().toISOString(),
      };
      console.log("[DraftContract] Execution started:", logContext);

      try {
        // 1. LOOK UP JURISTO TEMPLATE FIRST, THEN FALL BACK TO LAWYER CONTRACT
        const normalizedSlug = contractType
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

        let templateName = "";
        let templateSlug = "";
        let templateDescription = "";
        let templateAuthor = "Juristo Legal Team";
        let templateOutline: any[] = [];
        let templateContent = "";
        let templateRequiredFields: any[] = [];
        let templateApplicableActs = "";
        let templateFileUrl: string | null = null;
        let templateContentStructure: any = null;
        let templatePreviewContent: string | null = null;
        let isJuristoTemplate = false;

        // Try Juristo template first via Vector Database
        const vectorChunks = await getTemplateChunksBySlug(contractType) || await getTemplateChunksBySlug(normalizedSlug);

        if (vectorChunks && vectorChunks.length > 0) {
          isJuristoTemplate = true;
          // Metadata is shared across all chunks for the same slug
          const meta = vectorChunks[0].metadata;
          templateName = meta?.title || meta?.name || "Verified Juristo Template";
          templateSlug = meta?.slug || contractType;
          templateDescription = meta?.category ? `Verified ${meta.category} template` : "Juristo Legal Template";
          templateFileUrl = meta?.sourceUrl || null;

          // Assemble the full content from the ordered chunks
          templateContent = vectorChunks.map(c => c.metadata?.text || c.data).join("\n\n");

          console.log("[DraftContract] Using Juristo Vector Template:", templateSlug, "with", vectorChunks.length, "chunks");
        } else {
          // Fall back to lawyer contract
          const [lawyerTpl] = await db
            .select()
            .from(lawyerContract)
            .where(
              or(
                eq(lawyerContract.slug, contractType),
                eq(lawyerContract.slug, normalizedSlug)
              )
            )
            .limit(1);

          if (!lawyerTpl) {
            console.error("[DraftContract] Template not found:", contractType);
            return {
              success: false,
              status: "template_not_found",
              message: `The template '${contractType}' was not found.Please try a different contract type.`,
            };
          }

          templateName = lawyerTpl.name;
          templateSlug = lawyerTpl.slug;
          templateDescription = lawyerTpl.description;
          templateAuthor = lawyerTpl.lawyerName || "Juristo Legal Team";
          templateContentStructure = lawyerTpl.contentStructure;
          templatePreviewContent = lawyerTpl.previewContent;
          console.log("[DraftContract] Using lawyer contract:", lawyerTpl.slug);
        }

        // 2. PARSE USER DATA
        const values = parseKeyValuesFromText(userRequirements);
        const jurisdiction =
          values["Jurisdiction"] ||
          values["jurisdiction"] ||
          values["State"] ||
          values["state"] ||
          "Delhi";

        // 3. GENERATE CONTRACT METADATA
        const contractRef = generateContractRef(templateSlug || contractType);

        // 4. BUILD CONTENT FROM TEMPLATE
        let contentBody = "";
        try {
          if (isJuristoTemplate) {
            // Use Juristo template's contentTemplate directly
            contentBody = templateContent;
          } else if (templateFileUrl) {
            contentBody = await getTemplateContentFromFile(
              templateFileUrl,
              templateName
            );
          } else if (templateContentStructure) {
            const parsed =
              typeof templateContentStructure === "string"
                ? JSON.parse(templateContentStructure)
                : templateContentStructure;

            contentBody =
              parsed.sections
                ?.map((s: any) => `## ${s.title} \n\n${s.content} `)
                .join("\n\n") ||
              templatePreviewContent ||
              "";
          } else {
            contentBody =
              templatePreviewContent ||
              `# ${templateName} \n\n${templateDescription} `;
          }
        } catch (contentError) {
          console.warn(
            "[DraftContract] Content extraction failed, using fallback:",
            contentError
          );
          contentBody = `# ${templateName} \n\n${templateDescription || "Drafting basis: Standard Professional Terms."} `;
        }

        // 5. FILL PLACEHOLDERS WITH USER DATA
        let filledContent = fillPlaceholders(contentBody, values);

        // 6. EXTRACT PARTY NAMES FOR EXECUTION BLOCK
        const partyNames: string[] = [];
        for (const [key, val] of Object.entries(values)) {
          const lk = key.toLowerCase();
          if (
            lk.includes("party") ||
            lk.includes("landlord") ||
            lk.includes("tenant") ||
            lk.includes("employer") ||
            lk.includes("employee") ||
            lk.includes("licensor") ||
            lk.includes("licensee") ||
            lk.includes("seller") ||
            lk.includes("buyer") ||
            lk.includes("client") ||
            lk.includes("vendor") ||
            lk.includes("disclosing") ||
            lk.includes("receiving") ||
            lk.includes("company") ||
            lk.includes("consultant")
          ) {
            if (val && val.length > 1) partyNames.push(val);
          }
        }

        // 7. BUILD EXECUTION BLOCK (with initials)
        const executionBlock = buildExecutionBlock({
          isSimulation: useDummyData,
          partyNames: partyNames.length > 0 ? partyNames : undefined,
          contractTitle: templateName,
        });

        // 8. ASSEMBLE FINAL PROFESSIONAL CONTENT
        const finalContent = filledContent + executionBlock;

        // 9. BUILD OUTLINE INSTRUCTIONS
        const outlineSection = isJuristoTemplate && templateOutline.length > 0
          ? `
TEMPLATE OUTLINE(from Juristo repository — follow this structure):
${templateOutline.map((s: any, i: number) => `  ${i + 1}. ${typeof s === "string" ? s : s.title || s.name || JSON.stringify(s)}`).join("\n")}
`
          : `
STANDARD CONTRACT STRUCTURE(follow this order):
${STANDARD_STRUCTURE.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
`;

        const applicableActsSection = templateApplicableActs
          ? `\nAPPLICABLE STATUTES: ${templateApplicableActs} \nYou MUST reference these specific acts in the relevant clauses.\n`
          : "";

        // 10a. BUILD STRUCTURED USER DATA BLOCK FOR CLAUDE
        // This ensures ALL user-submitted form data is available to Claude,
        // even if the template didn't have matching {{placeholders}} for every field.
        const userDataEntries = Object.entries(values);
        const userDataBlock = userDataEntries.length > 0
          ? `
USER-PROVIDED DATA (MANDATORY — You MUST incorporate ALL of this into the contract):
╔══════════════════════════════════════════════════╗
${userDataEntries.map(([key, val]) => `  ${key}: ${val}`).join("\n")}
╚══════════════════════════════════════════════════╝

CRITICAL: Every single piece of data listed above MUST appear in the final document.
- Party names → Preamble, Recitals, Signature blocks
- Addresses → Preamble party descriptions, Notices clause
- Dates/Duration → Term clause, Preamble date
- Amounts/Rent/Salary → Payment Terms, Schedules
- Email/Phone → Notices clause
- Any other field → Place in the most relevant clause or create a new sub-clause if needed
Do NOT leave any user-provided information unused. If a field doesn't fit an existing clause, add it under "Additional Terms" or "Special Conditions".
`
          : "";

        // 10. BUILD COMPREHENSIVE CLAUDE DRAFTING SYSTEM PROMPT
        const claudeDraftingPrompt = `
You are Juristo's Elite Legal Drafting Engine. You are a world-class legal document drafter specializing in Indian law.
You MUST produce a BEST-IN-CLASS, professional, legally sound contract document in markdown format.

CONTRACT REFERENCE: ${contractRef}
MODE: ${useDummyData ? "🔶 SIMULATION (Dummy Data — All details are fictional)" : "🟢 PRODUCTION (Verified User Data)"}
JURISDICTION: ${jurisdiction}
TEMPLATE SOURCE: ${isJuristoTemplate ? "Juristo Repository (state-specific)" : `Lawyer: ${templateAuthor}`}
${applicableActsSection}

You have been given:
1. A template body with user data filled into placeholders where they matched
2. An execution block with signature/witness/notary sections
3. A COMPLETE list of ALL user-submitted data (see USER-PROVIDED DATA below)
${outlineSection}
${userDataBlock}
${templateFileUrl ? `\n⚠️ CITATION REQUIREMENT: This template was sourced from ${templateFileUrl}.\nAdd a footnote at the bottom indicating it was generated from the official Juristo Master Template.\n` : ""}

YOUR TASK: Produce a complete, polished, professional legal document by ENHANCING the provided template content. Follow this structure:

A. PREAMBLE — Who the parties are and the date:
   "THIS ${templateName.toUpperCase()} (\"Agreement\") is made and executed on this ${formatLegalDate()}, at ${jurisdiction}."

B. RECITALS / BACKGROUND — The "whereas" clauses explaining why the contract exists.
   "WHEREAS, the First Party is engaged in..."
   "WHEREAS, the Second Party desires to..."
   "WHEREAS, both parties have agreed to enter into this Agreement on the terms herein."

C. DEFINITIONS — Define all key terms used throughout the contract.
   Bold each defined term on first use: **"Agreement"**, **"Confidential Information"**, **"Parties"**, etc.

D. CORE OBLIGATIONS — What each party must do. Structure with numbered clauses:
   - Main clauses: 1, 2, 3...
   - Sub-clauses: 1.1, 1.2, 1.3...
   - Sub-sub-clauses: 1.1.1, 1.1.2...

E. PAYMENT TERMS — If money is involved, include payment schedules, amounts, due dates.

F. TERM & TERMINATION — Duration, renewal terms, and termination procedures.

G. CONFIDENTIALITY — Mutual non-disclosure obligations if applicable.

H. DISPUTE RESOLUTION — Arbitration/mediation preference + court jurisdiction:
   "Any dispute shall first be resolved through mediation, failing which through arbitration under the Arbitration and Conciliation Act, 1996."

I. GOVERNING LAW — Which state's law applies:
   "This Agreement shall be governed by the laws of India, with courts at ${jurisdiction} having exclusive jurisdiction."

J. ADDITIONAL BOILERPLATE:
   - **Indemnification** — mutual indemnification provisions
   - **Force Majeure** — excusal for events beyond control
   - **Severability** — invalid clauses don't void entire agreement
   - **Entire Agreement** — supersedes all prior agreements
   - **Amendment** — modifications only in writing signed by both parties
   - **Waiver** — no waiver unless in writing
   - **Notices** — written notice requirements with addresses

K. SIGNATURES — Preserve the execution block EXACTLY as provided at the end. Do NOT modify it.

${useDummyData ? `
L. SIMULATION MODE:
   - Replace ALL remaining {{placeholders}} with realistic fictional Indian data
   - Add a prominent disclaimer: "FOR DEMONSTRATION PURPOSES ONLY — NOT LEGALLY ENFORCEABLE"
` : ""}

FORMATTING RULES:
- Use proper markdown headings (## for main sections, ### for subsections)
- Bold all defined terms on first use
- Use tables for structured data (payment schedules, milestones)
- Keep legal register — formal, precise language. No casual tone.
- Use "shall" for obligations, "may" for permissions, "must" for mandatory requirements
- Add "Schedule" / "Annexure" sections if the contract type warrants it
- Output ONLY the contract document content. No preamble, no commentary, no explanation.
`;

        // 11. CALL CLAUDE SONNET FOR PREMIUM CONTRACT GENERATION WITH DIRECT STREAMING
        let claudeGeneratedContent = ""; 
        const documentId = generateUUID();

        try {
          console.log("[DraftContract] Calling Claude Sonnet for premium contract generation...");
          
          if (dataStream) {
            dataStream.write({ type: "data-kind", data: "text", transient: true });
            dataStream.write({ type: "data-id", data: documentId, transient: true });
            dataStream.write({ type: "data-title", data: templateName, transient: true });
            
            if (templateSlug) {
              dataStream.write({
                type: "data-contract-meta",
                data: {
                  contractSlug: templateSlug,
                  isFree: false, // Defaulting for direct stream bypass
                  hasAccess: true,
                  price: 0
                },
                transient: true
              });
            }
            
            dataStream.write({ type: "data-clear", data: null, transient: true });
          }

          const draftingModel = getContractDraftingModel();
          const claudeResult = streamText({
            model: draftingModel as any,
            system: claudeDraftingPrompt,
            prompt: `Here is the template content with user data filled in and the execution block appended. Enhance this into a complete, professional legal document.

IMPORTANT: The user submitted the following data through the contract form. Make sure EVERY piece of this information appears in the appropriate section of the contract:
${userDataEntries.map(([key, val]) => `- ${key}: ${val}`).join("\n")}

--- TEMPLATE CONTENT START ---
${finalContent}
--- TEMPLATE CONTENT END ---`,
          });

          for await (const text of claudeResult.textStream) {
            claudeGeneratedContent += text;
            if (dataStream) {
              dataStream.write({
                type: "data-textDelta",
                data: text,
                transient: true,
              });
            }
          }
          
          if (dataStream) {
            dataStream.write({ type: "data-finish", data: null, transient: true });
          }

          if (claudeGeneratedContent.length > 100) {
            console.log(
              "[DraftContract] Claude Sonnet generation successful. Output length:",
              claudeGeneratedContent.length
            );

            // Log token usage for cost tracking
            const usage = await claudeResult.usage as any;
            if (usage) {
              console.log("[DraftContract] Claude usage:", {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
              });
            }
            
            // Save to DB directly
            if (session?.user?.id) {
              await saveDocument({
                id: documentId,
                title: templateName,
                content: claudeGeneratedContent,
                kind: "text",
                userId: session.user.id,
              });
              
              await updateUserUsage({
                id: session.user.id,
                draftDiff: 1,
              });
              console.log("[DraftContract] Document saved and usage tracked.");

              // Track contract_drafted activity
              const draftText = `${templateName} ${userRequirements}`;
              const draftKeywords = extractKeywordsFromText(draftText);
              trackUserActivity({
                userId: session.user.id,
                eventType: "contract_drafted",
                sourceTable: "Document",
                sourceId: documentId,
                userPlan: (session.user as any).plan || "free",
                model: "claude-sonnet",
                textPreview: createTextPreview(`Drafted: ${templateName}`),
                keywords: draftKeywords,
                metadata: {
                  contractSlug: templateSlug,
                  contractRef,
                  templateName,
                  isSimulation: useDummyData,
                  jurisdiction,
                },
              }).catch(() => {});

            }
          } else {
            console.warn(
              "[DraftContract] Claude returned insufficient content, falling back to template-assembled content."
            );
            claudeGeneratedContent = finalContent;
          }
        } catch (claudeError) {
          console.error(
            "[DraftContract] Claude Sonnet generation failed, falling back to template content:",
            claudeError
          );
          claudeGeneratedContent = finalContent;
          if (dataStream) {
            dataStream.write({ type: "data-finish", data: null, transient: true });
          }
        }

        // 12. BUILD FAST PASS-THROUGH INSTRUCTIONS FOR THE MAIN CHAT LLM
        const passThruInstructions = `
CONTRACT DOCUMENT READY
================================================

The contract has been professionally drafted and is ALREADY displayed to the user in the UI.
You do NOT need to generate the contract text or call createDocument.

YOU MUST:
1. IMMEDIATELY call 'offerNextSteps' with:
   - contractSlug: "${templateSlug}"
   - templateName: "${templateName}"
   - documentId: "${documentId}"

2. In the chat message, simply confirm:
   "Your ${templateName} has been drafted successfully with Contract Ref: ${contractRef}. You can view, edit, and download it from the document panel."

CRITICAL: Do NOT attempt to output the contract text. Do NOT call createDocument.
`;

        console.log(
          "[DraftContract] Professional drafting successful for:",
          templateSlug
        );
        return {
          success: true,
          templateName,
          contractSlug: templateSlug,
          contractRef,
          documentId,
          instructions: passThruInstructions,
        };
      } catch (globalError) {
        console.error(
          "[DraftContract] FATAL ERROR during execution:",
          globalError,
          logContext
        );
        return {
          success: false,
          error: "Internal Drafting Engine Error",
          message:
            "An unexpected error occurred while preparing your document. Please try again or contact support.",
        };
      }
    },
  });
