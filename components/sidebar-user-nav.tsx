"use client";

import { useState, useEffect } from "react";
import { ChevronUp, Brain, Mail } from "lucide-react";
import Link from "next/link";
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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { guestRegex } from "@/lib/constants";
import { BarChart3Icon, LoaderIcon, TicketIcon } from "./icons";
import { cn } from "@/lib/utils";
import { toast } from "./toast";

export function SidebarUserNav({ user }: { user: User }) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { cache } = useSWRConfig();
  
  // ─── UPDATED: Destructure isMobile to properly manage responsive states ───
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  // Newsletter State
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isNewsletterLoading, setIsNewsletterLoading] = useState(false);
  const [isAuthLoading] = useState(false);

  const isGuest = guestRegex.test(user?.email ?? "");

  const clearSWRCache = () => {
    for (const key of (cache as Map<string, unknown>).keys()) {
      (cache as Map<string, unknown>).delete(key);
    }
  };

  // Fetch initial subscription status
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

  // Handle Subscribe
  const handleSubscribe = async () => {
    if (!user?.email) {
      return;
    }
    setIsNewsletterLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          source: "v2_chatbot"
        }),
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

  // Handle Opt-Out
  const handleOptOut = async () => {
    if (!user?.email) {
      return;
    }
    setIsNewsletterLoading(true);
    try {
      const res = await fetch(`/api/newsletter/opt-out?email=${encodeURIComponent(user.email)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsSubscribed(false);
        toast({
          description: "You have opted out of the newsletter.",
          type: "error"
        });
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
        "bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 ease-in-out font-medium text-[14px]",
        isCollapsed
          ? "h-8 w-8 justify-center mx-auto p-0 rounded-lg"
          : "h-10 justify-between px-2"
      )}
      data-testid="user-nav-button"
    >
      <Avatar className={cn("transition-all duration-200", isCollapsed ? "size-5.5" : "size-6")}>
        <AvatarImage
          src={user.image || `https://avatar.vercel.sh/${user.email}`}
          alt={user.email ?? "User Avatar"}
        />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
          {user.email?.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      {!isCollapsed && (
        <>
          <span className="truncate" data-testid="user-email">
            {isGuest ? "Guest" : user?.email}
          </span>
          <ChevronUp className="ml-auto opacity-50 size-4 shrink-0" />
        </>
      )}
    </SidebarMenuButton>
  );

  return (
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
              <TooltipContent side="right" className="font-medium text-[12px]">
                {isGuest ? "Guest account" : user?.email}
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuTrigger asChild>
              {isAuthLoading ? (
                <SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <div className="flex flex-row gap-2">
                    <div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
                    <span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
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
            className="w-(--radix-popper-anchor-width) min-w-[220px] rounded-xl shadow-premium border-border"
            data-testid="user-nav-menu"
            side={isCollapsed ? "right" : "top"}
            align={isCollapsed ? "end" : "center"}
            sideOffset={isCollapsed ? 12 : 8}
          >
            <DropdownMenuItem asChild className="cursor-pointer py-2">
              <Link href="/dashboard" className="flex items-center gap-2">
                <BarChart3Icon size={16}/>
                <span className="font-medium text-[13.5px]">Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 py-2"
              onSelect={() => router.push("/dashboard?memory=open")}
            >
              <Brain size={16} className="opacity-70" />
              <span className="font-medium text-[13.5px]">Memory</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 py-2"
              onSelect={() => router.push("/dashboard?emailPreferences=open")}
            >
              <Mail size={16} className="opacity-70" />
              <span className="font-medium text-[13.5px]">Email Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer py-2">
              <Link href="/tickets" className="flex items-center gap-2">
                <TicketIcon size={16}/>
                <span className="font-medium text-[13.5px]">Raise a Ticket</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Newsletter Toggle UI */}
            {!isGuest && isSubscribed !== null && (
              <>
                {isSubscribed ? (
                  <DropdownMenuItem
                    className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500 py-2"
                    onSelect={(e) => {
                      e.preventDefault(); // Keep menu open during load
                      if (!isNewsletterLoading) {
                        handleOptOut();
                      }
                    }}
                  >
                    <Mail size={16} className="mr-2 opacity-70" />
                    <span className="font-medium text-[13.5px]">{isNewsletterLoading ? "Updating..." : "Opt Out of Newsletter"}</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="cursor-pointer py-2"
                    onSelect={(e) => {
                      e.preventDefault(); // Keep menu open during load
                      if (!isNewsletterLoading) {
                        handleSubscribe();
                      }
                    }}
                  >
                    <Mail size={16} className="mr-2 opacity-70" />
                    <span className="font-medium text-[13.5px]">{isNewsletterLoading ? "Updating..." : "Subscribe to Newsletter"}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem
              className="cursor-pointer py-2 font-medium text-[13.5px]"
              data-testid="user-nav-item-theme"
              onSelect={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth" className="py-2">
              <button
                className="w-full text-left cursor-pointer font-medium text-[13.5px]"
                onClick={() => {
                  if (isAuthLoading) {
                    toast({
                      type: "error",
                      description: "Checking authentication status, please try again!",
                    });
                    return;
                  }

                  if (isGuest) {
                    router.push("/login");
                  } else {
                    clearSWRCache();
                    logOut()
                      .then(() => {
                        window.location.href = "/";
                      })
                      .catch(() => {
                        toast({
                          type: "error",
                          description: "Failed to sign out",
                        });
                      });
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
  );
}