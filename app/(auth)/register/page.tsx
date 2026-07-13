"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Mail,
  Sparkles,
  User
} from "lucide-react";

import { toast } from "@/components/toast";
import { loginWithGoogle, type RegisterActionState, register } from "../actions";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams ? searchParams.get("callbackUrl") : null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, formAction, isPending] = useActionState<
    RegisterActionState,
    FormData
  >(register, { status: "idle" });

  const allFieldsFilled =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    email.trim() !== "" &&
    password.trim() !== "" &&
    confirmPassword.trim() !== "";

  const formReady = allFieldsFilled && agreeToTerms;

  const getPasswordStrength = (pass: string) => {
    const rules = [
      { id: "length", label: "8+ chars", met: pass.length >= 8 },
      { id: "upper", label: "Caps", met: /[A-Z]/.test(pass) },
      { id: "lower", label: "Lower", met: /[a-z]/.test(pass) },
      {
        id: "number",
        label: "Num/Sym",
        met: /[0-9!@#$%^&*(),.?":{}|<>]/.test(pass),
      },
    ];
    const score = rules.filter((rule) => rule.met).length;
    return { rules, score };
  };

  const { rules, score } = getPasswordStrength(password);

  const getScoreColor = (index: number) => {
    if (score === 0) return "bg-zinc-800";
    if (score <= 2) return index < score ? "bg-red-500" : "bg-zinc-800";
    if (score === 3) return index < score ? "bg-amber-500" : "bg-zinc-800";
    return "bg-emerald-500";
  };

  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ type: "error", description: "Account already exists!" });
    } else if (state.status === "failed") {
      toast({ type: "error", description: "Failed to create account!" });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success" && !isSuccessful) {
      toast({ type: "success", description: "Account created successfully!" });
      setIsSuccessful(true);
    }
  }, [state.status, isSuccessful]);

  const handleSubmit = (formData: FormData) => {
    if (!allFieldsFilled) {
      toast({ type: "error", description: "Please fill in all required fields." });
      return;
    }
    if (!agreeToTerms) {
      toast({ type: "error", description: "Please agree to the terms and privacy policy." });
      return;
    }
    if (password !== confirmPassword) {
      toast({ type: "error", description: "Passwords do not match." });
      return;
    }
    formAction(formData);
  };

  const handleGoogleSignUp = async () => {
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
      toast({ type: "error", description: "Failed to sign up with Google" });
      setIsGoogleLoading(false);
    }
  };

  return (
    // Explicit h-screen max-h-screen container prevents layout scrolling completely
    <div className="h-screen w-screen max-h-screen bg-[#080D1A] text-white antialiased flex font-sans overflow-hidden">

      {/* ─── LEFT PANEL: THE AUTHENTICATION ENGINE (Theme-Aligned Variant) ─── */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex flex-col justify-between p-5 xl:p-7 bg-white dark:bg-[#080D1A] text-[#17140f] dark:text-white border-r border-zinc-200 dark:border-white/5 h-full overflow-hidden z-10 transition-colors duration-300">

        {/* Brand Header */}
        <div className="flex items-center gap-2 select-none shrink-0">
          <div className="h-8 w-8 rounded-xl bg-[#4169E1] flex items-center justify-center text-white shadow-md">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <span className="font-bold text-base tracking-tight text-[#17140f] dark:text-white">
            Juristo AI
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#4169E1]/10 dark:bg-[#4169E1]/20 text-[#4169E1] ml-2 tracking-wider uppercase align-middle border border-[#4169E1]/20 dark:border-[#4169E1]/30">
              Prep OS
            </span>
          </span>
        </div>

        {/* Central Signup Form Card */}
        <div className="w-full max-w-[350px] mx-auto my-auto py-1 animate-in fade-in slide-in-from-top-3 duration-400 shrink-0">
          <div className="space-y-1 mb-4 text-left">
            <h1 className="text-2xl font-black tracking-tight text-[#17140f] dark:text-white sm:text-3xl leading-none">
              Create Account
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-[13px] font-normal leading-relaxed">
              Register your workspace profile to start tracking simulated mocks.
            </p>
          </div>

          <form action={handleSubmit} className="space-y-3">
            <input name="audience" type="hidden" value="student" />
            <input name="callbackUrl" type="hidden" value={callbackUrl} />

            {/* First and Last Name Inputs Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                  First Name
                </label>
                <div className="relative rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] transition-all focus-within:border-[#4169E1]">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  <input
                    name="firstName"
                    type="text"
                    required
                    disabled={isSuccessful}
                    placeholder="John"
                    className="w-full h-9.5 pl-9 pr-3 rounded-xl bg-transparent text-[13.5px] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[#17140f] dark:text-white"
                    onChange={(e) => setFirstName(e.target.value)}
                    value={firstName}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                  Last Name
                </label>
                <div className="relative rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] transition-all focus-within:border-[#4169E1]">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  <input
                    name="lastName"
                    type="text"
                    required
                    disabled={isSuccessful}
                    placeholder="Doe"
                    className="w-full h-9.5 pl-9 pr-3 rounded-xl bg-transparent text-[13.5px] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[#17140f] dark:text-white"
                    onChange={(e) => setLastName(e.target.value)}
                    value={lastName}
                  />
                </div>
              </div>
            </div>

            {/* Email Field Group */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block" htmlFor="email">
                Aspirant Email Address
              </label>
              <div className="relative rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] transition-all focus-within:border-[#4169E1]">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={isSuccessful}
                  placeholder="you@university.com"
                  className="w-full h-9.5 pl-10 pr-4 rounded-xl bg-transparent text-[13.5px] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[#17140f] dark:text-white"
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                />
              </div>
            </div>

            {/* Password Creation Container */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block" htmlFor="password">
                Create Security Password
              </label>
              <div className="relative rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] transition-all focus-within:border-[#4169E1]">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isSuccessful}
                  placeholder="••••••••••••"
                  className="w-full h-9.5 pl-10 pr-11 rounded-xl bg-transparent text-[13.5px] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[#17140f] dark:text-white"
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                />
                <button
                  className="absolute inset-y-0 right-3.5 flex items-center px-0.5 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-zinc-400 dark:text-zinc-500 hover:text-[#17140f] dark:hover:text-white" />
                  ) : (
                    <Eye className="h-4 w-4 text-zinc-400 dark:text-zinc-500 hover:text-[#17140f] dark:hover:text-white" />
                  )}
                </button>
              </div>

              {/* Compressed Password Quality Metrics Row */}
              {password.length > 0 && (
                <div className="pt-0.5 space-y-0.5 animate-in fade-in duration-200">
                  <div className="flex h-1 w-full gap-1">
                    {[0, 1, 2, 3].map((index) => (
                      <div className={`flex-1 rounded-full ${getScoreColor(index)}`} key={index} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold px-0.5 select-none">
                    {rules.map((rule) => (
                      <span key={rule.id} className="flex items-center gap-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${rule.met ? "bg-emerald-500" : "bg-zinc-700"}`} />
                        {rule.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field Group */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block" htmlFor="confirmPassword">
                  Confirm Security Password
                </label>
                {confirmPassword && password !== confirmPassword && (
                  <span className="text-red-400 text-[10px] font-bold animate-pulse">
                    Mismatch
                  </span>
                )}
              </div>
              <div className="relative rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] transition-all focus-within:border-[#4169E1]">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  disabled={isSuccessful}
                  placeholder="••••••••••••"
                  className="w-full h-9.5 pl-10 pr-11 rounded-xl bg-transparent text-[13.5px] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[#17140f] dark:text-white"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  value={confirmPassword}
                />
                <button
                  className="absolute inset-y-0 right-3.5 flex items-center px-0.5 cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  type="button"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-zinc-400 dark:text-zinc-500 hover:text-[#17140f] dark:hover:text-white" />
                  ) : (
                    <Eye className="h-4 w-4 text-zinc-400 dark:text-zinc-500 hover:text-[#17140f] dark:hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms and Privacy Policy Accordance Row */}
            <div className="flex items-start gap-2 pt-0.5 select-none">
              <input
                id="terms"
                type="checkbox"
                checked={agreeToTerms}
                disabled={isSuccessful}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 dark:border-white/10 bg-transparent text-[#4169E1] focus:ring-0 transition-all"
                onChange={(e) => setAgreeToTerms(e.target.checked)}
              />
              <label htmlFor="terms" className="cursor-pointer text-zinc-500 dark:text-zinc-400 text-[11px] leading-tight font-medium">
                I accept the ecosystem{" "}
                <Link className="font-bold text-[#17140f] dark:text-white underline hover:text-[#4169E1]" href="https://juristo.in/terms" target="_blank">Terms</Link>
                {" & "}
                <Link className="font-bold text-[#17140f] dark:text-white underline hover:text-[#4169E1]" href="https://juristo.in/privacy" target="_blank">Privacy</Link>
              </label>
            </div>

            {/* Accent (#4169E1) Form Submission Button */}
            <button
              type="submit"
              disabled={!formReady || isSuccessful || isPending || state.status === "in_progress"}
              className="w-full h-10 rounded-xl bg-[#4169E1] hover:bg-[#4169E1]/90 text-white font-bold text-[13.5px] tracking-wide shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {isSuccessful || isPending ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating profile...
                </span>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Provisioning Separator */}
          <div className="relative flex items-center justify-center my-3 select-none">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-white/5"></div></div>
            <span className="relative px-2.5 text-[9px] uppercase font-bold tracking-[0.14em] text-zinc-400 dark:text-zinc-500 bg-white dark:bg-[#080D1A] transition-colors duration-300">
              Identity Provisioning
            </span>
          </div>

          {/* Connected Google Provider Box */}
          <button
            type="button"
            disabled={isGoogleLoading || isSuccessful}
            onClick={handleGoogleSignUp}
            className="w-full h-10 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-[#17140f] dark:text-white font-bold text-[13.5px] tracking-wide transition-all hover:bg-zinc-50 dark:hover:bg-white/5 flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer shadow-xs"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google Account
          </button>

          {/* Login Fallback Link */}
          <p className="mt-3.5 text-center text-[13px] text-zinc-500 dark:text-zinc-400 font-semibold select-none">
            Already verified your identity?{" "}
            <Link
              className="font-bold text-[#4169E1] hover:underline"
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ─── RIGHT PANEL: IMMERSIVE LAW STUDENT IMAGE HUB (58% / 62% Width) ─── */}
      <div
        className="hidden lg:flex lg:w-[58%] xl:w-[62%] relative flex-col justify-between p-12 xl:p-16 h-full overflow-hidden select-none"
        style={{ backgroundColor: "#080D1A" }}
      >
        {/* The Generated Graphic: Set to perfectly fill the space without window scrollbars */}
        <img
          src="/register-bg.png" // Replace with your final image path (placed in public/ or asset URL)
          alt="Juristo Prep OS Activation Hub"
          className="absolute inset-0 w-full h-full object-cover opacity-85 transition-opacity duration-500"
        />

        {/* Premium Contrast Gradients to melt the image smoothly into the left auth panel */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080D1A] via-transparent to-[#080D1A]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1135]/50 via-transparent to-transparent" />

        {/* Decorative Ambient Lighting Overlays */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(65,105,225,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(65,105,225,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-1/3 right-1/4 size-96 bg-[#4169E1]/5 rounded-full filter blur-[120px] pointer-events-none" />
      </div>
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