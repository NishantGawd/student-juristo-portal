import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";

export async function POST(req: NextRequest) {
    try {
        console.log("🎤 Blazing fast transcription request via Gateway (Gemini 2.5 Pro)");

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No audio provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        
        // CRITICAL FIX 1: Convert to Base64 string to completely bypass Next.js 'instanceof' boundary crashes
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const finalMime = file.type || "audio/webm";

        const gateway = createGateway({
            apiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY,
        });

        const transcriptionModel = gateway("google/gemini-2.5-pro");

        const { text } = await generateText({
            model: transcriptionModel as any,
            // CRITICAL FIX 2: Move instructions to the system prompt to keep the user payload structured
            system: `You are an advanced legal transcription engine for Juristo AI. 
            TASKS:
            1. Transcribe the audio with 100% accuracy.
            2. Correct obvious grammar mistakes while keeping legal terminology intact.
            3. Use proper casing for legal entities, statutes (e.g., 'Section 420'), and Indian courts.
            4. Return ONLY the finalized text. No quotes or intro text.`,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please transcribe the attached audio."
                        },
                        {
                            type: "file",
                            data: base64Data,
                            // CRITICAL FIX 3: Pass both mime keys to satisfy strict Zod validation across all AI SDK versions
                            mimeType: finalMime,
                            mediaType: finalMime,
                        } as any
                    ]
                }
            ],
            temperature: 0.1,
        });

        return NextResponse.json({
            success: true,
            text: text.trim(),
        });

    } catch (error: any) {
        console.error("🔥 Transcription error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Transcription failed",
                details: error?.data?.error?.message || error?.message 
            },
            { status: 500 }
        );
    }
}