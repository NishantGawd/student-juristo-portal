import { connection } from "next/server";
import { Suspense } from "react";
import type { Metadata } from "next";
import { deleteTrailingMessages, serverUpdateChatVisibility } from "@/app/(chat)/chat-actions";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { createPageMetadata } from "@/lib/seo";
import { generateUUID } from "@/lib/utils";

import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = createPageMetadata({
  title: "Embedded Legal AI Support",
  description: "Embedded Juristo AI support chat for private legal assistance.",
  path: "/widget",
  noIndex: true,
});

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const { context } = await searchParams;
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <WidgetChat context={context} />
    </Suspense>
  );
}

async function WidgetChat({ context }: { context?: string }) {
  await connection();
  const id = generateUUID();

  return (
    <main className="h-dvh w-full overflow-hidden bg-background">
      <TooltipProvider>
        <Chat
          autoResume={false}
          deleteTrailingMessagesAction={deleteTrailingMessages}
          globalUpdateChatVisibilityAction={serverUpdateChatVisibility}
          id={id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          initialVisibilityType="private"
          isReadonly={false}
          key={id}
          isWidget={true}
          context={context}
        />
        <DataStreamHandler />
      </TooltipProvider>
    </main>
  );
}
