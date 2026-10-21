# Supabase SQL reference

`001_core_schema.sql` is an **initial development schema starting point**, not a declaration that all three Codex stages are already migrated. Codex should inspect and reconcile it when writing chronological executable files under `supabase/migrations/`, extending tables/policies for Fuel, Expenses, Progress, Documents, Reminders, Offline idempotency, and audit.

Never run SQL directly on a production project without review, local migration tests, row-security tests, and a backup. The SQL file is intentionally stricter than a mock and uses RLS to prevent direct unauthorized membership changes, but it is **not** a substitute for Stage 3 integration and adversarial verification.
