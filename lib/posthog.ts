import "server-only";
import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
    if (!process.env.POSTHOG_KEY) {
        return null;
    }

    if (!posthogClient) {
        posthogClient = new PostHog(process.env.POSTHOG_KEY, {
            host: process.env.POSTHOG_HOST || "https://app.posthog.com",
            flushAt: 1, // Flush immediately for real-time tracking
            flushInterval: 0,
        });
    }
    return posthogClient;
}


// Track events from server-side
export function trackServerEvent(
    userId: string,
    eventName: string,
    properties?: Record<string, any>
) {
    const client = getPostHogClient();
    if (client) {
        console.log(`[PostHog] Tracking event: ${eventName}`, { userId, ...properties });
        client.capture({
            distinctId: userId,
            event: eventName,
            properties,
        });
    } else {
        console.warn("[PostHog] Client not initialized - POSTHOG_KEY missing?");
    }
}

// Pre-defined event trackers
export function trackChatCreated(userId: string, chatId: string) {
    trackServerEvent(userId, "chat_created", { chatId });
}

export function trackTokenUsage(userId: string, tokens: number, model: string) {
    trackServerEvent(userId, "tokens_used", { tokens, model });
}

export function trackContractPurchased(
    userId: string,
    contractSlug: string,
    price: string,
    tier: string
) {
    trackServerEvent(userId, "contract_purchased", { contractSlug, price, tier });
}

export function trackPlanUpgraded(userId: string, plan: string, amount: string) {
    trackServerEvent(userId, "plan_upgraded", { plan, amount });
}

// Shutdown function for cleanup
export async function shutdownPostHog() {
    const client = getPostHogClient();
    if (client) {
        await client.shutdown();
    }
}

