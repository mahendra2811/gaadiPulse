import { r } from "@/src/features/records/copy";
import { AppState, Platform } from "react-native";
import { showToast } from "@/src/lib/toast";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { secureStorage } from "@/src/lib/supabase";
import type { RecordEntry } from "@/src/features/records/schema";
import { access, listRecords } from "@/src/features/records/api";
import { listVehicles } from "@/src/features/garage/api";
async function readLocal(key: string): Promise<unknown> {
  const raw = await secureStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
async function writeLocal(key: string, value: unknown) {
  await secureStorage.setItem(key, JSON.stringify(value));
}

// Notification work for a single account/vehicle must be ordered. A screen
// action and the background reconciler can otherwise race and resurrect a
// reminder after access has been revoked.
const locks = new Map<string, Promise<void>>();
const sessionEpoch = new Map<string, number>();
function epoch(user: string) {
  return sessionEpoch.get(user) ?? 0;
}
export function invalidateReminderSession(user?: string | null) {
  if (user) sessionEpoch.set(user, epoch(user) + 1);
}
async function serialized<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => (release = resolve));
  const tail = previous.then(() => current);
  locks.set(key, tail);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === tail) locks.delete(key);
  }
}

type ReminderMetadata = {
  type: "gaadipulse.reminder";
  accountId: string;
  vehicleId: string;
  reminderId: string;
};
function appReminder(data: unknown): ReminderMetadata | null {
  if (!data || typeof data !== "object") return null;
  const item = data as Record<string, unknown>;
  return item.type === "gaadipulse.reminder" &&
    typeof item.accountId === "string" &&
    typeof item.vehicleId === "string" &&
    typeof item.reminderId === "string"
    ? (item as ReminderMetadata)
    : null;
}
export async function notificationPermission() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("reminders", {
      name: r("reminders"),
      importance: AndroidImportance.DEFAULT,
    });
  return (await Notifications.requestPermissionsAsync()).granted;
}
export async function reconcileReminders(
  user: string,
  vehicle: string,
  records: RecordEntry[],
  latest: { km?: number; hours?: number },
  development = false,
) {
  if (Platform.OS === "web") return;
  return serialized(`${user}:${vehicle}`, async () => {
    const expectedEpoch = epoch(user);
    if (!development) {
      const session = await (
        await import("@/src/lib/supabase")
      )
        .client()
        .auth.getSession();
      if (session.data.session?.user.id !== user)
        throw new Error("REMINDER_SESSION_CHANGED");
    }
    const permissions = await access(vehicle, development);
    if (expectedEpoch !== epoch(user))
      throw new Error("REMINDER_SESSION_CHANGED");
    if (typeof permissions?.["reminders.read"] !== "boolean")
      throw new Error("INVALID_VEHICLE_ACCESS_RESPONSE");
    if (!permissions["reminders.read"]) {
      await cancelVehicleRemindersUnlocked(user, vehicle);
      return;
    }
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    const scheduledIds = new Set(
      (await Notifications.getAllScheduledNotificationsAsync()).map(
        (item) => item.identifier,
      ),
    );
    for (const entry of records) {
      if (expectedEpoch !== epoch(user))
        throw new Error("REMINDER_SESSION_CHANGED");
      const key = `user.${user}.notification.${vehicle}.${entry.id}`;
      let old = (await readLocal(key)) as {
        revision: number;
        id: string;
        threshold?: boolean;
        presentationVersion?: number;
      } | null;
      // Recover if Android or the OS removed a scheduled request while the
      // secure-storage marker survived an interrupted app lifecycle.
      if (old?.id && !scheduledIds.has(old.id)) {
        await secureStorage.removeItem(key);
        old = null;
      }
      if (entry.status !== "ACTIVE") {
        if (old?.id)
          await Notifications.cancelScheduledNotificationAsync(old.id);
        await writeLocal(key, { revision: entry.revision, id: "" });
        continue;
      }
      const due = entry.payload.due_at
        ? new Date(String(entry.payload.due_at))
        : null;
      const threshold =
        (entry.payload.threshold_km !== "" &&
          entry.payload.threshold_km != null &&
          latest.km !== undefined &&
          latest.km >= Number(entry.payload.threshold_km)) ||
        (entry.payload.threshold_hours !== "" &&
          entry.payload.threshold_hours != null &&
          latest.hours !== undefined &&
          latest.hours >= Number(entry.payload.threshold_hours));
      const date = due && due.getTime() > Date.now() ? due : null;
      if (
        old?.revision === entry.revision &&
        old.presentationVersion === 3 &&
        old.threshold === Boolean(threshold)
      )
        continue;
      if (old?.id) await Notifications.cancelScheduledNotificationAsync(old.id);
      if (!date && !threshold) {
        await writeLocal(key, {
          revision: entry.revision,
          id: "",
          threshold: false,
          presentationVersion: 3,
        });
        continue;
      }
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: r("reminders"),
          body: r("notificationBody"),
          color: "#147D69",
          autoDismiss: true,
          sticky: false,
          data: {
            type: "gaadipulse.reminder",
            accountId: user,
            vehicleId: vehicle,
            reminderId: entry.id,
          },
        },
        trigger:
          date && !threshold
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date,
                channelId: "reminders",
              }
            : null,
      });
      if (expectedEpoch !== epoch(user)) {
        await Notifications.cancelScheduledNotificationAsync(id);
        throw new Error("REMINDER_SESSION_CHANGED");
      }
      await writeLocal(key, {
        revision: entry.revision,
        id,
        threshold: Boolean(threshold),
        presentationVersion: 3,
      });
    }
  });
}

async function cancelVehicleRemindersUnlocked(user: string, vehicle: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    const meta = appReminder(item.content.data);
    if (meta?.accountId === user && meta.vehicleId === vehicle) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
      await secureStorage.removeItem(
        `user.${user}.notification.${vehicle}.${meta.reminderId}`,
      );
    }
  }
}
async function cancelVehicleReminders(user: string, vehicle: string) {
  await serialized(`${user}:${vehicle}`, () =>
    cancelVehicleRemindersUnlocked(user, vehicle),
  );
}

/** Reconcile every vehicle for the signed in account against fresh server access. */
export async function reconcileAccountReminders(
  user: string,
  development = false,
) {
  if (Platform.OS === "web") return;
  return serialized(`${user}:__account__`, async () => {
    const expectedEpoch = epoch(user);
    if (!development) {
      const auth = await (
        await import("@/src/lib/supabase")
      )
        .client()
        .auth.getSession();
      if (auth.data.session?.user.id !== user)
        throw new Error("REMINDER_SESSION_CHANGED");
    }
    const vehicles = await listVehicles(development); // A successful list is the authority for removed memberships.
    if (
      !Array.isArray(vehicles) ||
      vehicles.some((v) => !v || typeof v.id !== "string")
    )
      throw new Error("INVALID_VEHICLE_ACCESS_RESPONSE");
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledByVehicle = new Map<string, Set<string>>();
    for (const item of scheduled) {
      const meta = appReminder(item.content.data);
      if (meta?.accountId === user) {
        const ids = scheduledByVehicle.get(meta.vehicleId) ?? new Set<string>();
        ids.add(meta.reminderId);
        scheduledByVehicle.set(meta.vehicleId, ids);
      }
    }
    const authorized = new Map(vehicles.map((v) => [v.id, v]));
    for (const vehicleId of scheduledByVehicle.keys()) {
      if (expectedEpoch !== epoch(user))
        throw new Error("REMINDER_SESSION_CHANGED");
      if (!authorized.has(vehicleId))
        await cancelVehicleReminders(user, vehicleId);
    }
    const notificationGranted = (await Notifications.getPermissionsAsync())
      .granted;
    for (const vehicle of vehicles) {
      if (expectedEpoch !== epoch(user))
        throw new Error("REMINDER_SESSION_CHANGED");
      if (vehicle.archived_at) {
        await cancelVehicleReminders(user, vehicle.id);
        continue;
      }
      const permissions = await access(vehicle.id, development);
      if (
        !permissions ||
        typeof permissions !== "object" ||
        typeof permissions["reminders.read"] !== "boolean"
      )
        throw new Error("INVALID_VEHICLE_ACCESS_RESPONSE");
      if (!permissions["reminders.read"]) {
        await cancelVehicleReminders(user, vehicle.id);
        continue;
      }
      const records = await listRecords(
        user,
        vehicle.id,
        "reminders",
        development,
      );
      if (expectedEpoch !== epoch(user))
        throw new Error("REMINDER_SESSION_CHANGED");
      if (!notificationGranted) continue;
      await reconcileReminders(user, vehicle.id, records, {}, development);
      const active = new Set(
        records.filter((r) => r.status === "ACTIVE").map((r) => r.id),
      );
      for (const reminderId of scheduledByVehicle.get(vehicle.id) ?? []) {
        if (!active.has(reminderId)) {
          const latest =
            await Notifications.getAllScheduledNotificationsAsync();
          for (const item of latest) {
            const meta = appReminder(item.content.data);
            if (
              meta?.accountId === user &&
              meta.vehicleId === vehicle.id &&
              meta.reminderId === reminderId
            )
              await Notifications.cancelScheduledNotificationAsync(
                item.identifier,
              );
          }
        }
      }
    }
  });
}
export function nextRecurrence(date: string, repeat: string) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  if (repeat === "MONTHLY") d.setUTCMonth(d.getUTCMonth() + 1);
  else if (repeat === "YEARLY") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else return null;
  const max = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, max));
  return d.toISOString();
}
export async function clearDeviceNotifications(user?: string | null) {
  if (Platform.OS === "web") return;
  if (user) invalidateReminderSession(user);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const vehicles = new Set<string>();
  for (const item of scheduled) {
    const meta = appReminder(item.content.data);
    if (meta && (!user || meta.accountId === user))
      vehicles.add(`${meta.accountId}:${meta.vehicleId}`);
  }
  for (const key of vehicles) {
    const [accountId, vehicleId] = key.split(":");
    if (!accountId || !vehicleId) continue;
    invalidateReminderSession(accountId);
    await serialized(`${accountId}:${vehicleId}`, () =>
      cancelVehicleRemindersUnlocked(accountId, vehicleId),
    );
  }
  const presented = await Notifications.getPresentedNotificationsAsync();
  for (const item of presented) {
    const meta = appReminder(item.request.content.data);
    if (meta && (!user || meta.accountId === user))
      await Notifications.dismissNotificationAsync(item.request.identifier);
  }
}

/** Foreground feedback is app-owned; background notifications keep the OS presentation. */
export function startReminderFeedback(user: string) {
  if (Platform.OS === "web") return () => {};
  const belongsToAccount = (notification: Notifications.Notification) =>
    notification.request.content.data?.type === "gaadipulse.reminder" &&
    notification.request.content.data?.accountId === user;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner:
        !belongsToAccount(notification) || AppState.currentState !== "active",
      shouldShowList:
        !belongsToAccount(notification) || AppState.currentState !== "active",
      shouldPlaySound: !belongsToAccount(notification),
      shouldSetBadge: false,
    }),
  });
  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      if (AppState.currentState !== "active" || !belongsToAccount(notification))
        return;
      const message =
        notification.request.content.title || notification.request.content.body;
      if (message) showToast(message, "reminder");
    },
  );
  return () => {
    subscription.remove();
    Notifications.setNotificationHandler(null);
  };
}
