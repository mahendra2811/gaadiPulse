# Agent contract for implementing GaadiPulse

You are implementing a real app. Begin by reading `PROJECT_REFERENCE.md`, `docs/START_HERE.md`, the active `PROMPT_*.md`, and the prior `docs/STAGE_*_HANDOFF.md` files. Never replace working code with a demo.

## Priority and scope
1. User's latest explicit requirements and `PROJECT_REFERENCE.md` override examples or guesswork. Resolve gaps with safe defaults and record decisions in `docs/DECISIONS.md`.
2. Stage execution order: `PROMPT_1_FOUNDATION.md` → `PROMPT_2_FUEL_EXPENSES.md` → `PROMPT_3_COLLABORATION_RELEASE.md`.
3. Preserve previous migrations, user data, and tests. Make new additive migrations; no destructive reset in real environments.
4. Deliver typed, accessible, localized English, Android-first screens that are actually wired to authenticated data or documented offline drafts.
5. No invented loading percentages: show determinate progress only for measurable work; otherwise an indeterminate header line.
6. No placeholder/no-op business functionality. Explicitly disabled and labeled deferred features are allowed only for photo capture/upload, real GPS, Hindi translations and paid plans.
7. Role is **per vehicle**. Email access grants take effect automatically after **verified** Google/OTP sign-in—no invite acceptance. No access based solely on a client email string.
8. Store monetary amounts in paise; allow fuel/expenses without KM/HOURS and late truthfully timestamped readings. Mileage requires valid full-to-full intervals.
9. Resolve sensitive financial visibility at SQL/RPC layer; don't rely on hidden buttons. Secure every storage path and export.
10. Network/permission errors must show a retry/recover path; never silently ignore.

## Architectural organization
- `app/` Expo Router ONLY route entrypoints and layouts; `src/features/<domain>/` owns data services, schemas, hooks, components and tests.
- `src/components/ui/` reusable presentational primitives; `src/components/navigation/` floating tabs, global header line, vehicle switcher.
- `src/lib/` Supabase client, SQLite adapter, sync outbox, environment validation, i18n, query client, crash/toast utilities.
- `supabase/migrations/` chronological authoritative DDL; `supabase/functions/` only privileged logic. `supabase/reference` is planning source, not automatically applied migration.
- Global server state via TanStack Query keyed by `[userId,vehicleId,...]`; Zustand for UI-local state only; React Hook Form + Zod, design tokens, Reanimated sparingly.
- Disallow remote images, generic manufacturer photo scraping and ad SDKs.

## Run and report
Before stage completion run documented relevant commands: format/lint, strict TypeScript, unit tests, SQL local migrations/RLS tests, Expo config validation, Android build smoke test when feasible. Write `docs/STAGE_N_HANDOFF.md` with precisely which commands were executed, PASS/FAIL/BLOCKED, files/migrations added, and external-user-owned steps. Don't falsely say something passed.

## Security invariants
Client publishable Supabase key may be public; **never** bundle service_role, Google client secret, JWT secret, storage signing secret, or private email API key. Use Edge Functions/RPC for privileged membership grants, access resolution, approvals and guarded writes. Require verified identity; preserve audit trail; reject revoked Pilot offline writes on sync.
