const globalForSafeTimeout = globalThis as typeof globalThis & {
  __juristoSafeTimeoutInstalled?: boolean;
};

function normalizeTimeoutDelay(delay: unknown) {
  return typeof delay === "number" && delay < 0 ? 1 : delay;
}

if (
  typeof process !== "undefined" &&
  process.versions?.node &&
  !globalForSafeTimeout.__juristoSafeTimeoutInstalled
) {
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = ((
    handler: Parameters<typeof setTimeout>[0],
    delay?: Parameters<typeof setTimeout>[1],
    ...args: any[]
  ) =>
    originalSetTimeout(
      handler as any,
      normalizeTimeoutDelay(delay) as any,
      ...args
    )) as typeof setTimeout;

  globalForSafeTimeout.__juristoSafeTimeoutInstalled = true;
}
