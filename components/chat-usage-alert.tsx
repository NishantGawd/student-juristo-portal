"use client";

import useSWR from "swr";
import { UsageLimitAlert } from "./usage-limit-alert";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type UsageData = {
    plan: string;
    tokens: {
        used: number;
        limit: number;
        percentage: number;
    };
    chats: {
        used: number;
        limit: number;
        percentage: number;
    };
    drafts: {
        used: number;
        limit: number;
        percentage: number;
    };
};

export function ChatUsageAlert() {
    const { data } = useSWR<UsageData>("/api/usage", fetcher, {
        refreshInterval: 60000, // Refresh every minute
        revalidateOnFocus: false,
        dedupingInterval: 60000, // Prevent duplicate requests within 1 minute
        focusThrottleInterval: 300000, // Only revalidate on focus every 5 minutes
        revalidateIfStale: false,
        // Enable stale-while-revalidate pattern for better performance
        compare: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    });

    if (!data || !data.tokens || data.tokens.limit === -1) {
        return null; // Don't show for unlimited plans or if no data
    }

    return (
        <UsageLimitAlert
            creditsUsed={data.tokens.used}
            creditsLimit={data.tokens.limit}
            plan={data.plan}
        />
    );
}
