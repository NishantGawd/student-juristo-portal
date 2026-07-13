import { notifyProductionError } from "@/lib/monitoring/slack-alerts";

type PlatformHealthTarget = {
  name: string;
  timeoutMs?: number;
  url: string;
};

type PlatformHealthStatus = "ok" | "slow" | "down";

export type PlatformHealthResult = {
  durationMs: number;
  error?: string;
  name: string;
  status: PlatformHealthStatus;
  statusCode?: number;
  url: string;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_SLOW_MS = 3000;

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

function parseJsonTargets(value: string): PlatformHealthTarget[] | null {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .map((target) => {
        if (
          !target ||
          typeof target !== "object" ||
          typeof target.name !== "string" ||
          typeof target.url !== "string"
        ) {
          return null;
        }

        return {
          name: target.name,
          timeoutMs:
            typeof target.timeoutMs === "number" ? target.timeoutMs : undefined,
          url: target.url,
        };
      })
      .filter((target): target is PlatformHealthTarget => Boolean(target));
  } catch {
    return null;
  }
}

function parseDelimitedTargets(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawName, ...urlParts] = entry.split("=");
      const url = urlParts.join("=").trim();

      if (!rawName || !url) {
        return null;
      }

      return {
        name: rawName.trim(),
        url,
      };
    })
    .filter((target): target is PlatformHealthTarget => Boolean(target));
}

function targetsFromEnvValue(value?: string) {
  if (!value) {
    return [];
  }

  return parseJsonTargets(value) || parseDelimitedTargets(value);
}

function defaultTargets() {
  const appUrl =
    process.env.PLATFORM_V2_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://chat.juristo.in";
  const lawyerUrl =
    process.env.PLATFORM_LAWYER_URL ||
    process.env.LAWYER_PROJECT_URL ||
    process.env.LAWYER_APP_URL ||
    "https://lawyer.juristo.in";
  const adminUrl =
    process.env.PLATFORM_ADMIN_URL ||
    process.env.ADMIN_PROJECT_URL ||
    process.env.ADMIN_APP_URL ||
    "https://admin.juristo.in";

  return [
    appUrl ? { name: "v2", url: appUrl } : null,
    lawyerUrl ? { name: "lawyer", url: lawyerUrl } : null,
    adminUrl ? { name: "admin", url: adminUrl } : null,
  ].filter((target): target is PlatformHealthTarget => Boolean(target));
}

export function getPlatformHealthTargets() {
  const explicitTargets = [
    ...targetsFromEnvValue(process.env.PLATFORM_HEALTH_TARGETS),
    ...targetsFromEnvValue(process.env.PLATFORM_LOOKUP_TARGETS),
    ...targetsFromEnvValue(process.env.PLATFORM_SERVICE_HEALTH_TARGETS),
  ];

  const targets =
    explicitTargets.length > 0 ? explicitTargets : defaultTargets();
  const seen = new Set<string>();

  return targets
    .map((target) => ({
      ...target,
      url: normalizeUrl(target.url),
    }))
    .filter((target) => {
      const key = `${target.name}:${target.url}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

async function checkTarget(
  target: PlatformHealthTarget,
  slowThresholdMs: number
): Promise<PlatformHealthResult> {
  const startedAt = Date.now();
  const timeoutMs = target.timeoutMs || DEFAULT_TIMEOUT_MS;

  try {
    const response = await fetch(target.url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Juristo-Platform-Healthcheck/1.0",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        durationMs,
        name: target.name,
        status: "down",
        statusCode: response.status,
        url: target.url,
      };
    }

    return {
      durationMs,
      name: target.name,
      status: durationMs > slowThresholdMs ? "slow" : "ok",
      statusCode: response.status,
      url: target.url,
    };
  } catch (error) {
    return {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      name: target.name,
      status: "down",
      url: target.url,
    };
  }
}

function summarizeFailures(results: PlatformHealthResult[]) {
  return results
    .filter((result) => result.status !== "ok")
    .map((result) => {
      const statusCode = result.statusCode ? ` HTTP ${result.statusCode}` : "";
      const error = result.error ? ` ${result.error}` : "";

      return `${result.name} is ${result.status}${statusCode} after ${result.durationMs}ms (${result.url})${error}`;
    })
    .join("\n");
}

export async function runPlatformHealthLookup() {
  const targets = getPlatformHealthTargets();
  const slowThresholdMs = Number(
    process.env.PLATFORM_HEALTH_SLOW_MS || DEFAULT_SLOW_MS
  );
  const results = await Promise.all(
    targets.map((target) => checkTarget(target, slowThresholdMs))
  );
  const failingResults = results.filter((result) => result.status !== "ok");

  if (failingResults.length > 0) {
    await notifyProductionError({
      error: new Error("Platform health lookup detected failures"),
      source: "platform-health-cron",
      summary: summarizeFailures(results),
      tags: {
        checkedTargets: results.length,
        failedTargets: failingResults.length,
        slowThresholdMs,
      },
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    failing: failingResults.length,
    results,
    targets: targets.length,
  };
}
