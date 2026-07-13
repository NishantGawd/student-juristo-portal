import type { UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { codeDocumentHandler } from "@/app/artifacts/code/server";
import { textDocumentHandler } from "@/app/artifacts/text/server";
import type { ArtifactKind } from "@/components/artifact";
import { saveDocument } from "../db/queries";
import type { Document } from "../db/schema";
import type { ChatMessage } from "../types";

export type SaveDocumentProps = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
};

export type CreateDocumentCallbackProps = {
  id: string;
  title: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  initialContent?: string;
};

export type UpdateDocumentCallbackProps = {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
};

export type DocumentHandler<T = ArtifactKind> = {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
};

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      console.log("[DOC HANDLER] onCreateDocument called for:", args.title);

      // Check draft limit BEFORE creating the document
      if (args.session?.user?.id) {
        const { checkUserLimit } = await import("../usage/limit-checker");
        const limitCheck = await checkUserLimit(args.session.user.id, "drafts", 1);

        if (!limitCheck.allowed) {
          console.log("[DOC HANDLER] Draft limit reached, blocking creation");
          args.dataStream.write({
            type: "data-textDelta",
            data: `⚠️ You've reached your contract draft limit (${limitCheck.used}/${limitCheck.limit}). Please upgrade your plan to draft more contracts.`,
            transient: true,
          });
          args.dataStream.write({ type: "data-finish", data: null, transient: true });
          return;
        }
      }

      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
        session: args.session,
        initialContent: args.initialContent,
      });

      console.log("[DOC HANDLER] draftContent returned, length:", draftContent?.length || 0);
      console.log("[DOC HANDLER] Content preview:", draftContent?.substring(0, 100));

      if (args.session?.user?.id) {
        console.log("[DOC HANDLER] Saving document to database...");
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
        console.log("[DOC HANDLER] Document saved successfully");

        // Track draft usage
        const { updateUserUsage } = await import("../db/queries");
        await updateUserUsage({
          id: args.session.user.id,
          draftDiff: 1,
        });
        console.log("[DOC HANDLER] Draft usage tracked");
      } else {
        console.log("[DOC HANDLER] No user session, skipping save");
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        session: args.session,
      });

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
];

export const artifactKinds = ["text", "code"] as const;

