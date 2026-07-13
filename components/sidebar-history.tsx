"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "next-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Chat } from "@/lib/db/schema";
import { LoaderIcon } from "./icons";
import { ChatItem } from "./sidebar-history-item";
import type { VisibilityType } from "./visibility-selector";

const PAGE_SIZE = 20;

export type ChatHistory = {
  chats: Chat[];
  hasMore: boolean;
};

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats
  );
};

export function SidebarHistory({
  user,
  globalUpdateChatVisibilityAction,
}: {
  user: User | undefined;
  globalUpdateChatVisibilityAction: (payload: {
    chatId: string;
    visibility: VisibilityType;
  }) => Promise<void>;
}) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Track dynamic session parameter from the workspace URL
  const activeChatId = searchParams ? searchParams.get("chatId") : null;

  const [chats, setChats] = useState<Chat[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/history?limit=${PAGE_SIZE}`);
      if (!res.ok) return;
      const data: ChatHistory = await res.json();
      setChats(data.chats);
      setHasMore(data.hasMore);
      setIsLoading(false);
    } catch (e) {
      console.error("[SIDEBAR] Failed to fetch history:", e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchHistory();
  }, [user, pathname]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = () => fetchHistory();
    window.addEventListener("juristo-history-sync", handler);
    return () => window.removeEventListener("juristo-history-sync", handler);
  }, []);

  // Structural Interceptor: Intercepts standard history navigation links and routes them into the dashboard sheet
  useEffect(() => {
    const handleHistoryLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor && anchor.pathname.startsWith("/chat/")) {
        e.preventDefault();
        const extractedId = anchor.pathname.split("/")[2];
        const currentTab = searchParams?.get("tab") || "dashboard";
        router.push(`/clat-exam?tab=${currentTab}&chatId=${extractedId}`);
      }
    };
    document.addEventListener("click", handleHistoryLinkClick, true);
    return () => document.removeEventListener("click", handleHistoryLinkClick, true);
  }, [router, searchParams]);

  const removeChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
  };

  const hasReachedEnd = !hasMore;
  const hasEmptyChatHistory = chats.length === 0;

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    const chatToDelete = deleteId;
    const isCurrentChat = activeChatId === chatToDelete;

    setShowDeleteDialog(false);

    const deletePromise = fetch(`/api/chat?id=${chatToDelete}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        removeChat(chatToDelete!);

        if (isCurrentChat) {
          const currentTab = searchParams?.get("tab") || "dashboard";
          router.replace(`/clat-exam?tab=${currentTab}`);
        }

        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });
  };

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 font-medium text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.12em]">
          Loading
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28].map((item) => (
              <div className="flex h-8 items-center gap-2 rounded-md px-2" key={item}>
                <div
                  className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-sidebar-accent-foreground/10"
                  style={{ "--skeleton-width": `${item}%` } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      {!hasEmptyChatHistory && (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.length > 0 &&
                (() => {
                  const groupedChats = groupChatsByDate(chats);

                  return (
                    <div className="flex flex-col gap-6">
                      {["today", "yesterday", "lastWeek", "lastMonth", "older"].map((key) => {
                        const list = groupedChats[key as keyof GroupedChats];
                        if (list.length === 0) return null;

                        const labelMap: Record<string, string> = {
                          today: "Today",
                          yesterday: "Yesterday",
                          lastWeek: "Last 7 days",
                          lastMonth: "Last 30 days",
                          older: "Older than last month",
                        };

                        return (
                          <div key={key}>
                            <div className="px-2 py-1 font-medium text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.12em]">
                              {labelMap[key]}
                            </div>
                            {list.map((chat) => (
                              <ChatItem
                                chat={chat}
                                globalUpdateChatVisibilityAction={globalUpdateChatVisibilityAction}
                                isActive={chat.id === activeChatId}
                                key={chat.id}
                                onDelete={(chatId) => {
                                  setDeleteId(chatId);
                                  setShowDeleteDialog(true);
                                }}
                                setOpenMobile={setOpenMobile}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
            </SidebarMenu>

            {hasReachedEnd ? (
              <div className="mt-8 flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
                End of history.
              </div>
            ) : (
              <div className="mt-8 flex flex-row items-center gap-2 p-2 text-zinc-500">
                <div className="animate-spin"><LoaderIcon /></div>
                <div>Loading Chats...</div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {hasEmptyChatHistory && (
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex w-full flex-row items-center justify-center gap-2 px-2 py-4 text-center text-sm text-zinc-500">
              Your conversations will appear here once you start chatting!
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chat session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}