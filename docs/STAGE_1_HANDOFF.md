# Stage 1 handoff — 2026-10-21

The original kit in `my docs/` is preserved. Root source implements Expo Router foundation, bundled onboarding/category/empty art, auth screens and PKCE/OTP services, secure session adapter, profile/theme/language, floating tabs, vehicle wizard with local drafts, garage, selection, Owner edit/archive/recover, meter baseline observations and RLS/RPC foundation. Latest user request additionally authorizes a debug-only device-local development mode, visibly labeled and isolated from Supabase identities. No real Auth account is forged.

No Git repository existed initially, so no commit/revision is claimed.

## Files and routes

`app/_layout.tsx`, `app/auth/*`, `app/(tabs)/*`, `app/garage/*`, `app/settings/*`; implementation under `src/features/auth`, `garage`, `development`, `src/components/ui`, `navigation`, `hooks`, `lib`, and `state`. Root configs, lockfile, .env.example, scripts, assets, tests and docs were added. Generated Android native project is ignored/reproducible. Source kit files are unchanged.

## Backend

`supabase/migrations/202610210001_foundation.sql`: profiles, vehicles, vehicle_members, vehicle_access_grants, vehicle_settings, meter_readings, audit_events and operation_receipts. Every public table has RLS. Vehicle writes are idempotent atomic RPCs; membership changes protect primary/final Owner. Verified-email grants resolve without acceptance. No Edge Functions are required for these transactions. Private privileged keys are absent.

## Executed checks

- `npm run typecheck` — PASS on Stage 1 source.
- `npm run lint` — PASS, zero warnings after using import-parser ignores for RN Flow source and generated PGlite bundle; TypeScript validates imports.
- `npm test` — PASS, 28 tests (vehicle/domain basics, route boundaries, loading cancellation/races and PostgreSQL security).
- `npm run assets` — PASS: 1024px icon, 432px adaptive foreground, 1080×1920 splash verified.
- `npm run format:check` — PASS.
- `npx expo-doctor` — PASS, 20/20 checks.
- `npx expo config --type public` — PASS.
- `npx expo export --platform android` — PASS, Hermes bundle and local assets exported.
- `npx expo prebuild --platform android --no-install` — PASS.
- `npx expo run:android --no-bundler` — native Gradle build PASS (BUILD SUCCESSFUL, 2m26s), APK generated. CLI automatic deep-link launch failed; actual app launch/device QA remains under investigation. Earlier attempts failed during generated-file/dependency reinstall overlap; final native compilation passed.
- `npm audit`, `npm audit fix` — 27 transitive tooling findings remain (8 moderate, 19 high); suggested force fix downgrades Expo to incompatible SDK 44 and was not applied.

Tests run the authoritative SQL in PGlite with minimal Supabase Auth fixtures and real PostgreSQL roles/RLS. Full Supabase/PostgREST/JWT/SMTP/Google integration is NOT TESTED; Supabase CLI and Docker are absent. Concurrent real connections and live-provider end-to-end tests remain unverified.

## Security evidence

Owner/Pilot/outsider reads and mutation denial; verified immediate grants; unresolved/unverified identities; later verified auto-resolution; primary admin protection; co-owner changes; revocation; protected profile email; append-only audit; create retry idempotency; stale edit rejection; atomic rollback on negative baseline. No acceptance UI is used.

## External steps and next stage

Configure real Supabase project and Auth providers using LOCAL_SETUP.md. Apply migrations on a development instance, repeat security tests via REST/JWT and perform real auth/device tests. Legal operator contact/review, production signing and Play release remain external. Do not mark Stage 1 live integration accepted until these pass.

Proceed with Prompt 2 and Prompt 3 per latest user instruction. Fuel/Expenses and Daily Progress staged labels must be removed as each module is implemented. Extend the migration additively and preserve UUID operation receipts, verified-email access, per-vehicle query keys and paise rules. See QA_STAGE_1.md for manual gates. Development bypass must remain debug-only and all local test data must remain isolated from real Supabase storage.
