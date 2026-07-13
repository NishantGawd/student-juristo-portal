// Plan limits configuration for Juristo
// Defines usage limits for each subscription tier

import type { User } from "next-auth";

export const PLAN_LIMITS = {
    free: {
        drafts: 3, // Document drafting limit
        analysis: 5, // Doc analysis limit
        chats: -1, // Chat queries limit
        tokens: 25000, // Monthly AI credit limit
        apiKeys: 3, // API keys limit
        consultations: 0, // Lawyer matching is paid/add-on led
        memories: 10, // Mem0 stored memories limit
        odrPackets: 0, // ODR filing packet generation
    },
    clat_spark: {
        drafts: 5,
        analysis: 10,
        chats: -1,
        tokens: 100000,
        apiKeys: 3,
        consultations: 0,
        memories: 20,
        odrPackets: 0,
    },
    clat_momentum: {
        drafts: 15,
        analysis: 30,
        chats: -1,
        tokens: 400000,
        apiKeys: 3,
        consultations: 0,
        memories: 60,
        odrPackets: 0,
    },
    clat_peak: {
        drafts: 30,
        analysis: 60,
        chats: -1,
        tokens: 800000,
        apiKeys: 3,
        consultations: 0,
        memories: 100,
        odrPackets: 0,
    },
    advance: {
        drafts: 10,
        analysis: 20,
        chats: -1,
        tokens: 300000,
        apiKeys: -1,
        consultations: 1,
        memories: 100,
        odrPackets: 1,
    },
    advance_pro: {
        drafts: 40,
        analysis: 100,
        chats: -1,
        tokens: 1000000,
        apiKeys: -1,
        consultations: 5,
        memories: 200,
        odrPackets: 5,
    },
    business: {
        drafts: -1,
        analysis: -1,
        chats: -1,
        tokens: -1,
        apiKeys: -1,
        consultations: -1,
        memories: -1,
        odrPackets: -1,
    },
};

// Feature types for usage tracking display
export const FEATURE_TYPES = {
    drafts: {
        label: "Document Drafting",
        icon: "FileText",
        color: "blue",
    },
    analysis: {
        label: "Doc Analysis",
        icon: "Search",
        color: "purple",
    },
    chats: {
        label: "Legal Chat",
        icon: "MessageSquare",
        color: "green",
    },
    tokens: {
        label: "AI Credits",
        icon: "Cpu",
        color: "orange",
    },
    consultations: {
        label: "Lawyer Match Requests",
        icon: "Phone",
        color: "blue",
    },
    memories: {
        label: "AI Memories",
        icon: "Brain",
        color: "pink",
    },
    odrPackets: {
        label: "ODR Filing Packets",
        icon: "Landmark",
        color: "teal",
    },
};

export type PlanType = keyof typeof PLAN_LIMITS;
export type FeatureType = keyof typeof PLAN_LIMITS.free;

// Get limit for a specific plan and feature
export const getLimit = (plan: string | undefined | null, feature: FeatureType) => {
    const planName = (plan?.toLowerCase() || "free") as PlanType;
    const planLimits = PLAN_LIMITS[planName] || PLAN_LIMITS.free;
    return planLimits[feature] ?? 0;
};

// Check if usage is within limit
export const isWithinLimit = (
    plan: string | undefined | null,
    feature: FeatureType,
    currentUsage: number
) => {
    const limit = getLimit(plan, feature);
    if (limit === -1) return true; // Unlimited
    return currentUsage < limit;
};

// Get usage percentage
export const getUsagePercentage = (
    plan: string | undefined | null,
    feature: FeatureType,
    currentUsage: number
) => {
    const limit = getLimit(plan, feature);
    if (limit === -1) return 0; // Unlimited shows 0%
    if (limit === 0) return 100;
    return Math.min(100, Math.round((currentUsage / limit) * 100));
};

// Get color based on usage percentage
export const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "red";
    if (percentage >= 70) return "yellow";
    return "green";
};

