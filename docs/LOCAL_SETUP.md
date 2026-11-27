# Local setup

## Requirements

Use the versions pinned by the lockfile and Expo SDK. Install Node/npm, Java, Android Studio/SDK for native Android work, and Docker plus Supabase CLI for local backend testing. Run `npm ci` from the repository root.

## App configuration

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for a development project. These values are bundled into the app; never put service-role, provider, signing, or job secrets in public variables.
3. Configure the Supabase Auth redirect `gaadipulse://auth/callback` and the providers you intend to exercise. See [external setup and release](EXTERNAL_SETUP_AND_RELEASE.md).
4. Run `npm start`; use `npx expo run:android` for a native development client. `npx expo export --platform android` checks the JS bundle but does not create a signed release build.

## Database setup

The authoritative schema is the chronological set of SQL files in `supabase/migrations/`. Review the target project's migration history and apply only missing migrations in order. Do not assume an old migration count and never reset a hosted or real-data project. `supabase/reference/` is design material, not an automatically applied migration.

Use `supabase start` and a disposable local database for destructive migration experiments. Local PGlite tests do not replace Supabase Auth, PostgREST/JWT, hosted RLS, concurrency, or provider checks. Follow [online-only verification](ONLINE_ONLY_PLAN.md) and [the QA matrix](QA_TEST_MATRIX.md).

## Current behavior

Authenticated records and permissions are online-only. Forms are held in memory; a failed or uncertain save is not automatically replayed after reconnect. Use the form's explicit retry/recovery path and follow the server revision/operation guidance. Development preview data is temporary and separate from real accounts.

See [the latest stage handoff](STAGE_3_HANDOFF.md) for verified commands, migrations, known blockers, and external steps. Never describe local preview or a bundle export as proof of live-backend integration.
