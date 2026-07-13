"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function GlobalOnboardingRedirect({ 
  isAuthenticated, 
  isCompleted 
}: { 
  isAuthenticated: boolean;
  isCompleted: boolean; 
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const publicRoutes = ["/login", "/register", "/reset-password", "/onboarding"];
    const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(r + "/"));
    const isApi = pathname.startsWith("/api");

    if (!isCompleted && !isPublic && !isApi) {
      router.push("/onboarding");
    }
  }, [isCompleted, isAuthenticated, pathname, router]);

  return null;
}
