"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    content: string;
    senderType: "user" | "lawyer";
    createdAt: string;
}

interface MessageSuggestionsProps {
    messages: Message[];
    role: "lawyer" | "user";        // whose perspective we generate for
    sessionId: string;
    onSelect: (text: string) => void; // fills the input, doesn't send
    lastMessageId?: string;          // re-fetch when this changes
    disabled?: boolean;
    // Which API endpoint to call — different for lawyer portal vs user app
    apiPath?: string;
}

export function MessageSuggestions({
    messages,
    role,
    sessionId,
    onSelect,
    lastMessageId,
    disabled = false,
    apiPath,
}: MessageSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [used, setUsed] = useState(false); // hide after a chip is clicked

    const endpoint = apiPath ?? `/api/live-chats/${sessionId}/suggestions`;

    const fetchSuggestions = useCallback(async () => {
        if (disabled) return;
        setIsLoading(true);
        setUsed(false);
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages, role }),
            });
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions ?? []);
            }
        } catch (err) {
            console.error("Failed to fetch suggestions:", err);
        } finally {
            setIsLoading(false);
        }
    }, [messages, role, endpoint, disabled]);

    // Fetch on mount (for opening messages) and whenever lastMessageId changes
    useEffect(() => {
        // Only regenerate when the OTHER party sends a message
        const lastMsg = messages[messages.length - 1];
        const shouldFetch =
            messages.length === 0 || // opening suggestions
            (lastMsg && lastMsg.senderType !== role); // incoming message from other party

        if (shouldFetch) {
            fetchSuggestions();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessageId]);

    const handleSelect = (text: string) => {
        onSelect(text);
        setUsed(true);
    };

    // Don't show if used, disabled, or loading with no prior suggestions
    if (used || disabled) return null;

    return (
        <div className={cn(
            "px-3 pb-2 pt-1 transition-all duration-300",
            "animate-in fade-in slide-in-from-bottom-2"
        )}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    <Sparkles className="w-3 h-3 text-primary/60" />
                    AI Suggestions
                </div>
                {!isLoading && suggestions.length > 0 && (
                    <button
                        onClick={fetchSuggestions}
                        className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                    >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Refresh
                    </button>
                )}
            </div>

            {/* Chips */}
            {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Generating suggestions...</span>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => handleSelect(s)}
                            className={cn(
                                "text-xs px-3 py-1.5 rounded-full border",
                                "bg-primary/5 border-primary/20 text-foreground",
                                "hover:bg-primary/10 hover:border-primary/40",
                                "transition-all duration-150 active:scale-95",
                                "text-left max-w-70 truncate",
                                "animate-in fade-in zoom-in-95",
                            )}
                            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                            title={s} // show full text on hover if truncated
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
