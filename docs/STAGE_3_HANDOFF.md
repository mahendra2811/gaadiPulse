# Stage 3 implementation handoff — 2026-10-21

> Latest handoff: see “2026-11-03 — Online-only implementation handoff” at the end. Earlier offline/draft/cache descriptions are historical.

The requested three-prompt implementation is present in source, including the development sign-in bypass. This handoff records implementation, not release acceptance. The user explicitly instructed that testing be deferred. Current type, runtime, SQL, security, accessibility and native behavior remain unverified.

No Git revision is available: this workspace was not initialized as a repository during implementation. Original supplied material remains in `my docs/`.

## User-visible implementation

- Debug-only Continue in development mode enters a persistent, isolated local Owner workspace without provider configuration. Local test records never upload. Settings supports exit; production authentication remains verified email OTP and Google browser PKCE.
- Garage/category/subtype wizard, manual model fallback, KM/HOURS/BOTH, baseline observations, vehicle switching, drafts, archive/recovery and details.
- Fuel and expense forms, paise arithmetic, full/partial history, optional observed meters, analysis, category details, EMI classification, line items and linked maintenance.
- Canonical meter history with source/time, explicit counter resets, Owner corrections/retractions, measured intervals and qualifying full-to-full fuel analysis.
- Per-vehicle members, verified-email automatic grants, reassignment/revocation, protected primary/last Owner, Pilot defaults and member overrides.
- Immutable progress forms, templates, typed custom fields, constraints/defaults/options, visibility, reporting aggregation, Pilot preview, timezone/date policy, submission history and approval/rejection/correction. Owner record details expose the latest 100 server audit events with actor, timestamp and stored change context; this view is excluded from local development mode.
- Document metadata, official service reference, expiry; reminders with recurrence, complete/snooze and local notifications based on dates or actual readings.
- Authorized reports, member submission/status summaries, CSV/JSON and native PDF export source. PDF/share/notification device behavior has not been tested.
- Persistent personal drafts, scoped cache leases, idempotent foreground outbox, backoff, rejected/conflict recovery, local/server comparison, export/remove and last-sync status.
- Theme, English catalogs, disabled Hindi, profile/security/help/about, local pre-release legal content and account deletion request/operator anonymization workflow.

Actual routes are listed in [SCREEN_MAP.md](SCREEN_MAP.md). Shared record screens deliberately consolidate repeated ledger UI under `src/features/records/`; progress, members, meters, reminders and reports retain domain modules. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Database and privileged operations

Apply reviewed migrations in order; no existing production reset is required:

1. `202610210001_foundation.sql`: verified identity, profiles, garage, grants/membership, baseline observations, RLS, audit and vehicle writes.
2. `202610210002_records.sql`: ledger domains, line items/maintenance/categories, scoped reads, transactional record writes and receipts.
3. `202610210003_collaboration.sql`: immutable forms, submissions/review, sanitized reads, owner defaults, document/reminder scope and deletion requests.
4. `202610210004_hardening.sql`: serialized grant reassignment, correction history, payload/permission validation, protected notes, payload-bound vehicle receipts and privileged anonymization.

`supabase/functions/process-account-deletion` is an operator-authenticated job endpoint. It is not deployed or scheduled. The service key and job secret remain server-side. Auth schema assumptions must be verified against the target Supabase instance before use. Maintained database typings are in `src/types/database.ts`; regenerate against the actual deployed schema when tooling is available.

## Commands and evidence

| Activity | Status | Evidence/scope |
|---|---|---|
| Source formatting (`npm run format`) | Executed | Formatting only; does not validate types or behavior |
| Current TypeScript/lint/unit checks | NOT RUN | Deferred by explicit user instruction |
| Migrations 002–004 / combined RLS tests | NOT RUN | Deferred; no local Supabase CLI/Docker available initially |
| Current Expo export/native build | NOT RUN | Deferred; native dependencies changed since baseline |
| Google/OTP and real multi-account flows | NOT TESTED | Provider/project credentials not configured |
| Current Android boot/device UI | NOT TESTED | Earlier Stage 1 APK does not represent current source |
| Notification/share/PDF, accessibility/performance | NOT TESTED | Device/manual validation deferred |
| External deployment/Play publication | NOT DONE | Operator setup and release validation remain |

Stage 1's earlier passing checks are documented in [STAGE_1_HANDOFF.md](STAGE_1_HANDOFF.md) and cover only that earlier baseline. Existing tests were preserved; later domain/integration coverage still needs extension when testing resumes. No current security scenario is marked PASS.

## Known risks and remaining gates

The later source may contain typing, SQL, native integration or interaction defects because validation was intentionally deferred. Execute the documented QA matrix before relying on real shared/financial data. Prior dependency audit findings remain unresolved; review compatible updates without force-downgrading Expo.

The backend project, all migrations, verified Google/email provider configuration, signing/EAS setup, retention/legal/support information, anonymization-job deployment and Play Console release still require operator configuration. See [EXTERNAL_SETUP_AND_RELEASE.md](EXTERNAL_SETUP_AND_RELEASE.md). No credentials or signed release were fabricated.

Photo/file uploads, OCR, GPS/telematics, Hindi translations, payments and legal vehicle-title transfer remain explicitly outside the supplied Phase 1 scope. Document metadata is not proof of legal validity. Background execution and notification delivery are subject to Android limits.

## Resume development

Install the lockfile dependencies and start Expo. Open sign-in in a debug build and choose Continue in development mode, then create a vehicle to exercise local workflows. Rebuild the native development client after adding DateTimePicker, Print or Sharing. This is a development entry path, not a claim that the current source has been smoke-tested.

For real data, follow [LOCAL_SETUP.md](LOCAL_SETUP.md). When testing is resumed, use [QA_TEST_MATRIX.md](QA_TEST_MATRIX.md) and [FEATURE_ACCEPTANCE_MATRIX.md](FEATURE_ACCEPTANCE_MATRIX.md), correct any discovered defects, then produce a fresh device/release handoff with actual command evidence.

## Migration syntax recovery — 2026-10-21

Fixed the missing closing quote on the `title` JSON key lookup in `link_maintenance_reminder` in `202610210003_collaboration.sql`. This corrects the migration that failed to apply; existing successful migrations are unchanged. Added `tests/migrations.test.ts` to compile all chronological migrations against an embedded PostgreSQL Auth/role fixture.

PASS: `npx vitest run tests/migrations.test.ts` (1 test, all four migrations applied), `npx eslint tests/migrations.test.ts --max-warnings=0`, `npx prettier --check tests/migrations.test.ts`. A separate Node/PGlite run also applied all four migrations successfully. These checks do not validate hosted Auth or REST, nor execute every function body. No remote database changes, reset, Android build or full regression suite were run for this fix.

Operator next step: rerun `npx supabase db push --dry-run` and `npx supabase db push` against the already linked project. Successfully recorded migrations 001/002 should be skipped. Do not reset the database or mark the failed migration applied manually.

## Navigation and logout follow-up — 2026-10-21

Added `src/components/navigation/PageHeader.tsx`, `src/components/navigation/routes.ts`, `src/features/auth/SignOutButton.tsx`, and `tests/navigation.test.ts`. Updated shared Screen/ConfirmDialog, More/Settings/Profile, vehicle wizard/details, record form/detail/analytics titles, maintenance and meter-history entry labels, and English catalogs. Sign-out is visible at the top of More and remains in Settings; errors offer retry and submission is disabled while running. Header Back honors the stack and existing form removal guards; wizard steps override Back. Direct-link parent fallback and readable domain labels replace reliance on route IDs. Maintenance creation defaults to SERVICE without overriding restored drafts. Two existing typecheck blockers were corrected: native Appearance system override now uses `unspecified`, and the missing permissionDenied translation was added.

Validation:
- PASS `npm run typecheck` (also repeated after final source changes).
- PASS `npm test`: 6 files, 34 tests, including 5 navigation parent/root cases and the migration compilation regression.
- PASS targeted ESLint with `--max-warnings=0` for PageHeader/routes, shared UI, SignOutButton/settings, garage form/screens, records screens/copy, reports, navigation tests, root layout and i18n.
- PASS targeted Prettier check on all changed TypeScript files, including meter history.
- PASS `npx expo export --platform web --output-dir /tmp/gaadipulse-navigation-web`.
- FAIL full `npm run lint`: Dashboard render-time Date.now, Builder effect state reset, notifications AndroidImportance namespace; garage hooks duplicate imports and unused meter-history symbols also remain. Shared UI unused imports, settings unused suppression and report unused import reported in the first full run were cleaned up. Full lint was not rerun after that cleanup; targeted lint passes as above.
- NOT RUN: browser/device interaction, physical Android back/keyboard/TalkBack checks, Android build. No database/migration changes in this follow-up.

Manual QA remaining: More → Garage/Reports → top Back returns to More; More → Add vehicle → wizard step Back → Save returns to More; a vehicle detail → Add meter/maintenance preserves that vehicle; direct-linked analytics → top Back reaches its record list; dirty-form Back cancel preserves values; More → Sign out → cancel/confirm and failed-network retry on web and Android. Hosted sign-out and deletion of scoped caches need real-session verification.

## Implementation continuation — 2026-10-21

Scoped the progress builder editor by account/vehicle key so changing vehicle remounts its draft, preview and option state. Removed the effect-driven ready reset; failed draft loads remain blocked from publishing until retried. Load/save/publish failures now retry the relevant operation rather than merely dismissing the message. Async load errors from an unmounted editor are ignored.

Added `src/hooks/useCurrentTime.ts` for minute and foreground refresh of dashboard date/overdue labels. Reminder reconciliation refreshes after foreground return, guards scheduling behind reminder read access, suppresses stale meter thresholds after an authorization/read failure, and exposes read/scheduling retry actions with errors scoped to the current account/vehicle. Consolidated duplicate garage query imports, removed unused meter-history imports, and used the exported AndroidImportance enum directly.

Executed source formatting only (`npm run format` and targeted Prettier write). No tests, lint, typecheck, database changes or native builds were run in this continuation, honoring the user's testing deferral. Earlier follow-up checks above do not validate these new changes. Real device reminder behavior and rapid vehicle-switch/draft recovery remain unverified.

## Updated supplied artwork — 2026-10-24

Imported the user's current `my docs/assets/` into root assets. Replaced the old subtype folder and removed its twelve obsolete SVG silhouettes. Integrated the supplied static registry and 43-image v2 catalog, adapting the catalog to existing five category IDs without migrating vehicle data. Added `subtypes.ts` and a two-column VehicleSubtypeSelector with common/all choices, search, accessible selection and manual Other input. New vehicles require explicit subtype selection; category changes clear incompatible selections. Meter suggestions remain editable and energy/model are not inferred from pictures.

Garage cards, details, wizard review and vehicle header/switcher use the selected subtype image. Unknown stored/custom subtypes use Other. Updated asset import scripts preserve the new PNGs rather than recreating old starter art. Source pack remains untouched. See ASSETS.md for provenance and cache/rebuild notes.

Only asset/source inspection, copying, integration and formatting were performed. Testing/typecheck/lint/build/device QA remain deferred by user instruction; no visual runtime acceptance is claimed.

## Home, navigation and Garage UI refresh — 2026-10-24

Implemented colorful tonal icon badges, SVG gradient surfaces, shallow elevated cards, compact text actions, motion press feedback and a system reduced-motion hook. Home presents vehicle context, observed meters, monthly confirmed spending, compact entry actions, expandable additional tools/activity and reminder rows. Permission gates and confirmed/pending accounting rules are preserved.

More tab presses now open a right drawer (82% width, capped at 460dp), grouping quick actions, vehicle tools, owner options and account/support. Deep links to More redirect to Home and open the drawer. Added MoreDrawer/TabLayout under src/components/navigation and MoreMenu under src/features/navigation; app route files remain entrypoints. Existing sign-out confirmation and error retry are reused.

Garage cards now use contained square art, concise captions/badges and card-level navigation in a tight grid. Category selection uses the current subtype pack. Add/Edit Vehicle has a six-stage indicator, step validation, compact wrapping choices/suggestions, labeled review, scroll reset by stage and a raised gradient footer. Shared page headers are shorter and keep Back next to the title. Screen supports compact spacing and avoids the former 140dp trailing padding when a fixed form action is present.

User reported two UI errors during this work: missing useEffect in Expandable and native accessible={false} leaking onto a web SVG. Added the explicit React hook import and moved decorative accessibility suppression to the surrounding React Native View, removing the SVG prop. These are source fixes, not runtime verification.

Executed targeted Prettier write commands on changed source. No tests, lint, typecheck, database operations, native builds or browser/device QA were run, preserving the user's testing deferral. UI/route/animation/accessibility regressions remain possible until checked. No new dependency was installed.

## Secondary-page UI and picker follow-up — 2026-10-24

Preserved Home's layout. Moved MoreDrawerProvider above the root stack so every browsing route can open More, changed the panel to slide from left to right at 75% width (capped at 460dp), and rounded its right edge. Extracted DrawerContext and FloatingNavigation; tabs and secondary browsing screens share the same bar. Lists, details, reports, maintenance, meter history, members and ordinary settings retain navigation. Entry/edit forms, vehicle wizard, form builder, profile/security and Auth omit it; the bar hides while the native keyboard is open. Existing tab-press events and scoped route parameters remain in use.

Added reusable SearchField (icon, focus state, clear action), FilterChips, InfoRows and RecordCard/RecordSummary. Fuel, expenses, meter events, progress, reminders and documents now share compact record presentation with domain icon colors, real status badges, dates and permitted values. Period controls are horizontal chips; extra filters are expandable. Record details reuse the list card, retain bound vehicle context and show structured metadata/expense items rather than raw JSON. Form choices wrap; Save actions use a compact footer. Maintenance reuses expense cards. Settings, member administration and meter history use the same icon/row conventions; advanced grant/default permission controls are expandable. Secondary headers use a subtle surface background and border.

Replaced raw ISO date editing with platform date/time fields: Android calendar and clock dialogs, an iOS picker sheet, and native browser date/time inputs. Date-only progress/custom/metadata fields preserve date strings; timestamp fields still emit ISO instants. Added exported picker props/value helpers and lazy native loading; no new package was installed. Restored the meter-history interval helper import and restrict its calculation to active observations.

Executed targeted Prettier write commands only. No tests, lint, typecheck, database operations, browser automation, export or native build were run under the user's continuing testing deferral. Calendar/clock native module availability, navigation/deep links, actual 320–430dp layouts, large text, keyboard, drawer focus/Back, and permissions still require runtime verification. No backend policy or migration was changed.

Form-builder field editors are also collapsible, with compact type/aggregation chips and consistent spacing. Definitions/defaults/visibility and immutable publish behavior were retained; only the editor presentation changed. Source formatting completed; no runtime validation was performed.

Shared browsing scroll clearance now also accounts for safe-area bottom and system font scaling so the floating bar has space above long content. Export text actions display their busy/loading disabled state. Device verification of this clearance remains pending.

## Fuel compatibility, dialogs, timestamp cards and toast — 2026-10-24

Added shared vehicle configuration/physical-fuel policy in src/features/garage/energy.ts. Vehicle create/edit supports petrol+CNG, petrol+LPG, plug-in/petrol/diesel hybrids, pure LPG/CNG, hydrogen, electric and Other as well as diesel/petrol. Fuel add/edit exposes only configured fuels and automatically fixes L/KG/KWH. Draft restore, vehicle switch, Save-and-add-another, local persistence and server writes now follow this policy. Existing historical physical fuels are retained instead of silently rewriting transactions. Added additive migration `202610240005_vehicle_fuel_profiles.sql`; existing migrations/data were preserved. See FUEL_CONFIGURATION.md. This migration has NOT been executed or deployed.

Replaced window.confirm/native Alert confirmation with a shared, themed modal host. Vehicle and record form exits offer Keep editing/Leave form; they flush the latest local draft before navigating, stopping navigation on a write error. Form builder exits/switches also flush drafts; Profile confirms discarding unsaved edits. Other existing archive/revoke/sign-out confirmation calls reuse the same UI. Browser-controlled refresh/tab-close prompts cannot be themed; this custom dialog handles in-app navigation.

Added dateDisplay helpers and Timestamp/TimestampRange components: human-readable dates with calendar/clock icons and explicit 12-hour AM/PM time, using the vehicle timezone where available. Record cards, measured/fuel intervals, meter history, grant/version/audit/draft/sync displays use readable timestamps; persisted/exported ISO values are unchanged. Meter ReadingCard is now compact, with reading/source/status, expandable entered-time/correction details, KM/HOURS filters, pagination and collapsible measured intervals. No observation values or timestamps were fabricated.

Toasts now hug their content (maximum 360dp or available screen width), use a small domain-status icon, two-line text and an X close target. Each new message restarts a three-second timer; close/unmount clears it and earlier timers cannot dismiss a newer message. Accessible announcement and success haptics remain.

Validation: targeted Prettier writes completed; `npm run typecheck` passed after the final source updates. The first typecheck caught an incorrect local repository import, which was corrected before subsequent passing checks. No test suite, SQL migration run, lint, native build or deployment was performed. CUA reported no connected browser for the supplied localhost route, so child-page runtime/visual verification remains unavailable. Manual browser/device checks are still needed for dialogs, timestamps, fuel profile changes and toast timing/layout.

## Replacement compact feedback — 2026-10-24

Removed the former inline toast state/render block from the UI barrel. New `src/lib/toast.ts` owns message identity, replacement and a real three-second deadline; `ToastHost.tsx` renders a content-sized, centered, neutral pill with a colored icon, centered small text, X and countdown line. A new message cancels the old deadline; dismiss/unmount clears it. Reduced motion disables the countdown animation while retaining automatic dismissal. Existing useToast calls remain compatible.

Replaced the large ConfirmationHost panel with a shorter icon-led dialog, centered title/body, X and compact explicit decision actions. Confirmations do not auto-accept or expire. MoreDrawer keeps its requested left/75% behavior but now has a compact centered icon/title/close header.

notifications.ts now tags reminders by account and presentation version and uses compact reminder toasts in the foreground. Matching foreground notifications suppress the duplicate system banner/list presentation. Background reminders retain OS notification styling, support system dismissal, and preserve scheduling. New presentation metadata is reconciled for existing active reminders on their next refresh; no notification permission prompt is added by the listener. Account changes unregister the listener.

Validation: targeted source formatting and `npm run typecheck` passed. Test suites, device/browser visual checks, OS notification delivery and native builds were not run. Background OS notifications cannot use the app's custom width/alignment or three-second toast timer.

## 2026-11-03 — Add Vehicle responsive refinement

Added `src/features/garage/VehicleChoiceGrid.tsx`; updated `VehicleForm.tsx` and `VehicleSubtypeSelector.tsx`. All six sections have a centered 640dp content limit. Category/subtype cards use measured responsive columns, square contained images and wrapping label space, without stretching the final card across the row. Catalog suggestions are collapsible; timezone and initial readings remain under Additional options. Review title falls back to subtype when optional identity fields are empty. No migrations or persistence changes.

Executed checks for this change:
- `npm run typecheck` — PASS.
- `npx eslint src/features/garage/VehicleChoiceGrid.tsx src/features/garage/VehicleForm.tsx src/features/garage/VehicleSubtypeSelector.tsx --max-warnings=0` — PASS.
- `npx prettier --write src/features/garage/VehicleChoiceGrid.tsx src/features/garage/VehicleForm.tsx src/features/garage/VehicleSubtypeSelector.tsx` — PASS.
- Browser visual inspection — BLOCKED: in-app browser provider unavailable in this session. Mobile/web visual QA and Android build smoke test were not run. No SQL changes; SQL tests not run for this presentation-only change.

## 2026-11-03 — Compact category/subtype card correction

Updated `src/features/garage/VehicleChoiceGrid.tsx`: removed outer photo padding, isolated contained images in square frames with absolute-fill positioning, reduced caption space from 44dp to a 24dp minimum/approximately 10% of card height, and prevented row stretching. Long captions and accessibility text may increase caption height. Applies to every category and subtype through the shared grid; other wizard sections and persistence unchanged. Decisions recorded in `docs/DECISIONS.md`. No migrations added.

Validation: `npm run typecheck` — PASS after correcting an initial unsupported `StyleSheet.absoluteFillObject` reference to `StyleSheet.absoluteFill`; targeted ESLint with `--max-warnings=0` — PASS; targeted Prettier check — PASS. Browser visual inspection — BLOCKED (CUA returned “No browser is available” for localhost). Unit/SQL tests, Expo export/config and Android build not run for this presentation-only correction. Runtime visual acceptance remains pending on web and Android.

### Image bounds follow-up

The compact card's absolutely positioned Image still inherited the bundled asset's 512×512 size on React Native Web. Added explicit `width: "100%"` and `height: "100%"` to override intrinsic dimensions, confining the entire contained vehicle illustration to its square section without changing card sizes or mappings. `npm run typecheck` and targeted ESLint — PASS; targeted Prettier write — PASS. Browser/device visual verification remains unavailable and was not performed.

### Final review card image correction

Updated `VehicleForm.tsx` final review thumbnail with explicit 96dp width and height, preventing intrinsic asset height from stretching the review card on web. Disabled thumbnail shrinking and allowed the adjacent identity text to wrap within available width. Existing card data and save behavior preserved. Targeted Prettier write, targeted ESLint and `npm run typecheck` — PASS. Browser/Android visual checks not performed; no connected browser available in this session.

## 2026-11-03 — Garage and shared vehicle card audit

Added `src/components/ui/SquareArtwork.tsx`. Updated Garage grid (`screens.tsx`), category/subtype grid, final wizard review and shared VehicleHeader/switcher to use bounded square contained artwork. Garage now measures responsive columns, avoids stretched final cards, places identity/type/access details below the photo and falls back to subtype when optional identity is absent. Summary/review text follows the artwork. Inspected all remaining Image uses: onboarding and empty states already specify both dimensions. No persistence or migration changes.

Executed: `npm run typecheck` — PASS; targeted ESLint on all five changed/new TSX files — PASS; targeted Prettier write — PASS; `npx expo export --platform web --output-dir /tmp/gaadipulse-square-cards-web` — PASS. Browser/device interaction remains unverified (no connected browser in this session). Unit/SQL tests and Android build not run for presentation-only changes. Actual small-screen/large-text layout still needs visual acceptance.

## 2026-11-03 — Remove global development notice

Removed the development/local test data/authentication bypass banner above the app header in `app/_layout.tsx` and its unused `developmentBanner` translation in `src/lib/i18n.ts`, as explicitly requested. Development session behavior and actual authentication/sync error recovery are unchanged.

- `npx eslint app/_layout.tsx src/lib/i18n.ts --max-warnings=0` — PASS.
- `npm run typecheck` — PASS.
- Device/browser visual QA and Android build not run for this small notice removal.

## 2026-11-03 — Header vehicle switcher

Added `src/components/navigation/HeaderVehicleSwitcher.tsx` and integrated it into `PageHeader.tsx` outside auth routes. Compact nickname/registration-first label, vehicle icon and swap icon share one press target. Label uses single-line end truncation and a 43% maximum header width. Sheet lists non-archived vehicles with artwork, role, registration and current selection. Selecting updates the existing active vehicle store. One-vehicle accounts show the label without a switch icon. Page title also truncates to prevent horizontal overlap.

Checks executed: `npm run typecheck` — PASS; targeted ESLint on both header files with `--max-warnings=0` — PASS; Prettier on both files — PASS. Device/browser visual QA and Android build smoke test not run. No migrations or backend changes.

## 2026-11-03 — Centered header vehicle picker

Replaced the bottom Sheet in `HeaderVehicleSwitcher.tsx` with a centered transparent Modal. Dialog width is capped at 420dp and height at 80% of its safe-area container. Only the vehicle list scrolls; Switch vehicle title and Cancel stay outside the scroll region. Backdrop press, Cancel, Android back (`onRequestClose`) and accessibility escape dismiss the dialog. Vehicle selection continues to update the existing store and close the dialog.

`npm run typecheck` initially failed because this React Native version exposes `StyleSheet.absoluteFill`, not `absoluteFillObject`; corrected. Final typecheck, targeted ESLint with zero warnings, and targeted Prettier check all PASS. Visual browser/device QA not run.

## 2026-11-03 — Focused bike/car rollout implemented

Latest user direction supersedes the broader first-release product surface. Full plan and paused-feature register: `docs/FOCUSED_RELEASE_PLAN.md`; linked from README. No domain implementation, migration, ledger, membership or draft was deleted.

Added `src/features/release/scope.ts`, `DeferredFeature.tsx`, and `tests/releaseScope.test.ts`. Updated advanced route wrappers under `app/owner`, `app/progress`, `app/reports`, `app/maintenance`, `app/records`; RootLayout notification lifecycle; Dashboard, MoreMenu, VehicleForm, garage screens, record screens/hooks, reminder hooks, settings, FloatingNavigation and English i18n. `advancedTools=false` suppresses Daily Progress, builder/versions, members, approvals, docs, reports/analytics/export, audit panels, maintenance shortcuts and reminders. Direct route wrappers render a deferred screen without mounting advanced domain views. No backend access rules are weakened. Previously scheduled local notifications are cleared with visible retry on failure; existing queued records still synchronize under server checks.

Bike/car setup uses KM-focused choices. Deferred category selection opens a modal without changing category, and Continue/save guards restored unsupported drafts. Existing unsupported histories remain readable; new record forms are deferred. Electric-only mapping already selected ELECTRIC/KWH; retained that behavior and added Charging tab/Home/form/list labels and explicit kWh/kg/L quantity and rate labels. Conventional and plug-in hybrid choices are preserved separately.

Commands actually executed:
- `npm run typecheck` — PASS on final source.
- `npx eslint app src/features/release src/features/dashboard/Dashboard.tsx src/features/navigation/MoreMenu.tsx src/features/garage/VehicleForm.tsx src/features/garage/screens.tsx src/features/records/screens.tsx src/features/records/hooks.ts src/features/auth/settings.tsx src/features/reminders/useReminders.ts src/components/navigation/FloatingNavigation.tsx src/lib/i18n.ts tests/releaseScope.test.ts --max-warnings=0` — PASS.
- Prettier write commands on changed app/source files and the new test — PASS.
- `npm test` — FAIL: 6 test files passed, 2 failed; 35 tests passed, 1 failed. `foundation.test.ts` could not resolve `@/src/utils/formInput`; `migrations.test.ts` reported PostgreSQL syntax error at end of input. These blockers are outside the modified presentation/scope code. No migrations changed.
- `npx vitest run tests/releaseScope.test.ts` — PASS, 3 tests. Covers focused/deferred boundaries, restoration flag and electric/hybrid/gas unit mapping.
- `npm run lint` — FAIL: 25 warnings, including two initial unused modal variables subsequently corrected and existing import/unused warnings across unrelated files. Final targeted lint above passes; no full-repository pass claimed.
- `npm run format:check` — FAIL: 9 existing files outside this change remain unformatted (shared UI primitives and VehicleChoiceGrid). No unrelated reformat performed.
- `npx expo export --platform android` — PASS, Hermes bundle and 85 assets exported to ignored dist.
- `npx expo config --type public --json > /tmp/gaadipulse-focused-expo-config.json` — PASS; local config artifact, not committed.

Browser smoke checks via native Brave accessibility: at existing responsive width 518, More contained Add vehicle, Add meter reading, My Garage, Meter readings and basic account/support only. Navigated Add vehicle, tapped Commercial, observed coming-soon modal, tapped Cancel and confirmed Two wheeler remained selected. Existing browser warning “Unexpected text node” was visible before these interactions and remains unresolved; no clean browser-console claim. No saved financial/vehicle records were created during this smoke check. Full 320/360dp/large-text/EV-save/offline acceptance and native Android build/device QA remain unverified; follow the plan’s manual sequence. Full local Supabase/PostgREST RLS validation not run; migration test failure remains a release blocker.

## 2026-11-03 — Horizontal active vehicle card

Updated `src/components/navigation/VehicleHeader.tsx` with a 20% square artwork column and compact right-side details (identity, available registration/make/model, Owner/Pilot and meter unit). Removed the hero card's Switch vehicle action; existing top header picker remains. Non-hero form selectors retain their behavior. Documented layout decision in `docs/DECISIONS.md`. No data or migration changes.

Validation executed: `npm run typecheck` — PASS; `npx eslint src/components/navigation/VehicleHeader.tsx --max-warnings=0` — PASS; targeted Prettier write/check — PASS. Unit/SQL tests, browser/device visual checks, Expo validation and Android build were not run for this presentation-only change. Small-screen and large-font visual acceptance remains unverified.

## 2026-11-03 — Online-only implementation handoff

Latest user instruction supersedes earlier offline-first requirements and historical offline sections above. Current plan and explicit live-backend TODOs: `docs/ONLINE_ONLY_PLAN.md`. Source implementation is complete for the online-only client change; live backend acceptance is still open while frontend work continues.

### Behavior and changed files

- `src/features/{garage,records,meters,progress}/api.ts` and `src/features/auth/profile.ts`: remove persisted remote-data fallbacks; propagate server errors. Records save directly through existing RPCs without a queue and require a returned identifier. Profile updates require a matching returned row.
- `src/features/garage/VehicleForm.tsx`, `src/features/records/screens.tsx`, `src/features/progress/Builder.tsx`: remove draft restore/autosave/save-on-leave. Keep current form values on request failure; leaving discards unsaved changes. Preserve stable operation IDs for explicit vehicle/record saves; record-detail mutations and meter corrections retain their operation ID across retries until confirmation.
- `src/features/records/hooks.ts`, `schema.ts`, `RecordCard.tsx` and Dashboard/report consumers: remove provisional local entries/statuses. Only server responses populate real-account lists/totals.
- `src/lib/query.ts`, `onlineFetch.ts`, `supabase.ts`, `app/_layout.tsx`: account/vehicle-scoped in-memory reads, hide old results on known disconnection/read failure, no automatic query/mutation retries, fail-fast offline and 20-second request aborts. No reconnect write worker. Secure auth/PKCE storage and active selection remain.
- Query consumers in auth, garage, members, meter history, progress, records, reminders, reports and vehicle-access hooks use the online read boundary. Reports' parallel reads exclude failed results and block report rendering/export on error.
- `src/features/records/SyncScreen.tsx`, auth settings/navigation copy and catalogs: Connection replaces queue recovery, retaining the old route for compatibility. `src/features/development/repository.ts` and root banner: explicitly labeled debug-only memory preview, cleared on exit/reload; never a backend fallback. Reminder notification handles use secure metadata storage, not ledger/draft persistence.
- Removed `src/lib/db.ts`, `src/lib/localStore.ts`, `src/lib/sync/hooks.ts`, `src/lib/sync/outbox.ts`, `expo-sqlite` dependency/lock entries and Expo plugin.
- Added `tests/onlineOnly.test.ts`; Vitest alias matches the app's TypeScript alias so service-boundary tests load real domain modules. Updated README, architecture, protocol, focused release plan, reference override, security/QA/screen-map override and decisions.
- No migrations added/modified, no remote deployment, no server reset and no server data deletion. Legacy device files are untouched but never read, shown or replayed by this runtime. Existing staged/unstaged frontend work was preserved.

### Executed validation

- `npm uninstall expo-sqlite` — PASS; removed dependency and lock entries. Native development clients need rebuilding.
- `npm run typecheck` — PASS on final implementation. Intermediate runs caught missing/new copy keys; these were corrected before the final passing run.
- `npx vitest run tests/onlineOnly.test.ts` — PASS, final 9 tests: missing acknowledgement rejected; no early success; failure + same-ID explicit retry; successful read followed by failure does not return old ledger; permission/garage/record/meter/form errors propagate; offline requests never schedule a reconnect write; timeout and cancellation.
- `npm test` — FAIL: last full run had 50 PASS / 1 FAIL across 9 files. Existing `tests/migrations.test.ts` fails with PostgreSQL `syntax error at end of input`, also reported before this change. A ninth targeted online-only test was subsequently added and passed; no later full-suite total is claimed. SQL compilation remains a release blocker.
- `npm run lint` — FAIL: final full-project run has 17 pre-existing warnings, 0 errors, rejected by `--max-warnings=0` (shared UI import ordering/default import, auth screen duplicate import, assets and older password test import ordering).
- `npx eslint app/_layout.tsx src/features/auth/profile.ts src/features/auth/session.tsx src/features/auth/settings.tsx src/features/dashboard/Dashboard.tsx src/features/development/repository.ts src/features/garage/VehicleForm.tsx src/features/garage/api.ts src/features/garage/hooks.ts src/features/garage/screens.tsx src/features/members/screens.tsx src/features/meters/History.tsx src/features/meters/api.ts src/features/progress/Builder.tsx src/features/progress/api.ts src/features/records/RecordCard.tsx src/features/records/SyncScreen.tsx src/features/records/api.ts src/features/records/copy.ts src/features/records/hooks.ts src/features/records/schema.ts src/features/records/screens.tsx src/features/reminders/notifications.ts src/features/reports/screens.tsx src/hooks/useVehicleAccess.ts src/lib/errors.ts src/lib/i18n.ts src/lib/query.ts src/lib/onlineFetch.ts src/lib/supabase.ts tests/onlineOnly.test.ts --max-warnings=0` — PASS. Follow-up `npx eslint tests/onlineOnly.test.ts src/features/records/screens.tsx src/features/meters/History.tsx --max-warnings=0` — PASS after final changes to those files.
- `npm run format:check` — FAIL: 9 existing files (ConfirmationHost, native/web DatePickerField, dateValues, ErrorBoundary, UI index/premium/Timestamp, VehicleChoiceGrid). No unrelated formatting cleanup performed.
- `npx prettier --check` on all implementation paths listed in the targeted lint command plus `app.config.ts` and `vitest.config.mts` — PASS. Final changed record/meter/test files were also formatted with `npx prettier --write`.
- `npx expo config --type public --json > /tmp/gaadipulse-online-expo-config.json` — PASS.
- `npx expo export --platform android` — PASS, Hermes bundle + 85 assets. Repeated successfully after later implementation adjustments; local export log `/tmp/gaadipulse-online-export.log`.
- From `android/`: `./gradlew app:assembleDebug --console=plain` — PASS, `BUILD SUCCESSFUL in 10m 46s`, 424 tasks. This is native compilation/package smoke validation, not device UI/network acceptance. APK is the ignored debug build output under `android/app/build/outputs/apk/debug/`.
- `git diff --check HEAD` — PASS at final review; code search found no runtime SQLite, localStorage ledger persistence, outbox, draft persistence or provisional record references.
- Full local Supabase/PostgREST/JWT/RLS acceptance — BLOCKED / NOT RUN. Supabase CLI and Docker are absent; PGlite migration compilation currently fails. No live backend was deployed or marked verified.

### Next owner/developer actions

Continue frontend flow work in the clearly labeled ephemeral preview. Follow every OPEN item in ONLINE_ONLY_PLAN.md before release: repair/apply migrations in a disposable environment; test actual sign-in, per-vehicle authorization and confirmed writes; exercise Android disconnect/uncertain commit/explicit retry, two-device conflicts and account changes. Verify no automatic replay with legacy device queues present, and test Back/discard, process restart and 320/360dp accessibility. Recheck retained advanced server workflows before enabling those modules. These are remarks/TODOs, not completed integration claims.

## 2026-11-04 — Authentication flow and UI replacement

Added `src/features/auth/AuthLayout.tsx`. Updated `screens.tsx`, `PasswordScreen.tsx`, `routing.ts`, `settings.tsx`, `SignOutButton.tsx`, `app/_layout.tsx`, `src/lib/i18n.ts`, `tests/auth.test.ts` and `docs/DECISIONS.md`. Signed-out entry/logout now open the redesigned login directly. Welcome is a compatibility redirect, with no onboarding carousel. Signup steps: email → password/confirmation → email verification → profile → Home. Established signed-in accounts skip auth through the existing session guard. Google is offered on login/signup and uses the existing real Supabase OAuth exchange. Optional OTP login, resend cooldown, password reset and retained-input errors remain. First profile setup and session-restoration screens share the new auth shell. Removed development entry buttons from login, welcome, session error and settings. No SQL/migration changes.

Commands executed:
- `npm run typecheck` — PASS following implementation (final startup-shell refinement rechecked).
- Targeted ESLint on AuthLayout/screens/PasswordScreen/settings/SignOutButton/routing/i18n/root layout/auth test with `--max-warnings=0` — PASS after combining duplicate React imports; initial run failed on two duplicate-import warnings.
- Targeted Prettier write/check on the same changed files — PASS (final root/i18n changes formatted with Prettier).
- `npx vitest run tests/auth.test.ts tests/password.test.ts` — PASS for 4 auth tests; `password.test.ts` was an incorrect filename and did not run password coverage.
- Corrected `npx vitest run tests/auth.test.ts tests/passwordAuth.test.ts tests/navigation.test.ts` — PASS, 15 tests.
- `npm test` — FAIL: 8 files passed, 1 failed; 51 tests passed, 1 failed. Existing full-migration PostgreSQL compilation failure remains: `syntax error at end of input` in `tests/migrations.test.ts`. No migrations modified.
- `npx expo export --platform android --output-dir /tmp/gaadipulse-auth-android` — PASS; Android Hermes bundle and 85 assets exported. This was before the final session-restoration shell-only refinement; this is not a native APK/AAB build.
- `npx expo config --type public --json > /tmp/gaadipulse-auth-config.json` — PASS.

Browser QA: inspected live localhost preview in Brave, login and signup layout at roughly 502–518dp, absence of the development button, and email → password/confirmation transition using `flow-check@example.com` without submitting to Supabase. Screenshot inspected. The attempted 360dp viewport adjustment did not hold; no 320/360dp pass claimed. Browser showed existing console warnings; no clean-console claim. No real account created and no Google authorization completed. Native Android build/device, large text, keyboard/back, Google return, real verification/recovery/profile writes and authenticated session restoration remain manual verification gates. User has reported Google provider enabled and custom callback allowlisted in Supabase; that configuration was not independently changed or verified here.

## 2026-11-04 — Simple password visibility controls

Added `src/features/auth/PasswordField.tsx` and updated `PasswordScreen.tsx`. Each password/confirmation input has its own accessible 52dp eye toggle, masked by default, with independent visibility. Shared by signup, login and password recovery. Removed the previous shared text toggle. No credential storage, validation, API or SQL changes. Targeted Prettier write, `npm run typecheck` and targeted ESLint with zero warnings — PASS. Browser/device visual interaction and native builds not run for this small control change.
