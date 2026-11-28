# Performance audit and implementation — 2026-11-28

## Implemented

- Deferred reminder feedback / notification reconciliation until 350 ms after the first root render. The timer is cancelled on unmount; notification failures keep their existing retry UI. Expo Router already lazily evaluates routes in production, so no duplicate route-lazy mechanism was added.
- Decorative screen banners use Expo Image low priority, memory/disk caching, and no transition.
- Fuel and expense histories use the existing authorized `fuel_history_page` and `expense_history_page` RPCs. They fetch 30 rows per page with server filtering/count/total instead of downloading all records and slicing locally. Development-only sample data keeps its in-memory pagination.
- Meter history fetches the first 30 observations and fetches another page on Load more. Other full-history callers, such as insights, keep the full query path.
- Memoized the shared `HistoryRow`, the repeated row component in long histories.
- Query results remain fresh for 30 seconds and cached for five minutes, avoiding immediate refetch and repeated cold loading during quick navigation. Existing auth/account/vehicle query scope remains intact.
- Removed unused `expo-sqlite`, `@supabase/server`, and `@supabase/ssr` dependencies after confirming there are no source imports. Current product behavior is online-only.

## Checklist status

| Checklist item                                | Status / evidence                                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cold start and splash duration                | Root background work deferred; timings need native Android profiling and remain unmeasured.                                                                                 |
| Lazy loading heavy screens/components         | Expo Router production routes are already lazy-evaluated. Optional export/update modules are dynamically imported.                                                          |
| Rerenders and memoization                     | Memoized shared `HistoryRow`; no app-wide memoization without profiling evidence.                                                                                           |
| FlatList and large lists                      | Histories use compact row rendering, server pagination and bounded fetches. They do not use FlatList; virtualization needs device layout/accessibility QA.                  |
| Pagination and infinite scroll                | Fuel and expenses use 30-row server RPC pages; meter history uses 30-row incremental fetch.                                                                                 |
| Images, compression, caching, banner priority | Banners are low-priority cached Expo Images. Raster conversion was not attempted without native packaging/visual checks. Asset folder is 17 MB, including 6 MB subtype art. |
| Navigation and transitions                    | Expo Router/native screens are configured. Transition performance remains unmeasured on device.                                                                             |
| Unused packages/assets                        | Removed three unused dependencies. Remaining bundled assets are referenced by active UI or static vehicle catalog.                                                          |
| JavaScript/download size                      | Dependency removal should reduce install size; bundle and APK/AAB deltas were not measured.                                                                                 |
| Memory leaks and listeners                    | Deferred timer has cleanup. Existing subscription lifecycles are source-managed; runtime leak profiling is untested.                                                        |
| Expensive calculations off UI thread          | No current blocking calculation established by source review. Report export modules are dynamically imported; calculations operate on bounded loaded pages.                 |
| CPU, memory, battery                          | NOT MEASURED; needs Android profiler and representative data.                                                                                                               |
| Low-end Android                               | Startup background work and history fetches are reduced; physical device validation is NOT TESTED.                                                                          |

## Validation performed

- PASS `npm run typecheck`.
- PASS `npm run lint`.
- PASS `npx vitest run tests/migrations.test.ts tests/pilotAccess.test.ts --maxWorkers=2` (2 files, 3 tests).
- FAIL `npm test`: 23 files pass, 7 fail (100 pass / 7 fail). Failures include existing vehicle schema/meter-option expectations, offline error wording, and three PGlite tests exceeding the default 5-second timeout under the default 30-worker run. Not changed in this task.
- PASS targeted Prettier check for changed source/manifests.
- FAIL `npm run format:check`: 18 unrelated existing files are not formatted.
- PASS `npx expo config --type public`.
- PASS `npx expo export --platform android --output-dir /tmp/gaadipulse-performance-android-export`; Android Hermes bundle was 7 MB. Export lists 79 assets, including 43 subtype PNGs.
- NOT RUN: APK/AAB build/install, emulator/device smoke test, bundle composition analysis, cold-start/splash measurement, CPU/memory/battery profiling, visual list/transition QA.

## Remaining work for measured completion

1. Profile a release build on a representative low-end Android device for time-to-first-interactive, splash duration, JS heap, CPU and battery.
2. Run Expo Atlas/Metro bundle analysis and compare install size before/after dependency removal.
3. Produce appropriately sized WebP variants for the 43 vehicle subtype PNGs and oversized auth/onboarding art, then validate Android packaging and fidelity before replacing originals.
4. Evaluate FlatList/FlashList virtualization on Garage and history routes with real data and screen-reader/device testing.
