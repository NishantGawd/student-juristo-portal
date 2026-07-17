import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex } from "./lib/constants";

const PUBLIC_FILE = /\.(.*)$/;
// Point to the active, functional CLAT cockpit workspace page 
const DEFAULT_AUTH_REDIRECT = "/clat-exam?tab=dashboard";

function getSafeRedirect(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/dashboard") // Intercept and map dead dashboard route paths
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return pathname;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow all public/static files instantly
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // 2. Allow API Auth routes natively
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 3. Define public routes
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/reset-password",
    "/forgot-password",
    "/api/payments/webhook",
  ];

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 4. ENVIRONMENT-AGNOSTIC TOKEN CHECK
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: isHttps,
  });

  const hasValidSession = !!token;

  // 5. REDIRECT DEAD OVERHEAD PATHS INSTANTLY
  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
  }

  // Prevent logged-in users from accessing auth pages (Kills the Loop)
  if (hasValidSession && ["/login", "/register"].includes(pathname)) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    return NextResponse.redirect(
      new URL(getSafeRedirect(callbackUrl), request.url)
    );
  }

  // ─── INITIALIZE HEADER BINDING PROXY FOR INTERNAL SECTIONS ───
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", pathname); // Maps custom track index parameter globally

  // 6. Public route? Let unauthenticated users pass.
  if (isPublicRoute) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 7. Protected route & Not authenticated? Redirect to login.
  if (!hasValidSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 8. ISOLATED GUEST HANDLING
  const isGuest = token?.email ? guestRegex.test(token.email) : false;
  if (
    isGuest &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth")
  ) {
    return NextResponse.json(
      { error: "Guest access restricted" },
      { status: 403 }
    );
  }

  // Pass request headers through natively to allow layout hooks to map routing constraints safely
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};