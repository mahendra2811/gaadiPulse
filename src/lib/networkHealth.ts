import { resolveNetworkStatus, type NetworkStatus } from "./networkStatus";

const listeners = new Set<() => void>();
const recentRequestLatencies: number[] = [];
const recentRequestFailures: number[] = [];
let unstableUntil = 0;
let resetTimer: ReturnType<typeof setTimeout> | undefined;
let connected: boolean | null = null;
let internetReachable: boolean | null = null;
let status: NetworkStatus = "checking";

function emit() {
  for (const listener of listeners) listener();
}

function publishStatus() {
  status = resolveNetworkStatus({
    connected,
    internetReachable,
    unstable: Date.now() < unstableUntil || recentRequestFailures.length >= 2,
    slow:
      recentRequestLatencies.length >= 2 &&
      recentRequestLatencies.slice(-2).every((latency) => latency >= 2500),
  });

  if (resetTimer) clearTimeout(resetTimer);
  if (status === "unstable") {
    resetTimer = setTimeout(
      () => {
        unstableUntil = 0;
        recentRequestFailures.length = 0;
        publishStatus();
      },
      Math.max(0, unstableUntil - Date.now()),
    );
  }
  emit();
}

export function getNetworkStatus() {
  return status;
}

export function subscribeNetworkStatus(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setNetworkAvailability(
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
) {
  connected = isConnected;
  internetReachable = isInternetReachable;
  publishStatus();
}

/** In-memory request health only; no URL, credentials or payload is retained. */
export function recordNetworkRequest(durationMs: number, succeeded: boolean) {
  const now = Date.now();
  while (
    recentRequestFailures.length &&
    recentRequestFailures[0] < now - 60_000
  ) {
    recentRequestFailures.shift();
  }
  if (succeeded) {
    unstableUntil = 0;
    recentRequestLatencies.push(durationMs);
    if (recentRequestLatencies.length > 3) recentRequestLatencies.shift();
    recentRequestFailures.length = 0;
  } else {
    recentRequestLatencies.length = 0;
    recentRequestFailures.push(now);
    if (recentRequestFailures.length >= 2) unstableUntil = now + 60_000;
  }
  publishStatus();
}

export function clearNetworkHealthTimer() {
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = undefined;
}
