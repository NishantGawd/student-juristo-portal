"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Search,
  LayoutDashboard,
  Sparkles,
  GraduationCap,
  Zap,
  FileText,
  Archive,
  BookOpen,
  Scale,
  Newspaper,
  ClipboardList,
  Briefcase,
  MessageSquarePlus,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { Chat } from "@/lib/db/schema";
import { useSidebar } from "@/components/ui/sidebar";

type ChatHistory = {
  chats: Chat[];
  hasMore: boolean;
};

const quickLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Chat", href: "/chat", icon: MessageSquarePlus, action: "new-chat" },
  { label: "Legal AI Plans", href: "/upgrade#professional-plans", icon: Sparkles },
  { label: "CLAT Mentor", href: "/clat-exam", icon: GraduationCap },
  { label: "Student Bundles", href: "/upgrade#student-plans", icon: Zap },
];

const legalTools = [
  { label: "AI Contracts", href: "/contracts", icon: FileText },
  { label: "Legal Vaults", href: "/vaults", icon: Archive },
  { label: "Bare Acts", href: "/legal/bare-acts", icon: BookOpen },
  { label: "SC Judgements", href: "/legal/judgements/sc", icon: Scale },
  { label: "HC Judgements", href: "/legal/judgements/hc", icon: Newspaper },
  { label: "Track Requests", href: "/lawyers/requests", icon: ClipboardList },
  { label: "Find Lawyers", href: "https://lawyer.juristo.in/", icon: Briefcase, external: true },
];

export function SearchCommandDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Fetch chat history when dialog opens
  useEffect(() => {
    if (open && chats.length === 0) {
      setIsLoadingChats(true);
      fetch("/api/history?limit=50")
        .then((res) => res.json())
        .then((data: ChatHistory) => {
          setChats(data.chats);
          setIsLoadingChats(false);
        })
        .catch(() => setIsLoadingChats(false));
    }
  }, [open]);

  const navigate = useCallback(
    (href: string, options?: { external?: boolean; action?: string }) => {
      onOpenChange(false);
      setOpenMobile(false);

      if (options?.action === "new-chat") {
        router.push("/chat");
        router.refresh();
        return;
      }

      if (options?.external) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      router.push(href);
    },
    [router, onOpenChange, setOpenMobile]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search chats..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Links">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                onSelect={() => navigate(item.href, { action: item.action })}
                className="gap-3 px-3 py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                  <Icon className="size-4" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Legal Workspace">
          {legalTools.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                onSelect={() =>
                  navigate(item.href, { external: item.external })
                }
                className="gap-3 px-3 py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                  <Icon className="size-4" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {chats.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Chats">
              {chats.map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={`chat-${chat.id}-${chat.title ?? ""}`}
                  onSelect={() => navigate(`/chat/${chat.id}`)}
                  className="gap-3 px-3 py-2.5"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-sm">
                      {chat.title ?? "Untitled chat"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {isLoadingChats && (
          <div className="px-4 py-3 text-center text-sm text-muted-foreground">
            Loading chats...
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
