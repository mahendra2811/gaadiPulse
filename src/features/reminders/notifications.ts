import { r } from "@/src/features/records/copy";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { readLocal, writeLocal } from "@/src/lib/localStore";
import type { RecordEntry } from "@/src/features/records/schema";
export async function notificationPermission() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("reminders", {
      name: r("reminders"),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  return (await Notifications.requestPermissionsAsync()).granted;
}
export async function reconcileReminders(
  user: string,
  vehicle: string,
  records: RecordEntry[],
  latest: { km?: number; hours?: number },
) {
  if (
    Platform.OS === "web" ||
    !(await Notifications.getPermissionsAsync()).granted
  )
    return;
  for (const entry of records) {
    const key = `user.${user}.notification.${vehicle}.${entry.id}`;
    const old = (await readLocal(key)) as {
      revision: number;
      id: string;
      threshold?: boolean;
    } | null;
    if (entry.status !== "ACTIVE") {
      if (old?.id) await Notifications.cancelScheduledNotificationAsync(old.id);
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
      old.threshold === Boolean(threshold)
    )
      continue;
    if (old?.id) await Notifications.cancelScheduledNotificationAsync(old.id);
    if (!date && !threshold) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: String(entry.payload.title),
        body: r("notificationBody"),
        data: { vehicleId: vehicle, reminderId: entry.id },
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
    await writeLocal(key, {
      revision: entry.revision,
      id,
      threshold: Boolean(threshold),
    });
  }
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
export async function clearDeviceNotifications() {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
