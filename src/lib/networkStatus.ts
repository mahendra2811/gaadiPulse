export type NetworkStatus =
  "checking" | "offline" | "unstable" | "slow" | "online";

export function resolveNetworkStatus(input: {
  connected: boolean | null;
  internetReachable: boolean | null;
  unstable: boolean;
  slow: boolean;
}): NetworkStatus {
  if (input.connected === null && input.internetReachable === null)
    return "checking";
  if (input.connected === false || input.internetReachable === false)
    return "offline";
  if (input.unstable) return "unstable";
  if (input.slow) return "slow";
  return "online";
}
