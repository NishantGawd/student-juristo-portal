import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { trackUserActivity } from "@/lib/activity/tracking";
import { extractKeywordsFromText } from "@/lib/activity/keywords";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import { getContractPurchase } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      "Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind. If this is a contract derived from a template, MUST pass the contractSlug.",
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
      content: z.string().optional().describe("The full content of the document. If provided, this will be used verbatim instead of generating new content."),
      contractSlug: z.string().optional().describe("The slug of the contract template if this document is based on one."),
    }),
    execute: async ({ title, kind, content, contractSlug }) => {
      const id = generateUUID();

      dataStream.write({
        type: "data-kind",
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
        initialContent: content,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      // Track document_created activity
      if (session?.user?.id) {
        trackUserActivity({
          userId: session.user.id,
          eventType: "document_created",
          sourceTable: "Document",
          sourceId: id,
          userPlan: (session.user as any).plan || "free",
          textPreview: `Created document: ${title}`,
          keywords: extractKeywordsFromText(title),
          metadata: { kind, contractSlug: contractSlug || null },
        }).catch(() => {});
      }

      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      };
    },
  });


