# Notifications and reminders

## Implemented

- Account-scoped inbox with unread count, read-all/read-one, cursor pages, refresh and record deep links.
- Per-installation Expo push tokens, Android `reminders` and `activity` channels, token refresh/deactivation, foreground/background response routing and sign-out cleanup.
- Supabase RLS for inbox, verified Owner/Pilot delivery scope, per-user preferences, bilingual English/Hindi content, quiet hours, daily push limit, delivery attempts/receipts and duplicate-event constraints.
- Scheduled due-date reminders at 09:00 in vehicle local time; supported advance days are 30, 15, 7 and 1 (custom metadata is validated to 0–365 days). Actual meter readings trigger service thresholds.
- Existing reminder forms support insurance, PUC, registration, fitness, driving licence, servicing, EMI and custom reminders, recurrence, snooze/completion, advance-day choices and Pilot visibility. Completed reminders are summarized on the dashboard.

## Hosted setup still required

The source implementation does not deliver push until the backend setup is completed. The project owner/operator must:

1. Apply migration `202611280007_notifications_reminders.sql` after the earlier migrations.
2. Configure Expo EAS Android FCM V1 credentials for the existing EAS project and build/install a new native app. Expo Go is not a production push target.
3. Deploy `notification-worker` with Supabase CLI. Configure function secrets `NOTIFICATION_WORKER_SECRET` (long random secret), `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`; keep service credentials only in Supabase.
4. Enable `pg_cron`, `pg_net`, and Vault. Add Vault secrets named `supabase_url` and `notification_worker_secret`, then run `supabase/operations/notification-cron.sql` as project administrator.
5. Check the scheduled job, Edge Function logs, delivery logs, invalid-token cleanup and one Android delivery on a real device before release. Review database backup/PITR and restoration policy separately.

The scheduled job runs every minute. Quiet-hour deliveries remain queued and are reconsidered on the next run. The SQL worker uses `FOR UPDATE SKIP LOCKED`, event uniqueness and per-user/device delivery uniqueness for concurrent idempotency. Supabase `pg_net` request/response queues contain request headers, so restrict database access to trusted operators and rotate the worker secret if exposed.

## Limits and known boundaries

- A database push ticket means Expo accepted the request; Android/FCM delivery is asynchronous. Receipts are checked later and invalid tokens are deactivated.
- The UI permission switch requests OS permission and registers the installation. The server preference switch separately controls push delivery.
- A notification links to the underlying record and is reauthorized by normal app data access when opened.
- Scheduled reminders require a due date or threshold and an active vehicle. Time-based alerts use the vehicle timezone; quiet hours and daily push quota use the user profile timezone.
- Recurrence advances when a reminder is completed, following existing reminder behavior. A document renewal must update its linked record; its linked reminder is synchronized by the existing record RPC.
- Server delivery, FCM credentials, hosted RLS behavior, production timezone edges, Android/iOS device behavior and scheduled invocation remain unverified until the external steps above are performed.
