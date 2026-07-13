"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { SessionCacheCleaner } from "@/components/session-cache-cleaner";
import { Toaster } from "sonner";
import { lazy } from "react";

// ✅ Lazy-load PostHog for analytics — non-critical for initial render
const LazyPostHogProvider = lazy(() => import("@/components/posthog-provider").then(m => ({ default: m.PostHogProvider })));

export function Providers({ 
    children,
    session 
}: { 
    children: React.ReactNode;
    session?: any; 
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
        >
            <Toaster position="top-center" />
            <SessionProvider session={session}>
                <SessionCacheCleaner />
                <PostHogProvider>{children}</PostHogProvider>
            </SessionProvider>
        </ThemeProvider>
    );
}