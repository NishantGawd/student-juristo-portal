"use client";

import { motion } from "framer-motion";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------
// Animated Number Counter
// ----------------------------------------------------------------------
export function AnimatedCounter({
  value,
  duration = 1.5,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) {
        startTimestamp = timestamp;
      }
      const progress = Math.min(
        (timestamp - startTimestamp) / (duration * 1000),
        1
      );
      // easeOutQuart
      const ease = 1 - (1 - progress) ** 4;
      setCurrentValue(Math.floor(ease * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrentValue(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span className={className}>{currentValue}</span>;
}

// ----------------------------------------------------------------------
// Shimmer Button (MagicUI style)
// ----------------------------------------------------------------------
export function ShimmerButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-900 px-6 py-3 font-medium text-white transition-transform hover:scale-105 active:scale-95 dark:bg-slate-50",
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(110deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.3)_25%,rgba(255,255,255,0.1)_50%)] dark:bg-[linear-gradient(110deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.15)_25%,rgba(0,0,0,0.05)_50%)]" />
      <span className="relative flex items-center gap-2 text-slate-50 text-sm dark:text-slate-900">
        {children}
      </span>
    </button>
  );
}

// ----------------------------------------------------------------------
// Glow Card (MagicUI style)
// ----------------------------------------------------------------------
export function GlowCard({
  children,
  className,
  color = "rgba(16, 185, 129, 0.4)", // emerald default
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <div className={cn("group relative rounded-xl border bg-card", className)}>
      <div
        className="-inset-px pointer-events-none absolute rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          boxShadow: `0 0 15px 0 ${color}, inset 0 0 10px 0 ${color}`,
        }}
      />
      <div className="relative z-10 h-full w-full overflow-hidden rounded-xl">
        {children}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Fire Streak Icon
// ----------------------------------------------------------------------
export function FireStreak({ count }: { count: number }) {
  const isActive = count > 0;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 font-bold text-orange-600 text-sm dark:bg-orange-950/40 dark:text-orange-400">
      <motion.svg
        animate={
          isActive
            ? {
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              }
            : {}
        }
        className="h-4 w-4"
        fill={isActive ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </motion.svg>
      {count}
    </div>
  );
}
