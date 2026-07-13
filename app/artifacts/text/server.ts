import { smoothStream, streamText } from "ai";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { getArtifactModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, initialContent }) => {
    let draftContent = "";

    if (initialContent && initialContent.length > 0) {
      console.log("[DOC HANDLER] Using provided initial content, length:", initialContent.length);
      draftContent = initialContent;

      // Stream in chunks to simulate generation and ensure client handles it well
      const chunkSize = 20;
      for (let i = 0; i < draftContent.length; i += chunkSize) {
        const chunk = draftContent.slice(i, i + chunkSize);
        dataStream.write({
          type: "data-textDelta",
          data: chunk,
          transient: true,
        });
        // Small delay to allow UI to update and look natural
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      return draftContent;
    }

    try {
      console.log("[ARTIFACT DEBUG] Generating artifact for title:", title);

      const model = getArtifactModel();
      console.log("[ARTIFACT DEBUG] Got artifact model");

      const result = streamText({
        model,
        system:
          "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
        prompt: title,
        experimental_transform: smoothStream({ chunking: "word" }),
      });

      console.log("[ARTIFACT DEBUG] streamText created, starting stream...");

      for await (const text of result.textStream) {
        draftContent += text;
        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }

      console.log("[ARTIFACT DEBUG] Stream complete, content length:", draftContent.length);

      const usage = await result.usage;
      console.log("[ARTIFACT DEBUG] Usage:", usage);
    } catch (error) {
      console.error("[ARTIFACT DEBUG] ERROR generating content:", error);
      draftContent = "Error generating content. Please try again.";
      dataStream.write({
        type: "data-textDelta",
        data: draftContent,
        transient: true,
      });
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    const { fullStream } = streamText({
      model: getArtifactModel(),
      system: updateDocumentPrompt(document.content, "text"),
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: description,
      providerOptions: {
        openai: {
          prediction: {
            type: "content",
            content: document.content,
          },
        },
      },
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});

