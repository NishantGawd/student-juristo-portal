"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Mail,
  Scale,
  Sparkles
} from "lucide-react";

import { ForgotPasswordModal } from "@/components/forgot-password-modal";
import { toast } from "@/components/toast";
import { type LoginActionState, login, loginWithGoogle } from "../actions";

export default function Page() {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams ? searchParams.get("callbackUrl") : null);

  const [showPassword, setShowPassword] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<
    LoginActionState,
    FormData
  >(login, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "failed") {
      toast({
        type: "error",
        description: "Invalid credentials!",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    formAction(formData);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(callbackUrl);
    } catch (error: any) {
      if (
        error?.message === "NEXT_REDIRECT" ||
        error?.digest?.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }
      toast({
        type: "error",
        description: "Failed to sign in with Google",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    // Locked No-Scroll Viewport Box using #080D1A Background
    <div className="h-screen w-screen max-h-screen bg-[#080D1A] text-white antialiased flex font-sans overflow-hidden">

      {/* ─── LEFT PANEL: THE AUTHENTICATION ENGINE (Theme-Aligned Variant) ─── */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex flex-col justify-between p-6 xl:p-10 bg-white dark:bg-[#080D1A] text-[#17140f] dark:text-white border-r border-zinc-200 dark:border-white/5 h-full overflow-hidden z-10 transition-colors duration-300">

        {/* Brand Header */}
        <div className="flex items-center gap-2.5 select-none shrink-0">
          <div className="h-8.5 w-8.5 rounded-xl bg-[#4169E1] flex items-center justify-center text-white shadow-md">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#17140f] dark:text-white">
            Juristo AI
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#4169E1]/10 dark:bg-[#4169E1]/20 text-[#4169E1] ml-2 tracking-wider uppercase align-middle border border-[#4169E1]/20 dark:border-[#4169E1]/30">
              Prep OS
            </span>
          </span>
        </div>

        {/* Central Card Element */}
        <div className="w-full max-w-[350px] mx-auto my-auto py-2 animate-in fade-in slide-in-from-top-3 duration-400 shrink-0">
          <div className="space-y-1.5 mb-6 text-left">
            <h1 className="text-2xl font-black tracking-tight text-[#17140f] dark:text-white sm:text-3xl">
              Welcome Back
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-[13.5px] leading-relaxed font-normal">
              Sign in to access your mock execution sheets, dynamic learning roadmaps, and your active AI Mentor.
            </p>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <input name="callbackUrl" type="hidden" value={callbackUrl} />

            {/* Email Input Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block" htmlFor="email">
                Aspirant Email Address
              </label>
              <div className="relative rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] transition-all focus-within:border-[#4169E1] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4169E1]/10">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@university.com"
                  className="w-full h-10.5 pl-10 pr-4 rounded-xl bg-transparent text-[14px] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[#17140f] dark:text-white"
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500" htmlFor="password">
                  Security Token Password
                </label>
                <button
                  type="button"
                  className="text-xs font-bold text-[#4169E1] hover:text-[#4169E1]/80 hover:underline cursor-pointer transition-all"
                  onClick={() => setForgotPasswordOpen(true)}
                >
                  Forgot token?
                </button>
              </div>
              <div className="relative rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] transition-all focus-within:border-[#4169E1] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4169E1]/10">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  className="w-full h-10.5 pl-10 pr-12 rounded-xl bg-transparent text-[14px] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[#17140f] dark:text-white"
                />
                <button
                  className="absolute inset-y-0 right-3.5 flex items-center px-0.5 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-zinc-400 dark:text-zinc-500 transition-colors hover:text-[#17140f] dark:hover:text-white" />
                  ) : (
                    <Eye className="h-4 w-4 text-zinc-400 dark:text-zinc-500 transition-colors hover:text-[#17140f] dark:hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Royal Blue (#4169E1) Action Button */}
            <button
              type="submit"
              disabled={isSuccessful || isPending || state.status === "in_progress"}
              className="w-full h-11 rounded-xl bg-[#4169E1] hover:bg-[#4169E1]/90 text-white font-bold text-[14px] tracking-wide shadow-md transition-all flex items-center justify-center gap-2 relative overflow-hidden active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
            >
              {isSuccessful || isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Verifying...
                </span>
              ) : (
                <>
                  Enter Workspace
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Verification Separator */}
          <div className="relative flex items-center justify-center my-5 select-none">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-white/5"></div></div>
            <span className="relative px-3 text-[9px] uppercase font-bold tracking-[0.16em] text-zinc-400 dark:text-zinc-500 bg-white dark:bg-[#080D1A] transition-colors duration-300">
              Identity Verification
            </span>
          </div>

          {/* Premium Google Button Wrapper */}
          <button
            type="button"
            disabled={isGoogleLoading}
            onClick={handleGoogleSignIn}
            className="w-full h-11 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-[#17140f] dark:text-white font-bold text-[14px] tracking-wide transition-all hover:bg-zinc-50 dark:hover:bg-white/5 flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer group shadow-xs"
          >
            <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google Account
          </button>

          {/* System Footer Navigation */}
          <p className="mt-5 text-center text-[13px] text-zinc-500 dark:text-zinc-400 font-medium">
            New candidate to the ecosystem?{" "}
            <Link
              className="font-bold text-[#4169E1] hover:underline transition-all"
              href={`/register?callbackUrl=${callbackUrl}`}
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* ─── RIGHT PANEL: IMMERSIVE LAW STUDENT IMAGE HUB (55% Width) ─── */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[62%] relative h-full bg-[#080D1A] overflow-hidden select-none">

        {/* The Generated Graphic: Set to perfectly fill the space without scrolling */}
        <img
          src="/login-bg.png" // Replace with your generated image path
          alt="Juristo Prep OS Intelligence Engine Layout"
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-700"
        />

        {/* Subtle Dark Overlays to ensure contrast against ambient lights */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080D1A] via-transparent to-[#080D1A]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1135]/40 via-transparent to-transparent" />
      </div>

      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </div>
  );
}

function getSafeCallbackUrl(callbackUrl: string | null) {
  if (
    !callbackUrl ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl === "/" ||
    callbackUrl.startsWith("/login") ||
    callbackUrl.startsWith("/register")
  ) {
    return "/clat-exam?tab=dashboard";
  }

  return callbackUrl;
}