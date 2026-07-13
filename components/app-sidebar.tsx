"use client";

import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MapIcon,
  PlayCircle,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { SidebarHistory } from "@/components/sidebar-history";
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
    <div className="px-3 pt-4 pb-1.5 font-semibold text-[11px] uppercase tracking-wider text-sidebar-foreground/40 transition-opacity duration-200">
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
    "flex items-center transition-all duration-200 ease-in-out font-medium text-[14px]",
    isCollapsed
      ? "h-8 w-8 justify-center mx-auto rounded-lg"
      : "h-9 w-full gap-3 rounded-lg px-3",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      : "text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
  );

  const content = (
    <>
      <Icon className={cn("shrink-0", isCollapsed ? "size-4" : "size-[17px]")} />
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
        <TooltipContent side="right" className="font-medium text-[12px]">
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

  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true);

  const closeMobile = () => setOpenMobile(false);
  
  // Extracts the current query target parameter, defaulting safely to dashboard view
  const activeTab = searchParams.get("tab") || "dashboard";

  return (
    <>
      <Sidebar collapsible="icon" className="border-sidebar-border/70 group-data-[side=left]:border-r transition-all duration-300 ease-in-out">
        <SidebarHeader className={cn("transition-all duration-300 ease-in-out", isCollapsed ? "px-1 py-3.5" : "px-2.5 py-3")}>
          <SidebarMenu className="gap-1">
            <div className={cn("flex items-center justify-between", isCollapsed ? "px-0 justify-center mb-1" : "px-2 mb-1")}>
              <Link
                className={cn("flex min-w-0 items-center gap-2.5 rounded-md py-1.5", !isCollapsed && "pr-2")}
                href="/clat-exam?tab=dashboard"
                onClick={closeMobile}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-sm">
                  <GraduationCap className="size-3.5" />
                </div>
                {!isCollapsed && (
                  <span className="truncate font-bold text-[15px] tracking-tight text-foreground">
                    Juristo AI
                  </span>
                )}
              </Link>

              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground focus:bg-sidebar-accent md:hidden rounded-lg"
                  onClick={() => setOpenMobile(false)}
                  aria-label="Close sidebar"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-y-auto overflow-x-hidden px-2 pb-3 !scrollbar-none transition-all duration-300 ease-in-out">
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

            {!isCollapsed && (
              <>
                <button
                  className="mt-4 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-sidebar-accent/70"
                  onClick={() => setIsChatHistoryOpen((open) => !open)}
                  type="button"
                >
                  <span className="font-semibold text-[11px] uppercase tracking-wider text-sidebar-foreground/45">
                    Recent Sessions
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3 text-sidebar-foreground/45 transition-transform duration-200 ml-auto",
                      isChatHistoryOpen && "rotate-180"
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    isChatHistoryOpen
                      ? "h-auto opacity-100"
                      : "h-0 overflow-hidden opacity-0"
                  )}
                >
                  <div className="pb-4">
                    <SidebarHistory
                      globalUpdateChatVisibilityAction={
                        globalUpdateChatVisibilityAction
                      }
                      user={user}
                    />
                  </div>
                </div>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className={cn("border-sidebar-border/70 border-t transition-all duration-300 ease-in-out", isCollapsed ? "px-0 py-2.5 flex justify-center" : "px-2 py-2")}>
          {user ? <SidebarUserNav user={user} /> : null}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}