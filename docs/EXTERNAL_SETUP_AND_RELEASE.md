# External setup and release

This guide describes operator-owned configuration. No credentials, external deployment or Play release was performed. The user deferred Stage 2/3 testing; follow QA_TEST_MATRIX.md before shipping.

## Supabase

1. Create a separate development Supabase project. Keep production isolated and back up any existing data.
2. Copy .env.example to .env and set only EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Default OAuth redirect is gaadipulse://auth/callback. Restart Metro when public environment changes. Never paste secrets into chat.
3. Install Supabase CLI and Docker if using local development. `supabase/config.toml` is included. Start locally, then apply all chronological migrations. `supabase db reset` is only for a disposable local database. For linked projects, review `supabase db push`; never reset production.
4. Migrations: 001 foundation; 002 ledger/meter/reminder data; 003 collaboration/forms/redacted reads/deletion requests; 004 payload-bound retries, corrections, permission maps, provenance and anonymization hardening. The supplied `my docs/supabase/reference` is planning material, not an applied migration.
5. Regenerate database types with `supabase gen types typescript --local` or your linked project. Current src/types/database.ts is manually maintained; reconcile generated types before binding the whole client.
6. Execute the RLS matrix with real Auth/JWT/PostgREST clients. Embedded PostgreSQL fixture results do not prove hosted configuration or gateway behavior.

## Email OTP and Google

Enable email sign-up/confirmation and OTP. Configure SMTP and the token email template (`{{ .Token }}`), delivery and provider rate limits. Use real test inboxes for valid/invalid/expired/resend scenarios; do not disable confirmation to make tests pass.

Enable Google in Supabase Auth. Store provider client secret only in the Supabase dashboard/server environment. Add Supabase's displayed callback to Google configuration and allow gaadipulse://auth/callback in Supabase. Verify package `com.pooniya.gaadipulse`, redirect handling, signing SHA-1/SHA-256 and provider settings for the exact Android build. Browser OAuth uses PKCE. Do not claim Google works before testing actual credentials and a device.

The debug local bypass is intentionally absent from release builds and cannot assign real backend privileges. Development records are never migrated/uploaded automatically.

## Account deletion job

The app records a deletion request, requires protected vehicles to be archived first, revokes membership and blocks new writes. Operational attribution and shared ledgers remain under the reviewed retention policy.

Deploy `supabase/functions/process-account-deletion` after reviewing its Auth schema operations. Configure server secrets SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DELETION_JOB_SECRET and DELETION_RETENTION_DAYS (1–365; default 30). These never belong in EXPO_PUBLIC variables. The endpoint uses its own constant-time job-secret check; gateway JWT verification is disabled only for this operator endpoint.

Schedule a trusted operator job to POST with `Authorization: Bearer <DELETION_JOB_SECRET>`. It processes eligible recorded requests, masks/bans Auth users, then calls service-role-only complete_account_anonymization to remove identities/sessions/metadata, redact profile/grant identity and mark completion. Do not expose this secret to a device. Validate the actual Supabase Auth schema and retry behavior before enabling the job. No job was deployed or scheduled here.

## Android development and release

Use Node 24 and the committed lockfile. Expo SDK 58 selects the matching React/RN versions. Install Java/Android SDK, start an emulator or connect a real device. Rebuild the native client for DateTimePicker/Print/Sharing. Keep scheme and package stable after release; ANDROID_PACKAGE is configurable before the first release.

Configure your EAS project/account and signing credentials locally. Review app.config.ts, eas.json, adaptive masks, notification icon, application title and version/versionCode. Run development and production exports/builds. A development APK is not a signed store release. Inspect the final merged Android manifest: location/camera/microphone/broad storage permissions are blocked; local reminder notifications are optional.

## Data safety and policies

Replace the pre-release local legal text with operator-reviewed retention, deletion contact and privacy/terms content and publish required policy links through the operator's approved channel. Review Google Play Data Safety declarations against actual Auth/shared records/cache/exports/notifications. No ads, paid plans, GPS or uploads are implemented. Do not claim legal document verification; metadata is not an official RC/DL.

## Final gates

Run current format/type/lint/domain/SQL checks, real provider flows, direct REST attacks, process-death/offline/conflict flows, 320dp/large text/TalkBack/reduced motion, actual notification/share/PDF behavior, signed build and physical-device smoke tests. Review dependency audit findings without force-downgrading Expo. Produce real store screenshots/feature graphic from an approved build; never fabricate release evidence. Only the operator can complete Play Console submission and review.
