# Security architecture and current verification boundary

## Backend authority

Supabase Auth is the identity authority; PostgreSQL RLS and fixed-search-path SECURITY DEFINER RPCs enforce business rules. Roles belong to `(vehicle_id,user_id)`, not profiles. Helpers read real `auth.users` verification state. No grant resolution trusts a submitted user ID, client email or editable metadata.

Every application public table enables RLS. Vehicle/member/grant mutations and financial/progress workflows are RPC-only. Authenticated direct INSERT/UPDATE/DELETE grants are absent for protected entities. Catalog/category mutations are Owner RPCs. Audits and operation receipts are server-controlled.

Owners can assign existing verified users immediately or leave an unresolved normalized-email grant for later verified sign-in. No invitation acceptance is involved. Membership updates serialize on the vehicle, protect primary/final Owner, validate permission keys, and audit changes. Revocation blocks future writes and cache refresh. Reassignment updates/removes the previous assignment under the same protections.

## Financial and custom-field privacy

Fuel and expense SELECT policies require their own read permissions; create permission does not imply read. Expense line items and maintenance share their parent financial scope. Reports use only permitted records and reauthorize real exports. Money is integer paise; no service record or report-only progress currency is automatically counted as a second transaction.

Row security cannot redact selected JSON fields. Therefore direct authenticated SELECT on `daily_progress` and `progress_form_versions` is revoked. `read_progress_records` limits Pilots to their own submissions and removes Owner-only answers. `read_form_versions` removes private field definitions for Pilots. Private financial transaction notes are not copied into generally readable meter observations. PDF HTML is escaped and CSV cells protect formula-like values.

## Integrity

Writes validate units, quantities, dates, readings, line-item sums, EMI breakdowns, field types and date policies. Immutable form versions preserve historical interpretation. Revision/updated_at comparisons reject stale edits; payload hashes bind UUID operations to their original content. No destructive reset is used.

Approved progress adds independent observations; same vehicle/type/time conflicts require Owner review. Corrections retain old observations as CORRECTED and create replacements, or retract an invalid observation. A retracted timestamp is never silently backdated to a guessed time. Meter reset segments invalidate affected consumption intervals.

## Device and account lifecycle

SecureStore holds refresh tokens. SQLite caches have account/vehicle scopes and expiring authorization leases. Explicit logout clears user data; session expiry retains personal drafts while clearing live sensitive caches. Offline copies cannot be remotely recalled; see SYNC_PROTOCOL.md. Debug bypass is guarded by __DEV__ and writes only to a separate local namespace.

Deletion requests require a verified account and archiving protected administered vehicles first. Access is revoked immediately; new writes/memberships are blocked. The separately authorized operator Edge job bans/anonymizes the account and clears Auth identities/sessions after the configured retention period. Operational attribution UUIDs and shared ledger history remain under the operator's retention policy.

No upload buckets or public files are configured. Deferred attachment metadata cannot contain a file path and is not client-writable. No GPS/location, camera, microphone or broad storage permission is requested for these features. Export uses app cache and the system share sheet.

## Secrets

The client receives only project URL and publishable key. Service-role and deletion-job secret exist only as server environment variables. No private key, provider secret or signing credential belongs in .env public fields, a bundle, logs or an export.

## Verification

The Stage 1 baseline PostgreSQL fixture tests passed earlier. The later ledger, private JSON redaction, sync, correction and deletion migrations have NOT been executed or tested, per the user instruction. No current release-ready or live-provider claim is made. Run the full adversarial matrix in QA_TEST_MATRIX.md against all migrations and real Supabase REST/JWT sessions before release.
