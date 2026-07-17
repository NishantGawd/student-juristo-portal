"use client";

import type { ComponentProps } from "react";
import { type SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarLeftIcon } from "./icons";
import { Button } from "./ui/button";

export function SidebarToggle({
  className,
  onClick,
  ...props
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar } = useSidebar();
  const toggleScope =
    (props as { "data-sidebar-toggle-scope"?: string })[
      "data-sidebar-toggle-scope"
    ] ?? "page";

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "h-9 w-9 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors duration-200 ease-in-out rounded-none border border-transparent",
            className
          )}
          data-sidebar-toggle-scope={toggleScope}
          data-testid="sidebar-toggle-button"
          onClick={(event) => {
            onClick?.(event);
            toggleSidebar();
          }}
          variant="ghost"
          {...props}
        >
          <SidebarLeftIcon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent 
        align="start" 
        side="bottom" 
        className="hidden md:flex md:items-center md:gap-2 font-bold text-[10px] uppercase tracking-wider rounded-none border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] text-zinc-900 dark:text-white shadow-sm px-3 py-1.5"
      >
        Toggle Sidebar
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] px-1.5 font-mono text-[9px] text-zinc-500 dark:text-zinc-400">
          <span className="text-[10px]">⌘</span>B
        </kbd>
      </TooltipContent>
    </Tooltip>
  );
}