# Offline cache, outbox and synchronization contract

## Local tables
`cached_vehicles`, `cached_permissions`, `cached_form_versions`, `fuel_drafts`, `expense_drafts`, `progress_drafts`, `cached_meter_readings`, `sync_operations`, `sync_checkpoint`.

## Mutation lifecycle
1. Generate unique UUID v4 operation ID once; local SQLite transaction persists entity draft and outbox row atomically.
2. UI marks local record `Pending sync` (not server-confirmed). Exclude from confirmed totals or clearly label provisional totals.
3. When online and authenticated, sync worker gets fresh membership authorization and sends operation IDs to server RPC/Edge Function.
4. Server validates membership, permission, date policy, form schema version, meter chronology and monetary invariants; stores operation ID unique to ensure idempotence.
5. Client atomically saves server outcome and removes/marks acknowledged outbox entry; wakes dependent queries and updates pending UI.
6. Errors: retry exponential backoff for network/5xx; `REJECTED` for revoked access/invalid policy; `CONFLICT` for stale version or competing corrections; user sees recover/export options.

## Concurrency
- No blind last-write-wins on ledger items or authoritative meter snapshots.
- Use record version counters / `updated_at`, or compare-and-swap via RPC, and show conflict resolution if outdated.
- Recent vehicle switch does not change recorded `vehicle_id` in existing drafts or in-flight requests.
- Avoid unauthorized background sync after logout. Cancel in-flight work and erase scoped sensitive cache on logout.
- On Android, foreground resume/connectivity notifications are reliable triggers; background jobs are best-effort and must not be promised as guaranteed.

## Acceptance tests
- Offline: save Fuel, Expense, Daily Progress and reopen app; drafts preserved.
- Offline duplicate tapping: only one outbox operation.
- Connection restore: exactly one remote transaction for each operation ID.
- Session expired: no uncontrolled uploads, show login.
- Pilot revoked during offline: server rejects, UI explains without silently losing personal draft.
- Form changed offline: either validate against server-accepted version or present migration/conflict.
- Two Owners update same expense: conflict not overwrite.
- Switch vehicles mid-sync: cached totals never contaminate other vehicle.
