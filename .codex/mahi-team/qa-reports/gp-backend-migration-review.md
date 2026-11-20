# Backend migration review

> Pre-deployment findings below were resolved by the 2026-11-21 rollout. See [production database rollout](production-db-rollout-2026-11-21.md) for the live migration record and outstanding authenticated acceptance checks.

`npx vitest run tests/migrations.test.ts tests/pilotAccess.test.ts tests/security.test.ts tests/currency.test.ts tests/recordMeterChronology.test.ts --maxWorkers=1` passed 21 tests. A disposable PGlite fixture simulated applying 001–012, 015 and 017 before the four missing migrations 013, 014, 016 and 018; it compiled and returned expected catalog checks. This is not hosted production verification. No live writes were performed.

- 013 preserves historical progress rows but revokes client progress access and removes two vehicle triggers. Confirm compatibility with installed clients before rollout.
- 014 adds permission-scoped `record_author_name`. Verify real RLS and authenticated REST on staging.
- 016 blocks record writes and details edits for archived vehicles; verify restore, corrections, linked reminders, deletion/anonymization, and operator maintenance.
- 018 adds INR-only currency fields and wraps `save_vehicle`; confirm actual legacy currency, client compatibility, grants, and function dependencies.

Before a production write, verify a recoverable backup, establish a production-like staging environment, reconcile migration history and schema drift, test the exact forward-only order and supported clients against real Auth/JWT/PostgREST, and review the complete plan. Do not reset data or mark missing migrations applied without establishing the schema state. Authorization is required for a production deployment.
