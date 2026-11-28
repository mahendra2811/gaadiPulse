# API and cache implementation — 2026-11-28

## Implemented

- TanStack Query remains the server-state layer. Vehicle-scoped keys start with `[userId, vehicleId, ...]`; profile and account deletion keys are `[userId, ...]`.
- Global query freshness is 30 seconds and garbage collection is five minutes. Explicit overrides: profile 5/30 minutes; vehicles 1/10 minutes; access permissions 15 seconds/60 seconds; records and fuel/expense history 30 seconds/5 minutes; latest readings 30 seconds/2 minutes; recent fuel 60 seconds/5 minutes; progress definitions 5/15 minutes.
- Native AppState updates `focusManager`, NetInfo updates `onlineManager`; active stale queries revalidate on foreground/reconnect.
- Transient reads retry twice with exponential 1/2/4-second delays (cap 8 seconds). Common auth/permission/validation failures do not retry. Mutations remain non-retrying.
- The shared fetch timeout is 20 seconds, preserves caller abort signals, and exposes `AbortError` plus `code: REQUEST_TIMEOUT`; known-offline requests expose `NETWORK_UNAVAILABLE` with localized recovery copy.
- Supabase abort signals flow into vehicle list, record list, financial history, meter history, profile, and recent fuel requests when supported by the request builder.
- Home prefetches only the 10-row `recent_fuel_activity` result after `fuel.read` is confirmed, keyed identically to the visible recent fuel query. No financial report datasets are prefetched.
- Pull-to-refresh is supported by the shared Screen component and enabled on Home, Garage, record histories, and meter history.
- Fuel, expense, and meter saves/reviews invalidate the affected user/vehicle data. Vehicle/member changes invalidate scoped vehicle/member data rather than every query.
- Logout and account changes cancel and clear all queries. Realtime membership changes cancel affected vehicle queries, remove private data on revocation, and refresh vehicle membership data.
- Record and meter history display the query cache's `dataUpdatedAt` time.

## Validation

- PASS `npm run typecheck`.
- PASS `npm run lint`.
- PASS `npx vitest run tests/onlineOnly.test.ts tests/migrations.test.ts tests/pilotAccess.test.ts --maxWorkers=2` (3 files, 14 tests).
- Request behavior verified in mocked/local tests; live Supabase cancellation, realtime delivery, reconnect behavior, and real authenticated refresh remain NOT TESTED.
- No migration or hosted database changes.
