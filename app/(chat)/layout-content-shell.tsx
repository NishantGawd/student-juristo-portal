"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSidebarToggle } from "@/components/global-sidebar-toggle";
import { QuizAnnouncementModal } from "@/components/quiz-announcement-modal";

interface LayoutContentShellProps {
  children: React.ReactNode;
  sidebarUser: any;
  serverUpdateChatVisibility: any;
  showQuizModal: boolean;
}

export function LayoutContentShell({
  children,
  sidebarUser,
  serverUpdateChatVisibility,
  showQuizModal,
}: LayoutContentShellProps) {
  const pathname = usePathname();
  
  // Directly intercepting the explicit test execution route
  const isTestingRoom = pathname?.endsWith("/take");

  if (isTestingRoom) {
    return (
      <div className="h-screen w-full overflow-hidden bg-white dark:bg-[#0C1222] p-0 m-0 left-0 top-0 fixed z-[9999]">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar
        globalUpdateChatVisibilityAction={serverUpdateChatVisibility}
        user={sidebarUser}
      />
      <GlobalSidebarToggle />
      <SidebarInset className="overflow-x-hidden">
        {children}
        {showQuizModal && <QuizAnnouncementModal />}
      </SidebarInset>
    </SidebarProvider>
  );
}