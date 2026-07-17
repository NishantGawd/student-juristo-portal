"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  KeyRound,
  Mail,
  User,
  Eye,
  EyeOff
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
    if (score === 0) return "bg-zinc-100";
    if (score <= 2) return index < score ? "bg-red-500" : "bg-zinc-100";
    if (score === 3) return index < score ? "bg-amber-500" : "bg-zinc-100";
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
    // Clean framework container maintaining absolute uniformity with login layout
    <div className="h-screen w-screen max-h-screen bg-white text-zinc-900 antialiased flex font-sans overflow-hidden selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── LEFT PANEL: THE AUTHENTICATION FORM (Enlarged Asymmetric Column) ─── */}
      <div className="w-full lg:w-[48%] xl:w-[44%] flex flex-col justify-center p-8 sm:p-10 xl:p-14 bg-white border-r border-zinc-200 h-full overflow-hidden z-10">

        {/* Content container widened to 390px with slightly more comfortable vertical spacing (space-y-5) */}
        <div className="w-full max-w-[390px] mx-auto space-y-5 animate-in fade-in duration-300">

          {/* Brand Identity Stack */}
          <div className="space-y-2 select-none text-left">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1 bg-[#4169E1]" />
              <span className="font-bold text-xs tracking-widest uppercase text-zinc-400">
                Juristo AI
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-serif">
                Create account.
              </h1>
              <p className="text-xs text-zinc-500 leading-normal font-normal">
                Register your profile to start tracking simulated mocks and pacing metrics.
              </p>
            </div>
          </div>

          {/* Form Actions Field Stack with increased gaps (space-y-3) */}
          <form action={handleSubmit} className="space-y-3">
            <input name="audience" type="hidden" value="student" />
            <input name="callbackUrl" type="hidden" value={callbackUrl} />

            {/* Split First & Last Name Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block">
                  First Name
                </label>
                <div className="relative border border-zinc-200 bg-white transition-all focus-within:border-[#4169E1] focus-within:ring-1 focus-within:ring-[#4169E1]">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    name="firstName"
                    type="text"
                    required
                    disabled={isSuccessful}
                    placeholder="John"
                    className="w-full h-10 pl-10 pr-3 bg-transparent text-sm font-medium outline-none text-zinc-900 placeholder:text-zinc-300 rounded-none"
                    onChange={(e) => setFirstName(e.target.value)}
                    value={firstName}
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block">
                  Last Name
                </label>
                <div className="relative border border-zinc-200 bg-white transition-all focus-within:border-[#4169E1] focus-within:ring-1 focus-within:ring-[#4169E1]">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    name="lastName"
                    type="text"
                    required
                    disabled={isSuccessful}
                    placeholder="Doe"
                    className="w-full h-10 pl-10 pr-3 bg-transparent text-sm font-medium outline-none text-zinc-900 placeholder:text-zinc-300 rounded-none"
                    onChange={(e) => setLastName(e.target.value)}
                    value={lastName}
                  />
                </div>
              </div>
            </div>

            {/* Email Input Field */}
            <div className="space-y-1.5 text-left">
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
                  disabled={isSuccessful}
                  placeholder="you@university.com"
                  className="w-full h-10 pl-10 pr-4 bg-transparent text-sm font-medium outline-none text-zinc-900 placeholder:text-zinc-300 rounded-none"
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                />
              </div>
            </div>

            {/* Password Verification Block */}
            <div className="space-y-1.5 text-left">
              {/* Create Password Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block" htmlFor="password">
                  Create Security Password
                </label>
                <div className="relative border border-zinc-200 bg-white transition-all focus-within:border-[#4169E1] focus-within:ring-1 focus-within:ring-[#4169E1]">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isSuccessful}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-10 pr-12 bg-transparent text-sm font-medium outline-none text-zinc-900 placeholder:text-zinc-300 rounded-none"
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                  />
                  <button
                    className="absolute inset-y-0 right-3.5 flex items-center px-0.5 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors" />
                    ) : (
                      <Eye className="h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Minimalistic Strength Tracker Row */}
              {password.length > 0 && (
                <div className="pt-0.5 space-y-0.5 animate-in fade-in duration-200">
                  <div className="flex h-0.5 w-full gap-1">
                    {[0, 1, 2, 3].map((index) => (
                      <div className={`flex-1 ${getScoreColor(index)} transition-colors duration-300`} key={index} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-1 text-[9px] text-zinc-400 font-bold tracking-tight select-none px-0.5">
                    {rules.map((rule) => (
                      <span key={rule.id} className="flex items-center gap-0.5">
                        <span className={`h-1 w-1 rounded-full ${rule.met ? "bg-emerald-500" : "bg-zinc-200"}`} />
                        {rule.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block" htmlFor="confirmPassword">
                  Confirm Security Password
                </label>
                {confirmPassword && password !== confirmPassword && (
                  <span className="text-red-500 text-[9px] font-bold tracking-wide uppercase animate-pulse">
                    Mismatch
                  </span>
                )}
              </div>
              <div className="relative border border-zinc-200 bg-white transition-all focus-within:border-[#4169E1] focus-within:ring-1 focus-within:ring-[#4169E1]">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  disabled={isSuccessful}
                  placeholder="••••••••••••"
                  className="w-full h-10 pl-10 pr-12 bg-transparent text-sm font-medium outline-none text-zinc-900 placeholder:text-zinc-300 rounded-none"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  value={confirmPassword}
                />
                <button
                  className="absolute inset-y-0 right-3.5 flex items-center px-0.5 focus:outline-none"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  type="button"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors" />
                  ) : (
                    <Eye className="h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Clean Checkbox Node */}
            <div className="flex items-start gap-2.5 pt-1 select-none text-left">
              <input
                id="terms"
                type="checkbox"
                checked={agreeToTerms}
                disabled={isSuccessful}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer border-zinc-200 text-[#4169E1] focus:ring-0 rounded-none bg-white transition-all"
                onChange={(e) => setAgreeToTerms(e.target.checked)}
              />
              <label htmlFor="terms" className="cursor-pointer text-zinc-400 text-[11px] leading-tight font-normal">
                I accept the system{" "}
                <Link className="font-semibold text-zinc-600 underline hover:text-[#4169E1]" href="https://juristo.in/terms" target="_blank">Terms</Link>
                {" & "}
                <Link className="font-semibold text-zinc-600 underline hover:text-[#4169E1]" href="https://juristo.in/privacy" target="_blank">Privacy Policy</Link>.
              </label>
            </div>

            {/* Submit Action Box Height Increased to h-11 */}
            <button
              type="submit"
              disabled={!formReady || isSuccessful || isPending || state.status === "in_progress"}
              className="w-full h-11 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]"
            >
              {isSuccessful || isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Provisioning Profile...
                </span>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Provisioning Separation Bar */}
          <div className="relative flex items-center justify-center select-none py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <span className="relative px-3 text-[9px] uppercase font-bold tracking-widest text-zinc-400 bg-white">
              Identity Provisioning
            </span>
          </div>

          {/* Clean Google Block Height Increased to h-11 */}
          <button
            type="button"
            disabled={isGoogleLoading || isSuccessful}
            onClick={handleGoogleSignUp}
            className="w-full h-11 border border-zinc-200 bg-white text-zinc-700 font-medium text-xs transition-colors hover:bg-zinc-50 flex items-center justify-center gap-2.5 rounded-none active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Fallback Reference Toggle */}
          <p className="text-center text-xs text-zinc-400 font-normal">
            Already verified your identity?{" "}
            <Link
              className="font-bold text-[#4169E1] hover:underline"
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              Sign in
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ─── RIGHT PANEL: IMMERSIVE IMAGE CANVAS FIT (55% Width) ─── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative h-full bg-white select-none">
        <img
          src="/register-bg.png"
          alt="Juristo Student Portal Active Learning Illustration"
          className="absolute inset-0 w-full h-full object-cover object-center animate-in fade-in duration-700"
        />
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