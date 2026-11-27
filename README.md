# GaadiPulse

**Every Vehicle. Every Detail.** Android-first vehicle logbook built with Expo Router, TypeScript and Supabase.

Read the [comprehensive product brief](docs/GAADIPULSE_COMPREHENSIVE_PRODUCT_BRIEF.md) for the current product description and safe feature claims. The [Stage 3 handoff](docs/STAGE_3_HANDOFF.md) is the implementation and validation record; hosted backend, device and release gaps are listed there and in [online-only verification](docs/ONLINE_ONLY_PLAN.md). Source presence or a successful JS export does not prove production availability.

Current data policy: **online-only**. Authenticated records require connectivity; failed saves are not queued for automatic upload. The original prompt kit remains preserved in `my docs/`.

## Run in development

```sh
npm ci
npm start
```

Choose **Continue in development mode** on onboarding/sign-in. This button exists only in debug builds, opens a temporary, memory-only Owner preview workspace. It does not create a real Auth account or upload test data. You can also enter/exit it in Settings. Native development clients must be rebuilt after adding native DateTimePicker, Print or Sharing modules:

```sh
npx expo run:android
```

## Connect real authentication and storage

```sh
cp .env.example .env
```

Populate only your Supabase project URL and publishable key, then follow [external setup](docs/EXTERNAL_SETUP_AND_RELEASE.md). Never put provider secrets, service_role, signing keys or job secrets in public environment variables.

```sh
supabase start
supabase db reset       # disposable local development only
# For a linked development/hosted project, review and apply additive migrations:
supabase db push
```

Review migration history before applying pending files in chronological order. Never reset a real database. Configure supported authentication providers and the `gaadipulse://auth/callback` redirect. The Auth implementation uses browser OAuth with PKCE; verified-email vehicle grants require no acceptance flow.

## Implemented modules

- Garage, five categories, subtype/model entry, KM/HOURS/BOTH, baseline readings, per-vehicle Owner/Pilot role, archive/recover.
- Fuel full/partial fills, any-two-of-three calculation with paise rounding, optional truthful observations, history and qualifying efficiency.
- Expenses, category-specific details, EMI cash/operating/financing classification, line items, linked maintenance/reminders.
- Independent observations, reset markers, Owner corrections/retractions and measured intervals.
- Members, verified-email grants, defaults and overrides; SQL-enforced financial visibility and private progress-answer redaction.
- Immutable progress form versions, typed custom fields, defaults/options/constraints, Pilot preview, date policy, submissions and Owner review.
- Document metadata, expiry/reminders, official service link and accurate no-file notices.
- Local notifications, reminder recurrence/complete/snooze; permission-scoped CSV/JSON/PDF export.
- Online-only server reads and acknowledged saves; in-memory forms, explicit retry, idempotent operation IDs and server revision conflicts.
- Theme/system, English catalog, deferred Hindi, local legal/help content and account-deletion request/operator workflow.

## Architecture

`app/` contains route entrypoints/layouts. `src/features/` owns feature services/screens; the shared `records` feature consolidates common ledger, metadata and progress entry flows. Domain mathematics live under `src/utils/`; security lives in ordered SQL/RPC migrations. Supabase remains the only production backend. Zustand is UI-only; TanStack Query keys include account/vehicle/domain, and React Hook Form/Zod validate inputs. See the [documentation index](docs/README.md), [architecture](docs/ARCHITECTURE.md), [screen map](docs/SCREEN_MAP.md), [security](docs/SECURITY_AND_RLS.md) and [online request protocol](docs/SYNC_PROTOCOL.md).

## Verification commands

```sh
npm run format:check
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
npx expo run:android
```

Use the latest [stage handoff](docs/STAGE_3_HANDOFF.md) and [QA matrix](docs/QA_TEST_MATRIX.md) for exact evidence and remaining checks. Do not use destructive DB resets on real data.

Release signing, live providers, operator retention/legal contact, deletion-job deployment/scheduling, real devices and Play review remain external setup steps. No Play publication or live-provider success is claimed.
