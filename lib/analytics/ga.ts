/**
 * Client-side Google Analytics event tracking utility.
 *
 * Usage (from any client component or client-side code):
 *   import { trackGA } from "@/lib/analytics/ga";
 *   trackGA("chat_created", { model: "gemini-flash", plan: "advance" });
 *
 * This sends a custom event to GA4 (G-8KTHEXQBS0) that appears under
 * Reports → Engagement → Events in the Google Analytics dashboard.
 */

type GAEventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function trackGA(eventName: string, params?: GAEventParams) {
  try {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, {
        ...params,
        event_category: "user_activity",
        send_to: "G-8KTHEXQBS0",
      });
    }
  } catch (e) {
    // Silently fail – analytics should never break the app
  }
}
