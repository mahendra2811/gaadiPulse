import { z } from "zod";

export const notificationSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  vehicle_id: z.uuid().nullable(),
  category: z.enum(["REMINDER", "ACCOUNT"]),
  event_key: z.string(),
  title_en: z.string(),
  body_en: z.string(),
  title_hi: z.string(),
  body_hi: z.string(),
  route_data: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  read_at: z.string().nullable(),
});

export const notificationPreferencesSchema = z.object({
  user_id: z.uuid(),
  push_enabled: z.boolean(),
  in_app_enabled: z.boolean(),
  reminders_enabled: z.boolean(),
  account_updates_enabled: z.boolean(),
  language: z.enum(["AUTO", "en-IN", "hi-IN"]),
  quiet_hours_enabled: z.boolean(),
  quiet_start: z.string(),
  quiet_end: z.string(),
  daily_push_limit: z.number().int().min(1).max(20),
});

export type AppNotification = z.infer<typeof notificationSchema>;
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
