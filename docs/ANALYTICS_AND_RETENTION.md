# Product analytics and retention

## Consent and privacy

Analytics is off by default and is enabled only from Settings. The app creates
a random installation UUID only after opt-in. On Android/iOS it is stored in
SecureStore; web uses local storage only after opt-in. No Supabase account ID,
vehicle ID, email, registration number, document details, record payload,
request URL, notification token or free text is sent.

Events use a server-side timestamp and an allowlist of event names, feature
names, Owner/Pilot role, app version, platform, locale and bounded durations or
API batch counts. The Edge Function rejects unknown event fields and oversized
bodies. It calls a service-role-only RPC; the app has no table grants. RLS is
enabled on the event table. Duplicate event UUIDs and daily foreground events
are unique, and each installation is limited to 30 events per minute.

Turning analytics off stops collection immediately and requests deletion for
that installation. If the deletion request cannot reach Supabase, the UI says
so; the server retention job removes the remaining events after 90 days.
Analytics events are not durably queued on the device. Failed event sends are
dropped, except the idempotent first-open event can be retried at a later app
launch using the same installation UUID.

## What the metrics mean

- `first_open` is the first observed app open after opt-in on this installation.
  It is not Play Store install attribution; Play Store installs cannot be
  verified from this client event. Reinstalling creates a new installation ID.
- Daily active installations are distinct consented IDs with an
  `app_foreground` event that day. Monthly active installations are distinct
  IDs during the calendar month. D1/D7/D30 retention compares exact UTC calendar
  days from the first observed open.
- Fuel and expense events are emitted only after a confirmed production save.
  Vehicle creation and profile onboarding are also measured after confirmed
  saves. `form_started` without a completion within 24 hours is an abandonment
  estimate, not proof that a person abandoned the form.
- Access grants resolve automatically after verified sign-in; there is no
  recipient acceptance screen. The `grant_resolved` event reports only the
  resolved Owner/Pilot role, never the account or vehicle.
- `feature_opened` is throttled to one event per feature every ten minutes.
  API timings are aggregated in memory and sent in batches of up to 20 requests
  or on app background. No endpoint names or request content are retained.
- Startup timing runs only for users who had already opted in before the app
  process started. A person who opts in during a session begins startup
  measurement on their next launch.

## Operator views

The migration creates service-role-only views for daily feature/app-version/API
rollups, monthly active installations, retention cohorts and 24-hour funnels.
Operators can query these views from the Supabase SQL Editor or connect a
protected internal dashboard. Do not expose them through app-facing APIs.

The migration schedules `prune_app_analytics()` at 02:15 UTC daily when
`pg_cron` is already enabled. If it is not enabled on the target Supabase
project, an operator must enable the extension and schedule the function before
turning on analytics in production. No production dashboard, hosted migration,
Edge Function deployment or scheduled job has been configured by this local
implementation.

## Release steps

1. Review and apply migrations `202611280010`–`202611280012` in order on a
   disposable Supabase project, then run the migration/RLS tests.
2. Deploy `collect-analytics` and confirm the service-role key is available only
   in the Edge Function environment. The public endpoint has JWT verification
   disabled by design, so verify its strict allowlist, request-size ceiling,
   idempotency and rate-limit behavior before enabling collection.
3. Confirm the cron cleanup is scheduled and prove both opt-out deletion and
   90-day pruning against test events.
4. Build protected operator dashboards from the aggregate views. No analytics
   provider account or dashboard credentials are bundled with the app.
5. Confirm the final privacy notice and data retention disclosure with the
   operator before a public release.
