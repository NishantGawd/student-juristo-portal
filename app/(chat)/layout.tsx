import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { GlobalSidebarToggle } from "@/components/global-sidebar-toggle";
import { PyodideLoader } from "@/components/pyodide-loader"; 
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserById } from "@/lib/db/queries";
import { auth } from "../(auth)/auth";
import { serverUpdateChatVisibility } from "./chat-actions";
import { QuizAnnouncementModal } from "@/components/quiz-announcement-modal";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Preload critical fonts and images for faster LCP */}
      <link
        as="font"
        href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
        rel="preload"
      />

      {/* Load PyodideLoader early for immediate availability */}
      <PyodideLoader />

      <DataStreamProvider>
        <Suspense fallback={<LayoutSkeleton />}>
          <SidebarWrapper>{children}</SidebarWrapper>
        </Suspense>
      </DataStreamProvider>
    </>
  );
}

function LayoutSkeleton() {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="hidden w-64 flex-col space-y-4 border-r bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[calc(100vh-120px)] w-full rounded-xl" />
      </div>
    </div>
  );
}

async function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);

  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";
  let showQuizModal = false;
  let sidebarUser = session?.user;
  
  if (session?.user?.id) {
    const dbUser = await getUserById({ id: session.user.id }).catch(() => null);

    if (dbUser) {
      sidebarUser = {
        ...session.user,
        audience: dbUser.audience,
        plan: dbUser.plan,
        userType: dbUser.userType,
      } as typeof session.user;

      if (!dbUser.onboardingCompleted && session.user.type === "regular") {
        const callbackUrl =
          cookieStore.get("post_onboarding_callback")?.value || "/chat";
        redirect(`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }

      const dismissedCookie = cookieStore.get(
        "quiz_announcement_dismissed"
      )?.value;
      if (dismissedCookie !== "true" && dbUser.quizAnnouncementSeen === false) {
        showQuizModal = true;
      }
    }
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
