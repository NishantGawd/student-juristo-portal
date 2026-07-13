import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { extractTextFromPdf } from "@/lib/pdf";
import mammoth from "mammoth";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(request: NextRequest) {
    console.log("----------------------------------------");
    console.log("[V2 Extract API] ⚡ API Route Hit!");

    try {
        const { url } = await request.json();
        console.log(`[V2 Extract API] 📥 Received Payload: ${url}`);

        if (!url) {
            return NextResponse.json({ error: "No URL provided" }, { status: 400 });
        }

        // 1. DETERMINE THE FETCH URL
        let fetchUrl = url;

        // If the database gave us just the Public ID (fileKey) instead of a full link, build the standard link
        if (!url.startsWith("http")) {
            console.log("[V2 Extract API] 🔧 Generating standard URL from Public ID...");
            fetchUrl = cloudinary.url(url, {
                secure: true,
                resource_type: "auto", // Use auto to support both image (PDF) and raw (DOCX)
            });
        }

        // 2. FETCH THE BYTES DIRECTLY
        console.log(`[V2 Extract API] ⏳ Fetching file bytes from: ${fetchUrl}`);
        const response = await fetch(fetchUrl);

        if (!response.ok) {
            console.error(`[V2 Extract API] ❌ Cloudinary rejected access. Status: ${response.status} ${response.statusText}`);
            throw new Error(`Cloudinary rejected access: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[V2 Extract API] 📦 File downloaded successfully. Size: ${buffer.length} bytes.`);

        // 3. DETECT FILE TYPE AND EXTRACT
        let extractedContent = "";
        const isDocx = fetchUrl.toLowerCase().includes(".docx");

        if (isDocx) {
            console.log("[V2 Extract API] 📝 Detected Word Document. Using Mammoth engine...");
            // mammoth extracts text directly from the .docx buffer
            const result = await mammoth.extractRawText({ buffer });
            extractedContent = result.value;
        } else {
            console.log("[V2 Extract API] ⚙️ Detected PDF. Using PDF engine...");
            extractedContent = await extractTextFromPdf(buffer);
        }

        console.log(`[V2 Extract API] ✅ Extraction Complete! Yielded ${extractedContent.length} characters.`);
        console.log("----------------------------------------");

        return NextResponse.json({ content: extractedContent });

    } catch (error: any) {
        console.error("[V2 Extract API] 🚨 FATAL ERROR CAUGHT:");
        console.error(error);
        console.log("----------------------------------------");
        return NextResponse.json({ 
            error: "Failed to read cloud document", 
            details: error.message 
        }, { status: 500 });
    }
}