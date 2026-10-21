# Local setup

Implementation uses the Expo SDK 58 blank TypeScript template's matched React 19.3 / React Native 0.88 versions. Node 24.22.0 and npm 11.19.1 were present during implementation. Use `npm ci` with the committed lockfile, and Expo install for native dependencies. Do not independently upgrade React Native.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env`; configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These are the only backend keys allowed in the app. The optional redirect is `gaadipulse://auth/callback`.
3. Create a Supabase project or install Supabase CLI and Docker for local development. Neither CLI nor Docker was installed during initial implementation. Do not treat `supabase/reference` in the supplied kit as an executable migration.
4. Apply `supabase/migrations/202610210001_foundation.sql` to a fresh development project using Supabase migrations or its SQL editor. Back up existing projects and review migrations first. Never reset production. The migration creates profiles for pre-existing Auth users as well as installing an Auth trigger.
5. Enable email OTP in Supabase Auth. Set the email template to include the numeric token (`{{ .Token }}`), configure SMTP, and verify delivery/rate limits. Email confirmation must remain enabled.
6. Enable Google in Supabase Auth using provider credentials stored in Supabase, never in the app. Add the Supabase callback to Google configuration and `gaadipulse://auth/callback` to the Supabase redirect allowlist. Verify Android package and signing SHA configuration for the intended provider/release. This implementation uses Supabase browser OAuth with PKCE.
7. Run `npm start`, then `npm run android` for a native development build with the emulator/device available. `npx expo export --platform android` validates the JS/Hermes bundle; it does not produce a signed store binary.
8. Test account creation, verified email, profile, first/second vehicle, selection, archive/recover, logout and re-login. Grant a second verified email using the backend RPC and verify per-vehicle access and revocation.

## Database tests

`npm test` runs the actual authoritative migration in PGlite (embedded PostgreSQL), with a minimal `auth.users`, `auth.uid()` and authenticated/anon role fixture. It verifies PostgreSQL RLS and RPC logic. It does not verify Supabase REST, actual JWT verification, GoTrue, SMTP, OAuth, concurrency across real connections, or hosted configuration. Repeat the security matrix against local/hosted Supabase before release.

## Native build

Android package defaults to `com.pooniya.gaadipulse`; configure `ANDROID_PACKAGE` before first release if needed. Generated `android/` is ignored and reproducible through Expo prebuild. Java 21 and Android SDK were detected. EAS signing, project ID, release credentials and Play review remain operator-owned.

## Offline and recovery

Stage 1 saves vehicle wizard drafts to user-scoped SQLite and the active selection to secure storage. Reopen Add/Edit to resume the draft. Vehicle saves require a live verified session and server authorization; an operation UUID makes retries idempotent. Edit uses the last server `updated_at` for conflict detection. A stale edit returns CONFLICT and must be reviewed against the current vehicle. Stage 3 adds collaborative outbox and conflict UI. Signing out clears scoped drafts and in-memory queries. Do not promise offline server-confirmed creation.

## Secrets and legal

`.env` is ignored. Never bundle service_role, provider secrets, JWT signing secrets or signing credentials. Local pre-release Terms/Privacy content is in the English catalog and reachable from welcome/settings; operator review, deletion contacts and public policies must be supplied before release.
