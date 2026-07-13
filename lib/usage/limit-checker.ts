import { getUserUsage } from "@/lib/db/queries";

// Plan limits configuration
export const PLAN_LIMITS = {
    free: { tokens: 25000, drafts: 3, chats: -1, analysis: 5, odrPackets: 0 },
    basic: { tokens: 25000, drafts: 3, chats: -1, analysis: 5, odrPackets: 0 },
    clat_spark: { tokens: 100000, drafts: 5, chats: -1, analysis: 10, odrPackets: 0 },
    clat_momentum: { tokens: 400000, drafts: 15, chats: -1, analysis: 30, odrPackets: 0 },
    clat_peak: { tokens: 800000, drafts: 30, chats: -1, analysis: 60, odrPackets: 0 },
    advance: { tokens: 300000, drafts: 10, chats: -1, analysis: 20, odrPackets: 1 },
    advance_pro: { tokens: 1000000, drafts: 40, chats: -1, analysis: 100, odrPackets: 5 },
    business: { tokens: -1, drafts: -1, chats: -1, analysis: -1, odrPackets: -1 },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
export type LimitType = "tokens" | "drafts" | "chats" | "analysis" | "odrPackets";

export type LimitCheckResult = {
    allowed: boolean;
    limitType: LimitType;
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    message: string;
};

/**
 * Check if a user has exceeded a specific limit
 */
export async function checkUserLimit(
    userId: string,
    limitType: LimitType,
    increment: number = 1
): Promise<LimitCheckResult> {
    const userUsage = await getUserUsage(userId);

    if (!userUsage) {
        return {
            allowed: false,
            limitType,
            used: 0,
            limit: 0,
            remaining: 0,
            percentUsed: 100,
            message: "User not found",
        };
    }

    const plan = (userUsage.plan || "basic") as PlanType;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic;

    let used = 0;
    let limit = 0;

    switch (limitType) {
        case "tokens":
            used = parseInt(userUsage.tokensUsed || "0", 10);
            limit = limits.tokens;
            break;
        case "drafts":
            used = parseInt(userUsage.draftCount || "0", 10);
            limit = limits.drafts;
            break;
        case "chats":
            used = parseInt(userUsage.chatCount || "0", 10);
            limit = limits.chats;
            break;
        case "analysis":
            used = parseInt(userUsage.analysisCount || "0", 10);
            limit = limits.analysis;
            break;
        case "odrPackets":
            used = parseInt((userUsage as any).odrPacketCount || "0", 10);
            limit = limits.odrPackets;
            break;
    }

    // Unlimited (-1)
    if (limit === -1) {
        return {
            allowed: true,
            limitType,
            used,
            limit: -1,
            remaining: Infinity,
            percentUsed: 0,
            message: "Unlimited usage",
        };
    }

    const remaining = Math.max(limit - used, 0);
    const percentUsed = Math.min((used / limit) * 100, 100);
    const wouldExceed = used + increment > limit;

    const limitLabels: Record<LimitType, string> = {
        tokens: "AI credit",
        drafts: "contract draft",
        chats: "chat session",
        analysis: "document analysis",
        odrPackets: "ODR filing packet",
    };

    if (wouldExceed) {
        return {
            allowed: false,
            limitType,
            used,
            limit,
            remaining,
            percentUsed,
            message: `You've reached your ${limitLabels[limitType]} limit. Please upgrade your plan to continue.`,
        };
    }

    return {
        allowed: true,
        limitType,
        used,
        limit,
        remaining,
        percentUsed,
        message: `${remaining} ${limitLabels[limitType]}${remaining !== 1 ? "s" : ""} remaining`,
    };
}

/**
 * Check all limits for a user
 */
export async function checkAllLimits(userId: string): Promise<{
    tokens: LimitCheckResult;
    drafts: LimitCheckResult;
    chats: LimitCheckResult;
    analysis: LimitCheckResult;
    odrPackets: LimitCheckResult;
    anyLimitReached: boolean;
    limitReachedTypes: LimitType[];
}> {
    const [tokens, drafts, chats, analysis, odrPackets] = await Promise.all([
        checkUserLimit(userId, "tokens", 0),
        checkUserLimit(userId, "drafts", 0),
        checkUserLimit(userId, "chats", 0),
        checkUserLimit(userId, "analysis", 0),
        checkUserLimit(userId, "odrPackets", 0),
    ]);

    const limitReachedTypes: LimitType[] = [];

    if (tokens.percentUsed >= 100) limitReachedTypes.push("tokens");
    if (drafts.percentUsed >= 100) limitReachedTypes.push("drafts");
    if (chats.percentUsed >= 100) limitReachedTypes.push("chats");
    if (analysis.percentUsed >= 100) limitReachedTypes.push("analysis");
    if (odrPackets.percentUsed >= 100) limitReachedTypes.push("odrPackets");

    return {
        tokens,
        drafts,
        chats,
        analysis,
        odrPackets,
        anyLimitReached: limitReachedTypes.length > 0,
        limitReachedTypes,
    };
}

