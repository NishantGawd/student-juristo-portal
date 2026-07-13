"use client";

import { useEffect, useState } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { useSidebar } from "@/components/ui/sidebar";

function hasVisiblePageToggle() {
  if (typeof window === "undefined") {
    return false;
  }

  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-sidebar-toggle-scope="page"]')
  ).some((element) => {
    const style = window.getComputedStyle(element);
    return (
      element.getClientRects().length > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
}

export function GlobalSidebarToggle() {
  const { isMobile, open } = useSidebar();
  const [hasPageToggle, setHasPageToggle] = useState(false);

  useEffect(() => {
    const syncTogglePresence = () => {
      setHasPageToggle(hasVisiblePageToggle());
    };

    syncTogglePresence();
    const animationFrameId = window.requestAnimationFrame(syncTogglePresence);

    const observer = new MutationObserver(syncTogglePresence);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", syncTogglePresence);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", syncTogglePresence);
      observer.disconnect();
    };
  }, []);

  if (hasPageToggle) {
    return null;
  }

  return (
    <div
      className="fixed top-3 z-50 transition-[left] duration-300 ease-in-out"
      style={{
        left: isMobile
          ? "0.75rem"
          : open
          ? "calc(var(--sidebar-width) + 0.75rem)"
          : "calc(var(--sidebar-width-icon, 3rem) + 0.75rem)",
      }}
    >
      <SidebarToggle
        aria-label="Toggle sidebar"
        className="h-8 w-8 bg-background/95 p-0 shadow-sm backdrop-blur border border-border/50 rounded-lg flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        data-sidebar-toggle-scope="global"
      />
    </div>
  );
}