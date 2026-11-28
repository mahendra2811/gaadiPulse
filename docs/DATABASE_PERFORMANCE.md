# Supabase database performance and operations

## Changes in migration 006

`202611280006_query_indexes.sql` adds vehicle-scoped cursor/history indexes for fuel, expenses, progress and meter readings; membership/grant lookups for RLS helpers; and linked-meter, expense-item and maintenance lookup indexes. It runs `ANALYZE` on the affected tables so PostgreSQL refreshes planner statistics after the indexes are created. Existing indexes and unique constraints are retained to avoid risking unmeasured query paths.

The migration also replaces `fuel_history_page` without changing its signature, grants, invoker security, filters, counts or total. The filtered CTE now projects only the eight columns returned to the client rather than carrying every `fuel_logs` column. The endpoint remains bounded at 100 rows. Existing expense history remains cursor-paginated and bounded at 100 rows; raw meter reads already select a small explicit column list and use server-side ranges.

The full financial read RPC is still offset-paginated and can return up to 500 records because dashboard/report consumers currently need the full payload and total count. Do not change its response shape or lower its limit until those consumers move to aggregate and cursor APIs and product behavior is checked. The fuel date filter derives local dates from JSON timestamps and each vehicle's time zone; a matching expression index is unsafe until legacy payloads are validated. See the verification query below before proposing a normalized timestamp migration.

## Existing integrity and transaction guarantees

- Fuel, expense, meter-event, reminder, document and progress tables enforce one `(vehicle_id, client_operation_id)` per operation.
- Active meter readings enforce uniqueness on `(vehicle_id, reading_type, observed_at)` with a partial unique index.
- Maintenance records enforce one-to-one expense linkage; expense categories enforce unique labels per vehicle.
- `save_record`/`save_record_v2` write the main record, operation receipt, meter observations, expense items and maintenance linkage inside one database function transaction. Do not split those writes into client-side requests.
- RLS policies and security-definer authorization helpers were not rewritten in this pass. Indexes support their membership and grant lookups; authorization changes require a separate security review.

## Explain plans on a real database

The PGlite migration test runs `EXPLAIN (ANALYZE, BUFFERS)` for a vehicle-scoped history query to catch SQL errors. Its tiny fixture cannot prove that the production planner chooses an index. Run these against a staging/production clone with representative data, using a read-only role and the same predicates as the application. `EXPLAIN ANALYZE` executes the query, so avoid arbitrary writes or expensive broad scans.

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, created_at
FROM public.fuel_logs
WHERE vehicle_id = '<vehicle UUID>'
  AND status <> 'ARCHIVED'
ORDER BY created_at DESC, id DESC
LIMIT 30;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, created_at
FROM public.expenses
WHERE vehicle_id = '<vehicle UUID>'
  AND status <> 'ARCHIVED'
ORDER BY created_at DESC, id DESC
LIMIT 30;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, reading_type, observed_at
FROM public.meter_readings
WHERE vehicle_id = '<vehicle UUID>'
  AND reading_type = 'KM'
  AND status = 'ACTIVE'
ORDER BY observed_at DESC, id DESC
LIMIT 1;

-- Check whether existing fuel payloads are safe for a normalized timestamp/index.
SELECT count(*) AS invalid_event_at_rows
FROM public.fuel_logs
WHERE coalesce(payload->>'event_at', '') = ''
   OR (payload->>'event_at') !~ '^\\d{4}-\\d{2}-\\d{2}T';
```

Record actual plans, row counts, execution time, shared buffer hits/reads and database size in the release record. Recheck after a representative data load. Remove or consolidate indexes only after observing write overhead and index usage in Supabase; indexes consume storage and add work to every write.

## Backups and recovery

Backup retention/PITR is configured at the hosted Supabase project level and cannot be enabled by a SQL migration. Before production migrations, confirm the plan's available backup/PITR window and retention, and create an encrypted, access-restricted pre-change backup according to the data-handling policy. For a logical dump, use a secure operator environment and never commit the dump or expose credentials in logs:

```sh
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" --file=gaadipulse-pre-migration.dump
```

For recovery, restore the backup into an isolated project/database first, verify migration history, row counts and representative owner/Pilot RLS behavior, then follow the incident runbook to decide whether a hosted point-in-time restore is required. A successful dump is not a tested recovery: schedule and record a restore drill. Keep migration files as the version-controlled schema source; take a backup before roll-forward deployment and prefer forward fixes over destructive resets.

## Usage, storage and connection management

Review Supabase project reports for database size, table/index growth, CPU, I/O, active connections, cache hit ratio and API request/error volume. Establish a normal-traffic baseline before setting alerts; inspect slow-query/Query Performance reports for high total time and repeated scans. Investigate sustained growth, lock waits, connection saturation, or a cache-hit decline against that baseline. Check index usage and table sizes before adding more indexes.

The Expo app calls Supabase over HTTPS through PostgREST; it does not open or retain PostgreSQL connections, so a client-side pool is neither applicable nor safe. For trusted server-side workers/Edge Functions that need direct PostgreSQL access, use the connection string and pool mode recommended for that runtime by Supabase (transaction pooling for high-churn/serverless workloads when session features are not needed). Keep database credentials server-side only. Do not embed a direct connection string or service-role key in the mobile bundle.

## Release verification status

- Local PGlite migration chain and the `EXPLAIN ANALYZE` smoke query: verified by `tests/migrations.test.ts`.
- Production/staging query plans, live database size/usage, hosted backup/PITR configuration, restore drill, and connection-pool saturation: not verified from this checkout. Complete these against the target Supabase project before relying on production performance or disaster recovery claims.
- Supabase CLI and Docker were not available in the local environment during this pass; no hosted migration was applied.
