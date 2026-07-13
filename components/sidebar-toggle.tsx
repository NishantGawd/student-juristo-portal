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
            "h-8 w-8 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200 ease-in-out",
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
        className="hidden md:flex md:items-center md:gap-1.5 font-medium text-[12px]"
      >
        Toggle Sidebar
        <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono font-medium text-[9px] text-muted-foreground">
          <span className="text-[10px]">⌘</span>B
        </kbd>
      </TooltipContent>
    </Tooltip>
  );
}