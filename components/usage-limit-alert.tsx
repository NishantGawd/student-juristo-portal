"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Zap, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

type UsageLimitAlertProps = {
    creditsUsed: number;
    creditsLimit: number;
    plan: string;
};

export function UsageLimitAlert({ creditsUsed, creditsLimit, plan }: UsageLimitAlertProps) {
    const [dismissed, setDismissed] = useState(false);

    // Don't show for unlimited plans
    if (creditsLimit === -1) return null;

    const percentage = Math.min((creditsUsed / creditsLimit) * 100, 100);
    const remaining = Math.max(creditsLimit - creditsUsed, 0);

    // Only show when usage is >= 70%
    if (percentage < 70 || dismissed) return null;

    const isReached = percentage >= 100;
    const isCritical = percentage >= 95 && !isReached;
    const isWarning = percentage >= 80;
    const isNearLimit = percentage >= 70;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className={`mx-4 mb-3 rounded-xl border p-3 ${isReached || isCritical
                    ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
                    : isWarning
                        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
                        : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
                    }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                        <div className={`mt-0.5 rounded-full p-1 ${isReached || isCritical
                            ? "bg-red-100 dark:bg-red-900/50"
                            : isWarning
                                ? "bg-amber-100 dark:bg-amber-900/50"
                                : "bg-blue-100 dark:bg-blue-900/50"
                            }`}>
                            {isReached || isCritical ? (
                                <AlertTriangle className="size-3.5 text-red-600 dark:text-red-400" />
                            ) : (
                                <Zap className="size-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${isReached || isCritical
                                ? "text-red-800 dark:text-red-200"
                                : isWarning
                                    ? "text-amber-800 dark:text-amber-200"
                                    : "text-blue-800 dark:text-blue-200"
                                }`}>
                                {isReached
                                    ? "Limit reached please upgrade to continue using service."
                                    : isCritical
                                        ? "AI credit limit almost reached!"
                                        : isWarning
                                            ? "Running low on AI credits"
                                            : "AI credit usage update"}
                            </p>
                            {!isReached && (
                                <p className={`text-xs mt-0.5 ${isCritical
                                    ? "text-red-600 dark:text-red-400"
                                    : isWarning
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-blue-600 dark:text-blue-400"
                                    }`}>
                                    {remaining.toLocaleString()} AI credits remaining ({(100 - percentage).toFixed(0)}% left)
                                </p>
                            )}

                            {/* Mini progress bar */}
                            <div className="mt-2 h-1.5 w-full max-w-[200px] rounded-full bg-white/50 dark:bg-black/20 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    className={`h-full rounded-full ${isReached || isCritical
                                        ? "bg-red-500"
                                        : isWarning
                                            ? "bg-amber-500"
                                            : "bg-blue-500"
                                        }`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {(plan === "basic" || plan === "free") && (
                            <Link
                                href="/upgrade"
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${isCritical
                                    ? "bg-red-600 text-white hover:bg-red-700"
                                    : "bg-amber-600 text-white hover:bg-amber-700"
                                    }`}
                            >
                                Upgrade
                                <ArrowUpRight className="size-3" />
                            </Link>
                        )}
                        <button
                            onClick={() => setDismissed(true)}
                            className={`rounded-lg p-1 transition-colors ${isReached || isCritical
                                ? "hover:bg-red-200 dark:hover:bg-red-900"
                                : isWarning
                                    ? "hover:bg-amber-200 dark:hover:bg-amber-900"
                                    : "hover:bg-blue-200 dark:hover:bg-blue-900"
                                }`}
                        >
                            <X className="size-4 text-current opacity-60" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Simple inline alert for within messages
export function InlineUsageWarning({
    percentage,
    remaining
}: {
    percentage: number;
    remaining: number;
}) {
    if (percentage < 90) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1"
        >
            <AlertTriangle className="size-3" />
            <span>{remaining.toLocaleString()} AI credits left</span>
        </motion.div>
    );
}

