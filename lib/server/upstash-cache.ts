import "server-only";

type UpstashResult<T = unknown> = {
  error?: string;
  result?: T;
};

type CacheEnvelope<T> = {
  value: T;
  storedAt: number;
};

const CACHE_KEY_PREFIX = "juristo";
const DEFAULT_TTL_SECONDS = 5 * 60;

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/g, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!(url && token)) {
    return null;
  }

  return { token, url };
}

function namespacedKey(key: string) {
  return `${CACHE_KEY_PREFIX}:${key}`;
}

async function runUpstashPipeline(commands: unknown[][]) {
  const config = getUpstashConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn("[Upstash Cache] request failed:", response.status);
      return null;
    }

    return (await response.json()) as UpstashResult[];
  } catch (error) {
    console.warn("[Upstash Cache] request error:", error);
    return null;
  }
}

export function isGlobalCacheAvailable() {
  return Boolean(getUpstashConfig());
}

export async function getGlobalCache<T>(key: string) {
  const response = await runUpstashPipeline([["GET", namespacedKey(key)]]);
  const rawValue = response?.[0]?.result;

  if (typeof rawValue !== "string") {
    return null;
  }

  try {
    const envelope = JSON.parse(rawValue) as CacheEnvelope<T>;
    return envelope.value ?? null;
  } catch (error) {
    console.warn("[Upstash Cache] parse failed:", error);
    return null;
  }
}

export async function setGlobalCache<T>(
  key: string,
  value: T,
  {
    ttlSeconds = DEFAULT_TTL_SECONDS,
  }: {
    ttlSeconds?: number;
  } = {}
) {
  const envelope: CacheEnvelope<T> = {
    value,
    storedAt: Date.now(),
  };

  await runUpstashPipeline([
    ["SET", namespacedKey(key), JSON.stringify(envelope), "EX", ttlSeconds],
  ]);
}

export async function deleteGlobalCache(key: string) {
  await runUpstashPipeline([["DEL", namespacedKey(key)]]);
}
