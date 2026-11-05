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

## 2026-11-04 — Remove card vehicle switch action

Updated `src/components/navigation/VehicleHeader.tsx` to remove the card-level Switch vehicle action and its sheet across all consumers, including Fuel and Expenses. Global `HeaderVehicleSwitcher` remains. Legacy optional props remain accepted for caller compatibility but no card selector is rendered. Record/form vehicle binding and save guards are unchanged; existing record context remains fixed. Targeted Prettier write, `npm run typecheck` and targeted ESLint with zero warnings — PASS. No migration changes. Unit/SQL tests, visual/device QA and native builds not run for this small UI removal.

## 2026-11-04 — Fuel Add Record button

Updated `src/features/records/screens.tsx` and `copy.ts`: Fuel/Charging lists now show a full-width shared gradient button labeled Add Record (52dp minimum height) instead of the small heading Add action. Opens the existing vehicle-scoped add form; create permission and archived-vehicle guards remain. Generic label applies to all energy types. Targeted Prettier write, `npm run typecheck`, and targeted ESLint with zero warnings — PASS. No migrations. Visual/device QA, unit/SQL tests and native builds not run for this presentation-only change.

## 2026-11-04 — Owner Garage edit and vehicle deletion

Added `src/features/garage/DeleteVehicle.tsx`, `tests/vehicleDeletion.test.ts` and additive migration `supabase/migrations/202611040007_vehicle_deletion.sql`. Updated garage `screens.tsx`, `VehicleForm.tsx`, `api.ts` and English i18n. Owner cards expose a separate Edit button (outside the details press target). Edit wizard bottom contains typed exact-name deletion; shared busy state blocks concurrent save actions. API waits for matching RPC acknowledgement before clearing account query state and navigating to Garage. No client-side deletion fallback.

SQL: soft deletion preserves vehicle/ledger/audit rows. Verified active Owner required; exact saved identity compared server-side; row locking and unchanged retry handling; email grants revoked; member/owner access helpers deny deleted vehicles, including normal direct API/RLS access that uses these helpers. No server migration applied remotely and no real vehicle deleted.

Validation:
- Targeted Prettier write — PASS.
- `npm run typecheck` — PASS.
- Targeted ESLint on changed garage/i18n files and new deletion test, zero warnings — PASS.
- `npx vitest run tests/vehicleDeletion.test.ts tests/migrations.test.ts` — new deletion test PASS; full migration-chain test FAIL with existing `syntax error at end of input`. Isolated PGlite deletion test covers Pilot/outsider/unverified/anonymous rejection, wrong-name rejection, Owner success, unchanged retry, deleted access denial, grant revocation and retained vehicle/audit rows. Fixture does not prove full hosted RLS integration.

External gate: apply the new chronological migration through the normal reviewed migration process after resolving the existing full-chain compilation blocker. Real Supabase RLS/REST, owner-vs-Pilot UI, typed confirmation, stale owner revocation/concurrent changes and Android device verification remain pending. No permanent data purge or backend reset.

Additional checks for vehicle deletion: `npx expo config --type public --json > /tmp/gaadipulse-delete-config.json` — PASS; `npx expo export --platform android --output-dir /tmp/gaadipulse-delete-android` (log `/tmp/gaadipulse-delete-export.log`) — PASS. Hermes export is not a signed native APK/AAB build. Browser/device visual checks and native build not run.

## 2026-11-04 — Plain single-page vehicle editing

Updated `src/features/garage/VehicleForm.tsx` and `src/lib/i18n.ts`. Existing vehicle edit bypasses wizard steps, illustrations and review page. All major identity/category/energy/meter settings appear together; Save and owner typed-name Delete remain at bottom. New vehicle wizard retained. Add meter reading links to the real vehicle-scoped observation form; edit does not overwrite historical readings or impersonate another owner. No SQL changes.

Targeted Prettier write/check — PASS; `npm run typecheck` — PASS after correcting an initial unsupported `editable` prop on DateTimeInput (moved to InputField); targeted ESLint with zero warnings — PASS. Browser/device visual QA, unit/SQL tests, Expo validation/export and native build not run for this form-layout change. Deletion still requires the previously added migration; its deployment/full-chain blocker remains unchanged.

## 2026-11-04 — Dropdowns for vehicle edit and meter choices

Added `src/components/ui/DropdownField.tsx`, `src/features/garage/meterOptions.ts`, `tests/meterOptions.test.ts`; updated `VehicleForm.tsx` and English i18n. Edit category/subtype/meter choices now use labeled dropdown controls with selected values, scrollable selection dialog, Cancel/backdrop/Android Back dismissal and accessible selection states. Meter options follow documented catalog-default UI policy: road KM-only, engine HOURS-only, dual subtypes KM/HOURS/BOTH. Changing category/subtype removes incompatible selection; edit save validates the resulting mode. New vehicle wizard/focused release category availability preserved. No data migration or SQL changes.

Executed targeted Prettier write — PASS; `npm run typecheck` — PASS; targeted ESLint on all changed/new files and test with zero warnings — PASS; `npx vitest run tests/meterOptions.test.ts` — PASS, 3 tests (bike/car, tractor/tipper/generator, missing subtype and category-specific Other). Browser/device visual QA, full tests, SQL validation, Expo export/config and native build not run for this UI-only change. Existing full-migration/deletion deployment blockers remain unchanged.

## 2026-11-04 — Compact icon dropdown choices

Updated `src/components/ui/DropdownField.tsx`: removed bottom Cancel button, retained outside-tap/Android Back dismissal and added accessibility escape. Compact label above icon-led 64dp minimum option rows with borders and selected-state radio/check indicators. Existing two/three-option choices and selection behavior preserved. Targeted Prettier write, `npm run typecheck`, targeted ESLint with zero warnings — PASS. No browser/device visual verification, tests, SQL changes or native build for this presentation-only change.

## 2026-11-04 — Expenses Add Record button

Updated `src/features/records/screens.tsx`: Expenses now shares Fuel's full-width gradient Add Record button, replacing the small heading Add action. Opens the existing vehicle-scoped expense form; create permission and archived-vehicle guards preserved. Targeted Prettier write, `npm run typecheck`, targeted ESLint with zero warnings — PASS. No migrations; visual/device QA, unit/SQL tests and native build not run for this presentation-only change.

## 2026-11-04 — Fuel/expense form simplification

Updated `src/features/records/screens.tsx`, `src/components/ui/AdditionalOptions.tsx` and English i18n. Fuel amount/quantity are marked required and checked on submit; optional unit rate remains validated/calculated by existing paise-safe solver. Compact fuel identity replaces repeated profile/unit rows; timestamp follows core inputs. Full/partial, optional receipt rate, station, payment, meter and notes remain under collapsed Additional options. Expense amount/title/category are primary with dropdown category, and optional fields remain collapsed. Removed record-form Connection button. No API/migration changes; actual server confirmation/error/retry semantics retained.

Checks: targeted Prettier write — PASS; `npm run typecheck` — PASS; targeted ESLint with zero warnings — PASS; `npx vitest run tests/foundation.test.ts tests/onlineOnly.test.ts` — PASS, 16 tests covering domain arithmetic and online-only behavior. Browser/live form/device visual QA, real saves, full SQL tests, Expo export/config and native builds not run for this refinement. No real record created. Existing migration deployment blocker remains unchanged.

## 2026-11-04 — Remove Connection/Sync destination

Removed Sync/Connection entries from MoreMenu, Settings and Help, deleted unused `src/features/records/SyncScreen.tsx`, and replaced `app/settings/sync.tsx` with a compatibility redirect to Settings. Existing per-screen connection errors/retry remain. Targeted Prettier write, `npm run typecheck`, targeted ESLint with zero warnings — PASS. Browser/device QA and native builds not run; no backend changes.

## 2026-11-04 — Single record-form save action

Updated `src/features/records/screens.tsx`: removed Save & add another from fuel entry footer and the duplicate bottom Back button from record forms. Connection shortcut was already removed. Save remains the single normal form submission action; existing header/system navigation, field controls and error recovery remain. Targeted Prettier write, `npm run typecheck`, targeted ESLint with zero warnings — PASS. Visual/device QA and native build not run; no backend changes.

## 2026-11-04 — Separate full/partial choices

Updated `src/features/records/screens.tsx`: replaced the single fill-state toggle with two mutually exclusive FilterChips for Partial fill/Full fill (Partial charge/Full charge for electric). Both map to the existing `is_full_tank` boolean; selecting the active option does not deselect it. Writes are ignored while submitting. Targeted Prettier write, `npm run typecheck`, targeted ESLint with zero warnings — PASS. No schema changes; visual/device QA and native build not run.

## 2026-11-04 — Fuel save confirmation and timed return

Added `src/features/records/RecordSavedDialog.tsx`; updated record screens and English i18n. A confirmed fuel/charging save now shows a success modal with OK, then replaces the form with `/(tabs)/fuel` (public URL `/fuel`) on OK or after 4000ms. Saved vehicle becomes active so the destination shows that vehicle. Dirty-form prevention is cleared only following save acknowledgement; resubmission is disabled while success is displayed. Timer cleans up on unmount. Android modal Back also continues to Fuel. Other record types keep their existing completion behavior.

Targeted Prettier write, `npm run typecheck`, targeted ESLint with zero warnings — PASS. `npx vitest run tests/onlineOnly.test.ts` — PASS, 9 tests for underlying acknowledgement/error/retry behavior; this does not test the modal timer/UI. Real save, timing/navigation on device, visual QA and native build not run. No migration changes.

## 2026-11-04 — Minimal fuel history cards

Updated `src/features/records/RecordCard.tsx` and `copy.ts`. Fuel/charging cards now emphasize a 28sp amount with small energy shorthand (P/D/E/CNG etc.), PF/FF or PC/FC state, and event date/time aligned to the bottom right with wrapping. Removed fuel icons, generic title, quantity, confirmed and missing-reading badges from the summary; full record remains available by tapping. Archived state remains visible when archived entries are requested. Accessible press labels retain expanded fuel/fill descriptions. Other domain cards unchanged.

Targeted Prettier write, `npm run typecheck`, targeted ESLint with zero warnings — PASS. Visual/device QA, tests, SQL checks and native builds not run for this presentation-only change. No data/API changes.

### 2026-11-04 — Compact fuel history follow-up

Changed `src/features/records/RecordCard.tsx` and `src/features/records/screens.tsx`: shared fuel list card, thin separators, amount plus quantity, small partial-state/time metadata and theme accents. Recorded presentation decision in `docs/DECISIONS.md`. No migrations or backend changes. Prettier on both changed TSX files: PASS. `npm run typecheck`: PASS. Targeted ESLint result recorded below. Browser/device visual verification, unit/SQL suites, Expo config and Android build were not run for this presentation-only follow-up; no stage/release completion claimed.

Validation detail: initial typecheck FAIL (separator used nonexistent theme `border` token); corrected to existing `line` token and reran `npm run typecheck`: PASS. `npx eslint src/features/records/RecordCard.tsx src/features/records/screens.tsx --max-warnings=0`: PASS.

### 2026-11-04 — Fuel detail popup and Delete follow-up

Changed RecordCard.tsx, records/screens.tsx and records/copy.ts: row chevron, shared details popup, Edit/Delete icon actions, owner-only deletion UI, no ledger archive/recovery filters, retained detail URLs and optional detail values. Added supabase/migrations/202611040008_record_soft_deletion.sql and tests/recordDeletion.test.ts. Database trigger protects fuel and expenses from Pilot deletion and recovery of deleted rows. Requires external application of the migration; not deployed remotely.

Validation: `npx vitest run tests/recordDeletion.test.ts` PASS (PGlite, verified owner vs Pilot/unverified user, retained rows and rejected restore). Prettier changed TSX/copy/test files PASS. Initial TypeScript checks caught missing detail-label translation keys; keys added before final rerun. Final TypeScript/lint results below. Live backend, browser/mobile visual checks, full SQL migration suite, Expo config and Android build NOT RUN; release acceptance remains open.

Final `npm run typecheck`: PASS. Final `npx eslint src/features/records/RecordCard.tsx src/features/records/screens.tsx src/features/records/copy.ts tests/recordDeletion.test.ts --max-warnings=0`: PASS.

### 2026-11-04 — Shared centered popup follow-up

Added `src/components/ui/Popup.tsx` and root PopupBackground in `app/_layout.tsx`. Updated shared Sheet in `src/components/ui/index.tsx`, DropdownField, ConfirmationHost, DatePickerField, HeaderVehicleSwitcher, MoreDrawer, RecordSavedDialog, VehicleComingSoon (`features/release/DeferredFeature.tsx`), and English close-popup text. All app-managed Modal usage now goes through Popup. Centered dialogs size to content, scroll long content, provide outside-click dismissal and close icons, and preserve caller actions. No business data or migrations changed. Updated DECISIONS and UI_DESIGN_SYSTEM. Prior worktree edits were preserved.

Validation performed:
- Prettier on changed popup/navigation/root TSX and i18n files: PASS.
- `npm run typecheck`: PASS after removing the unavailable expo-blur dependency attempt.
- Targeted `npx eslint app/_layout.tsx src/components/ui/Popup.tsx src/components/ui/ConfirmationHost.tsx src/components/ui/DropdownField.tsx src/components/ui/DatePickerField.tsx src/components/ui/index.tsx src/components/navigation/HeaderVehicleSwitcher.tsx src/components/navigation/MoreDrawer.tsx src/features/records/RecordSavedDialog.tsx src/features/release/DeferredFeature.tsx src/lib/i18n.ts --max-warnings=0`: PASS after moving an existing type export below imports (initial lint FAIL: import/first warnings).
- `npx expo export --platform web --output-dir /tmp/gaadipulse-popup-web`: PASS; output is temporary, not published.
- `npx expo config --type public --json > /tmp/gaadipulse-popup-expo-config.json`: PASS.
- `npx expo install expo-blur`: BLOCKED by registry DNS/unavailable network. Removed attempted dependency; package.json/package-lock.json unchanged by this follow-up. Implemented platform filter blur without new packages.
- Browser visual/interaction checks: BLOCKED, computer-use service startup failed and no browser surfaces were available. Do not interpret compilation as visual verification.
- Unit/SQL suites and Android native build/device checks: NOT RUN for this UI-only change. No new behavioral tests duplicating implementation were added. Manual follow-up: verify outside click/close/Back, long-content scrolling, keyboard behavior, stacked confirmation cancellation and Android blur on device. iOS/older Android use a dim-only backdrop. No remote setup or deployment required by this change; release acceptance remains open.

### 2026-11-04 — Delete click popup correction

Changed `src/features/records/screens.tsx`: RecordDetail uses an in-place delete confirmation, avoiding a second native Modal above the details popup. Delete replaces the details; confirming waits for saveRecord, then closes on success. Cancel closes without writing. Failed deletion retains the confirmation with retry. Per-vehicle ownership and the existing deletion RPC/trigger contract are unchanged. Prettier on screens.tsx PASS; `npm run typecheck` PASS; `npx eslint src/features/records/screens.tsx --max-warnings=0` PASS. Browser/device interaction verification NOT RUN (computer-use service unavailable in prior attempt). No new SQL, dependency changes, or stage/release completion claim.

## 2026-11-04 — Grouped fuel rows refinement

Inspected current RecordCard/RecordsList implementation: fuel rows already share one enclosing Card with thin separators and quantity alongside amount. Refined `RecordCard.tsx` to retain that structure, show expanded Full fill/Partial fill (charge wording for electric), omit repeated energy names and remove the row chevron. Amount retains primary color and quantity is shown in brackets with L/kg/kWh; small date/time remains below at right. Existing detail-opening handler preserved. Targeted Prettier write, `npm run typecheck`, targeted ESLint on RecordCard/screens with zero warnings — PASS. Visual/device QA, tests and native build not run for this presentation-only refinement.

### 2026-11-04 — Compact expense history follow-up

Changed `src/features/records/RecordCard.tsx` and `src/features/records/screens.tsx` to use a shared list card and details popup for expense records. Rows show amount, title, category, timestamp and chevron; the existing owner-only delete confirmation and edit form are reused. No new migration or service changes. Prettier on both files: PASS; `npm run typecheck`: PASS; targeted `npx eslint src/features/records/RecordCard.tsx src/features/records/screens.tsx --max-warnings=0`: PASS; `npx vitest run tests/recordDeletion.test.ts`: PASS (existing PGlite deletion guard tests). Browser/device visual checks NOT RUN; the computer-use service was unavailable in the previous attempt. Full SQL suite and Android build NOT RUN for this UI change. The previously created `202611040008_record_soft_deletion.sql` still needs deployment to enforce deletion rules on the backend; no remote deployment was performed.

### 2026-11-04 — Manual meter monotonicity

Changed `src/features/records/screens.tsx`, `src/lib/i18n.ts` and `src/lib/errors.ts`; added `supabase/migrations/202611040009_manual_meter_monotonic.sql` and `tests/manualMeterMonotonic.test.ts`. New standalone manual KM/HOURS entries cannot be less than the most recent earlier active observation for the same vehicle and type; equality and truthfully timed late entries are allowed. The form shows preceding values when readable, provides retry on history errors, and no longer offers a reset switch. Database enforcement requires applying the new migration; it has not been deployed. Other record paths and correction history were not altered.

Validation: Prettier changed files PASS; `npm run typecheck` PASS; `npx eslint src/features/records/screens.tsx src/lib/i18n.ts src/lib/errors.ts --max-warnings=0` PASS; `npx vitest run tests/manualMeterMonotonic.test.ts` PASS using PGlite (lower/equal, KM/HOURS, vehicle isolation, late entries, reset). Full local Supabase migration/RLS suite, live backend, visual/device checks, Expo config and Android build NOT RUN for this follow-up. No release acceptance claimed.

## Google Play privacy and deletion review — 2026-11-04

This follow-up is **incomplete; not ready for Play submission**. Added `docs/PRIVACY_POLICY_DRAFT.md` and `docs/GOOGLE_PLAY_PRIVACY_NOTES.md`. Added a direct Settings entry for the existing deletion-request screen, a readable archive prerequisite error, and separate request-confirmation/sign-out handling. The operator worker now returns HTTP 500 if any request fails, retaining failed requests for retry; it still performs only the previous anonymization workflow and **does not establish full account/data deletion**. No server migration, production deployment, schedule or actual deletion was performed. Changed import order/formatting in existing files to resolve release-check warnings.

The deletion workflow requires a reviewed implementation for personal data, vehicle records and shared data; Google requires account and associated data deletion with disclosed legitimate retention exceptions. The existing worker masks/bans an Auth user and leaves records, and it must not be advertised as completed deletion. Decide shared-record handling and the policy for user-created personal records, then implement and test the complete workflow, including external requests, identity verification, failure recovery, providers/backups and retention. Confirm the working support contact, legal operator name, hosting URL, provider details and retention before publishing the policy or completing Play declarations. The in-app legal content remains pre-release.

Validation performed:
- `npm run typecheck`: PASS before and after the UI change (latest combined check recorded separately below).
- Targeted Prettier and ESLint on changed auth/error files: PASS.
- `npm test`: FAIL (55 passed; migration syntax failure and two 5-second timeouts). `npm test -- --maxWorkers=1`: FAIL (57 passed, one migration compilation failure).
- PGlite migration isolation: migrations 001–004 PASS; `202610240005_vehicle_fuel_profiles.sql` FAIL with `syntax error at end of input`, position 2551 near the `IF ... IS DISTINCT FROM CASE ... END THEN` expression. Existing migrations were preserved. A later additive migration cannot run before this failed migration; reconcile a safe bootstrap correction with migration history before deployment.
- `npx expo config --type public`: PASS.
- `npm run lint` and `npm run format:check`: initially FAIL on pre-existing warnings/formatting; fixes applied and rerun recorded separately below.
- `cd android && ./gradlew assembleDebug --offline`: FAIL because the required Android lint artifact was not cached; online retry recorded separately below.
- Supabase local full-stack migrations/RLS: BLOCKED (Docker unavailable), and live Auth/RLS/deletion were not tested. Deno is unavailable for execution of the Edge Function. No Play Console actions or signed production build were performed.

Additional follow-up: `npx supabase migration list --linked` PASS (read-only); linked project shows 001–004 applied and 005–009 pending. No linked project migration or data was changed. An in-memory-only PGlite experiment adding parentheses around the CASE expression in 005 compiled all nine migrations; this is diagnostic, not an applied correction or hosted/RLS test. `npm run lint`, `npm run format:check` and `npm run typecheck` subsequently PASS. The user supplied Mahendra Singh, `mahendrapuniya92@gmail.com` and the website, and chose to keep shared vehicle records while removing the departing identity. Added `docs/ACCOUNT_DELETION_PAGE_DRAFT.md`, populated contact details in the policy draft, and added a deletion support email action in-app. HTTP HEAD to the supplied website returned 200, but publishing access was not established and no policy/deletion page was published. Changes after the full checks received targeted checks (recorded below).
- After adding the contact action and updating privacy copy, `npx prettier --check src/lib/i18n.ts src/features/auth/SecurityScreen.tsx src/features/records/copy.ts`, targeted ESLint on those files and `npm run typecheck`: PASS. `git diff --check`: PASS.
- `cd android && ./gradlew assembleDebug`: CANCELLED during native compilation after the offline failure; then `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a`: PASS. This is a debug native build for one ABI, not a signed release or device test.

## More drawer restoration — 2026-11-04

Restored More as a full-height drawer entering from the left at 75% of the current window width, with a translucent blue backdrop, outside-tap/close-button/Android Back dismissal, safe-area padding, scrollable menu content and reduced-motion handling. Changed `src/components/navigation/MoreDrawer.tsx`; existing menu actions remain in `MoreMenu`.

Validation: `npm run typecheck` — PASS; `npx eslint src/components/navigation/MoreDrawer.tsx --max-warnings=0` — PASS; `npx prettier --check src/components/navigation/MoreDrawer.tsx` — PASS. Browser visual/interaction verification was not completed: the available browser was on an expense form after an automation timeout, so no further interaction was attempted. Android device verification and a native build were not run for this UI-only change.

## Compact home observations — 2026-11-04

Changed `src/features/garage/screens.tsx` and `src/lib/i18n.ts` to show available latest KM and HOURS readings in compact rows within a full-width card, each with its own observed date and time in the vehicle timezone. Missing readings are omitted; the empty state is shown only after loading completes. No query, data or permissions changed.

Validation: `npm run typecheck`, `npx eslint src/features/garage/screens.tsx src/lib/i18n.ts --max-warnings=0`, `npx prettier --check src/features/garage/screens.tsx src/lib/i18n.ts`, and `git diff --check` — PASS. Browser visual testing and Android device testing were not performed; no native build was run for this presentation change.

## Consistent form saves and expense categories — 2026-11-04

Fuel/charging saves now use the shared success toast and navigate directly to Fuel after confirmed save, removing `RecordSavedDialog.tsx`. Shared toast styling uses dark colors and light text for all message types; profile, meter corrections and new expense categories use the success tone. Added `src/components/ui/InlineSelect.tsx` for the expense category's inline, bounded scrollable list, preserving category options and existing selection behavior. Category loading errors now offer retry. No database or save validation changes.

Validation: `npm run typecheck` — PASS; targeted ESLint and Prettier for changed source — PASS; `npx vitest run tests/onlineOnly.test.ts tests/recordDeletion.test.ts --maxWorkers=1` — PASS (10 tests); `git diff --check` — PASS. Browser and Android device interaction/visual testing was not performed; Android build not run for this presentation change.

## Per-vehicle pilot access — 2026-11-04

Restored `app/owner/members.tsx` and its More menu route for owner access; added a pilot read/create policy with a two-local-calendar-day window, owner-only editing/deletion and an explicit policy-readiness gate. Owner/member permission overrides can restrict each of the six pilot read/create permissions. Role, verification and revocation remain server-enforced; owner privileges remain per vehicle. Client screens explain the pilot history window, avoid labeling a two-day sum as monthly data, and re-filter cached pilot records as local dates change. Record entry works for previously existing vehicles of any category; focused-release new vehicle creation remains unchanged. Member form state resets on active-vehicle change. See `docs/PILOT_ACCESS.md` and `docs/DECISIONS.md`.

Files added: `supabase/migrations/202611040010_pilot_access.sql`, `src/features/members/pilotPolicy.ts`, `src/features/members/history.ts`, `tests/pilotAccess.test.ts`, `tests/pilotHistory.test.ts`, `docs/PILOT_ACCESS.md`. Modified member, record, meter, dashboard, garage, release routing, access hook, English catalog and related tests. No production migration or data was modified.

Validation: `npm run typecheck` PASS; full `npm run lint` and `npm run format:check` PASS before final small source edits, followed by targeted ESLint/Prettier and typecheck PASS; `npx vitest run tests/pilotAccess.test.ts tests/pilotHistory.test.ts tests/releaseScope.test.ts tests/onlineOnly.test.ts --maxWorkers=1` PASS (15 tests); `npm test -- --maxWorkers=1` FAIL (60 passed, migration-chain compilation fails in the pre-existing 005 migration). The pilot SQL integration test uses PGlite and skips the unbuildable 005 and 006, and thus does not establish full-chain correctness or hosted Supabase/Auth behavior. `npx expo config --type public` PASS; `npx expo export --platform android --output-dir /tmp/gaadipulse-pilot-export` PASS; `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --offline` PASS (native debug build only). Local full-stack Supabase/RLS blocked by unavailable Docker; no live security tests or Android device testing. A read-only linked migration listing showed 001–004 applied, 005–010 pending. Resolve 005 safely and apply/retest the complete migration chain before enabling grants; until then the client gate blocks pilot reads/new grants, but direct API access to an older backend is not protected by the new policy.

## Restore focused-release features — 2026-11-05

Enabled `releaseFeatures.advancedTools`, restoring commercial/agricultural/heavy vehicles, all KM/HOURS/BOTH modes, vehicle member management, Daily Progress forms/review, document metadata, reminders and notification settings, maintenance, reports, audit panels and CSV/JSON/PDF exports. `supportsVehicle` and `supportsRecord` continue to reject unknown values. Vehicle meter choices now allow the actual editable configuration for every subtype rather than rejecting valid alternate modes during edit.

Added `supabase/migrations/202611040011_pilot_progress.sql`: pilots may be explicitly granted progress view/submission while progress edits remain denied; progress history remains today/yesterday and restricted to the submitting pilot, with Owner-only answers redacted. It also fixes an existing PL/pgSQL variable/column ambiguity in progress-answer validation using an additive function replacement. No earlier migration was modified. `tests/pilotAccess.test.ts` now applies all migrations in a disposable PGlite fixture with an explicitly in-memory-only parenthesis repair to 005, tests owner publishing/approval, Pilot submission, private field redaction, restricted date history, denied updates, grant verification, per-vehicle roles, financial permissions and revocation. This is not a successful authoritative full-chain migration or hosted Supabase test.

Extracted `src/features/reports/csv.ts` and hardened spreadsheet formula escaping for leading whitespace; added `tests/reportCsv.test.ts`. Reminder notifications now use a generic title to avoid exposing vehicle details on the device notification surface; existing schedules are rescheduled with the new presentation version. Online-only operation remains; photo/file upload, GPS, Hindi and paid plans remain deferred under the existing product scope.

Validation: `npm run typecheck` PASS; `npm run lint` PASS; `npm run format:check` PASS; `git diff --check` PASS. `npm test -- --maxWorkers=1` FAIL: 60 tests passed and the authoritative migration-chain test failed at the pre-existing 005 syntax error. `npx expo config --type public` PASS; `npx expo export --platform android --output-dir /tmp/gaadipulse-restored-final` PASS; `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --offline` PASS (native debug build, before the final JS-only scope validation change). Local full-stack Supabase/RLS tests BLOCKED (Docker unavailable); no live JWT/PostgREST, physical Android UI, reminder delivery/share-sheet or signed release tests were run. A read-only linked migration listing showed 001–004 applied and 005–011 pending; no remote migration or production data was changed. Repair/reconcile 005 while preserving deployment history, validate the entire migration chain and apply it normally before relying on the newly enabled backend features or Pilot access.

## Pilot server deployment — 2026-11-05

Corrected the un-applied `202610240005_vehicle_fuel_profiles.sql` CASE syntax and removed the in-memory workaround from `tests/pilotAccess.test.ts`. The linked project had 001–004 applied and 005–011 pending before this repair. Applied 005–011 normally without a reset or manual history changes. Updated `docs/PILOT_ACCESS.md` with the deployment status. Other environments must check their own histories before applying the corrected migration.

Validation: `npm test -- --maxWorkers=1` PASS (61 tests, before removal of the now-redundant test workaround); `npx vitest run tests/migrations.test.ts tests/pilotAccess.test.ts --maxWorkers=1` PASS after its removal; `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, and `npx expo config --type public` PASS. `npx supabase db push --dry-run` PASS; `npx supabase db push --yes` PASS, applying 005–011; `npx supabase migration list --linked` PASS, confirming 001–011; `npx supabase db query --linked` returned true for `public.pilot_access_policy_ready()`. Full local Supabase/RLS remains blocked by unavailable Docker; hosted authenticated Pilot/Owner flows, PostgREST and device interaction were not tested. Verify the app uses the linked project and exercise verified sign-in, grants and revocation on real accounts.

## Home and fuel improvements — 2026-11-05

Implemented the plan in `docs/HOME_FUEL_IMPROVEMENT_PLAN.md`: shared three-column vehicle header; Home focus refresh and 15-second polling of authorized latest observations; compact grouped activity/reminders; simplified fuel entry; accessible icon actions and authorized submitter identity on fuel details without the audit section; server-filtered fuel history and 30-row pagination with date/amount/search filters. Existing fuel, expense and manual observations are retained. Added `202611050012_record_meter_chronology.sql` to validate new form readings against temporal neighbors and provide RLS-scoped fuel pages and record-author lookup. The linked project's 012 migration was applied normally; migration list confirms 001–012. No data reset was performed. Existing reset/correction history remains, and a later observation cannot be used to justify falsifying a late entry.

Validation: `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm test -- --maxWorkers=1` (62 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-home-fuel-final`, and `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --offline` PASS. `npx supabase db push --dry-run`, `npx supabase db push --yes` and linked migration listing PASS. PGlite tests cover chronology across three form sources, both neighbors, pagination and owner/Pilot/outsider author visibility. Local full-stack Supabase/RLS tests remain BLOCKED by unavailable Docker. In the running browser against the linked backend, verified Home card/latest value, fuel history, amount filter and total, submitted name/email, and the simplified fuel form; no live financial records were created or changed for testing. Physical Android interaction, real multi-session updates and live Pilot adversarial REST tests were not run. The Android build is debug-only and the export is not a signed release. Other environments must apply migration 012 before using the new fuel page.

After the full checks, shortened the event field label in `src/features/records/copy.ts` to “Date and time”; targeted Prettier, ESLint and `git diff --check` PASS. The Android export/build above preceded this copy-only change.

## Vehicle card presentation — 2026-11-05

Updated the shared `src/components/navigation/VehicleHeader.tsx` card used on Home, Fuel, Expenses and other screens: removed the Active Vehicle label and current reading, increased text and artwork sizing, and arranged the image, vehicle identity and available make/model, energy and role in three columns. Role uses a contrasting badge; make/model is omitted when unavailable or redundant. Latest observations on Home remain separate and unchanged.

Validation: `npx prettier --write src/components/navigation/VehicleHeader.tsx`, `npm run typecheck`, `npx eslint src/components/navigation/VehicleHeader.tsx --max-warnings=0`, `git diff --check`, and `npx expo config --type public` PASS. Inspected the running browser Fuel screen with the real vehicle's name, registration, make/model, energy and role visible. No database changes, automated unit suite, native build or physical-device checks were run for this presentation-only update.

## Vehicle setup time zone and fuel guidance — 2026-11-05

Added `src/features/garage/TimezoneField.tsx`, `timezone.ts`, `timezones.json` and `tests/vehicleSetup.test.ts`; updated `VehicleForm.tsx`, `src/lib/i18n.ts`, `docs/DECISIONS.md` and `docs/FUEL_CONFIGURATION.md`. Vehicle create/edit use a searchable IANA-zone selector defaulting to India (IST, UTC+05:30), preserve existing zone aliases, show current offsets and explain seasonal changes. The picker filters time zones unsupported by the device. Starting readings, their actual time, conditional vehicle identity, fuel/unit compatibility, fuel-profile edits and limited Other fuel support are explained. Review now includes supplied starting readings. Changing meter mode asks before clearing an incompatible unsaved reading; changing an edited vehicle category retains a compatible existing meter mode. No database migration or remote data change.

Validation: `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm test -- --maxWorkers=1` (65 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-vehicle-setup-export`, and `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --offline` PASS before the final device-supported-zone filter; targeted final checks are recorded below. In the live browser add wizard, verified optional make/model labels, the conditional identity hint, Petrol+CNG fuel/units and India default. The browser changed pages while opening the picker, so selection/search, edit flow and physical Android were not interaction-tested. No hosted writes or SQL/RLS migrations were run; the existing server fuel policy was reviewed and tested by the existing suite. The native build is debug-only.

After the device-supported-zone filter: Prettier for `timezone.ts`, `npm run typecheck`, targeted ESLint for the setup components and test, `npx vitest run tests/vehicleSetup.test.ts --maxWorkers=1` (3 tests), and `git diff --check` PASS. Expo export and Android build above preceded this final TypeScript-only filter.

## Account onboarding and currency request — partial, 2026-11-05

Updated `src/features/auth/settings.tsx`, `src/features/garage/VehicleForm.tsx`, `src/features/garage/TimezoneField.tsx` and `src/lib/i18n.ts`: profile setup shows the authenticated account's email and asks for the account time zone using the existing zone picker; new vehicles initialize their time zone from the account profile, with a visible retry on profile-load failure. Existing vehicle time zones remain unchanged. Existing display-name onboarding and profile persistence are reused. Separate username and currency onboarding are NOT implemented. The user chose to retain each record's original currency; see `docs/DECISIONS.md` for the required record-level, mixed-currency and legacy-client work. The app still uses INR/paise throughout; no alternative currency selector, database change, currency relabeling or conversion was introduced.

Validation: `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm test -- --maxWorkers=1` (65 tests), `npx expo config --type public`, and `npx expo export --platform android --output-dir /tmp/gaadipulse-account-timezone-export` PASS. Browser/device interaction, native build and hosted signup checks for this partial follow-up were NOT RUN; no server migration/deployment was performed.

## Meter history and More menu — 2026-11-05

Added `src/components/ui/HistoryRow.tsx` and reused it for fuel, expense and meter history. Updated `src/features/meters/History.tsx`, `src/features/records/RecordCard.tsx` and `src/features/navigation/MoreMenu.tsx`: compact observation rows open a details sheet with the existing owner correction/retraction flow, type filters are conditional, and the redundant Add maintenance shortcut is removed. Readings and correction provenance remain separate; no migration or server data was changed. `docs/DECISIONS.md` records the history and time-zone presentation decisions.

Validation: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test -- --maxWorkers=1` (65 tests), `npx expo config --type public` and `git diff --check` PASS before a final addition of retry states; targeted final checks are recorded below. Browser visual/interaction testing was not completed because no browser automation surface was available; Android device and native build were not run for this UI change. Local Supabase/RLS and hosted writes were not run; no SQL changed.

Final retry-state checks: targeted ESLint and Prettier, `npm run typecheck`, and `git diff --check` PASS.

Follow-up: removed the measured intervals section from meter history at the user's request; insights are planned separately. Targeted Prettier and ESLint, `npm run typecheck`, and `git diff --check` PASS. No browser/device testing or native build was run for this removal.

## Fuel form meter readings — 2026-11-05

Updated `src/features/records/screens.tsx`, `schema.ts`, `copy.ts`, and `src/lib/i18n.ts` to load authorized active observations for entry forms, show the latest reading and observation date for each configured meter, and display fuel meter fields directly. The fuel form explains the existing confirmation when the observation and fill times match, resets that confirmation when the reading, time or vehicle changes, and reports an actionable validation message. Latest readings are informational and are never copied as new observations; server chronology validation remains authoritative. No SQL or hosted data was changed.

Validation: `npm run typecheck`, full `npm run lint`, `npm run format:check`, `npm test -- --maxWorkers=1` (65 tests), `npx expo config --type public`, and `git diff --check` PASS. After the final validation-message change, targeted ESLint/Prettier, typecheck and diff check PASS. In the running browser, verified that the selected vehicle's latest KM and HOURS values and dates appear above the fuel meter fields. No record was submitted, and no Android device/build or hosted write test was performed.

## Compact time-zone selector — 2026-11-05

Updated `src/features/garage/TimezoneField.tsx` for account and vehicle setup: a compact searchable input opens a fixed-height scrollable list directly below it; selection retains existing IANA-zone and offset handling. Targeted ESLint and Prettier, `npm run typecheck`, `npx vitest run tests/vehicleSetup.test.ts --maxWorkers=1` (3 tests), and `git diff --check` PASS. The tests ran before the final input-blur adjustment, which received targeted lint/format/type checks. Browser and Android interaction were not tested; no native build or backend changes were made.

## Garage meter labels — 2026-11-05

Updated garage vehicle card meter-mode labels to KM, hrs and KM & hrs in `src/features/garage/screens.tsx` and `src/lib/i18n.ts`. Targeted Prettier and ESLint, `npm run typecheck`, and `git diff --check` PASS. Browser/device testing and a native build were not run for this copy-only presentation change.

## Section heading size — 2026-11-05

Reduced the shared `SectionHeading` title from 28/36 to 20/27 points and marked it as an accessibility heading in `src/components/ui/premium.tsx`. This affects all screens using the shared component. Targeted Prettier and ESLint, `npm run typecheck`, and `git diff --check` PASS. Browser/device testing and a native build were not run for this presentation change.

## Retire Daily Progress — 2026-11-05

Plan: `docs/DAILY_PROGRESS_REMOVAL_PLAN.md`. Removed progress, approvals and form-builder actions from Home, More and garage, removed member permission controls and progress reports/export content, removed dedicated routes, and redirect legacy record links. Added `supabase/migrations/202611050013_remove_daily_progress.sql` to revoke authenticated progress RPC/table access and stop automatic form creation/adaptation; historical data, audit events and meter observations are retained. Some unreachable legacy implementation remains in source. The migration is NOT deployed; older clients retain backend access until it is applied. Existing client builds must be updated alongside the migration.

Validation: `npm run typecheck`, `npm run lint`, targeted Prettier, `git diff --check`, `npm test -- --maxWorkers=1` (65 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-remove-progress`, and `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --offline` PASS. PGlite migration test verifies the complete chain, revoked read/submit RPC privileges, and removed triggers; previous pilot test continues to exercise the historical 001–012 state. `npx supabase db push --dry-run` PASS and lists only 013; no hosted change was made. Full `npm run format:check` FAIL on pre-existing formatting in eight unrelated files; targeted formatting for this change PASS. Full local Supabase/RLS tests remain BLOCKED by unavailable Docker. No hosted authenticated, browser or physical device interactions were run; debug build is not a release build.

## Remove separate Maintenance page — 2026-11-05

Removed the separate maintenance list and its More and garage shortcuts; `/maintenance` redirects to Expenses for old links. Existing maintenance expense data, categories, linked reminders and database records remain intact. Modified `app/maintenance/index.tsx`, `src/features/navigation/MoreMenu.tsx`, `src/features/garage/screens.tsx`, `src/features/reports/screens.tsx`, `src/features/release/scope.ts`, and `tests/releaseScope.test.ts`. Targeted ESLint and Prettier, `npm run typecheck`, `npx vitest run tests/releaseScope.test.ts tests/navigation.test.ts --maxWorkers=1` (8 tests), and `git diff --check` PASS. No database migration, native build or browser/device interaction was performed for this change.

## Contextual empty states — 2026-11-05

Replaced generic empty-state photos with compact colored Ionicons in `src/components/ui/index.tsx`. Added contextual copy and visuals for fuel, charging, expenses, documents, reminders, meters, garage and search in `src/features/records/screens.tsx`, `src/features/meters/History.tsx`, `src/features/garage/screens.tsx` and `src/lib/i18n.ts`. Filtered lists give filter guidance; empty vehicle search offers a working clear action. Existing permissions and data queries are unchanged.

Validation: `npm run typecheck`, targeted ESLint on changed source, Prettier for the shared component and garage screen, `npm test -- --maxWorkers=1` (65 tests), `npx expo config --type public`, and `git diff --check` PASS. Other changed source files retain their existing formatting; full formatting check was not rerun. Browser/Android visual and interaction testing and a native build were not performed for this presentation change.

## Remove audit history from record details — 2026-11-05

Removed the shared audit panel and its client-side query/service from non-fuel record details in `src/features/records/screens.tsx` and `src/features/records/api.ts`, and removed unused panel labels from `src/features/records/copy.ts`. Fuel details already had no panel. Server audit logging, existing audit records, deletion disclosures and security policies remain intact. `npm run typecheck`, targeted ESLint, `git diff --check`, and `npx vitest run tests/security.test.ts tests/recordDeletion.test.ts --maxWorkers=1` (15 tests) PASS. Browser/device testing, full formatting checks and native build were not run for this UI change. No database migration was made.

## Record submitter names — 2026-11-05

Updated `src/features/records/screens.tsx`, `src/features/records/api.ts` and `src/types/database.ts` to display the submitter's name, loading/unavailable states and retry on lookup errors, without displaying raw IDs. Fuel uses its existing authorized author RPC; expenses, meter events, documents and reminders use new `supabase/migrations/202611050014_record_author_name.sql`. The new RPC returns only a name for the specified authorized record and enforces vehicle permissions and Pilot history restrictions. Development mode reads its profile. `tests/pilotAccess.test.ts` verifies owner, pilot, outsider, cross-vehicle, old-record and revoked-access cases. Existing prior-migration fixture adds 014 while intentionally preserving the historical progress tests; the migration-chain test also applies 013 and 014 in order.

Validation: `npm run typecheck`, targeted ESLint, `npm test -- --maxWorkers=1` (65 tests), `npx expo config --type public`, `git diff --check`, and `npx supabase db push --dry-run` PASS. The dry run lists pending 013 and 014. Neither migration was deployed; non-fuel name lookup will show a recoverable setup error until 014 is applied. No hosted authenticated, browser or device testing or native build was performed. PGlite does not replace hosted RLS/PostgREST verification.

## More, garage and vehicle members — 2026-11-05

Simplified `src/features/navigation/MoreMenu.tsx` so Quick Add contains Add vehicle and Add meter reading, and Settings is the account entry point; Security and data, About and profile already existed in Settings and Help was added there in `src/features/auth/settings.tsx`. Garage now has a full-width Add vehicle button. Vehicle details offer owners an Add vehicle member button that opens the grant form for that exact vehicle. `src/features/members/screens.tsx` and `vehicleContext.ts` bind the page and its queries/mutations to the supplied vehicle without changing the active vehicle or falling back to a different vehicle; the general More entry retains the active-vehicle behavior. Added `tests/memberVehicleContext.test.ts` for context selection and invalid links. No membership, permission or database policy changes were made.

Validation: `npm run typecheck`, `npm run lint`, targeted ESLint/Prettier on modified components and test, `npm test -- --maxWorkers=1` (68 tests), `npx expo config --type public`, and `git diff --check` PASS. Full formatting check, browser/physical Android interaction, native build and hosted membership grants were not run for this change. Existing server authorization remains authoritative.

## Profile icons and appearance — partial request, 2026-11-05

Added 40 bundled Ionicons in `src/features/auth/avatars.ts` and accessible picker `ProfileIconPicker.tsx`; profile setup/edit stores the selection with display name, time zone and appearance and More displays it. Appearance controls are now directly visible on Profile. `profile.ts`, `settings.tsx`, development repository, More menu, i18n and database types were updated. Additive migration `202611050015_profile_icons.sql` adds an allowlisted profile field and self-update grant, preserving profile RLS and existing data. Before deployment the profile remains readable and other fields can save; attempting to save a changed icon reports that a database update is required. Currency selection and multi-currency ledger support are NOT implemented; see `docs/plan/INTERNATIONAL_COUNTRY_CURRENCY_ONBOARDING.md` and the existing decision about preserving record currencies.

Validation: `npm run typecheck`, `npm run lint`, `npm test -- --maxWorkers=1` (69 tests), `npx expo config --type public`, and `git diff --check` PASS. PGlite migration-chain test verifies permitted icon update, rejected invalid icon and inability to update another profile. `npx supabase db push --dry-run` PASS, listing pending 013, 014 and 015. No hosted migration or live account test was performed. Browser/Android interaction, full formatting check and native build were not run. This request remains incomplete until currency is safely implemented and migrations are deployed.

## Vehicle card actions and archive behavior — 2026-11-05

Updated `src/features/garage/screens.tsx` with compact card edit icons, Active/Archived garage sections and owner-only top icons for edit, member management, and archive/restore. Removed duplicated detail shortcuts and the bottom Back button; standard header Back remains. Archived vehicles remain in Garage, are excluded from the active switcher, and can be restored by an owner. Updated `VehicleForm.tsx` and record forms/details to block archived edits; development record/vehicle writes reject archived vehicles. `src/lib/errors.ts` supplies a recoverable explanation. Added `202611050016_archived_vehicle_read_only.sql` to serialize and reject writes to archived vehicle details, records and meter readings at the database layer. Existing records remain readable. Existing deployed `save_record` already refuses archived vehicles, but the new broader server protection is NOT deployed.

Validation: `npm run typecheck`, `npm run lint`, `npm test -- --maxWorkers=1` (69 tests), `npx expo config --type public`, `git diff --check`, and `npx supabase db push --dry-run` PASS. After changing the guard lock to avoid concurrent lock upgrades, `npx vitest run tests/migrations.test.ts --maxWorkers=1` PASS. Migration test exercises archived meter inserts/updates and vehicle edits, followed by restore; foundation test verifies archived switcher exclusion. Dry-run lists pending 013–016; no hosted database changes were made. Full local Supabase/RLS remains blocked by unavailable Docker. Browser/physical Android interaction, full format check and native build were not performed for this change.

## Garage card edit alignment — 2026-11-05

Adjusted `src/features/garage/screens.tsx` so all vehicle cards reserve the same right-hand space for the edit action and use the same minimum content height; the owner edit icon sits at the lower right beside the vehicle information without adding an extra row. Pilot and archived cards use the same content layout without an edit action. `npm run typecheck`, targeted ESLint and Prettier, and `git diff --check` PASS. Inspected the running browser garage with two owner cards and verified the icon placement. Pilot-card visual and physical Android checks were not performed; no native build or backend change was made.

## Record form error feedback — 2026-11-05

Added `src/components/ui/FormError.tsx` and updated `src/features/records/screens.tsx` to place a dismissible, red-bordered, accessible error message beside the fixed Save action rather than below the form with a Retry button. Validation errors mark their associated fields, clear field errors when edited, and mark the fill-time confirmation when required. Saving remains the retry path for write/network failures; data-loading errors retain their existing retries. No meter-reading placement or database behavior was changed.

Validation: `npm run typecheck`, `npm run lint`, `npx prettier --check src/components/ui/FormError.tsx`, `npm test -- --maxWorkers=1` (69 tests), `npx expo config --type public`, and `git diff --check` PASS. The browser opened a fuel form, but the validation interaction timed out and the final visual state was not verified. Physical Android interaction, full formatting check and a native build were not run. No record was intentionally submitted or changed during verification.

## Authentication and onboarding review — 2026-11-05

Created `docs/AUTH_ONBOARDING_FLOW.md` listing session restoration, login, signup/verification, optional email-code sign-in, password recovery, Google callback, profile setup, Home/garage and vehicle creation. Simplified `src/features/auth/PasswordScreen.tsx` to collect email and password on one signup screen before verification and show concise dismissible authentication errors. Updated `src/features/auth/routing.ts` and `app/_layout.tsx` to gate incomplete profiles on restored sessions and app deep links, preserve password recovery/legal, and offer retry on profile-load failure. Removed forced dark theme during session restoration; `src/lib/themeMode.ts` resolves System to device appearance or light when unavailable. Added route and theme tests. No auth provider, database migration, user data or existing verified grant logic was changed. A separate currency selector remains unimplemented and profile icons still depend on pending migration 015.

Validation: `npm run typecheck`, `npm run lint`, targeted Prettier, `npm test -- --maxWorkers=1` (73 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-auth-flow`, `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --offline`, and `git diff --check` PASS. The root-layout trim adjustment received subsequent typecheck and targeted ESLint; Android export ran concurrently with it. `npm run format:check` FAIL on eight already-unformatted files including the existing English catalog; targeted formatting for the other changed files PASS. Full local Supabase/RLS remains BLOCKED by unavailable Docker. No live Google/OTP/password/signup or Android device interaction was tested; the native build is debug only.

## More profile shortcut — 2026-11-05

Made the profile/name area at the top of More an accessible button that opens `/settings/profile` through the existing drawer navigation, with a chevron indicating the action. Updated `src/features/navigation/MoreMenu.tsx`. Targeted Prettier and ESLint, `npm run typecheck`, and `git diff --check` PASS. Browser and device interaction were not tested; no native build or backend changes were made.

## Reports and exports — 2026-11-05

Updated `src/features/reports/screens.tsx`, `export.ts`, and `csv.ts`; added `reportData.ts`, `reportHtml.ts`, and `tests/reportData.test.ts`. Reports now presents period selection, export actions and a summary derived from the same calculation as exports. JSON includes full authorized structured records, observations and intervals; CSV provides a filterable row-type table with payload fields as columns and spreadsheet-formula protection; PDF includes metadata, summary and full record and interval details. Exports reload authorized data and recheck vehicle permissions. Intervals are grouped by closing date and may start before the period. See `docs/DECISIONS.md` for scope and field semantics. No migration or hosted change was made.

Validation: `npm run typecheck`, `npm run lint`, targeted Prettier, `npm test -- --maxWorkers=1` (80 tests), `npx expo config --type public`, and `git diff --check` PASS. Tests cover calendar boundaries, cross-period intervals, permission-limited intervals, CSV formula protection and PDF HTML escaping. PDF print/share layout, CSV import in external spreadsheet apps, authenticated hosted data, browser and physical Android interactions were not tested; no Android build or local Supabase/RLS run was performed for this change.

## Help, settings and account guidance — 2026-11-05

Added grouped accessible FAQ content in `src/features/help/` and routed `app/settings/help.tsx` to it. Expanded the pre-release privacy and terms in `src/features/auth/screens.tsx`; replaced the security screen with actionable guidance and added `src/features/auth/DeletionScreen.tsx` and `app/settings/deletion.tsx` for status and the existing deletion request RPC. Settings now saves one System/Light/Dark theme in the existing profile field; removed the duplicate profile appearance controls. More drawer contains a fixed sign-out action. Updated `src/features/auth/profile.ts`, `settings.tsx`, `SignOutButton.tsx`, `SecurityScreen.tsx` and `src/components/navigation/MoreDrawer.tsx`. Added `docs/REMINDERS_PLAN.md` and updated decisions. No schema migration, deletion automation or reminder scheduling changes were made.

Validation: `npm run typecheck`, `npm run lint`, targeted Prettier, `npm test -- --maxWorkers=1` (80 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-help-export`, and `git diff --check` PASS. Hosted deletion requests, sign-out, theme persistence, TalkBack, PDF/legal review, local notifications and physical Android interaction were not tested. Android export is a JavaScript bundle, not a native build. The operator must review and publish legal/privacy text and configure and verify a real deletion/anonymization and retention process before public release; the existing RPC records a request and revokes access but does not itself complete account deletion.

## Vehicle member management UI — 2026-11-05

Reworked `src/features/members/screens.tsx` and added `MemberControls.tsx`, `permissions.ts` and `tests/memberPermissions.test.ts`. The vehicle-specific page separates active and revoked members from unresolved email grants; grant and member dialogs explain Owner/Pilot roles, inherited versus customized Pilot permissions, and offer explicit cancel, save, revoke or restore actions. Promotion to Owner, revocation, restoration and cancellation of a pending grant require confirmation. Protected primary administrator and archived vehicle controls are disabled. Fixed prior UI behavior that copied defaults into member overrides on save, and prevented ordinary Save from silently restoring a revoked member. `api.ts` development-mode revocation now also marks resolved grants revoked. No backend policy or migration was changed.

Validation: `npm run typecheck`, `npm run lint`, targeted Prettier, `npm test -- --maxWorkers=1` (82 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-members-export`, and `git diff --check` PASS. The running browser was checked at `/owner/members` and showed the updated no-vehicle state and Open Garage action. The current account had no accessible vehicle, so real member/grant dialogs, save/revoke/restore operations, hosted permissions, TalkBack and physical Android interaction were not exercised. Android export is a JavaScript bundle, not a native build.

## Vehicle details and member access — 2026-11-05

Embedded `VehicleMembersSection` from `src/features/members/screens.tsx` in the matching Owner vehicle detail (`src/features/garage/screens.tsx`). The old member route resolves the explicit vehicle without fallback and redirects to its detail page, preserving `add=1`; the duplicate member shortcut was removed from the detail header. Active member rows summarize their role and effective Pilot fuel/expense/meter permissions, including inherited defaults. `src/components/ui/premium.tsx` accepts an explicit accessibility label for those summaries, and `tests/memberPermissions.test.ts` covers the summary logic. Existing role checks, server RPCs, protected admin and archived-vehicle behavior remain in place.

Validation: `npm run typecheck`, `npm run lint`, targeted Prettier, `npm test -- --maxWorkers=1` (83 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-combined-export`, and `git diff --check` PASS. The export and full suite ran before a final small change to suppress Pilot permission summaries until policy verification; subsequent TypeScript, targeted ESLint and formatting checks PASS. Browser inspection confirmed the member section is absent on an accessible Pilot vehicle. The specified vehicle did not open in the current Pilot session, and an Owner vehicle/session was not available to visually verify embedded member controls or perform live access mutations. No native build, hosted policy test, or physical-device check was performed; Android export is a JS bundle.

## Profile icon database fix — 2026-11-05

The linked database lacked `profiles.avatar_icon`. Applied only the existing `supabase/migrations/202611050015_profile_icons.sql` and its `supabase_migrations.schema_migrations` record atomically, then notified PostgREST to reload. Verified the column is non-null, the allowlist constraint exists, authenticated has column update privilege, and migration 015 is recorded. Did not modify individual profiles. Updated `src/features/auth/settings.tsx` to re-fetch stale profile capability metadata during save without discarding the form. Existing migrations 013, 014, 016 and 017 remain pending; because 015 was applied out of order, plain `supabase db push --dry-run` reports missing earlier migrations. `npx supabase db push --dry-run --include-all` PASS and lists precisely those four pending migrations; review them before any future `--include-all` deployment.

Validation: `npm run typecheck`, targeted ESLint and Prettier, `npx vitest run tests/migrations.test.ts --maxWorkers=1` PASS, plus the linked database read-only metadata verification above. Anonymous PostgREST profile access returned HTTP 401 (42501), as expected for its access scope; an authenticated icon update was not exercised, and the user's unsaved profile form was not submitted. Full hosted RLS testing, native build and device testing were not performed.

## Report export buttons — 2026-11-05

Added `src/features/reports/ExportActions.tsx` and updated `src/features/reports/screens.tsx` to show three equal-width JSON, CSV and PDF actions with larger icons and distinct gradients. The existing handlers, busy/permission gates and accessible export labels remain in place. `npm run typecheck`, targeted ESLint and Prettier, and `git diff --check` PASS. The current browser session has Pilot access without Reports permission, so the export card was not visually inspected or exercised; no Android device or native build was tested for this presentation change.

## Profile country database fix — 2026-11-05

Applied only the existing `supabase/migrations/202611050017_profile_country.sql` to the linked database, recorded its history entry in the same transaction and requested PostgREST schema reload. Verified the column, allowed-country constraint, authenticated column update privilege and recorded migration. No profile country was set on a user's behalf. `npx supabase db push --dry-run --include-all` PASS and lists pending migrations 013, 014 and 016; an earlier concurrent dry run failed CLI login authentication, and the sequential retry passed. `npx vitest run tests/migrations.test.ts --maxWorkers=1` and `git diff --check` PASS. The PGlite test covers valid/invalid country and another user's row, but an authenticated hosted form submission and device interaction were not exercised.

## Sign-in and sign-up redesign — 2026-11-05

Added `src/features/auth/PremiumAuth.tsx`, `PremiumPasswordScreen.tsx`, and a copy of the user-supplied hero at `assets/images/auth/gaadipulse-auth-hero.png`. Updated `PasswordScreen.tsx`, `passwordApi.ts`, `passwordSchema.ts`, `settings.tsx`, `src/lib/i18n.ts` and `tests/passwordAuth.test.ts`. Sign-in and sign-up use a shared responsive hero, app logo, themed form and feature strip; sign-up collects and validates a name and sends it as Auth metadata for profile prefill. Existing Google, password, signup verification and recovery APIs remain in use. Privacy/terms acceptance gates sign-up in the UI but is not recorded as a server-side consent audit. The email-code option was removed from the sign-in UI; the underlying route remains. The retired Daily Progress feature is not advertised.

Validation: `npm run lint`, `npm run typecheck`, `npm test -- --maxWorkers=1` (84 tests), targeted Prettier, `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-auth-redesign`, and `git diff --check` PASS. Browser inspection showed the redesigned sign-in and sign-up forms, and the privacy/terms link opened the legal screen; no credentials were submitted and no account was created. Live Google OAuth, email signup/verification, password login, keyboard behavior, small Android widths, accessibility service and physical device were not tested. Android export is a JS bundle, not a native build. Existing OAuth provider, redirect and email-template setup must be verified by the operator, and the pre-release privacy and terms require operator review before public distribution.

## Authentication hero spacing — 2026-11-05

Updated `src/features/auth/PremiumAuth.tsx` so the sign-in/sign-up hero fills the available width and reaches the top of the app surface. The brand overlay sits lower and uses safe-area insets; the loading line overlays the hero rather than reserving vertical space. Form content remains width-limited. `npm run typecheck`, targeted ESLint and `git diff --check` PASS. Browser inspection of the sign-up page confirmed the hero reaches the top and sides; native status-bar and Android device layout were not tested. No native build was run for this presentation change.

## First-time onboarding — 2026-11-05

Added `docs/plan/PROFILE_ONBOARDING.md`, `app/onboarding/index.tsx`, `src/features/auth/OnboardingScreen.tsx`, `onboardingDefaults.ts`, `data/country-timezones.json` and `tests/onboardingDefaults.test.ts`; updated routing, root guard, English strings, auth route tests and timezone-data documentation. New accounts without a name are routed to the one-page onboarding form, while existing accounts and legal/recovery paths remain supported. Country and timezone are suggestions that can be changed; manual timezone choices are preserved. Name is required by the existing profile gate, country and vehicle creation are optional. Currency selection is NOT implemented: the screen states the existing INR-only ledger limitation; the separate multicurrency plan remains outstanding. No database migration or hosted changes were made.

Validation: `npm run typecheck`, targeted ESLint and Prettier, `npm test -- --maxWorkers=1` (86 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-onboarding`, and `git diff --check` PASS. After export, a small banner contrast adjustment received subsequent typecheck and targeted ESLint. Full `npm run lint` FAIL on an existing unused `router` import in `src/features/auth/AuthLayout.tsx`, outside this change. No first-time live login, onboarding save, browser visual, physical Android interaction or native build was tested; Android export is a JS bundle.

## Onboarding hero illustration — 2026-11-05

Updated `src/features/auth/OnboardingScreen.tsx` to use the user-supplied `assets/media/Premium Fleet Management Onboarding Illustration.png` as the onboarding banner. TypeScript, targeted ESLint, `git diff --check`, and `npx expo export --platform android --output-dir /tmp/gaadipulse-onboarding-illustration` PASS. Browser/device visual inspection was not performed. The supplied image contains a Daily Progress label; that feature remains retired as recorded in `docs/DECISIONS.md`.

## Fixed vehicle currency — foundation only, incomplete — 2026-11-05

Added `docs/plan/FIXED_VEHICLE_CURRENCY.md`, `src/utils/currency.ts`, `tests/currency.test.ts` and additive `supabase/migrations/202611050018_currency_foundation.sql`; extended `tests/migrations.test.ts`. Migration 018 defaults existing vehicles and profile preferences to INR, enforces immutable vehicle currency, rejects non-INR currency requests, and restricts direct execution of the renamed legacy save function. No linked database change was made. Standalone exact minor-unit parsing, formatting and fuel arithmetic supports an initial test catalog (INR/USD/JPY/KWD); it is not integrated into the app. Vehicle currency picker and remembered preference, versioned permission-protected read/write paths, currency-aware ledger/forms/history/reports/exports, legacy-client isolation, actual non-INR and authenticated/device verification remain unimplemented. The INR gate must remain until those are complete and tested.

Validation: `npm run typecheck`, targeted ESLint and Prettier, `npm test -- --maxWorkers=1` (90 tests), PGlite full migration-chain test including authenticated legacy save and non-INR rejection, and `git diff --check` PASS. `npx supabase db push --dry-run --include-all` PASS lists pending 013, 014, 016 and 018; none was pushed. The full suite preceded one additional successful targeted migration-chain test of the legacy save wrapper. PGlite is not hosted Supabase/RLS proof. Full local Supabase, old-client compatibility, Android build/device and live writes were not tested. Do not treat this foundation as completed multi-currency support.

## Brand assets and main-screen loading — 2026-11-05

Applied the supplied logo variants through `src/lib/assets.ts`, the app header, auth, onboarding and About. `scripts/build-brand-assets.mjs` generates the launcher, adaptive foreground, favicon and notification icon referenced by `app.config.ts`; `--android` also refreshes the ignored local Android resource tree and notification icon metadata. Added `src/components/ui/PageSkeleton.tsx` and integrated pending states into Garage, Home, dashboard and records screens. Errors and retry actions remain available, including Pilot activity errors. See `docs/plan/BRAND_AND_LOADING.md` and `docs/ASSET_MANIFEST.md`. No database change was made.

Validation: `npm run typecheck`, `npm run lint`, targeted Prettier, `npm test -- --maxWorkers=1` (90 tests), `npx expo config --type public`, `npx expo export --platform android --output-dir /tmp/gaadipulse-brand-export`, and `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --offline` PASS. An initial test run timed out in a PGlite test while concurrent build checks were running; the full rerun passed. Expo export and native build preceded a final accessibility-label adjustment to the Home header. The debug APK was built but not installed or tested on a physical device. The browser session encountered a profile loading/network error, so authenticated main-screen visuals, vehicle switching, reduced motion and TalkBack were not verified. Rebuild and install the app to see updated native launcher and splash assets; the ignored Android tree must be regenerated or refreshed separately on other machines. No hosted database/RLS test was run for this presentation change.
