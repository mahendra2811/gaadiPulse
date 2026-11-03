import { access, listRecords, saveRecord } from "../src/features/records/api";
import { listVehicles } from "../src/features/garage/api";
import { observations } from "../src/features/meters/api";
import { formVersions } from "../src/features/progress/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onlineManager } from "@tanstack/react-query";
import { onlineFetch } from "../src/lib/onlineFetch";

const backend = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/src/lib/supabase", () => ({
  client: () => ({
    ...backend,
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "user" } } } }),
    },
  }),
}));
vi.mock("expo-crypto", () => ({ randomUUID: () => "preview-id" }));
vi.mock("@/src/features/development/repository", () => ({
  requireDevelopment: vi.fn(),
  readDevelopment: vi.fn(),
  writeDevelopment: vi.fn(),
  listDevelopmentVehicles: vi.fn(),
  DEVELOPMENT_USER: "local-development",
}));

beforeEach(() => {
  vi.clearAllMocks();
  onlineManager.setOnline(true);
});
afterEach(() => {
  onlineManager.setOnline(true);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("online-only writes", () => {
  it("does not treat an empty RPC response as a confirmed save", async () => {
    backend.rpc.mockResolvedValue({ data: null, error: null });
    await expect(
      saveRecord("user", false, "expenses", "vehicle", {}, "operation"),
    ).rejects.toThrow("SAVE_NOT_CONFIRMED");
  });
  it("does not resolve a save before database acknowledgement", async () => {
    let finish!: (value: { data: string; error: null }) => void;
    backend.rpc.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const saved = vi.fn();
    const request = saveRecord(
      "user",
      false,
      "expenses",
      "vehicle",
      { amount_paise: 100 },
      "stable-operation",
    ).then(saved);
    await Promise.resolve();
    expect(saved).not.toHaveBeenCalled();
    finish({ data: "record", error: null });
    await request;
    expect(saved).toHaveBeenCalledWith({ id: "record" });
  });
  it("rejects a failed save and sends the same operation ID on explicit retry", async () => {
    backend.rpc
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Failed to fetch" },
      })
      .mockResolvedValueOnce({ data: "record", error: null });
    const save = () =>
      saveRecord(
        "user",
        false,
        "expenses",
        "vehicle",
        { amount_paise: 100 },
        "stable-operation",
      );
    await expect(save()).rejects.toThrow("Failed to fetch");
    expect(backend.rpc).toHaveBeenCalledTimes(1);
    await expect(save()).resolves.toEqual({ id: "record" });
    expect(backend.rpc.mock.calls.map((call) => call[1].p_operation)).toEqual([
      "stable-operation",
      "stable-operation",
    ]);
  });
});

describe("server-only reads", () => {
  it("withholds a previously loaded ledger when its next read fails", async () => {
    backend.rpc.mockResolvedValue({
      data: { "meters.read": true },
      error: null,
    });
    const row = {
      id: "10000000-0000-4000-8000-000000000001",
      vehicle_id: "20000000-0000-4000-8000-000000000001",
      created_by: "user",
      revision: 1,
      status: "ACTIVE",
      payload: { km: 100 },
      created_at: "2026-11-03T00:00:00Z",
      updated_at: "2026-11-03T00:00:00Z",
    };
    const request = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    };
    request.select.mockReturnValue(request);
    request.eq.mockReturnValue(request);
    request.order.mockReturnValue(request);
    request.range
      .mockResolvedValueOnce({ data: [row], error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Failed to fetch" },
      });
    backend.from.mockReturnValue(request);
    await expect(
      listRecords("user", "vehicle", "meters", false),
    ).resolves.toEqual([row]);
    await expect(
      listRecords("user", "vehicle", "meters", false),
    ).rejects.toThrow("Failed to fetch");
  });

  it("does not return remembered permission grants when the server fails", async () => {
    backend.rpc.mockResolvedValueOnce({ data: { owner: true }, error: null });
    await expect(access("vehicle", false)).resolves.toEqual({ owner: true });
    backend.rpc.mockResolvedValue({
      error: { message: "Network unavailable" },
    });
    await expect(access("vehicle", false)).rejects.toThrow(
      "Network unavailable",
    );
  });
  it("propagates garage, record, observation and form read failures", async () => {
    backend.rpc.mockResolvedValue({
      error: { message: "Network unavailable" },
    });
    await expect(listVehicles()).rejects.toThrow("Network unavailable");
    await expect(
      listRecords("user", "vehicle", "expenses", false),
    ).rejects.toThrow("Network unavailable");
    await expect(observations("user", "vehicle", false)).rejects.toThrow(
      "Network unavailable",
    );
    await expect(formVersions("vehicle", false)).rejects.toThrow(
      "Network unavailable",
    );
    expect(backend.from).not.toHaveBeenCalled();
  });
});

describe("network request lifecycle", () => {
  it("rejects offline immediately without scheduling a reconnect write", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    onlineManager.setOnline(false);
    await expect(onlineFetch("https://example.test")).rejects.toThrow(
      "NETWORK_UNAVAILABLE",
    );
    onlineManager.setOnline(true);
    await Promise.resolve();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("aborts requests after twenty seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      ),
    );
    const result = expect(onlineFetch("https://example.test")).rejects.toThrow(
      "aborted",
    );
    await vi.advanceTimersByTimeAsync(20000);
    await result;
  });
  it("preserves caller cancellation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () =>
              reject(new Error("cancelled")),
            );
          }),
      ),
    );
    const controller = new AbortController();
    const result = expect(
      onlineFetch("https://example.test", { signal: controller.signal }),
    ).rejects.toThrow("cancelled");
    controller.abort();
    await result;
  });
});
