import { r } from "@/src/features/records/copy";
import { AppState, Platform } from "react-native";
import { showToast } from "@/src/lib/toast";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { readLocal, writeLocal } from "@/src/lib/localStore";
import type { RecordEntry } from "@/src/features/records/schema";
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
      presentationVersion?: number;
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
      old.presentationVersion === 2 &&
      old.threshold === Boolean(threshold)
    )
      continue;
    if (old?.id) await Notifications.cancelScheduledNotificationAsync(old.id);
    if (!date && !threshold) {
      await writeLocal(key, {
        revision: entry.revision,
        id: "",
        threshold: false,
        presentationVersion: 2,
      });
      continue;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: String(entry.payload.title),
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
    await writeLocal(key, {
      revision: entry.revision,
      id,
      threshold: Boolean(threshold),
      presentationVersion: 2,
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
