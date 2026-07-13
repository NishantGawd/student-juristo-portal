"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSWRConfig } from "swr";

/**
 * Invisible component that detects when the logged-in user changes
 * (e.g. logout → login with a different Google account) and wipes
 * the entire SWR in-memory cache so the new user never sees stale
 * sidebar history, consultations, or other user-scoped data.
 *
 * Also clears the `chat-model` cookie on user change so the model
 * selector resets to the default.
 */
export function SessionCacheCleaner() {
    const { data: session, status } = useSession();
    const { cache } = useSWRConfig();
    const prevUserIdRef = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        if (status === "loading") return; // wait until session is resolved

        const currentUserId = session?.user?.id ?? null;

        // On first mount, just record; on subsequent changes, wipe cache
        if (prevUserIdRef.current === undefined) {
            prevUserIdRef.current = currentUserId;
            return;
        }

        if (prevUserIdRef.current !== currentUserId) {
            // User identity changed — wipe everything
            console.log("[SessionCacheCleaner] User changed, clearing SWR cache + cookies");

            // 1. Wipe every SWR cache key
            for (const key of (cache as Map<string, unknown>).keys()) {
                (cache as Map<string, unknown>).delete(key);
            }

            // 2. Clear the chat-model cookie (client-side)
            document.cookie = "chat-model=; path=/; max-age=0";

            prevUserIdRef.current = currentUserId;
        }
    }, [session?.user?.id, status, cache]);

    return null; // renders nothing
}
