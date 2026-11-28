# Connectivity, security and UX architecture/checkpoint

Date: 2026-11-28  
Status: proposal for implementation sequencing; no source or database changes authorized by this artifact alone.  
Scope: user-requested checklist sections 9–11.  
Product contract: authenticated data remains online-only per `docs/ONLINE_ONLY_PLAN.md` and `PROJECT_REFERENCE.md`.

## Summary and decisions

1. Keep TanStack Query + NetInfo as the online/freshness foundation. Expose one app-level connection snapshot and show a compact, persistent status line when offline or when the transport appears degraded. Do not persist server data or submit queued writes after reconnect.
2. Treat `isConnected` and `isInternetReachable` as transport evidence, not proof that Supabase is reachable. Show “Checking connection” while reachability is unknown; transition to offline only on explicit false. Classify a connection as “slow/unstable” using measured request outcomes/latencies and recent timeouts, not cellular generation alone.
3. On offline/reconnect/foreground transitions, refetch active stale queries. Continue withholding cached private data after a known disconnection or failed read, consistent with current fail-closed behavior. Any later cached read-only mode requires a separate privacy/permission design and explicit authorization lease semantics.
4. Preserve existing idempotency UUIDs and server receipts for explicit same-input retries. Never automatically retry mutations or replay a form after reconnection. Keep uncertain-commit errors explicit and preserve the mounted form for deliberate retry.
5. Security remediation is split into a source/migration audit and separately approved mutations. RLS/RPC/auth/session/deletion/rate-limit/storage changes are approval-gated. Do not deploy hosted changes in this scope.
6. UX work is an audit-first pass over existing primitives and screens. Prefer targeted fixes in shared components and high-traffic flows over a broad visual rewrite. Follow Android-first sizing, readable font scaling, accessible labels, safe areas, keyboard behavior and the established design tokens.

## Current implementation evidence (source inspection only)

- Connectivity and foreground: `src/lib/connectivity.ts` sends NetInfo reachability to TanStack `onlineManager` and native AppState to `focusManager`; listeners are cleaned up.
- Request handling: `src/lib/onlineFetch.ts` fails fast when known offline, propagates caller cancellation, applies a 20-second timeout and removes its abort listener.
- Query privacy/recovery: `src/lib/query.ts` retries transient reads with capped exponential backoff, avoids retries for known authorization/input failures and suppresses cached server data while offline or after a read error. Query client defaults in `app/_layout.tsx` use TanStack focus/reconnect behavior.
- Write safety: record writes carry stable operation UUIDs and database receipt/revision guards (`src/features/records/api.ts` and migrations). Mutations do not retry automatically. Form data stays mounted after failure.
- Account isolation: auth changes cancel and clear query state (`src/features/auth/session.tsx`); vehicle membership revocation removes vehicle-scoped cache (`src/hooks/useMembershipUpdates.ts`).
- Pull-to-refresh exists in Garage, record browse, and notification center. More enabled lists/screens need an inventory.
- Shared UX primitives exist: `PageSkeleton`, `EmptyState`, `ErrorState`, `ToastProvider`, screen refresh control, and success haptics. Several forms use `usePreventRemove` and explicit discard confirmation. Current header back target is 44dp, below the construction-saathi UI rule of 56dp.
- Security design is documented in `docs/SECURITY_AND_RLS.md`: RLS and SECURITY DEFINER RPC authority, verified identity, server-side permission checks, financial field redaction, secure session storage, account deletion request/operator job, and no private document bucket configured.
- Static search did not find service-role use in `app/`, `src/`, app config or package scripts. This does not establish that no secret is present elsewhere or in built artifacts/history.
- `docs/ONLINE_ONLY_PLAN.md`, `docs/SECURITY.md`, and `docs/QA_TEST_MATRIX.md` label hosted migration/RLS/provider verification as open. Therefore the hosted security posture is not verified by this source review.

## Connectivity/status design

### State model

Expose a small shared status snapshot:

- `checking`: no reachability answer yet; do not label the user offline.
- `online`: internet reachability is true and there is no recent degraded request evidence.
- `degraded`: network is reported reachable, but the latest request sample has repeated timeouts/transport errors or latency above the chosen threshold.
- `offline`: either connectivity or internet reachability is explicitly false.

Reset degraded evidence after a successful request and decay old failures over a short rolling window. Do not use `isConnectionExpensive` or `cellularGeneration` as an error signal; at most use those to avoid large optional fetches. Avoid probe requests that create extra Supabase/API traffic. Request timing can be recorded in-memory in the shared fetch wrapper without logging URLs, tokens, response bodies, or personal data.

### UI behavior

- Place a compact, accessible status banner/line in the shared app shell near the page header. It appears only for `offline` or `degraded`; `checking` may use a subtle status label where useful, not a blocking screen.
- Use both icon and localized text, high contrast, large-text wrapping, and minimum 56dp touch target only if the banner has an action. It should not cover form actions or alter navigation state.
- Offline copy states that the internet is required and there are no background uploads. Degraded copy suggests waiting/retrying and does not promise a write was rejected if server commit status is unknown.
- If a request fails while the global status still says online, show that request's Retry/recovery UI. Do not infer global offline state from one permission/server error.
- On reconnection and AppState foreground, invalidate/refetch active stale reads. No queued writes or automatic form submits.
- No private cached ledger/permission details are rendered when offline or after a read error under the current fail-closed wrapper. Read-only offline display remains a separately designed feature.

### Options and tradeoffs

- **Recommended: event + request evidence.** Use NetInfo reachability plus a small rolling window of request latency/timeouts. Minimal traffic and reliable degraded state, but cannot precisely attribute latency to network versus backend.
- **Alternative: periodic Supabase health probe.** More direct reachability evidence but adds API use, startup work and false alarms if the health endpoint differs from data API availability. Not recommended absent measured need.
- **Alternative: transport-only status.** Easiest, but misses connected Wi-Fi with a slow or unreachable API and does not satisfy unstable-network messaging.

## Online-only recovery contract

- Keep forms in volatile component state only. No SQLite/browser cache, durable drafts, outbox, sync worker, reconnect upload, or optimistic authoritative financial records.
- All mutations require explicit user action and confirmed RPC response for success. Do not auto-retry mutation requests. If the response is ambiguous, state that confirmation is unknown and let the user retry unchanged values using the same operation UUID.
- The query layer may retain in-memory results briefly for navigation only while a successful server state is current. Known offline and failed reads must not be presented as fresh data or successful empty state.
- Permission revocation, account change, logout and session expiry clear private query state and dependent UI. Do not persist vehicle authorization leases in this design.

## Security audit findings and checkpoint boundary

### Read-only findings

- Migration sources show RLS on primary domain tables and narrowly granted authenticated reads/RPC execution, with sensitive writes routed through server functions. This is consistent with deny-by-default, but migrations are numerous and include later policy replacements; a line-by-line final-state audit and direct API tests are still needed.
- Static source review cannot establish that the linked/production database has the same migration state. Existing docs explicitly say hosted RLS and session/revocation tests remain unverified.
- Rate limiting for sensitive RPCs and authentication is not established by this inspection. The auth provider and Edge/DB functions need explicit rate-limit review.
- Account deletion is a request plus operator-controlled processing job; timing, retention, backup expiration and completed data-erasure evidence are operationally unresolved.
- No private storage bucket is currently configured. Signed URL and upload validation work should remain out of scope until a private file-upload feature is separately approved and designed.
- Existing package audit history reports advisories; blindly upgrading Expo-compatible packages could break the managed native runtime. Dependency audit is review-only until exact package fixes and lockfile impact are proposed.

### Approval-gated remediation areas

Before implementing any item below, present the exact finding, proposed migration/code diff, rollback plan, and verification plan for human approval (the project workflow security checkpoint):

- RLS policy changes, table/function grants, SECURITY DEFINER RPC changes, or permission semantics.
- Auth session expiration/refresh behavior, identity verification or account/session revocation changes.
- Account deletion, retention, or irreversible data cleanup behavior.
- Sensitive-operation rate limiting or lockout rules.
- Storage bucket exposure, signed URL policy, file validation, or data export changes.
- Dependency replacement/major upgrade where native permissions or cryptography are affected.

A read-only migration review, source scan and tests can be completed before this checkpoint. Never apply a hosted migration or alter production secrets without separate explicit authorization.

### Audit sequence

1. Enumerate all public tables, views, functions, grants and policies from the chronological migrations and derive final effective policy state, including later `DROP/CREATE POLICY` replacements.
2. Inspect function security mode, fixed `search_path`, caller authorization, input validation, returned columns, execute grants and transaction/receipt semantics.
3. Scan app and generated/exported bundles for privileged keys and unsafe logging; scan dependency graph and current npm advisories without auto-fixing.
4. Run the full ordered migration compilation on a disposable local Supabase/Postgres environment and authored RLS tests with Owner, Pilot, outsider, revoked user, and unauthenticated roles. Do not reset the linked/production project.
5. Provide a reviewable report with evidence and classify each proposed mutation for the checkpoint. After approval, add additive migration/tests and separately request deployment authorization only if needed.

## UX audit and remediation plan

Inventory all reachable routes and shared components against the 17 listed items, then fix the highest-impact shared causes first:

1. Shared loading, empty, error/retry and success/toast patterns; ensure no failed query renders an empty ledger or zero summary.
2. Submission lock / pending UI on every critical save and destructive action; ensure rapid taps cannot issue duplicate operations and preserve retry UUID behavior.
3. Keyboard handling, focus order, save position, validation focus and unsaved-change confirmation on all forms and profile/settings workflows.
4. Destructive confirmations; explicit search/filter/sort behavior and state persistence where navigating back is expected.
5. Dark-mode contrast and token usage; 320/360dp/large-font layouts, scrollability and Android back behavior.
6. Accessibility labels/roles/states and touch target sizing, especially icon-only controls and shared navigation. Construction UI baseline calls for 56dp touch areas, so any deliberate smaller target needs an accessibility rationale.
7. Localized date/time/number/currency formatting and correct timezone display. Do not replace stored values or formats.
8. Haptic feedback remains optional and must never fail a committed operation; honor platform/accessibility settings.

Use existing primitives and domain-specific patterns. Avoid a broad rewrite or new UI dependency unless the audit identifies a concrete gap.

## Non-goals

- Offline drafts, offline financial cache, outbox, background sync or optimistic server-authoritative writes.
- New remote data cache, longer private-data retention, or showing stale permissions while offline.
- Deploying Supabase migrations, changing production auth/RLS/secrets, configuring provider limits, EAS or Play release operations.
- Adding file uploads or storage buckets; signed URLs are not applicable until that feature exists.
- Replacing the Expo/React Native UI stack or performing unmeasured dependency upgrades.
- Claiming device accessibility, low-end performance, hosted RLS, backup/restore or production recovery has passed without actual verification.

## Acceptance criteria

- Connection state distinguishes unknown, reachable, degraded, and offline without equating Wi-Fi connectivity with API success.
- Offline/degraded messaging is localized, accessible, non-blocking, and does not claim data was saved or definitively rejected when acknowledgement is ambiguous.
- Foreground/reconnect revalidates stale reads; no write is submitted automatically.
- Private stale server data stays hidden offline or on read errors; logout/account change/revocation removes it.
- Repeated taps and explicit retries produce at most one committed record per idempotency key; failure preserves form input and offers recovery.
- Every reachable screen has coherent loading/empty/error/retry states and appropriate refresh behavior; destructive and unsaved-change flows are safe.
- Keyboard, Android back, large font, dark mode, localization, touch targets and screen reader semantics pass representative Android checks.
- Security audit report distinguishes source evidence from hosted evidence. No security-sensitive mutation proceeds without the checkpoint; no production deployment is inferred.

## Unverified items

- Current linked/hosted migration state, final effective policies, direct REST/JWT/RPC adversarial tests, database rate limits and verified identity provider enforcement.
- Session expiry/refresh and revoked-session behavior on actual native builds.
- Account deletion processing schedule, retention policy, backup expiration and completed erasure proof.
- Dependency vulnerability reachability and Expo-compatible remediation; compiled bundle secret scan.
- Connectivity signal reliability/latency thresholds under Wi-Fi without internet, captive portal, slow cellular, background/resume and request timeout on device.
- Every route's loading/empty/error/retry, keyboard, back/discard, search/filter persistence, dark mode, accessibility and large-font layout.
- No upload bucket exists; signed URL and file-size/MIME controls remain inapplicable until approved upload scope.
