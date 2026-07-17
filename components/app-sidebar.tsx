"use client";

import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  MapIcon,
  PlayCircle,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import type { VisibilityType } from "./visibility-selector";

type NavItem = {
  tab: string;
  label: string;
  icon: LucideIcon;
};

// Maps workspace choices directly to the dynamic search query parameter strings
const studentNavItems: NavItem[] = [
  { tab: "dashboard", label: "Clat Dashboard", icon: LayoutDashboard },
  { tab: "mock", label: "Mock Prep", icon: PlayCircle },
  { tab: "pyq", label: "PYQs", icon: ClipboardList },
  { tab: "quick", label: "Quick Quiz", icon: Zap },
  { tab: "roadmap", label: "Roadmap", icon: MapIcon },
  { tab: "reports", label: "Reports", icon: BarChart3 },
  { tab: "community", label: "Community", icon: Users },
];

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  if (isCollapsed) return null;

  return (
    <div className="px-4 pt-5 pb-2 font-bold text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-opacity duration-200">
      {children}
    </div>
  );
}

function SidebarRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;
  const Icon = item.icon;

  const className = cn(
    "flex items-center transition-colors duration-200 ease-in-out text-[13px] tracking-wide rounded-none",
    isCollapsed
      ? "h-9 w-9 justify-center mx-auto"
      : "h-9 w-full gap-3 px-4",
    active
      ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-bold border-l-2 border-[#4169E1]"
      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white font-medium border-l-2 border-transparent"
  );

  const content = (
    <>
      <Icon className={cn("shrink-0", isCollapsed ? "size-4" : "size-[16px]")} />
      {!isCollapsed && <span className="min-w-0 truncate">{item.label}</span>}
    </>
  );

  const linkElement = (
    <Link className={className} href={`/clat-exam?tab=${item.tab}`} onClick={onNavigate}>
      {content}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium text-[11px] rounded-none border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] text-zinc-900 dark:text-white">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkElement;
}

export function AppSidebar({
  user,
  globalUpdateChatVisibilityAction,
}: {
  user: User | undefined;
  globalUpdateChatVisibilityAction: (payload: {
    chatId: string;
    visibility: VisibilityType;
  }) => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const { setOpenMobile, state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const closeMobile = () => setOpenMobile(false);
  
  // Extracts the current query target parameter, defaulting safely to dashboard view
  const activeTab = searchParams.get("tab") || "dashboard";

  return (
    <>
      <Sidebar collapsible="icon" className="border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] group-data-[side=left]:border-r transition-all duration-300 ease-in-out">
        <SidebarHeader className={cn("transition-all duration-300 ease-in-out border-b border-zinc-100 dark:border-white/5", isCollapsed ? "px-1 py-4" : "px-4 py-4")}>
          <SidebarMenu className="gap-1">
            <div className={cn("flex items-center justify-between", isCollapsed ? "px-0 justify-center" : "")}>
              <Link
                className="flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-90 align-middle"
                href="/clat-exam?tab=dashboard"
                onClick={closeMobile}
              >
                {/* ─── Optimized Company Logo Layout Integration ─── */}
                <div className="flex h-7 w-6 items-center justify-center shrink-0 overflow-visible">
                  <Image 
                    src="/favicon.png" 
                    alt="Juristo AI Logo" 
                    width={24} 
                    height={28} 
                    className="h-7 w-auto object-contain dark:brightness-[0.95]" 
                    priority
                  />
                </div>
                {!isCollapsed && (
                  <span className="truncate font-bold text-[17px] tracking-tight text-zinc-900 dark:text-white font-serif select-none pl-0.5">
                    Juristo AI
                  </span>
                )}
              </Link>

              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-none"
                  onClick={() => setOpenMobile(false)}
                  aria-label="Close sidebar"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-y-auto overflow-x-hidden pb-3 !scrollbar-none transition-all duration-300 ease-in-out bg-white dark:bg-[#0C1222]">
          <SidebarMenu className={cn("gap-1", isCollapsed && "space-y-1.5")}>
            
            <SidebarSectionLabel>CLAT Prep Workspace</SidebarSectionLabel>
            <div className={cn(isCollapsed ? "space-y-1.5" : "space-y-0.5")}>
              {studentNavItems.map((item) => (
                <SidebarRow
                  active={activeTab === item.tab}
                  item={item}
                  key={item.tab}
                  onNavigate={closeMobile}
                />
              ))}
            </div>
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className={cn("border-zinc-100 dark:border-white/5 border-t bg-white dark:bg-[#0C1222] transition-all duration-300 ease-in-out", isCollapsed ? "px-0 py-3 flex justify-center" : "px-3 py-3")}>
          {user ? <SidebarUserNav user={user} /> : null}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}