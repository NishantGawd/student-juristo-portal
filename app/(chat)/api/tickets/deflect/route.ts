// app/(chat)/api/tickets/deflect/route.ts
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";

// Initialize the Vercel AI Gateway instance using your project-wide unified keys
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text, category } = await req.json();

    // Safety check boundary to save gateway credits on short/accidental keystrokes
    if (!text || text.length < 20) {
      return NextResponse.json({ suggestion: null });
    }

    const { text: suggestion } = await generateText({
      // Routes directly through your gateway mapping using your Juristo Mini configuration model
      model: gateway("google/gemini-3.5-flash") as any,
      system: `You are a Tier 1 Juristo Support AI. Your goal is to solve user problems instantly before they submit a support ticket. 
      Keep responses strictly under 2 sentences. Be incredibly polite and precise. 
      If the issue is too vague, complex, or requires human intervention (like billing refunds), reply with exactly "NULL".`,
      prompt: `Category: ${category}\nUser Issue: "${text}"\n\nProvide a suggested fix:`,
    });

    if (suggestion.trim() === "NULL") {
      return NextResponse.json({ suggestion: null });
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("AI Deflection Gateway Error:", error);
    return NextResponse.json({ suggestion: null }, { status: 500 });
  }
}