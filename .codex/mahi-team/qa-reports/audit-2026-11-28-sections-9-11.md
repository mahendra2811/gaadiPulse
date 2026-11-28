# Read-only audit — connectivity, security and UX (sections 9–11)

Date: 2026-11-28. Scope: source, local migrations, linked Supabase catalog metadata and npm advisory report. No hosted writes, migrations, deployments or user data reads were performed.

## Connectivity and synchronization

Existing coverage: NetInfo drives TanStack `onlineManager`; root AppState drives `focusManager`; shared fetch fails fast when offline, propagates cancellation and times out at 20 seconds; query retries are bounded with exponential delay; authenticated query results are withheld on offline/error; mutations do not auto-retry; record writes use stable operation UUIDs and server receipts; account change/logout clears query state and membership revocation removes vehicle cache. No durable offline drafts, cached ledger mode, outbox or automatic replay is supported, per `docs/ONLINE_ONLY_PLAN.md`.

Gaps addressed in this change: visible app-wide-in-screen offline/degraded status; slow request classification using repeated measured response latency; unstable status from repeated transport failures; status is localized (English/Hindi) and uses no health-probe API calls. Added pull-to-refresh to meter history and Insights; Home refresh now refetches active queries scoped to its account and vehicle.

Remaining verification: real Android airplane mode, connected Wi-Fi without internet, captive portal, slow cellular, foreground/reconnect, timed-out requests and uncertain RPC commit. Web notification APIs are irrelevant to this section.

## Security review evidence

### Linked project catalog

- `npx supabase migration list --linked`: local migrations `202611280005` through `202611280009` are not in hosted migration history. No migrations were applied.
- Read-only linked catalog query found every current `public` ordinary table has RLS enabled; no anonymous table privileges; no authenticated direct INSERT/UPDATE/DELETE privilege exceptions. Ten sensitive tables were inspected individually. `daily_progress` and `progress_form_versions` have RLS policies but no authenticated table SELECT grant, matching JSON-redaction safety.
- Current `pg_policies` metadata shows authenticated row policies for owner/member/permission-scoped rows. This catalog-level result does not prove row behavior for specific JWTs.
- Public SECURITY DEFINER routines inspected use empty search paths, except the `rls_auto_enable` event-trigger function uses `pg_catalog` and is executable by anon; it is a trigger-only event-trigger routine, not an ordinary RPC. Consider revoking direct execution only after confirming function semantics and migration tests.
- Linked `pg_get_functiondef` for `correct_meter_observation` confirmed dynamic SQL iterates a hard-coded four-table allowlist. The SQL linter's relation error is likely a dynamic-SQL static-analysis limitation, not proof the function executes successfully.
- `npx supabase db lint --linked`: warnings include IMMUTABLE routines that call stable expressions and text-to-array/jsonb assignment casts; one dynamic SQL relation error described above. These require source/runtime triage; no live behavior was changed.

### Source controls found

- SecureStore stores native Supabase PKCE/session state; web uses session storage. Supabase client enables persisted session and token refresh.
- Core write RPCs require verified identity and check vehicle authorization, role/permission, revision and idempotency receipts. Vehicle grant RPC has an existing 30-per-hour control.
- No service-role reference was found in client `app/`, `src/`, app config or package scripts. Privileged service keys appear in server Edge Function code/environment only.
- No private document bucket or client upload path is implemented. Signed URLs and MIME/size checks are not applicable until uploads exist.
- Account deletion is a request plus operator Edge job; default delay is 30 days, configurable 1–365 days. The worker/scheduler and retention operation are not live-verified; financial/audit history retention after anonymization remains an operator/privacy-policy decision.
- At initial audit time, the only explicit operation-level limit found was access grants. A local audit-event trigger migration was added after the user approved local-only remediation; auth provider rate settings remain dashboard-owned and not verified.

### Dependency advisories

Initial `npm audit --json` found 19 advisories (5 high, 14 moderate). After user approval, Expo SDK 58 was aligned to compatible patch versions and targeted overrides updated `node-forge`, `underscore` and Expo fingerprint's `minimatch`; `npm audit` now reports zero vulnerabilities. Expo 52 was not installed.

## UX source review

Existing shared primitives include screen skeletons, empty/error/retry states, pull refresh, consistent ToastProvider, success haptics, keyboard-avoiding/scrolling auth and forms, dirty-form `usePreventRemove`, confirmation dialogs, theme-aware palettes, accessible labels, Expo Router back handling, locale-aware date/number/money formatters, FlashList for the unbounded notification center and bounded server pagination for ledgers. React Native font scaling is left enabled by default. Added degraded network notice; raised common text line-height and interactive targets below 56dp in the audited app UI; added refresh for Insights and meter history.

Remaining device checks: verify 320/360dp and large-font layouts, Devanagari line wrapping, keyboard focus and submit path, Android system/back behavior, screen readers, haptics, dark mode contrast, and touch target measurement. Search/filter state is kept in route component state but device navigation persistence was not manually exercised.

## Initial checkpoint boundary

No auth/session, RLS/RPC, rate-limit, account-deletion retention, storage or dependency mutation was made pending the required security checkpoint. No local/hosted database migration was added or applied in this audit phase. The architecture proposal is `.codex/mahi-team/architecture/connectivity-security-ux-2026-11-28.md`.

## Approved local-only remediation follow-up

- The user approved local-only fixes/tests and compatible dependency remediation, preserving the existing 30-day account deletion delay. No production/hosted writes were authorized or performed.
- Added `supabase/migrations/202611280009_sensitive_operation_limits.sql`, which serializes and applies rolling one-hour audit-event rate limits to membership, vehicle, correction and record writes. The full local PGlite migration chain and a 30/31-event boundary test pass. Hosted behavior has not been established.
- Updated stale vehicle/meter/release expectations and mocked Expo Constants in the reminder test. The complete suite now passes: 33 files, 116 tests.
- Converted the onboarding banner to a visually checked same-dimension WebP derivative: 199 KB from a 2.2 MB PNG (about 91% smaller). The supplied original remains; a script regenerates the derivative.
- Raised shared touch sizes/line heights, added network status UI and pull-to-refresh coverage. Expo SDK compatibility check, typecheck, lint, formatting, locale structure, web/Android exports and an arm64 Android debug build pass. npm reports zero advisories.
- External gates remain: linked migration ordering/application, hosted JWT/RLS attack matrix, provider Auth rate settings, backup/recovery restore test, operational usage monitoring, production scheduling and low-end physical-device profiling. No deployment or user data was changed.
