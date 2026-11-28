# Architecture checkpoint: push notifications and smart reminders

Date: 2026-11-28
Status: Approved by user on 2026-11-28. Production deployment remains excluded.

## Scope requested

Android FCM-backed Expo Push, secure account/device token registration and refresh, notification categories/channels and lifecycle/deep links, server-backed inbox/unread/mark-read, preference controls, bilingual English/Hindi copy, deduplicated delivery logs, quiet hours/frequency limits, expiry/document/maintenance/custom reminders, 30/15/7/1 day lead times, recurrence, snooze/completion, renewal rescheduling, vehicle timezone, Owner/Pilot recipient rules, scheduled server processing and upcoming/history UI.

## Existing constraints discovered

- The app currently schedules date and meter reminders locally in `src/features/reminders/notifications.ts`. It reconciles permission-aware access and cancels for verified revocation; retain this as an offline/device fallback, not as server-delivery proof.
- Reminder/document/expense records already use atomic `save_record` routines and linked reminders. Vehicle access is per vehicle and must be resolved server-side.
- Main UI English catalog is complete; Hindi catalog is partial and not enabled for the whole app. This feature can provide complete Hindi specifically for notification templates without claiming full Hindi UI.
- Hosted Supabase CLI/Docker are not installed/available in this environment. No production migration or deployment can be done or asserted.
- The Expo push service uses an Expo token acquired with projectId. Android FCM V1 credentials must be configured for the EAS project; this is external and requires a rebuilt app.

## Proposed design

1. **Client delivery:** Keep `expo-notifications`; create separate `reminders` and `activity` Android channels before requesting permission. On granted permission, acquire Expo push token using the configured EAS project ID and upsert it through an authenticated RPC keyed by `(user_id, installation_id)`. Listen for token refresh, update the same row, and deactivate on logout/permission removal. Store locale and app timezone with the device record; never trust user_id supplied by the client.
2. **Inbox and preferences:** Add user-owned notification preferences and per-user inbox rows scoped to vehicle, with category/event dedupe constraints. Expose only security-invoker, user-scoped list/count/mark-one/mark-all RPCs. Keep titles/bodies in English and Hindi template fields; lock-screen body remains generic to avoid leaking vehicle/financial details. Keep small route identifiers in payload and re-check live permission when opening.
3. **Scheduled delivery:** Use an additive DB queue with unique idempotency keys and delivery attempt/status rows. A once-per-minute `pg_cron` call invokes a service-authenticated Edge Function. A transactional RPC claims a bounded batch using row locking; the function sends to Expo Push API, records ticket/receipt state, retries transient failures with backoff, and disables tokens only on `DeviceNotRegistered` (not generic errors). Do not put service-role credentials or worker secrets in the app. Configure cron/Vault secrets and EAS FCM credentials only in operator-controlled Supabase/EAS settings.
4. **Reminder policy:** Build scheduled alerts from active document/reminder/maintenance records with explicit lead-day arrays, vehicle-local date/time, recurrence, snooze and completed/renewed state. Resolve Owner recipients plus Pilots only when the reminder's pilot visibility and vehicle permission allow it. Dedupe per user/reminder/due-cycle/lead-day. Renewal updates the linked reminder transactionally, which supersedes old queued alerts. Meter-threshold evaluation runs server-side from active meter readings; no GPS assumptions.
5. **App experience:** Add a notification-center route with paginated newest-first inbox, unread badge, mark-read/all-read, preference controls and recoverable permission state. Add reminder templates for insurance, PUC, registration, fitness, driving licence (vehicle/operator applicable), servicing and custom reminders. Preserve current completion/snooze actions and provide upcoming/history dashboard sections.

## Decision

The user approved this server architecture: Expo Push service with FCM V1 credentials, Supabase notification outbox + pg_cron + service-authenticated Edge Function, RLS/RPC-based inbox and preferences. The user explicitly excluded production deployment. Proceed with implementation and tests; list hosted setup as an external operator step.

## Documentation checked

- Expo Notifications current docs: `getExpoPushTokenAsync({ projectId })`, Android `setNotificationChannelAsync`, Expo Router notification response listener; SDK docs include token and push setup requirements.
- Supabase current docs: scheduled Edge Function via `pg_cron`/`pg_net` and Vault; service-to-service auth. Docs warn queued pg_net request headers may be readable to logged-in database roles while queued, so restrict DB role access and use a dedicated secret.
