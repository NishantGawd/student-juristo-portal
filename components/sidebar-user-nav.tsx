"use client";

import { useState, useEffect } from "react";
import { ChevronUp, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { logOut } from "@/app/(auth)/actions";
import { useTheme } from "next-themes";
import { useSWRConfig } from "swr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MdUpgrade } from "react-icons/md";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { guestRegex } from "@/lib/constants";
import { LoaderIcon, TicketIcon } from "./icons";
import { cn } from "@/lib/utils";
import { toast } from "./toast";
import { EmailPreferencesDialog } from "@/components/email-preferences-dialog";
import Link from "next/link";

export function SidebarUserNav({ user }: { user: User }) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { cache } = useSWRConfig();
  
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  // Newsletter State
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isNewsletterLoading, setIsNewsletterLoading] = useState(false);
  const [isAuthLoading] = useState(false);

  // ─── ADDED: EMAIL PREFERENCES DIALOG STATE ───
  const [emailPrefsOpen, setEmailPrefsOpen] = useState(false);

  const isGuest = guestRegex.test(user?.email ?? "");

  const clearSWRCache = () => {
    for (const key of (cache as Map<string, unknown>).keys()) {
      (cache as Map<string, unknown>).delete(key);
    }
  };

  useEffect(() => {
    if (user?.email && !isGuest) {
      fetch("/api/newsletter/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      })
        .then((res) => res.json())
        .then((data) => setIsSubscribed(data.isSubscribed))
        .catch(console.error);
    }
  }, [user?.email, isGuest]);

  const handleSubscribe = async () => {
    if (!user?.email) return;
    setIsNewsletterLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, name: user.name, source: "v2_chatbot" }),
      });
      if (res.ok) {
        setIsSubscribed(true);
        toast({ description: "Successfully subscribed to the newsletter!", type: "success" });
      } else {
        const error = await res.json();
        toast({ type: "error", description: error.error || "Failed to subscribe" });
      }
    } catch {
      toast({ type: "error", description: "Failed to process request." });
    } finally {
      setIsNewsletterLoading(false);
    }
  };

  const handleOptOut = async () => {
    if (!user?.email) return;
    setIsNewsletterLoading(true);
    try {
      const res = await fetch(`/api/newsletter/opt-out?email=${encodeURIComponent(user.email)}`, { method: "DELETE" });
      if (res.ok) {
        setIsSubscribed(false);
        toast({ description: "You have opted out of the newsletter.", type: "error" });
      } else {
        toast({ type: "error", description: "Failed to opt out" });
      }
    } catch {
      toast({ type: "error", description: "Failed to process request." });
    } finally {
      setIsNewsletterLoading(false);
    }
  };

  const userNavButton = (
    <SidebarMenuButton
      className={cn(
        "bg-transparent hover:bg-zinc-50 dark:hover:bg-white/5 data-[state=open]:bg-zinc-100 dark:data-[state=open]:bg-white/10 transition-colors duration-200 ease-in-out font-medium text-[13px] rounded-none border border-transparent hover:border-zinc-200 dark:hover:border-white/10",
        isCollapsed ? "h-9 w-9 justify-center mx-auto p-0" : "h-11 justify-between px-3"
      )}
      data-testid="user-nav-button"
    >
      <Avatar className={cn("transition-all duration-200 rounded-none", isCollapsed ? "size-6" : "size-7")}>
        <AvatarImage
          src={user.image || `https://avatar.vercel.sh/${user.email}`}
          alt={user.email ?? "User Avatar"}
          className="rounded-none"
        />
        <AvatarFallback className="bg-zinc-100 dark:bg-[#080D1A] text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 text-xs font-bold rounded-none">
          {user.email?.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      {!isCollapsed && (
        <>
          <span className="truncate text-zinc-700 dark:text-zinc-300" data-testid="user-nav-button-text">
            {isGuest ? "Guest" : user?.email}
          </span>
          <ChevronUp className="ml-auto opacity-50 size-4 shrink-0 text-zinc-500" />
        </>
      )}
    </SidebarMenuButton>
  );

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            {isCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    {userNavButton}
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium text-[11px] rounded-none border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] text-zinc-900 dark:text-white">
                  {isGuest ? "Guest account" : user?.email}
                </TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenuTrigger asChild>
                {isAuthLoading ? (
                  <SidebarMenuButton className="h-11 justify-between bg-zinc-50 dark:bg-white/5 rounded-none border border-zinc-200 dark:border-white/10">
                    <div className="flex flex-row gap-2">
                      <div className="size-6 animate-pulse bg-zinc-200 dark:bg-zinc-800" />
                      <span className="animate-pulse bg-zinc-200 dark:bg-zinc-800 text-transparent">
                        Loading auth status
                      </span>
                    </div>
                    <div className="animate-spin text-zinc-500">
                      <LoaderIcon />
                    </div>
                  </SidebarMenuButton>
                ) : (
                  userNavButton
                )}
              </DropdownMenuTrigger>
            )}
            
            <DropdownMenuContent
              className="w-(--radix-popper-anchor-width) min-w-[220px] rounded-none shadow-sm border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] p-1"
              data-testid="user-nav-menu"
              side={isCollapsed ? "right" : "top"}
              align={isCollapsed ? "end" : "center"}
              sideOffset={isCollapsed ? 12 : 8}
            >
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 py-2.5 rounded-none focus:bg-zinc-50 dark:focus:bg-white/5 text-zinc-700 dark:text-zinc-300 focus:text-zinc-900 dark:focus:text-white"
                onSelect={() => router.push("/upgrade")}
              >
                <MdUpgrade size={15} className="opacity-70" />
                <span className="font-medium text-xs">Upgrade</span>
              </DropdownMenuItem>
              
              {/* ─── MODIFIED: OPEN EMBEDDED PREFERENCES MODAL DIRECTLY ─── */}
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 py-2.5 rounded-none focus:bg-zinc-50 dark:focus:bg-white/5 text-zinc-700 dark:text-zinc-300 focus:text-zinc-900 dark:focus:text-white"
                onSelect={() => setEmailPrefsOpen(true)}
              >
                <Mail size={15} className="opacity-70" />
                <span className="font-medium text-xs">Email Preferences</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild className="cursor-pointer py-2.5 rounded-none focus:bg-zinc-50 dark:focus:bg-white/5 text-zinc-700 dark:text-zinc-300 focus:text-zinc-900 dark:focus:text-white">
                <Link href="/tickets" className="flex items-center gap-2.5">
                  <TicketIcon size={15}/>
                  <span className="font-medium text-xs">Raise a Ticket</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/10 my-1" />

              {!isGuest && isSubscribed !== null && (
                <>
                  {isSubscribed ? (
                    <DropdownMenuItem
                      className="cursor-pointer text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-400 py-2.5 rounded-none"
                      onSelect={(e) => {
                        e.preventDefault();
                        if (!isNewsletterLoading) handleOptOut();
                      }}
                    >
                      <Mail size={15} className="mr-2.5 opacity-70" />
                      <span className="font-medium text-xs">{isNewsletterLoading ? "Updating..." : "Opt Out of Newsletter"}</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5 rounded-none focus:bg-zinc-50 dark:focus:bg-white/5 text-zinc-700 dark:text-zinc-300 focus:text-zinc-900 dark:focus:text-white"
                      onSelect={(e) => {
                        e.preventDefault();
                        if (!isNewsletterLoading) handleSubscribe();
                      }}
                    >
                      <Mail size={15} className="mr-2.5 opacity-70" />
                      <span className="font-medium text-xs">{isNewsletterLoading ? "Updating..." : "Subscribe to Newsletter"}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/10 my-1" />
                </>
              )}

              <DropdownMenuItem
                className="cursor-pointer py-2.5 font-medium text-xs rounded-none focus:bg-zinc-50 dark:focus:bg-white/5 text-zinc-700 dark:text-zinc-300 focus:text-zinc-900 dark:focus:text-white"
                data-testid="user-nav-item-theme"
                onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {`Toggle ${resolvedTheme === "light" ? "Dark" : "Light"} Mode`}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/10 my-1" />
              
              <DropdownMenuItem asChild data-testid="user-nav-item-auth" className="py-2.5 rounded-none focus:bg-zinc-50 dark:focus:bg-white/5 text-zinc-700 dark:text-zinc-300 focus:text-zinc-900 dark:focus:text-white">
                <button
                  className="w-full text-left cursor-pointer font-medium text-xs"
                  onClick={() => {
                    if (isAuthLoading) {
                      toast({ type: "error", description: "Checking authentication status, please try again!" });
                      return;
                    }
                    if (isGuest) {
                      router.push("/login");
                    } else {
                      clearSWRCache();
                      logOut().then(() => { window.location.href = "/"; }).catch(() => { toast({ type: "error", description: "Failed to sign out" }); });
                    }
                  }}
                  type="button"
                >
                  {isGuest ? "Login to your account" : "Sign out"}
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* ─── ADDED: EMAIL PREFERENCES DIALOG CONTAINER ─── */}
      <EmailPreferencesDialog
        open={emailPrefsOpen}
        onOpenChange={setEmailPrefsOpen}
        userEmail={user?.email ?? ""}
      />
    </>
  );
}