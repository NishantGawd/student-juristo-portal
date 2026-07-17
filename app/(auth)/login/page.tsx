"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail
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
    // Locked viewport screen following the strict two-pane layout rule
    <div className="h-screen w-screen max-h-screen bg-white text-zinc-900 antialiased flex font-sans overflow-hidden selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── LEFT PANEL: THE AUTHENTICATION ENGINE (45% Width) ─── */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center p-8 sm:p-12 xl:p-16 bg-white border-r border-zinc-200 h-full overflow-y-auto z-10">

        <div className="w-full max-w-[360px] mx-auto space-y-8 animate-in fade-in duration-300">

          {/* Brand Header Stack */}
          <div className="space-y-4 select-none text-left">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 bg-[#4169E1]" />
              <span className="font-bold text-sm tracking-widest uppercase text-zinc-400">
                Juristo AI
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-serif">
                Welcome back.
              </h1>
              <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                Sign in to access your mock execution sheets, dynamic learning roadmaps, and active AI mentor arrays.
              </p>
            </div>
          </div>

          {/* Credentials Form Hub */}
          <form action={handleSubmit} className="space-y-5">
            <input name="callbackUrl" type="hidden" value={callbackUrl} />

            {/* Email Input Node */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block" htmlFor="email">
                Aspirant Email Address
              </label>
              <div className="relative border border-zinc-200 bg-white transition-all focus-within:border-[#4169E1] focus-within:ring-1 focus-within:ring-[#4169E1]">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@university.com"
                  className="w-full h-11 pl-10 pr-4 bg-transparent text-xs font-medium outline-none text-zinc-900 placeholder:text-zinc-300 rounded-none"
                />
              </div>
            </div>

            {/* Password Input Node */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block" htmlFor="password">
                  Security Token Password
                </label>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#4169E1] hover:underline focus:outline-none"
                  onClick={() => setForgotPasswordOpen(true)}
                >
                  Forgot token?
                </button>
              </div>
              <div className="relative border border-zinc-200 bg-white transition-all focus-within:border-[#4169E1] focus-within:ring-1 focus-within:ring-[#4169E1]">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  className="w-full h-11 pl-10 pr-12 bg-transparent text-xs font-medium outline-none text-zinc-900 placeholder:text-zinc-300 rounded-none"
                />
                <button
                  className="absolute inset-y-0 right-3.5 flex items-center px-0.5 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors" />
                  ) : (
                    <Eye className="h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Core Action Button (Royal Blue Accent) */}
            <button
              type="submit"
              disabled={isSuccessful || isPending || state.status === "in_progress"}
              className="w-full h-11 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]"
            >
              {isSuccessful || isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Verifying Credentials...
                </span>
              ) : (
                <>
                  Enter Workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Identity Separator Bar */}
          <div className="relative flex items-center justify-center select-none py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <span className="relative px-3 text-[9px] uppercase font-bold tracking-widest text-zinc-400 bg-white">
              Identity Verification
            </span>
          </div>

          {/* Clean, Flat Google Authentication Wrapper */}
          <button
            type="button"
            disabled={isGoogleLoading}
            onClick={handleGoogleSignIn}
            className="w-full h-11 border border-zinc-200 bg-white text-zinc-700 font-medium text-xs transition-colors hover:bg-zinc-50 flex items-center justify-center gap-2.5 rounded-none active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google Account
          </button>

          {/* Portal Footer Reference */}
          <p className="text-center text-xs text-zinc-400 font-normal pt-2">
            New candidate to the ecosystem?{" "}
            <Link
              className="font-bold text-[#4169E1] hover:underline"
              href={`/register?callbackUrl=${callbackUrl}`}
            >
              Create an account
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ─── RIGHT PANEL: IMMERSIVE LAW STUDENT DESIGN CANVAS (55% Width) ─── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative h-full bg-white select-none">
        <img
          src="/login-bg.png"
          alt="Juristo Student Portal Active Learning Illustration"
          className="absolute inset-0 w-full h-full object-cover object-center animate-in fade-in duration-700"
        />
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