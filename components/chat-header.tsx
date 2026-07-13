"use client";

import { usePathname, useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/upgrade") return "Upgrade Plan";
  if (pathname === "/lawyers") return "Legal Experts";
  if (pathname.startsWith("/live-chat/") && pathname.includes("/overview"))
    return "Session Overview";
  if (pathname.startsWith("/live-chat/")) return "Live Consultation";
  if (pathname === "/" || pathname === "/chat") return "Juristo AI";
  if (pathname.startsWith("/chat/")) return "Juristo AI";
  return "Juristo";
}

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  chatTitle,
  globalUpdateChatVisibilityAction,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  chatTitle?: string;
  globalUpdateChatVisibilityAction: (payload: {
    chatId: string;
    visibility: VisibilityType;
  }) => Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const pageTitle = chatTitle || getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-1.5 border-border/30 border-b bg-background px-2 py-1.5 sm:gap-2 sm:px-2.5 sm:py-2 md:px-3 md:py-2">
      <SidebarToggle />

      <span className="mr-1 truncate font-semibold text-foreground text-sm">
        {pageTitle}
      </span>

      <Button
        className="ml-auto h-8 shrink-0 gap-1.5 border-0 bg-gradient-to-r from-indigo-500 to-purple-500 px-3 text-white hover:from-indigo-600 hover:to-purple-600"
        onClick={() => router.push("/upgrade")}
        size="sm"
      >
        <span className="font-semibold text-xs">Upgrade</span>
      </Button>

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          className=""
          globalUpdateChatVisibilityAction={globalUpdateChatVisibilityAction}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.chatTitle === nextProps.chatTitle
  );
});
