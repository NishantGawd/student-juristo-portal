// Cache bust for pdf-parse 1.1.1 downgrade
// Polyfills for pdfjs-dist (used by pdf-parse) in Node.js environment
// This prevents "ReferenceError: DOMMatrix is not defined" and other browser-api related errors

if (typeof Promise.withResolvers === 'undefined') {
    // @ts-ignore
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

if (typeof global.DOMMatrix === 'undefined') {
    // @ts-ignore
    global.DOMMatrix = class DOMMatrix {
        constructor() { }
        toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
    };
}

if (typeof global.Path2D === 'undefined') {
    // @ts-ignore
    global.Path2D = class Path2D { constructor() { } }
}

if (typeof global.ImageData === 'undefined') {
    // @ts-ignore
    global.ImageData = class ImageData { constructor() { } }
}

process.env.PDFJS_DISABLE_DOM_MATRIX_POLYFILL = 'true';

const pdf = require("pdf-parse/lib/pdf-parse.js");

/**
 * Extracts text from a scanned/image-based PDF using AWS Textract.
 * Falls back to this when pdf-parse returns insufficient text.
 */
async function extractTextViaTextract(buffer: Buffer): Promise<string> {
    const { TextractClient, DetectDocumentTextCommand } = await import("@aws-sdk/client-textract");

    const client = new TextractClient({
        region: process.env.AWS_REGION || "eu-north-1",
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

    const command = new DetectDocumentTextCommand({
        Document: { Bytes: buffer },
    });

    const response = await client.send(command);

    const lines = (response.Blocks || [])
        .filter((block) => block.BlockType === "LINE" && block.Text)
        .map((block) => block.Text!);

    return lines.join("\n").trim();
}

/**
 * Smart PDF text extraction:
 * 1. Try pdf-parse (fast, works on text-based PDFs)
 * 2. If extracted text is too sparse (scanned PDF), fall back to AWS Textract OCR
 *
 * @param buffer - Raw PDF buffer
 * @param options.forceOcr - Skip pdf-parse entirely and use Textract directly
 */
export async function extractTextFromPdf(
    buffer: Buffer,
    { forceOcr = false }: { forceOcr?: boolean } = {}
): Promise<string> {
    // If the caller explicitly wants OCR (e.g., known scanned doc), skip pdf-parse
    if (forceOcr) {
        console.log("[PDF] Force OCR mode — using AWS Textract.");
        return extractTextViaTextract(buffer);
    }

    try {
        const data = await pdf(buffer);
        const text = data.text.replace(/\n\s*\n/g, '\n\n').trim();

        // Heuristic: if text is suspiciously short for any PDF, it is likely scanned
        if (text.length < 150) {
            console.log(
                `[PDF] Extracted text is too sparse (${text.length} chars). Falling back to AWS Textract OCR...`
            );
            return extractTextViaTextract(buffer);
        }

        return text;
    } catch (error) {
        console.warn("[PDF] pdf-parse failed, attempting Textract OCR fallback...", error);
        return extractTextViaTextract(buffer);
    }
}