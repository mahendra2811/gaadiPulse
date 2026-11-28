import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  invalidateReminderSession,
  reconcileAccountReminders,
  reconcileReminders,
} from "@/src/features/reminders/notifications";
import * as Notifications from "expo-notifications";

const state = vi.hoisted(() => ({
  scheduled: [] as { identifier: string; content: { data: unknown } }[],
  vehicles: [] as { id: string; archived_at: string | null }[],
  permissions: new Map<string, Record<string, boolean>>(),
  records: new Map<string, unknown[]>(),
  storage: new Map<string, string>(),
  canceled: [] as string[],
  sessionUser: "user",
}));
vi.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  getPermissionsAsync: vi.fn(async () => ({ granted: true })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(async () => state.scheduled),
  cancelScheduledNotificationAsync: vi.fn(async (id: string) => {
    state.canceled.push(id);
    state.scheduled = state.scheduled.filter((item) => item.identifier !== id);
  }),
  scheduleNotificationAsync: vi.fn(
    async (request: { content: { data: unknown } }) => {
      state.scheduled.push({
        identifier: "scheduled-new",
        content: { data: request.content.data },
      });
      return "scheduled-new";
    },
  ),
  getPresentedNotificationsAsync: vi.fn(async () => []),
  dismissNotificationAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
  addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
}));
vi.mock("expo-constants", () => ({
  default: { expoConfig: null, easConfig: null },
}));
vi.mock("react-native", () => ({
  AppState: { currentState: "background", addEventListener: vi.fn() },
  Platform: { OS: "android" },
}));
vi.mock("@/src/lib/supabase", () => ({
  client: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: state.sessionUser } } },
      }),
    },
  }),
  secureStorage: {
    getItem: async (key: string) => state.storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      state.storage.set(key, value);
    },
    removeItem: async (key: string) => {
      state.storage.delete(key);
    },
  },
}));
vi.mock("@/src/features/records/api", () => ({
  access: async (vehicle: string) => state.permissions.get(vehicle) ?? {},
  listRecords: async (_user: string, vehicle: string) =>
    state.records.get(vehicle) ?? [],
}));
vi.mock("@/src/features/garage/api", () => ({
  listVehicles: vi.fn(async () => state.vehicles),
}));
vi.mock("@/src/features/records/copy", () => ({ r: (key: string) => key }));
vi.mock("@/src/lib/toast", () => ({ showToast: vi.fn() }));

const reminder = (id: string) => ({
  id,
  vehicle_id: "vehicle-kept",
  created_by: "user",
  revision: 1,
  status: "ACTIVE",
  created_at: "2026-11-20T00:00:00.000Z",
  updated_at: "2026-11-20T00:00:00.000Z",
  payload: { due_at: "2030-01-01T00:00:00.000Z" },
});
const scheduled = (
  identifier: string,
  accountId: string,
  vehicleId: string,
  reminderId: string,
) => ({
  identifier,
  content: {
    data: { type: "gaadipulse.reminder", accountId, vehicleId, reminderId },
  },
});

beforeEach(() => {
  state.scheduled = [
    scheduled("revoked", "user", "vehicle-revoked", "old-reminder"),
    scheduled("kept", "user", "vehicle-kept", "kept-reminder"),
    scheduled("other-account", "other", "vehicle-revoked", "other-reminder"),
  ];
  state.vehicles = [{ id: "vehicle-kept", archived_at: null }];
  state.permissions = new Map([["vehicle-kept", { "reminders.read": true }]]);
  state.records = new Map([["vehicle-kept", [reminder("kept-reminder")]]]);
  state.storage = new Map([
    [
      "user.user.notification.vehicle-kept.kept-reminder",
      JSON.stringify({
        revision: 1,
        id: "kept",
        threshold: false,
        presentationVersion: 3,
      }),
    ],
  ]);
  state.canceled = [];
  state.sessionUser = "user";
});
afterEach(() => vi.clearAllMocks());

describe("account reminder reconciliation", () => {
  it("cancels only the signed-in account's reminders for a vehicle missing from the fresh vehicle list", async () => {
    await reconcileAccountReminders("user");
    expect(state.canceled).toEqual(["revoked"]);
    expect(state.scheduled.map((item) => item.identifier)).toEqual([
      "kept",
      "other-account",
    ]);
  });

  it("does not cancel any notification when the server vehicle check fails", async () => {
    const { listVehicles } = await import("@/src/features/garage/api");
    vi.mocked(listVehicles).mockRejectedValueOnce(new Error("offline"));
    await expect(reconcileAccountReminders("user")).rejects.toThrow("offline");
    expect(state.canceled).toEqual([]);
  });

  it("cancels the affected vehicle after fresh permission data confirms access was removed", async () => {
    state.vehicles = [
      { id: "vehicle-revoked", archived_at: null },
      { id: "vehicle-kept", archived_at: null },
    ];
    state.permissions.set("vehicle-revoked", { "reminders.read": false });
    await reconcileAccountReminders("user");
    expect(state.canceled).toContain("revoked");
    expect(state.canceled).not.toContain("other-account");
  });

  it("refuses to reconcile a response for a different signed-in account", async () => {
    state.sessionUser = "other";
    await expect(reconcileAccountReminders("user")).rejects.toThrow(
      "REMINDER_SESSION_CHANGED",
    );
    expect(state.canceled).toEqual([]);
  });

  it("recreates a missing OS schedule when its secure-storage marker survived", async () => {
    state.scheduled = [
      scheduled("other-account", "other", "vehicle-kept", "other-reminder"),
    ];
    await reconcileAccountReminders("user");
    expect(state.scheduled.map((item) => item.identifier)).toContain(
      "scheduled-new",
    );
    expect(
      JSON.parse(
        state.storage.get("user.user.notification.vehicle-kept.kept-reminder")!,
      ).id,
    ).toBe("scheduled-new");
  });

  it("cancels a notification created by an in-flight schedule after session invalidation", async () => {
    let finish!: (id: string) => void;
    vi.mocked(Notifications.scheduleNotificationAsync).mockImplementationOnce(
      (request) =>
        new Promise<string>((resolve) => {
          finish = (id) => {
            state.scheduled.push({
              identifier: id,
              content: { data: request.content.data },
            });
            resolve(id);
          };
        }),
    );
    const pending = reconcileReminders(
      "user",
      "vehicle-kept",
      [reminder("race")],
      {},
    );
    await vi.waitFor(() => {
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledOnce();
    });
    invalidateReminderSession("user");
    finish("in-flight");
    await expect(pending).rejects.toThrow("REMINDER_SESSION_CHANGED");
    expect(state.canceled).toContain("in-flight");
  });
});
