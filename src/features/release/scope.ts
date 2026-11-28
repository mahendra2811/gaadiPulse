import { useSyncExternalStore } from "react";

/** Reversible product rollout controls. These never replace server authorization. */
let remoteFlags: Record<string, boolean> = {};
let releaseRevision = 0;
const releaseListeners = new Set<() => void>();

export function setRemoteReleaseFlags(value: Record<string, boolean>) {
  const next = { ...value };
  if (JSON.stringify(next) === JSON.stringify(remoteFlags)) return;
  remoteFlags = next;
  releaseRevision++;
  for (const listener of releaseListeners) listener();
}

export function useReleaseFlagsRevision() {
  return useSyncExternalStore(
    (listener) => {
      releaseListeners.add(listener);
      return () => releaseListeners.delete(listener);
    },
    () => releaseRevision,
    () => 0,
  );
}

export const releaseFeatures = new Proxy(
  { advancedTools: true } as Record<"advancedTools", boolean>,
  {
    get: (_target, key) =>
      typeof key === "string" && typeof remoteFlags[key] === "boolean"
        ? remoteFlags[key]
        : true,
  },
);
export function supportsVehicle(category: string) {
  const basic = ["two_wheeler", "three_wheeler", "four_wheeler"];
  const advanced = ["commercial", "agricultural", "heavy_machinery"];
  return (
    basic.includes(category) ||
    (releaseFeatures.advancedTools && advanced.includes(category))
  );
}
export function supportsRecord(kind: string) {
  const basic = ["fuel", "expenses", "meters"];
  const advanced = ["documents", "reminders"];
  return (
    basic.includes(kind) ||
    (releaseFeatures.advancedTools && advanced.includes(kind))
  );
}
export function deferredPath(path: string) {
  if (
    /^\/progress(?:\/|$)/.test(path) ||
    /^\/owner\/form-builder(?:\/|$)/.test(path) ||
    /^\/records\/progress(?:\/|$)/.test(path)
  )
    return true;
  if (releaseFeatures.advancedTools || path === "/owner/members") return false;
  return (
    /^\/(owner|progress|reports)(\/|$)/.test(path) ||
    /^\/records\/(progress|documents|reminders)(\/|$)/.test(path) ||
    /^\/records\/[^/]+\/analytics(\/|$)/.test(path)
  );
}
