const LEGAL_PHRASES = [
  "rent agreement",
  "rental agreement",
  "lease agreement",
  "property dispute",
  "consumer complaint",
  "employment contract",
  "employment agreement",
  "termination notice",
  "legal notice",
  "divorce petition",
  "mutual divorce",
  "child custody",
  "trademark registration",
  "company registration",
  "partnership deed",
  "shareholder agreement",
  "non disclosure agreement",
  "nda",
  "sale deed",
  "privacy policy",
  "terms and conditions",
  "service agreement",
  "freelance agreement",
  "contract review",
  "contract drafting",
  "cheque bounce",
  "criminal complaint",
  "succession certificate",
  "will draft",
  "gst notice",
  "tax return",
];

const STOP_WORDS = new Set([
  "about",
  "above",
  "after",
  "again",
  "against",
  "also",
  "and",
  "any",
  "are",
  "because",
  "been",
  "being",
  "can",
  "could",
  "did",
  "does",
  "doing",
  "for",
  "from",
  "had",
  "has",
  "have",
  "help",
  "her",
  "him",
  "his",
  "how",
  "into",
  "its",
  "just",
  "kindly",
  "law",
  "legal",
  "like",
  "make",
  "need",
  "please",
  "should",
  "show",
  "some",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "they",
  "this",
  "use",
  "want",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you",
  "your",
]);

export function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const candidate = part as { text?: unknown; type?: unknown };
      if (candidate.type === "text" && typeof candidate.text === "string") {
        return candidate.text;
      }
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createTextPreview(text: string, maxLength = 180): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

export function extractKeywordsFromText(text: string, limit = 12): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];

  const keywords = new Set<string>();

  for (const phrase of LEGAL_PHRASES) {
    if (normalized.includes(phrase)) {
      keywords.add(phrase);
    }
  }

  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  const rankedTokens = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token);

  for (const token of rankedTokens) {
    keywords.add(token);
    if (keywords.size >= limit) break;
  }

  return [...keywords].slice(0, limit);
}
