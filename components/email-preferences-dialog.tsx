"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, ChevronDown, ChevronUp, GripVertical, Loader2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface EmailPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function EmailPreferencesDialog({ open, onOpenChange, userEmail }: EmailPreferencesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferenceState>({
    ...DEFAULT_EMAIL_PREFERENCES,
    email: userEmail,
  });

  const fetchEmailPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email-preferences", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load preferences");

      setPreferences({
        email: data.email || userEmail,
        optional: {
          quiz: data.optional?.quiz !== false,
          newsletter: data.optional?.newsletter !== false,
          reminder: data.optional?.reminder !== false,
          marketing: data.optional?.marketing !== false,
        },
        order: Array.isArray(data.order) ? data.order : DEFAULT_EMAIL_PREFERENCES.order,
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not load email preferences.");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (open) {
      fetchEmailPreferences();
    }
  }, [open, fetchEmailPreferences]);

  const handleToggle = (key: OptionalEmailPreferenceKey, checked: boolean) => {
    setPreferences((current) => ({
      ...current,
      optional: { ...current.optional, [key]: checked },
    }));
  };

  const moveItem = (key: EmailPreferenceKey, direction: -1 | 1) => {
    setPreferences((current) => {
      const index = current.order.indexOf(key);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.order.length) return current;

      const order = [...current.order];
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];

      return { ...current, order };
    });
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optional: preferences.optional,
          order: preferences.order,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) throw new Error(data.error || "Failed to save");

      toast.success("Email preferences saved.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Could not save email preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 outline-none rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] sm:max-w-2xl font-sans text-left">
        <DialogHeader className="shrink-0 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/50 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] p-2 text-[#4169E1]">
              <Bell className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-bold text-base tracking-tight font-serif text-zinc-900 dark:text-white">
                Email Notification Settings
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-zinc-400 dark:text-zinc-500 text-xs">
                Choose optional emails for {preferences.email || userEmail}. Required security and account emails stay on.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-3 [scrollbar-width:thin]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-6 animate-spin text-[#4169E1]" />
              <span className="font-medium text-zinc-400 text-xs uppercase tracking-wider">
                Loading email preferences...
              </span>
            </div>
          ) : (
            preferences.order.map((key) => {
              const meta = EMAIL_PREFERENCE_META[key];
              const locked = !!meta.locked;
              const enabled = locked || preferences.optional[key as OptionalEmailPreferenceKey] !== false;
              const index = preferences.order.indexOf(key);

              return (
                <div
                  className="rounded-none border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/30 p-4 transition-colors hover:border-[#4169E1]/30"
                  key={key}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A] p-2 text-zinc-400">
                      {locked ? <ShieldCheck className="size-4 text-emerald-500" /> : <GripVertical className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200 font-serif">{meta.title}</p>
                        {locked && (
                          <Badge className="rounded-none border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-none" variant="outline">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-zinc-400 dark:text-zinc-500 text-xs leading-relaxed font-normal">
                        {meta.description}
                      </p>
                      
                      <div className="mt-3 flex items-center gap-1.5">
                        <button
                          disabled={index === 0}
                          onClick={() => moveItem(key, -1)}
                          type="button"
                          className="h-7 w-7 rounded-none p-0 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <button
                          disabled={index === preferences.order.length - 1}
                          onClick={() => moveItem(key, 1)}
                          type="button"
                          className="h-7 w-7 rounded-none p-0 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={locked}
                      onCheckedChange={(checked) =>
                        !locked && handleToggle(key as OptionalEmailPreferenceKey, checked)
                      }
                      className="data-[state=checked]:bg-[#4169E1] rounded-full"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-[#080D1A]/50 px-6 py-4">
          <p className="text-zinc-400 dark:text-zinc-500 text-xs font-normal">
            OTP, security, payment and critical account emails cannot be disabled.
          </p>
          <button
            disabled={saving || loading}
            onClick={savePreferences}
            className="h-10 px-5 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs uppercase tracking-wider transition-colors rounded-none flex items-center justify-center gap-2 disabled:opacity-50 shadow-none cursor-pointer"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save Settings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}