# Implemented offline and synchronization protocol

## Identity and storage

Native uses Expo SQLite: user-scoped form drafts, `local_records` for minimal authorized caches, and `sync_operations` for the durable outbox. Browser development uses namespaced local browser persistence. Refresh tokens use Expo SecureStore on native, chunked below platform item-size limits; web sessions are limited to sessionStorage. No service key is stored by the app.

Debug-only development mode is a separate identity and repository. It persists real local test records but never creates a fake Supabase session, sends them to Supabase, or migrates them into a real account. Exit development mode and configure Auth to use the backend.

## Authorized cache

Garage, permissions, form versions, record mirrors and meter observations are scoped by account and vehicle. Financial/form caches expire after one hour. Record/form caches carry the permission signature from the latest trusted access response; a known role/permission change prevents reuse of a broader old cache. Explicit permission/auth failures clear affected caches; vehicle membership loss removes live query data. Profile preference cache contains only the current account's own settings.

Offline cache revocation is inherently delayed until the device reconnects or the authorization lease expires. Already viewed/exported information cannot be cryptographically recalled. The app does not promise otherwise. Real-account exports require a live server permission check and retrieve permitted data again.

## Durable writes

1. User-entered drafts are saved locally while editing, with vehicle-bound keys. Changing vehicle is explicit and confirmed; incompatible KM/HOURS fields are cleared and progress answers reset for the new schema. In-flight operations keep their captured vehicle ID.
2. A single UUID is allocated per intended write. Before remote dispatch, the operation is durably stored with action, vehicle, payload, expected revision and status.
3. Supabase RPC rechecks verified identity, active membership, permission, policy/schema and financial/meter invariants. Payload-bound receipts make retries idempotent. Same UUID with different content is rejected. Edits use compare-and-swap revisions; garage edits use `updated_at`.
4. Success removes the outbox operation and invalidates scoped queries. Pending records have an explicit provisional badge and do not enter confirmed financial totals.
5. Network/transient errors retry with exponential backoff capped at five minutes. Permission/validation failures become REJECTED; stale records/form schemas/meter observations become CONFLICT. These personal drafts remain available for inspection, export and deletion.

`SYNCING` operations left after process death are retried idempotently. Foreground, connectivity restoration and periodic foreground timers drive synchronization; Android background execution is best effort, never guaranteed. A worker verifies the current session before each upload. Account changes cancel active dispatch and prevent a response from recreating cleared operations.

## Recovery and privacy

Sync Status shows queued states, errors and last successfully uploaded operation time. Conflicts show local and available server versions; a user explicitly confirms retry against the new revision, or exports/removes the draft. A changed progress form still requires review of the current schema; no automatic answer migration is fabricated. Rejected former-member drafts do not expose fresh vehicle data.

Automatic session expiry clears live caches and notifications but retains personal drafts/outbox for the same account to recover after sign-in. Explicit sign-out cancels synchronization and clears scoped drafts, outbox, authorized caches and local notifications. Development test records remain in their isolated debug namespace.

## Verification

Stage 2/3 process-death, network, revocation, concurrency, lease expiry and reconciliation scenarios are NOT RUN, per the user's instruction to defer testing. Follow QA_TEST_MATRIX.md before release. The protocol describes implemented source behavior, not proven runtime results.
