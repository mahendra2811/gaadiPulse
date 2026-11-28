import { client, secureStorage } from "@/src/lib/supabase";
import { notificationPreferencesSchema, notificationSchema } from "./schema";
import type { NotificationPreferences } from "./schema";

const pageSize = 30;

export async function readNotifications(offset: number, signal?: AbortSignal) {
  let request = client()
    .from("user_notifications")
    .select(
      "id,user_id,vehicle_id,category,event_key,title_en,body_en,title_hi,body_hi,route_data,created_at,read_at",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (signal && "abortSignal" in request) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return notificationSchema.array().parse(data);
}

export async function unreadNotificationCount() {
  const { count, error } = await client()
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  const { error } = await client()
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead() {
  const { error } = await client()
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function loadNotificationPreferences() {
  const { data, error } = await client().rpc("read_notification_preferences");
  if (error) throw new Error(error.message);
  return notificationPreferencesSchema.parse(data);
}

export async function saveNotificationPreferences(
  value: NotificationPreferences,
) {
  const preferences = notificationPreferencesSchema.parse(value);
  const { data, error } = await client().rpc("save_notification_preferences", {
    p_push_enabled: preferences.push_enabled,
    p_in_app_enabled: preferences.in_app_enabled,
    p_reminders_enabled: preferences.reminders_enabled,
    p_account_updates_enabled: preferences.account_updates_enabled,
    p_language: preferences.language,
    p_quiet_hours_enabled: preferences.quiet_hours_enabled,
    p_quiet_start: preferences.quiet_start,
    p_quiet_end: preferences.quiet_end,
    p_daily_push_limit: preferences.daily_push_limit,
  });
  if (error) throw new Error(error.message);
  return notificationPreferencesSchema.parse(data);
}

export async function registerPushToken(
  installationId: string,
  token: string,
  platform: "android" | "ios",
) {
  const { error } = await client().rpc("register_push_device", {
    p_installation: installationId,
    p_token: token,
    p_platform: platform,
  });
  if (error) throw new Error(error.message);
}

export async function deactivatePushToken(installationId: string) {
  const { error } = await client().rpc("deactivate_push_device", {
    p_installation: installationId,
  });
  if (error) throw new Error(error.message);
}

export async function pushInstallationId() {
  const key = "gaadipulse.push.installation.v1";
  const old = await secureStorage.getItem(key);
  if (old && /^[0-9a-f-]{36}$/i.test(old)) return old;
  const { randomUUID } = await import("expo-crypto");
  const next = randomUUID();
  await secureStorage.setItem(key, next);
  return next;
}

export const notificationPageSize = pageSize;
