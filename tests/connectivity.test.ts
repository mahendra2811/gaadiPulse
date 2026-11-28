import { afterEach, describe, expect, it } from "vitest";
import { resolveNetworkStatus } from "../src/lib/networkStatus";
import {
  clearNetworkHealthTimer,
  getNetworkStatus,
  recordNetworkRequest,
  setNetworkAvailability,
} from "../src/lib/networkHealth";

afterEach(() => {
  clearNetworkHealthTimer();
  setNetworkAvailability(null, null);
});

describe("resolveNetworkStatus", () => {
  it("waits for an explicit reachability answer", () => {
    expect(
      resolveNetworkStatus({
        connected: null,
        internetReachable: null,
        unstable: false,
        slow: false,
      }),
    ).toBe("checking");
  });

  it("fails closed when either transport signal is explicitly offline", () => {
    expect(
      resolveNetworkStatus({
        connected: true,
        internetReachable: false,
        unstable: false,
        slow: false,
      }),
    ).toBe("offline");
  });

  it("surfaces degraded transport and otherwise reports online", () => {
    const connected = { connected: true, internetReachable: true };
    expect(
      resolveNetworkStatus({ ...connected, unstable: true, slow: false }),
    ).toBe("unstable");
    expect(
      resolveNetworkStatus({ ...connected, unstable: false, slow: true }),
    ).toBe("slow");
    expect(
      resolveNetworkStatus({ ...connected, unstable: false, slow: false }),
    ).toBe("online");
  });

  it("classifies slow responses and repeated transport failures in memory", () => {
    setNetworkAvailability(true, true);
    recordNetworkRequest(3000, true);
    recordNetworkRequest(2700, true);
    expect(getNetworkStatus()).toBe("slow");

    recordNetworkRequest(500, false);
    recordNetworkRequest(500, false);
    expect(getNetworkStatus()).toBe("unstable");

    setNetworkAvailability(false, false);
    expect(getNetworkStatus()).toBe("offline");
  });
});
