# Insights page: data, charts and export plan

Status: proposal based on the repository as inspected on 5 November 2026. This document does not add the page or API. Availability below means the app has fields or building blocks, not that a particular vehicle has enough records or that a chart already exists. No production data was inspected.

## Goal and entry point

Create `/insights`, focused on the active vehicle, with an optional comparison of vehicles the signed-in user can access. Add an Insights entry in More and contextual links from vehicle, Fuel, Expenses and meter history where appropriate. Keep the existing four bottom navigation tabs. The screen can have a bottom export action above the safe area; it must not obscure the last chart. Use the existing vehicle switcher and preserve the selected vehicle when entering and leaving.

Default to a useful overview rather than showing every chart at once. Sections: Overview, Fuel / charging, Distance / hours, Expenses, Compare, and Data quality. Show only applicable charts: e.g. KM charts for KM/BOTH meters, hours charts for HOURS/BOTH, and expense category charts only for categories represented in the selected data. A section with no usable data should explain what is missing and link to the relevant entry screen. Each chart needs an accessible text/table alternative, explicit units, date range, legends, point details, and a link to its underlying permitted records.

## Data available in the code

| Source | Existing data / behavior | Implication |
| --- | --- | --- |
| Vehicles and membership | Vehicle identity, category/subtype, energy profile, meter mode and timezone; access is per vehicle. | Scope the page and compare only authorized vehicles. Category and energy profile are context, not a guarantee of fuel records. |
| `fuel_logs` | Event time, amount in paise, quantity, unit (L, KG or KWH), energy type, full/partial flag; optional station, payment method, notes and readings with observation time. Status and revision are stored. | Purchases and prices can be graphed by event time. Valid efficiency needs more than a single fuel record. Hybrid vehicles can have different energy types and units. |
| `expenses` | Event time, title, category, amount in paise, optional vendor, payment, notes, reading, items and EMI principal/interest. Built-in categories are in `src/features/records/schema.ts`; a per-vehicle `expense_categories` table also exists. | Group actual populated categories, including Other/unknown. Confirm the currently supported custom-category workflow before promising category management. Items break down a parent expense; do not add them to its total again. |
| `meter_readings` | KM/HOURS, actual observation time, entry time, source, status and reset marker; readings can be independent or linked to records. | Chart observed readings and defensible intervals; use active corrected observations and handle resets, anomalies and gaps. Do not also count linked `meter_events` as extra observations. |
| Reports and utilities | `fuelIntervals`, `measuredIntervals`, `expenseAccounting`, paginated record/observation reads, and `/reports` with basic JSON, CSV and text-summary PDF export exist. | Reuse and verify these building blocks; insights, chart exports and XLSX are not already implemented. Existing reports calculate fuel intervals after date filtering, so do not assume that preserves a prior full-fill anchor. |
| Reminders and documents | Date/meter thresholds and document metadata are available subject to permission. | Optional future context for maintenance and renewal; not evidence that maintenance was performed or a prediction. |

The ledger stores paise and current display is INR-oriented; the multi-currency work is a separate plan, not an implemented basis for exchange-rate comparisons. Historical values may be missing, corrected or archived. Use only authorized, active records under the applicable history policy; show a clear incomplete-data state instead of treating denied, failed or unloaded data as zero.

## Global controls and interaction

- Vehicle selector; period presets: this week, last week, this month, last month, last 3/6/12 months, year, all time, and custom start/end. Monday–Sunday weeks in the selected vehicle's timezone; show the exact dates. Use half-open time boundaries internally and respect daylight-saving changes.
- This week/month are to date; compare against an equally elapsed previous period when explicitly selected, or label a full previous period clearly. Next week has no observed actuals yet: show “Upcoming — no actual data” and any user-requested forecast separately labeled with method and uncertainty; do not fabricate future results.
- Chart-specific controls: grouping day/week/month/year; fuel type/unit; expense category; cash vs operating cost; KM vs HOURS; value vs change; chart/table toggle. Display only options supported by the data. Persist selection locally if useful, and reset incompatible filters visibly on vehicle switch.
- Tap a point/segment for value, units, period, sample count and data-quality label; open the corresponding filtered history. Values should remain readable without relying on color. Support large text, screen readers, keyboard/web interaction and reduced motion.
- Load, empty, insufficient data, unavailable permission, and failed query states are distinct. Provide retry, and never display a partial sum as a complete total. Label excluded categories or vehicles and the reason when disclosure is permitted.

## Calculations and rules

1. **Period spend:** sum active fuel purchases and expense parent amounts by their event time. Show fuel, other expenses and combined cash outflow separately. Calculate operating, financing, principal and unclassified amounts consistently with `expenseAccounting`; show unknown EMI split as unclassified. Expense items are details of the parent and maintenance links are not additional expenses. A zero is valid only after an authorized, complete query returns no matching rows.
2. **Fuel efficiency:** use full-to-full intervals with truthful readings at both fill times, including intermediate partial fill quantities; exclude invalid/nonpositive distances or hours, duplicate times, resets and incompatible energy/unit transitions. See `src/utils/fuelEconomy.ts`. Fetch the full-fill anchor before the selected range and enough subsequent context, then explicitly choose how intervals are assigned to a period; never pretend an interval spanning weeks is measured within a single week. Aggregate efficiency as sum of valid distance / sum of interval quantity, not the arithmetic mean of per-fill ratios. Hourly consumption is sum quantity / sum valid hours. Restrict quantities to the same physical unit and compatible energy type; multi-energy intervals cannot be attributed to one fuel without additional data. Show excluded interval counts and reasons. Review correction handling against authoritative observations before reusing the utility.
3. **Meter-based travel/use:** use chronological active observations and `measuredIntervals`, split at resets, and flag non-monotonic or ambiguous readings. Show measured interval totals with their actual start/end times. A precise calendar-week/month distance requires reliable observations at both boundaries; absent boundaries, show covered intervals and coverage, not an exact calendar total. Optional interpolation must be opt-in, labeled estimated, describe the assumption, and never bridge resets/anomalies or extrapolate beyond observations. A difference between current readings is not necessarily distance for the selected calendar period.
4. **Cost per distance/hour:** calculate only with compatible spend and measured travel/use over the same defensible interval; label cash or operating basis. Calendar purchase spend divided by a different period's distance is not a precise running cost. Fuel interval cost/km has its own full-to-full semantics and must not be presented as total ownership cost. Zero denominators yield unavailable, never infinity or zero.
5. **Price:** total amount / total quantity for a weighted average, per energy type and unit; preserve actual transaction price history and distinguish it from an unweighted mean. Costs are integer paise until presentation; specify rounding at the display/export boundary. Keep category, quantity and distance denominators visible.
6. **Missingness:** missing reading, incomplete tank interval, mismatched timestamp, negative delta, duplicate timestamp, reset, archived record, missing amount and mixed units have explicit exclusion reasons. Do not infer zero for missing values. Corrections or changed records invalidate affected intervals and all affected cached summaries.

For week/month efficiency, the recommended default is to show valid full-to-full intervals by their end date, labeled “intervals ending in period,” including their true ranges and coverage. This is not a measurement of fuel consumed solely inside that week. A calendar allocation would be a separate, explicitly estimated mode. All-time totals use the same inclusion rules; sums of overlapping or differently allocated periods must not be presented as independent totals.

## Chart catalogue

All charts below are candidates. Implement in priority order and show only when data, permissions and the denominator support a meaningful result. Charts are accompanied by sortable data tables and exact values.

| Area | Metric and visual | Requirements / meaning | Priority |
| --- | --- | --- | --- |
| Overview | KPI cards: total cash outflow, operating cost, fuel spend, other expense, measured distance/hours, valid efficiency | Indicate coverage and period basis; do not conflate estimates with observations. | P0 |
| Spend | Stacked columns by week/month: fuel and non-fuel spend | Transaction event dates; same currency; drill into records. | P0 |
| Spend | Category horizontal bars; optional donut for a small number of categories | Only populated categories; Other/uncategorized explicit; show amounts and share. | P0 |
| Spend | Expense history list/table with category, date, amount and search/filter | Parent records; page and drill into authorized detail. | P0 |
| Fuel | Efficiency line or dot plot for each full-to-full interval | KM/L, KM/KG or KM/KWH as applicable; true interval dates and valid weighted summary. | P0 |
| Fuel | Fuel/charging spend and quantity columns over time | Separate unit and energy series; purchases do not equal consumption in a calendar period. | P0 |
| Fuel | Unit-price line/scatter and weighted price summary | Amount / quantity, per energy and unit; optional station filter where populated. | P1 |
| Fuel | Fill timeline / full vs partial markers | Expose missing or invalid anchors and excluded intervals. | P1 |
| Meter | Observed odometer or hour-meter step/scatter timeline | Actual observation timestamps, source, corrections, resets and discontinuities. Separate axes/graphs for KM and hours. | P0 |
| Meter | Distance/use per observed interval bars | Actual interval bounds; calendar buckets only under the measurement/estimate rules above. | P0 |
| Meter | Weekly/monthly coverage timeline | Show boundary observations, gaps, reset and measured vs estimated segments. | P1 |
| Expenses | Monthly category stacked bars and category trend lines | Group selected categories; aggregate only same-currency amounts. | P1 |
| Expenses | Cash vs operating vs financing/principal/unclassified breakdown | These are accounting views, not all additive peers; show explicit reconciliation and EMI rules. | P1 |
| Expenses | Largest expenses, count and average per expense | Average is total / count, with filters and category context; no double-counted line items. | P1 |
| Expenses | Cost per KM/hour trend | Only matching measured windows and explicit cost basis; otherwise unavailable. | P1 |
| Fuel / meter | L/hour, KG/hour or KWH/hour interval plot | Valid full-to-full hours interval; same energy/unit. KM/unit and units/hour are different metrics. | P1 |
| Fuel / meter | Fuel interval cost per KM | Valid interval fuel amount / measured interval distance, not total expense per KM. | P1 |
| Comparison | Grouped bars of vehicle efficiency, spend, operating cost, distance or hours | Comparable unit, period and definition; per-vehicle coverage, permissions and sample counts. | P1 |
| Comparison | Multi-series monthly trend | Aligned periods with explicit timezone rule and missing values as gaps; limit selected vehicles for readability. | P1 |
| Advanced | Calendar heatmap of recorded spend or event count; cumulative spend line; category treemap | Convenience views of existing actual records, not extra facts. | P2 |
| Advanced | Fuel price vs efficiency scatter; spend vs distance scatter | Require enough compatible paired intervals; association is not causation. | P2 |
| Advanced | Maintenance category spend and time since last recorded service | Based on expense categories and actual event dates only; no claim of complete service history. | P2 |
| Advanced | Reminder timeline | Separate upcoming user-entered deadlines/thresholds from historical actuals; requires reminders permission. | P2 |
| Future | Forecast next-week/month use, spend or service needs | New model, minimum history, validation/backtesting, uncertainty and explicit opt-in required. Never label as actual. | Later |

## Multi-vehicle comparison

Select the active vehicle plus a small number of accessible vehicles. Resolve `reports.read` and relevant domain permissions independently for every vehicle and every metric, on the server as well as in the UI. Never infer hidden financial or historical information through aggregate totals, labels, tooltips, chart scales or exports. Recheck on refresh/export and remove or fail safely on revocation; do not silently substitute zero. Respect Pilot history restrictions and archived-vehicle read-only rules.

Compare like with like: same energy type and unit for efficiency/quantity, same meter type for utilization, and same currency and accounting basis for money. Display each vehicle's selected range, timezone, sample count and coverage; for a shared calendar comparison use an explicit chosen comparison timezone or clearly disclose per-vehicle local periods. Compare raw totals alongside normalized cost per measured KM/hour only where the matching interval is valid. A vehicle without enough data remains “insufficient data”; do not rank it. Never combine L, KG and KWH or compare KM/L to L/hour as if equivalent. Different classes of vehicle may be compared with a visible context label, not a claim of fairness.

## Export and sharing

A bottom Export button opens a sheet with selected vehicle(s), range, filters, applicable data/sections and format. Confirm the scope in the sheet and let users choose summary, chart data, detailed records or all permitted content. An export uses the same definitions and result snapshot as the display; include generation time, exact boundaries, timezone, units, selected filters, data coverage, exclusions, estimate labels and calculation version. Re-fetch/revalidate access before generating or sharing, and fail visibly if a required read fails or access changes. Generated files are sensitive: use private temporary storage, clear when practical, and avoid permanent public links or remote services by default. Once shared, the recipient controls their copy.

| Format | Use and proposed content | Current state / work |
| --- | --- | --- |
| PDF | Shareable report with summary, selected charts, tables, legends and methodology; paginate and support accessible text. | Basic text-only PDF exists through `expo-print`; chart rendering, layout and cross-platform QA are new. |
| CSV | Spreadsheet-compatible detailed records or separate summary/chart-data files, with header and units. | Existing records CSV and spreadsheet formula-injection escaping can be reused; improve scope/metadata. CSV is not a multi-sheet Excel workbook. |
| XLSX | Actual Excel workbook with Summary, Fuel, Expenses, Meter intervals, Chart data and Methodology sheets, as selected. | New workbook generation dependency or service needed; test on Android, iOS and web, handle safe cells, size and memory. Do not rename CSV to `.xlsx`. |
| JSON | Versioned machine-readable records, summaries, intervals, filters, units and quality metadata. | Existing basic JSON export is a starting point; define and version a documented schema. |
| PNG / image | Optional share of a single chart with title, range, unit and legend. | New capture/share implementation and accessibility alternative required; verify native and web. |

Never export records, columns, derived values or chart images the user cannot currently access. Escape CSV/XLSX formula-like strings; escape PDF HTML; test large files and error/cancel handling. Provide a clear warning if the OS cannot share a file instead of silently sharing only its text.

## Implementation approach

- Add `app/insights/index.tsx` as the route entry and place screen, typed models, calculations, hooks, charts and export adapters under `src/features/insights/`. Add navigation and localized copy using existing patterns. Reuse design tokens and `react-native-svg` where suitable; evaluate a maintained, accessible chart library only if it materially reduces work and supports Expo native and web. Provide tables regardless of chart choice.
- Initial implementation can use existing authenticated paginated reads, `vehicle_access`, and domain utilities for modest datasets. Query keys must include user, vehicle(s), permissions/scope, date range and filters; clear/rekey on user or vehicle change. Read enough context outside the selected period for full-to-full and meter intervals; paginate consistently and guard against changes during pagination. Avoid accidentally loading an unbounded garage history on the UI thread.
- For scale, introduce date-filtered, indexed, paginated SQL/RPC aggregation only after profiling. Define a versioned response contract for overview, buckets, intervals, coverage and exclusions. Do not ship a privileged endpoint that bypasses per-vehicle domain permissions or Pilot history restrictions. A server aggregate must enforce authorization for every input and prevent inference of restricted records, including multi-vehicle totals; use RLS/security-invoker where suitable or carefully audited security-definer functions. Add additive migrations, indexes and RLS tests if needed. Verify deployed schema/migration status before relying on it.
- Make calculations a single shared, testable domain layer or clearly version equivalent server/client logic; graph, table and export must use identical results. Handle stale cache, loading, partial errors and offline state explicitly. The existing app is online-only for authenticated reads; do not imply that a complete offline analytics cache exists.
- Phase delivery: P0 single-vehicle overview and reliable actuals; P1 trends, category breakdown and authorized comparison; P2 optional exploratory charts and enriched exports; forecasts only after a separate validated design. PDF/CSV/JSON reuse can accompany P0; real XLSX and chart-rich PDF need dedicated work.

## Acceptance and verification

- Check empty garage, one/multiple vehicles, KM/HOURS/BOTH, all energy units, populated/missing categories, multiple currencies if later introduced, long histories and narrow screens. Navigation preserves active vehicle and works with accessibility text sizes and screen readers.
- Unit-test full/partial fills, weighted ratios, anchor outside range, duplicate times, mixed fuel/units, reset/correction, missing readings, zero denominator, anomalous readings, interval crossing a calendar boundary, expense-item deduplication, EMI reconciliation, timezone/DST and current/previous/next week. Validate chart/table/export totals against the same fixtures.
- Integration and SQL/RLS tests cover owner, Pilot, restricted domain/history, mixed permissions across vehicles, revocation between view and export, inaccessible vehicles, pagination, query errors and no cross-account cache leakage. Test non-owner inference through comparisons and downloads.
- Verify export content, escaping, metadata, selected scope and opening files on Android/iOS/web; test offline, retry and canceled share. Run relevant typecheck, lint, unit and migration tests; perform real authenticated and device QA before release. Record what was actually verified.

## Decisions to confirm during implementation

- Whether the bottom Export action is persistent on all Insights sections or appears only in an overflow/sheet on small screens.
- Whether interval-ending attribution and Monday-start weeks should be user configurable; defaults above avoid silently allocating a multi-week interval.
- Whether comparison defaults to the active vehicle only or remembers a previous selection, and which timezone governs a shared comparison.
- Which export formats and advanced charts belong in the first release; real XLSX and forecasts require additional implementation and testing.
