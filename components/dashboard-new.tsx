// Force HMR cache clear for Turbopack
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart,
  Brain,
  Calendar,
  Crown,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  PenTool,
  Plus,
  ShoppingBag,
  Trash2,
  Video,
  Zap,
  ChevronDown,
  ChevronUp,
  Check,
  Phone,
  Briefcase,
  Users,
  GraduationCap,
  Landmark,
  ArrowRight, 
  Bell,
  GripVertical,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/components/toast";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ContractPurchase, Document } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/usage/plan-limits";

type UserStats = {
  id: string;
  email: string;
  plan: string;
  tokensUsed: string;
  miniTokensUsed?: string;
  macroTokensUsed?: string;
  maxTokensUsed?: string;
  chatCount: string;
  draftCount: string;
  analysisCount: string;
  odrPacketCount?: string;
  consultationCount: string;
  usedConsultationMins?: number;
  phone?: string | null;
  phoneVerified?: boolean | null;
  workArea?: string | null;
  referralSource?: string | null;
  subscriptionData?: {
    status: string;
    currentStart: string | null;
    currentEnd: string | null;
    nextCharge: string | null;
  } | null;
};

type EnrichedDocument = Document & { chatId?: string };

type DashboardContentProps = {
  user: UserStats;
  purchases: ContractPurchase[];
  draftedDocuments: EnrichedDocument[];
  consultations?: any[];
  totalPurchases: number;
  totalDocuments: number;
  initialMemories?: any[];
  notifications?: any[];
};

type OptionalEmailPreferenceKey = "quiz" | "newsletter" | "reminder" | "marketing";
type EmailPreferenceKey = "transactional" | "account" | OptionalEmailPreferenceKey;

type EmailPreferenceState = {
  email: string;
  optional: Record<OptionalEmailPreferenceKey, boolean>;
  order: EmailPreferenceKey[];
};

const DEFAULT_EMAIL_PREFERENCES: EmailPreferenceState = {
  email: "",
  optional: {
    quiz: true,
    newsletter: true,
    reminder: true,
    marketing: true,
  },
  order: ["transactional", "account", "quiz", "newsletter", "reminder", "marketing"],
};

const EMAIL_PREFERENCE_META: Record<EmailPreferenceKey, { title: string; description: string; locked?: boolean }> = {
  transactional: {
    title: "Security, OTP and payment alerts",
    description: "Required for login verification, security, invoices, and account safety.",
    locked: true,
  },
  account: {
    title: "Critical account information",
    description: "Required for account creation, password reset, support, and legal service notices.",
    locked: true,
  },
  quiz: {
    title: "Quiz and exam prep updates",
    description: "Feature launches, CLAT prep, practice reminders, and Juristo AI quiz updates.",
  },
  newsletter: {
    title: "Newsletter",
    description: "Juristo product notes, legal AI education, and subscribed editorial updates.",
  },
  reminder: {
    title: "Onboarding reminders",
    description: "Helpful nudges to complete your profile and unlock relevant Juristo workflows.",
  },
  marketing: {
    title: "Product announcements",
    description: "Optional launches, offers, new tools, and general Juristo updates.",
  },
};

// Usage Meter Component
function UsageMeter({
  used,
  total,
  label,
  icon: Icon,
  onClick,
}: {
  used: number;
  total: number;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  const isUnlimited = total === -1;
  const isLocked = total === 0;
  const percentage = isUnlimited ? 0 : isLocked ? 100 : Math.min((used / total) * 100, 100);
  const isWarning = !isUnlimited && percentage >= 80;
  const isCritical = !isUnlimited && percentage >= 95;
  const remaining = isUnlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(total - used, 0);

  return (
    <div
      className={`rounded-xl border bg-card p-4 transition-all duration-300 ${onClick ? "cursor-pointer hover:border-border/80 hover:shadow-md" : "hover:shadow-sm"}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`shrink-0 rounded-lg p-2.5 ${isCritical ? "bg-red-500/10" : isWarning ? "bg-amber-500/10" : "bg-primary/10"}`}
        >
          <Icon
            className={`size-4 ${isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-primary"}`}
          />
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col items-start">
          <span className="w-full truncate font-medium text-[13px]">
            {label}
          </span>
          <span
            className={`font-semibold text-[11px] tracking-wide ${isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"}`}
          >
            {isLocked
              ? "Locked"
              : isUnlimited
              ? "Unlimited"
              : `${used.toLocaleString()} / ${total.toLocaleString()}`}
          </span>
        </div>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          animate={{ width: isUnlimited ? "100%" : `${percentage}%` }}
          className={`h-full rounded-full ${
            isUnlimited
              ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
              : isCritical
                ? "bg-gradient-to-r from-red-500 to-rose-600"
                : isWarning
                  ? "bg-gradient-to-r from-amber-400 to-orange-500"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600"
          }`}
          initial={{ width: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {isWarning && !isUnlimited && (
        <div
          className={`mt-3 flex items-start gap-1.5 font-medium text-[11px] leading-tight ${isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
        >
          <AlertTriangle className="size-3 shrink-0 translate-y-0.5" />
          {isCritical
            ? isLocked
              ? "Upgrade to unlock this feature."
              : "Limit almost reached! Consider upgrading."
            : "Approaching your limit."}
        </div>
      )}
    </div>
  );
}

export function DashboardContent({
  user,
  purchases,
  draftedDocuments,
  consultations,
  initialMemories = [],
  notifications = [],
}: DashboardContentProps) {
  const limits =
    PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showConsultations, setShowConsultations] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const tokensUsed = Number.parseInt(user.tokensUsed, 10) || 0;
  const draftsUsed = Number.parseInt(user.draftCount, 10) || 0;
  const chatsUsed = Number.parseInt(user.chatCount, 10) || 0;
  const analysisUsed = Number.parseInt(user.analysisCount, 10) || 0;
  const odrPacketsUsed = Number.parseInt(user.odrPacketCount || "0", 10) || 0;
  const consultationsUsed = Number.parseInt(user.consultationCount, 10) || 0;

  // ─── Profile & Documents State ────────────────────────────────────────────
  const [showDocuments, setShowDocuments] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [emailPreferencesOpen, setEmailPreferencesOpen] = useState(false);
  const [emailPreferencesLoading, setEmailPreferencesLoading] = useState(false);
  const [emailPreferencesSaving, setEmailPreferencesSaving] = useState(false);
  const [emailPreferenceLink, setEmailPreferenceLink] = useState<{ email: string; token: string } | null>(null);
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferenceState>({
    ...DEFAULT_EMAIL_PREFERENCES,
    email: user.email,
  });
  
  const [phone, setPhone] = useState(user.phone || "");
  const [workArea, setWorkArea] = useState(user.workArea || "");
  const [referralSource, setReferralSource] = useState(user.referralSource || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(!!user.phoneVerified);

  const getEmailPreferenceEndpoint = useCallback(() => {
    if (!emailPreferenceLink?.email || !emailPreferenceLink.token) {
      return "/api/email-preferences";
    }

    const params = new URLSearchParams({
      email: emailPreferenceLink.email,
      token: emailPreferenceLink.token,
    });

    return `/api/email-preferences?${params.toString()}`;
  }, [emailPreferenceLink]);

  const fetchEmailPreferences = useCallback(async () => {
    setEmailPreferencesLoading(true);
    try {
      const res = await fetch(getEmailPreferenceEndpoint(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load email preferences");
      }

      setEmailPreferences({
        email: data.email || user.email,
        optional: {
          quiz: data.optional?.quiz !== false,
          newsletter: data.optional?.newsletter !== false,
          reminder: data.optional?.reminder !== false,
          marketing: data.optional?.marketing !== false,
        },
        order: Array.isArray(data.order) ? data.order : DEFAULT_EMAIL_PREFERENCES.order,
      });
    } catch (error) {
      console.error("Failed to load email preferences", error);
      toast({ type: "error", description: "Could not load email preferences." });
    } finally {
      setEmailPreferencesLoading(false);
    }
  }, [getEmailPreferenceEndpoint, user.email]);

  const handleEmailPreferenceToggle = (key: OptionalEmailPreferenceKey, checked: boolean) => {
    setEmailPreferences((current) => ({
      ...current,
      optional: {
        ...current.optional,
        [key]: checked,
      },
    }));
  };

  const moveEmailPreference = (key: EmailPreferenceKey, direction: -1 | 1) => {
    setEmailPreferences((current) => {
      const index = current.order.indexOf(key);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.order.length) {
        return current;
      }

      const order = [...current.order];
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];

      return { ...current, order };
    });
  };

  const saveEmailPreferences = async () => {
    setEmailPreferencesSaving(true);
    try {
      const res = await fetch(getEmailPreferenceEndpoint(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optional: emailPreferences.optional,
          order: emailPreferences.order,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to save email preferences");
      }

      toast({ type: "success", description: "Email preferences saved." });
      setEmailPreferencesOpen(false);
    } catch (error) {
      console.error("Failed to save email preferences", error);
      toast({ type: "error", description: "Could not save email preferences." });
    } finally {
      setEmailPreferencesSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, workArea, referralSource }),
      });
      if (res.ok) {
        toast({ type: "success", description: "Profile updated successfully!" });
        window.location.reload(); // Force full reload to update server layout state
      } else {
        toast({ type: "error", description: "Failed to update profile." });
      }
    } catch {
      toast({ type: "error", description: "Something went wrong." });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast({ type: "error", description: "Please enter your phone number." });
      return;
    }
    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        setOtpSent(true);
        setShowOtpInput(true);
        toast({ type: "success", description: `Verification code sent to ${user.email}` });
      } else {
        toast({ type: "error", description: "Failed to send verification code." });
      }
    } catch {
      toast({ type: "error", description: "Something went wrong." });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) {
      toast({ type: "error", description: "Please enter a valid 6-digit code." });
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, otp }),
      });
      if (res.ok) {
        setPhoneVerified(true);
        setShowOtpInput(false);
        // Also update the database to set phoneVerified: true
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneVerified: true }),
        });
        toast({ type: "success", description: "Phone verified successfully!" });
      } else {
        const data = await res.json();
        toast({ type: "error", description: data.error || "Invalid verification code." });
      }
    } catch {
      toast({ type: "error", description: "Something went wrong." });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ─── Memory State ────────────────────────────────────────────
  const [memories, setMemories] = useState<any[]>(initialMemories);
  const [memoryLoading, setMemoryLoading] = useState(
    initialMemories.length === 0
  );
  const [newMemory, setNewMemory] = useState("");
  const [addingMemory, setAddingMemory] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const memoryLimit = (limits as any).memories ?? 10;

  // Auto-open from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("memory") === "open") {
        setMemoryDialogOpen(true);
      }
      if (urlParams.get("emailPreferences") === "open") {
        setEmailPreferenceLink({
          email: urlParams.get("email") || "",
          token: urlParams.get("token") || "",
        });
        setEmailPreferencesOpen(true);
      }
      if (urlParams.get("memory") === "open" || urlParams.get("emailPreferences") === "open") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [setMemoryDialogOpen]);

  useEffect(() => {
    if (emailPreferencesOpen) {
      fetchEmailPreferences();
    }
  }, [emailPreferencesOpen, fetchEmailPreferences]);

  const fetchMemories = useCallback(async (silent = false) => {
    try {
      if (!silent) setMemoryLoading(true);
      const res = await fetch(`/api/memory?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error("Failed to load memories", err);
    } finally {
      if (!silent) setMemoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialMemories.length === 0) {
      fetchMemories();
    }
  }, [fetchMemories, initialMemories.length]);

  // Auto-refresh and sync across tabs
  useEffect(() => {
    const channel = new BroadcastChannel("juristo-memory-sync");

    const onMessage = (event: MessageEvent) => {
      if (event.data === "MEMORIES_UPDATED") {
        console.log("[DASHBOARD] Syncing memories from broadcast");
        fetchMemories(true);
      }
    };

    const onFocus = () => {
      fetchMemories(true);
    };

    channel.addEventListener("message", onMessage);
    window.addEventListener("focus", onFocus);

    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchMemories]);

  // Poll every 5 seconds while the memory dialog is open to pick up AI-managed changes
  useEffect(() => {
    if (!memoryDialogOpen) return;
    fetchMemories(true); // immediate refresh on open
    const interval = setInterval(() => fetchMemories(true), 5000);
    return () => clearInterval(interval);
  }, [memoryDialogOpen, fetchMemories]);

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;
    setAddingMemory(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMemory }),
      });
      if (res.ok) {
        setNewMemory("");
        await fetchMemories();
        // Broadcast sync to other tabs
        const channel = new BroadcastChannel("juristo-memory-sync");
        channel.postMessage("MEMORIES_UPDATED");
        channel.close();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Failed to add memory:", data.error || res.statusText);
        // We could add a toast here if available
      }
    } catch (err) {
      console.error("Failed to add memory", err);
    } finally {
      setAddingMemory(false);
    }
  };

  const handleDeleteMemory = async (memId: string) => {
    setDeletingMemoryId(memId);
    try {
      await fetch(`/api/memory?id=${memId}`, { method: "DELETE" });
      setMemories((prev) => prev.filter((m) => m.id !== memId));
      // Broadcast sync to other tabs
      const channel = new BroadcastChannel("juristo-memory-sync");
      channel.postMessage("MEMORIES_UPDATED");
      channel.close();
    } catch (err) {
      console.error("Failed to delete memory", err);
    } finally {
      setDeletingMemoryId(null);
    }
  };

  // Unified contracts sorted by date
  const combined = [
    ...(purchases || []).map((p) => ({
      ...p,
      _type: "purchase" as const,
      date: p.createdAt,
    })),
    ...(draftedDocuments || []).map((d) => ({
      ...d,
      _type: "draft" as const,
      date: d.createdAt,
    })),
    ...(consultations || []).map((c) => ({
      ...c,
      _type: "consultation" as const,
      date: c.createdAt,
    })),
  ].sort((a, b) => {
    const dateA = new Date((a as any).date).getTime();
    const dateB = new Date((b as any).date).getTime();
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });

  const filtered = combined.filter(
    (item) => filter === "all" || item._type === filter
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Reset pagination when filter changes
  const handleFilterChange = (val: string) => {
    setFilter(val);
    setPage(1);
  };

  // Independent consultations list
  const sortedConsultations = [...(consultations || [])].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-7xl flex-col overflow-y-auto bg-background/50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex shrink-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Your complete workspace overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className="border-primary/20 bg-primary/5 px-3 py-1.5 font-semibold text-primary text-xs tracking-wide backdrop-blur-sm"
            variant="outline"
          >
            <Crown className="mr-1.5 size-3.5" />
            {user.plan === "basic" ? "FREE" : user.plan.toUpperCase()} PLAN
          </Badge>
          {user.plan !== "business" && (
            <Link
              className="hover:-translate-y-0.5 inline-flex items-center justify-center rounded-md border border-transparent bg-foreground px-4 py-1.5 font-semibold text-background text-xs shadow shadow-black/10 transition-all hover:opacity-90 hover:shadow-md"
              href="/upgrade"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Left Panel: Usage Metrics */}
        <div className="flex w-full shrink-0 flex-col lg:w-80 xl:w-[22rem]">
          <div className="mb-4 flex items-center gap-2 px-1">
            <Zap className="size-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">
              Current Usage
            </h2>
          </div>

          <div className="scrollbar-hide flex-1 overflow-y-auto pr-2 pb-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <UsageMeter
                icon={Zap}
                label="AI Credits"
                total={limits.tokens}
                used={tokensUsed}
              />
              <UsageMeter
                icon={BarChart}
                label="Doc Analysis"
                total={limits.analysis}
                used={analysisUsed}
              />
            </div>

            <AnimatePresence>
              {showConsultations && (
                <motion.div
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  className="overflow-hidden"
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                >
                  <div className="space-y-2">
                    {sortedConsultations.length === 0 ? (
                      <div className="rounded-xl border border-dashed bg-card py-4 text-center">
                        <p className="text-muted-foreground text-xs">
                          No consultations yet.
                        </p>
                      </div>
                    ) : (
                      sortedConsultations.map((item, idx) => (
                        <div
                          className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-xs transition-all hover:border-border/60 hover:bg-muted/30"
                          key={item.id}
                        >
                          <div className="flex items-center gap-2">
                            <div className="rounded bg-emerald-100 p-1.5 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <Video className="size-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">
                                Session #{item.id.slice(0, 8)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(
                                  item.startTime || item.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              className={`border px-1.5 py-0 text-[9px] uppercase ${
                                item.status === "completed"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : item.status === "awaiting_payment"
                                    ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400"
                                    : "bg-muted"
                              }`}
                              variant="outline"
                            >
                              {item.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 border-t pt-1.5">
                            <Link
                              className="flex-1"
                              href={`/live-chat/${item.id}/overview`}
                            >
                              <button className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border bg-background font-semibold transition-colors hover:bg-muted">
                                <ExternalLink className="size-3" /> View Details
                              </button>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Memory — Compact Card (opens dialog) */}
            <div
              className="group mt-4 cursor-pointer rounded-xl border border-pink-200/60 bg-gradient-to-br from-pink-50/30 to-transparent p-4 transition-all hover:border-pink-300/80 hover:shadow-md dark:border-pink-900/30 dark:from-pink-950/10 dark:hover:border-pink-800/50"
              onClick={() => setMemoryDialogOpen(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-pink-500/10 p-1.5 transition-colors group-hover:bg-pink-500/20">
                    <Brain className="size-3.5 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[13px] leading-tight">
                      AI Memory
                    </h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {memoryLoading
                        ? "Loading…"
                        : memoryLimit === -1
                          ? `${memories.length} stored · Unlimited`
                          : `${memories.length} / ${memoryLimit} used`}
                    </p>
                  </div>
                </div>
                <span className="font-medium text-[10px] text-pink-500 opacity-0 transition-opacity group-hover:opacity-100">
                  Manage →
                </span>
              </div>
              {/* Mini progress bar */}
              {memoryLimit !== -1 && (
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-pink-100 dark:bg-pink-950/30">
                  <motion.div
                    animate={{
                      width: `${Math.min((memories.length / memoryLimit) * 100, 100)}%`,
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500"
                    initial={{ width: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>

            {/* Email Preferences Card */}
            <button
              className="group mt-4 w-full cursor-pointer rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/30 to-transparent p-4 text-left transition-all hover:border-blue-300/80 hover:shadow-md dark:border-blue-900/30 dark:from-blue-950/10 dark:hover:border-blue-800/50"
              onClick={() => setEmailPreferencesOpen(true)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-blue-500/10 p-1.5 transition-colors group-hover:bg-blue-500/20">
                    <Mail className="size-3.5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[13px] leading-tight">
                      Email Preferences
                    </h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Manage quiz, newsletter and optional updates
                    </p>
                  </div>
                </div>
                <span className="font-medium text-[10px] text-blue-500 opacity-0 transition-opacity group-hover:opacity-100">
                  Manage -&gt;
                </span>
              </div>
            </button>

            {/* Email Preferences Dialog */}
            <Dialog onOpenChange={setEmailPreferencesOpen} open={emailPreferencesOpen}>
              <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 outline-none sm:max-w-2xl">
                <DialogHeader className="shrink-0 border-b bg-background/50 px-6 pt-6 pb-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-500/10 p-2 shadow-inner dark:bg-blue-500/20">
                      <Bell className="size-5 text-blue-500" />
                    </div>
                    <div>
                      <DialogTitle className="font-semibold text-base tracking-tight">
                        Email Notification Settings
                      </DialogTitle>
                      <DialogDescription className="mt-0.5 text-muted-foreground/80 text-xs">
                        Choose optional emails for {emailPreferences.email || user.email}. Required security and account emails stay on.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  {emailPreferencesLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <Loader2 className="size-6 animate-spin text-blue-500" />
                      <span className="font-medium text-muted-foreground text-sm">
                        Loading email preferences...
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {emailPreferences.order.map((key) => {
                        const meta = EMAIL_PREFERENCE_META[key];
                        const locked = !!meta.locked;
                        const enabled = locked || emailPreferences.optional[key as OptionalEmailPreferenceKey] !== false;
                        const index = emailPreferences.order.indexOf(key);

                        return (
                          <div
                            className="rounded-xl border border-border/60 bg-card p-4"
                            key={key}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1 rounded-lg bg-muted p-2 text-muted-foreground">
                                {locked ? <ShieldCheck className="size-4" /> : <GripVertical className="size-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm">{meta.title}</p>
                                  {locked && (
                                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" variant="outline">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                                  {meta.description}
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                  <Button
                                    disabled={index === 0}
                                    onClick={() => moveEmailPreference(key, -1)}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    <ChevronUp className="size-3.5" />
                                  </Button>
                                  <Button
                                    disabled={index === emailPreferences.order.length - 1}
                                    onClick={() => moveEmailPreference(key, 1)}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    <ChevronDown className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <Switch
                                checked={enabled}
                                disabled={locked}
                                onCheckedChange={(checked) =>
                                  !locked && handleEmailPreferenceToggle(key as OptionalEmailPreferenceKey, checked)
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4">
                  <p className="text-muted-foreground text-xs">
                    OTP, security, payment and critical account emails cannot be disabled.
                  </p>
                  <Button disabled={emailPreferencesSaving || emailPreferencesLoading} onClick={saveEmailPreferences}>
                    {emailPreferencesSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Memory Manager Dialog */}
            <Dialog onOpenChange={setMemoryDialogOpen} open={memoryDialogOpen}>
              <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 outline-none sm:max-w-lg">
                <DialogHeader className="shrink-0 border-b bg-background/50 px-6 pt-6 pb-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-pink-500/10 p-2 shadow-inner dark:bg-pink-500/20">
                      <Brain className="size-5 text-pink-500" />
                    </div>
                    <div>
                      <DialogTitle className="font-semibold text-base tracking-tight">
                        AI Memory Manager
                      </DialogTitle>
                      <DialogDescription className="mt-0.5 text-muted-foreground/80 text-xs">
                        {memoryLimit === -1
                          ? `${memories.length} memories stored · Unlimited plan`
                          : `${memories.length} of ${memoryLimit} memories used`}
                      </DialogDescription>
                    </div>
                  </div>
                  {/* Progress bar inside dialog */}
                  {memoryLimit !== -1 && (
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-pink-100 shadow-inner dark:bg-pink-900/30">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 shadow-sm"
                        style={{
                          width: `${Math.min((memories.length / memoryLimit) * 100, 100)}%`,
                          transition: "width 0.6s ease-out",
                        }}
                      />
                    </div>
                  )}
                </DialogHeader>

                {/* Add memory input */}
                <div className="shrink-0 border-b bg-accent/30 px-6 py-4 dark:bg-accent/10">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-border/60 bg-background px-3.5 py-2.5 font-medium text-sm shadow-sm transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
                      onChange={(e) => setNewMemory(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMemory()}
                      placeholder="Add a memory (e.g., I'm a property lawyer in Delhi)"
                      type="text"
                      value={newMemory}
                    />
                    <button
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-pink-500 px-4.5 py-2 font-semibold text-sm text-white shadow-sm transition-all hover:bg-pink-600 hover:shadow-md hover:shadow-pink-500/20 disabled:opacity-40"
                      disabled={addingMemory || !newMemory.trim()}
                      onClick={handleAddMemory}
                    >
                      {addingMemory ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      Add
                    </button>
                  </div>
                </div>

                {/* Scrollable memory list */}
                <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-background to-accent/10 px-6 py-4">
                  {memoryLoading && memories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <Loader2 className="size-6 animate-spin text-pink-400" />
                      <span className="font-medium text-muted-foreground text-sm">
                        Loading your memories…
                      </span>
                    </div>
                  ) : memories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary/50">
                        <Brain className="size-7 text-muted-foreground/40" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">
                        No memories found
                      </p>
                      <p className="mt-1.5 max-w-[250px] text-muted-foreground text-xs leading-relaxed">
                        Add a memory above or talk to Juristo AI — it actively
                        learns what matters to you.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memories.map((mem) => (
                        <div
                          className="group fade-in flex animate-in items-start gap-3 rounded-xl border border-border/40 bg-background p-3.5 shadow-sm transition-all duration-200 hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/5"
                          key={mem.id}
                        >
                          <div className="mt-0.5 shrink-0 rounded-lg bg-secondary/50 p-1.5 transition-colors group-hover:bg-pink-500/10">
                            <Brain className="size-3.5 text-muted-foreground transition-colors group-hover:text-pink-500" />
                          </div>
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-medium text-[13px] text-foreground leading-snug">
                              {mem.memory}
                            </p>
                            <p className="mt-2 font-bold text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                              {new Date(mem.created_at).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                          <button
                            className="ml-auto shrink-0 rounded-lg p-2 text-muted-foreground opacity-0 ring-offset-background transition-all hover:bg-red-500/10 hover:text-red-500 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                            onClick={() => setPendingDeleteId(mem.id)}
                            title="Forget memory"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog
              onOpenChange={(open) => !open && setPendingDeleteId(null)}
              open={!!pendingDeleteId}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Memory</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this memory? This action
                    cannot be undone and Juristo will no longer remember this
                    information.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 text-white hover:bg-red-600"
                    onClick={async () => {
                      if (pendingDeleteId) {
                        await handleDeleteMemory(pendingDeleteId);
                        setPendingDeleteId(null);
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Right Panel: Documents & Settings */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 pb-6">
          {/* Promotional Quiz Card */}
          <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-emerald-500/30 hover:shadow-md">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-lg tracking-tight">
                  <span className="rounded-md bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <GraduationCap className="size-4" />
                  </span>
                  Prepare for CLAT with AI
                </h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Generate quizzes, flashcards and track your progress using Juristo AI.
                </p>
              </div>
              <Link href="/clat-exam" className="shrink-0">
                <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-full shadow-sm">
                  Create Quiz
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Notifications Panel */}
          {notifications && notifications.length > 0 && (
            <div className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Notifications</h2>
                <Badge variant="secondary">{notifications.length} Unread</Badge>
              </div>
              <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-2 scrollbar-hide">
                {notifications.map((notif: any) => (
                  <div key={notif.id} className="flex flex-col gap-1.5 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-[13px]">{notif.title}</h3>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(notif.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{notif.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile & Onboarding Data Section */}
          <div className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-sm">
            <div 
              className="flex shrink-0 cursor-pointer select-none items-center justify-between border-b bg-muted/20 px-5 py-4 transition-colors hover:bg-muted/30"
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className="flex items-center gap-2">
                <Users className="size-4 shrink-0 text-primary" />
                <h2 className="font-semibold text-[15px]">Personal Data & Settings</h2>
              </div>
              <div className="rounded-full p-1 transition-colors hover:bg-muted">
                {showProfile ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </div>
            
            <AnimatePresence initial={false}>
              {showProfile && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {/* Email (Read Only) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <input
                    disabled
                    value={user.email}
                    className="rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Phone Number
                    </label>
                    {phoneVerified ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <Check className="mr-1 size-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400">
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91..."
                      className="flex-1 rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {!phoneVerified && phone && phone.trim().length >= 10 && (
                      <button
                        onClick={handleSendOtp}
                        disabled={sendingOtp}
                        className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
                      >
                        {sendingOtp ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                      </button>
                    )}
                  </div>
                  
                  {/* OTP Input UI */}
                  {showOtpInput && !phoneVerified && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/40 p-3">
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otp.length !== 6}
                        className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {verifyingOtp ? <Loader2 className="size-4 animate-spin" /> : "Confirm"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Work Area */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Work Area / Profession
                  </label>
                  <Select value={workArea} onValueChange={setWorkArea}>
                    <SelectTrigger className="h-10 rounded-xl bg-background">
                      <SelectValue placeholder="Select your field" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Legal & Law", "Finance & Banking", "Real Estate", "Healthcare", 
                        "Technology & IT", "Education", "Manufacturing", "Retail & E-Commerce", 
                        "Media & Entertainment", "Consulting", "Government & Public Sector", 
                        "Startups & Entrepreneurship", "Freelancing", "Non-Profit & NGO", "Other"
                      ].map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Referral Source */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    How did you find us?
                  </label>
                  <Select value={referralSource} onValueChange={setReferralSource}>
                    <SelectTrigger className="h-10 rounded-xl bg-background">
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Google Search", "Instagram", "LinkedIn", "Twitter / X", "Facebook", 
                        "YouTube", "Reddit", "Friend or Colleague", "Blog / Article", 
                        "Product Hunt", "App Store", "Other"
                      ].map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-2 border-t pt-5">
                <button
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingProfile || (phone === user.phone && workArea === user.workArea && referralSource === user.referralSource)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUpdatingProfile ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Save Changes
                </button>
              </div>
            </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Billing & Subscription Section */}
          <div className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-sm">
            <div 
              className="flex shrink-0 cursor-pointer select-none items-center justify-between border-b bg-muted/20 px-5 py-4 transition-colors hover:bg-muted/30"
              onClick={() => setShowBilling(!showBilling)}
            >
              <div className="flex items-center gap-2">
                <Crown className="size-4 shrink-0 text-primary" />
                <h2 className="font-semibold text-[15px]">Billing & Subscription</h2>
              </div>
              <div className="rounded-full p-1 transition-colors hover:bg-muted">
                {showBilling ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </div>
            
            <AnimatePresence initial={false}>
              {showBilling && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-5 p-5 sm:p-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Current Plan */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Current Plan
                        </label>
                        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Crown className="size-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {user.plan === "basic" ? "Free Plan" : `${user.plan.toUpperCase()} Plan`}
                            </p>
                            {user.subscriptionData?.currentStart && user.subscriptionData?.currentEnd ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Cycle: {user.subscriptionData.currentStart} - {user.subscriptionData.currentEnd}
                                {user.subscriptionData.nextCharge && ` (Next charge: ${user.subscriptionData.nextCharge})`}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {user.plan === "basic" ? "No active subscription" : "Billed according to your cycle"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Support / Cancel */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Need help with billing?
                        </label>
                        <div className="flex h-full flex-col justify-center rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                            For plan cancellations, refunds, or payment issues, please raise a support ticket. Our team will handle your request securely.
                          </p>
                          <Link href="/tickets" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors w-max">
                            <ExternalLink className="size-3.5" /> Contact Support
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
