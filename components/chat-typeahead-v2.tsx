"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { cn } from "@/lib/utils";

type Suggestion = {
  text: string;
  type: "static" | "memory" | "ai";
};

type CachedSuggestionEntry = {
  suggestions: Suggestion[];
  timestamp: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;
const SESSION_CACHE_KEY = "juristo-chat-suggestion-cache-v1";
const TOKEN_SPLIT_PATTERN = /[^a-z0-9]+/i;
const ACTION_START_PATTERN =
  /^(can|check|compare|draft|explain|find|how|list|prepare|summarize|what|write)\b/i;
const CONTEXT_STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "are",
  "can",
  "current",
  "explain",
  "find",
  "for",
  "from",
  "how",
  "india",
  "indian",
  "latest",
  "law",
  "laws",
  "legal",
  "recent",
  "summarize",
  "the",
  "this",
  "what",
  "with",
]);
const JURISTO_USE_CASE_SUGGESTIONS = [
  "Upload a PDF and summarize legal risks",
  "Review my contract for risky clauses",
  "Draft a legal notice for non-payment",
  "Prepare questions to ask a lawyer",
  "Compare legal options before filing a case",
  "Create an evidence checklist for my dispute",
  "Summarize a judgment in simple terms",
  "Find practical next steps under Indian law",
  "Draft a rental agreement for my city",
  "Check startup compliance requirements",
  "Prepare a client-ready legal brief",
  "Explain a legal notice I received",
];

const suggestionCache = new Map<string, CachedSuggestionEntry>();
const inFlightSuggestionRequests = new Map<string, Promise<Suggestion[]>>();
let hasLoadedSessionCache = false;

function normalizeQuery(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function tokenizeContext(value: string) {
  return normalizeQuery(value)
    .split(TOKEN_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !CONTEXT_STOP_WORDS.has(token));
}

function trimAtWordBoundary(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const trimmed = value.slice(0, maxLength).trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  const compacted = lastSpace > 24 ? trimmed.slice(0, lastSpace) : trimmed;

  return compacted.replace(/[,:;/-]+$/g, "").trim();
}

function dedupeSuggestions(suggestions: Suggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = normalizeQuery(suggestion.text);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function rankMatchingSuggestions(query: string, suggestions: string[]) {
  const q = normalizeQuery(query);
  const queryTokens = tokenizeContext(q);

  return suggestions
    .map((text) => {
      const lower = text.toLowerCase();
      const suggestionTokens = new Set(tokenizeContext(lower));
      const overlap = queryTokens.filter((token) =>
        suggestionTokens.has(token)
      ).length;
      const score =
        (lower.startsWith(q) ? 16 : 0) +
        (lower.includes(q) ? 8 : 0) +
        overlap * 3;

      return { score, text };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.text);
}

function contextualTypeaheadSuggestions(query: string) {
  const subject = trimAtWordBoundary(
    query
      .replace(/\s+/g, " ")
      .replace(/[?.!]+$/g, "")
      .trim(),
    56
  );

  if (subject.length < 3) {
    return [];
  }

  const lower = subject.toLowerCase();
  const startsWithAction = ACTION_START_PATTERN.test(subject);

  if (startsWithAction) {
    return [
      `${subject} under Indian law`,
      `${subject} with recent cases`,
      `${subject} in simple terms`,
      `${subject} practical next steps`,
    ];
  }

  if (
    lower.includes("upload") ||
    lower.includes("pdf") ||
    lower.includes("document") ||
    lower.includes("file")
  ) {
    return [
      `${subject} and summarize legal risks`,
      `${subject} and extract key clauses`,
      `${subject} for a simple legal summary`,
      `${subject} and prepare lawyer questions`,
    ];
  }

  if (lower.includes("contract") || lower.includes("agreement")) {
    return [
      `${subject} for risky clauses`,
      `${subject} and missing terms`,
      `${subject} under Indian law`,
      `${subject} checklist before signing`,
    ];
  }

  if (lower.includes("prime minister")) {
    return [
      `${subject} constitutional powers in India`,
      `${subject} vs president legal powers in India`,
      `${subject} accountability under Indian law`,
      `${subject} appointment and removal process`,
    ];
  }

  return [
    `${subject} legal risks and next steps`,
    `${subject} under Indian law`,
    `${subject} rights and obligations explained`,
    `${subject} lawyer questions to ask`,
  ];
}

function getLocalSuggestions(query: string) {
  const contextual = contextualTypeaheadSuggestions(query).map((text) => ({
    text,
    type: "ai" as const,
  }));
  const staticMatches = rankMatchingSuggestions(query, [
    ...JURISTO_USE_CASE_SUGGESTIONS,
  ])
    .slice(0, 4)
    .map((text) => ({ text, type: "static" as const }));

  return dedupeSuggestions([...contextual, ...staticMatches]).slice(0, 5);
}

function loadSessionSuggestionCache() {
  if (hasLoadedSessionCache || typeof window === "undefined") {
    return;
  }

  hasLoadedSessionCache = true;

  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as [string, CachedSuggestionEntry][];
    for (const [key, entry] of parsed) {
      if (Date.now() - entry.timestamp <= CACHE_TTL_MS) {
        suggestionCache.set(key, entry);
      }
    }
  } catch {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  }
}

function persistSessionSuggestionCache() {
  if (typeof window === "undefined") {
    return;
  }

  const entries = [...suggestionCache.entries()].slice(-MAX_CACHE_ENTRIES);
  window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(entries));
}

function getCachedSuggestions(query: string) {
  loadSessionSuggestionCache();
  const key = normalizeQuery(query);
  const cached = suggestionCache.get(key);
  if (!cached || Date.now() - cached.timestamp > CACHE_TTL_MS) {
    suggestionCache.delete(key);
    return null;
  }

  return cached.suggestions;
}

function setCachedSuggestions(query: string, suggestions: Suggestion[]) {
  const key = normalizeQuery(query);
  if (!key) {
    return;
  }

  suggestionCache.set(key, { suggestions, timestamp: Date.now() });
  if (suggestionCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = suggestionCache.keys().next().value;
    if (oldestKey) {
      suggestionCache.delete(oldestKey);
    }
  }
  persistSessionSuggestionCache();
}

type ChatTypeaheadProps = {
  input: string;
  onPreviewChange?: (text: string | null) => void;
  onSelect: (text: string) => void;
  visible: boolean;
};

export function ChatTypeahead({
  input,
  onPreviewChange,
  onSelect,
  visible,
}: ChatTypeaheadProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [debouncedInput] = useDebounceValue(input, 100); // Super fast background debounce
  const latestInputRef = useRef(input);

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  useEffect(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setSelectedIndex(0);

    const cachedSuggestions = getCachedSuggestions(trimmedInput);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setIsLoading(false);
      return;
    }

    setSuggestions(getLocalSuggestions(trimmedInput));
  }, [input]);

  // LAYER 2: Background AI & History Fetching (Debounced)
  useEffect(() => {
    const trimmedInput = debouncedInput.trim();
    if (!trimmedInput) {
      setIsLoading(false);
      return;
    }

    if (trimmedInput.length < 2) {
      setIsLoading(false);
      return;
    }

    const cachedSuggestions = getCachedSuggestions(trimmedInput);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchAIGenerated = async () => {
      const cacheKey = normalizeQuery(trimmedInput);
      setIsLoading(true);
      try {
        const requestPromise =
          inFlightSuggestionRequests.get(cacheKey) ??
          fetch("/api/chat/suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: trimmedInput }),
          })
            .then(async (res) => {
              const contentType = res.headers.get("content-type") ?? "";
              if (!(res.ok && contentType.includes("application/json"))) {
                return getLocalSuggestions(trimmedInput);
              }

              const data = await res.json();
              const apiSuggestions = Array.isArray(data.suggestions)
                ? data.suggestions
                : [];
              return dedupeSuggestions(
                apiSuggestions
                  .filter((s: any) => typeof s?.text === "string")
                  .map((s: any) => ({
                    text: s.text,
                    type: s.type === "static" ? "static" : "ai",
                  }))
              ).slice(0, 5);
            })
            .finally(() => {
              inFlightSuggestionRequests.delete(cacheKey);
            });

        if (!inFlightSuggestionRequests.has(cacheKey)) {
          inFlightSuggestionRequests.set(cacheKey, requestPromise);
        }

        const fetchedSuggestions = await requestPromise;
        const finalSuggestions =
          fetchedSuggestions.length > 0
            ? fetchedSuggestions
            : getLocalSuggestions(trimmedInput);

        setCachedSuggestions(trimmedInput, finalSuggestions);

        if (isMounted && normalizeQuery(latestInputRef.current) === cacheKey) {
          setSuggestions(finalSuggestions);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch suggestions:", err);
          setSuggestions((current) =>
            current.length > 0 ? current : getLocalSuggestions(trimmedInput)
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAIGenerated();
    return () => {
      isMounted = false;
    };
  }, [debouncedInput]);

  useEffect(() => {
    if (!visible || suggestions.length === 0) {
      onPreviewChange?.(null);
      return;
    }

    onPreviewChange?.(suggestions[selectedIndex]?.text ?? null);
  }, [visible, suggestions, selectedIndex, onPreviewChange]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible || suggestions.length === 0) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          e.stopImmediatePropagation();
          onSelect(suggestions[selectedIndex].text);
          onPreviewChange?.(null);
          setSuggestions([]);
        }
      } else if (e.key === "Escape") {
        onPreviewChange?.(null);
        setSuggestions([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [visible, suggestions, selectedIndex, onSelect, onPreviewChange]);

  if (!visible || (suggestions.length === 0 && !isLoading)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="absolute top-full left-0 z-[100] mt-2 w-full max-w-full overflow-hidden rounded-xl border bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md"
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
      >
        <div className="flex flex-col gap-0.5">
          {suggestions.map((s, i) => (
            <button
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150",
                i === selectedIndex
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              key={`${s.type}-${s.text}`}
              onClick={() => {
                onSelect(s.text);
                onPreviewChange?.(null);
                setSuggestions([]);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              type="button"
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md",
                  i === selectedIndex ? "bg-primary/20" : "bg-primary/10"
                )}
              >
                <Image
                  alt="Juristo"
                  className="object-contain opacity-80"
                  height={12}
                  src="https://res.cloudinary.com/dkgvldz8m/image/upload/q_auto/f_auto/v1776517817/image_dqwzyd.png"
                  width={12}
                />
              </div>
              <span className="flex-1 truncate font-medium">{s.text}</span>
              {i === selectedIndex && (
                <ArrowUpRight className="size-3.5 opacity-40" />
              )}
            </button>
          ))}

          {isLoading && (
            <div className="mt-1 flex items-center gap-2 border-border/40 border-t px-3 py-2 text-[11px] text-muted-foreground">
              <div className="flex gap-1">
                <span className="size-1 animate-bounce rounded-full bg-primary/40" />
                <span className="size-1 animate-bounce rounded-full bg-primary/40 [animation-delay:0.2s]" />
                <span className="size-1 animate-bounce rounded-full bg-primary/40 [animation-delay:0.4s]" />
              </div>
              <span>Searching legal database & AI history...</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
