# Supabase schema rollout — 2026-11-21

## Target and data policy

- Verified the linked target was the selected existing project `pamuveulonnbjocfprxh` (`gaadiPulse`, `ap-southeast-1`, PostgreSQL 17.11).
- No project was recreated and no database reset, table truncation, or record deletion was performed. The existing 21 profiles, 17 vehicles, 19 fuel records, 7 expenses, and 93 audit events remain present.
- A permission-restricted local snapshot is at `/Users/pooniya0092/Documents/GaadiPulse-backups/2026-11-21/`. The schema dump and JSON snapshot cover the app-owned `public` schema; Supabase-managed Auth/Storage data is excluded. The snapshot was not restored as a rollback rehearsal.

## Changes applied

Ran `npx supabase db push --linked --include-all --skip-vault --yes` after a dry run and exact-order PGlite validation. Supabase reported successful application of:

- `202611050013_remove_daily_progress.sql` — progress routes/endpoints are retired; existing history/form rows are retained.
- `202611050014_record_author_name.sql`
- `202611050016_archived_vehicle_read_only.sql`
- `202611050018_currency_foundation.sql`
- `202611200019_recent_fuel_activity.sql`
- `202611200020_expense_history_page.sql` — new RLS-invoker keyset-paged expense query with full-scope count and paise total.

## Live catalog verification

- Migration history now has 20 entries, including all six migrations above.
- `record_author_name`, `recent_fuel_activity`, and `expense_history_page` exist with their expected signatures.
- `expense_history_page` is not SECURITY DEFINER; authenticated can execute it, anon cannot.
- Seven archived-record/detail guard triggers exist.
- Existing key app-data row counts match the pre-change snapshot.
- Anonymous PostgREST call returned HTTP 401 / SQLSTATE `42501` (`permission denied for function expense_history_page`), confirming the RPC is in the API schema cache and remains unavailable to anon. No record data was returned. Signed-in user acceptance with real JWTs remains untested.

## Validation and remaining checks

- PASS: `tests/migrations.test.ts` — both chronological full-chain and linked-project out-of-order application simulations.
- PASS: PGlite expense tests cover full totals, cursor pages, search, Pilot history scoping, and outsider isolation.
- PASS: full test suite — 102 tests; TypeScript; lint; Expo config; Android JS bundle export; `git diff --check`.
- FAIL: `npm run format:check` still identifies 20 files. No further unrelated bulk formatting was performed.
- Not run: real signed-in JWT/PostgREST user acceptance, device notification delivery, Android native release build, AAB signing, or Play Store submission.
