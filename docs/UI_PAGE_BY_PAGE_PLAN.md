# GaadiPulse — page-by-page UI improvement plan

Date: 24 October 2026  
Status: planning only; implementation has not started under this plan.

## Objective and scope

Bring every page to the visual and interaction standard established by Home and the refreshed Fuel/Expenses cards: clear hierarchy, vehicle identity, appropriate artwork, coordinated gradients, colorful icons, compact readable cards and well-organized forms. Improve the task flow as well as appearance. Keep existing authenticated persistence, offline drafts, permissions, validation, audit history and navigation working.

This document is the implementation backlog and page review checklist. Each page needs a source review, implementation, visual review and behavior verification before it is complete. Existing styling in code is not evidence that a page looks correct on a device.

## Audit basis and current findings

Reviewed route inventory, PROJECT_REFERENCE.md, START_HERE, Stage 1–3 handoffs, SCREEN_MAP, design-system docs and source for shared UI, vehicle headers, garage, records, owner controls, progress, auth, settings, reports and meters. This is a source audit, not an Android/browser visual audit. Existing staged changes are preserved.

Current baseline:

- Home already uses a gradient vehicle hero, subtype illustration, latest-reading cards and colorful actions. Preserve this direction and the user's approved Home layout.
- Fuel/Expenses share RecordCard and RecordSummary, search, filters and status badges. These are partly refreshed; their entry, detail and analytics views still need individual review.
- Garage already has image cards and a six-step wizard with a gradient footer. Refine consistency rather than rebuild it.
- VehicleHeader already displays name, role, meter mode and subtype art; only its hero variant uses a gradient. Most secondary consumers use the plain variant.
- Members already has colorful grant controls and expandable sections, but needs a clearer membership/permissions workflow.
- Progress Builder already supports drafts, templates, field editing, preview, versions and publish. Its presentation remains a long configuration screen; templates are stacked text buttons without subtype images.
- Reports, Maintenance, meter history, profile/settings and record screens contain some shared cards/rows. Shared controls alone do not establish a consistent finished layout.
- Sync is an operational card list needing clearer queue status and recovery hierarchy.
- Auth uses existing illustrations and inputs; it needs coordinated composition across all modes.

The actual owner builder route is `/owner/form-builder`, not `/owners/form-dashboard`. A separate dashboard route is not required to improve this page.

## Shared visual and interaction rules

### Color and surfaces

Keep neutral readable page backgrounds and cards. Give each module one coordinated accent family, with stronger gradients reserved for its lead summary or primary action. Avoid filling every field or card with gradients.

| Module          | Direction                          | Icons and purpose                  |
| --------------- | ---------------------------------- | ---------------------------------- |
| Home / Garage   | Existing forest–emerald–teal       | Vehicle identity, navigation       |
| Fuel            | Teal–cyan–blue                     | Pump/charge, quantity, consumption |
| Expenses        | Violet–indigo                      | Wallet, categories, paid amounts   |
| Meters          | Blue–cyan; violet for hours        | Speedometer, clock, observations   |
| Daily Progress  | Emerald–cyan                       | Checklist, route, submission state |
| Documents       | Blue–indigo                        | Document, reference, expiry        |
| Reminders       | Amber–coral                        | Calendar, alarm, due state         |
| Members         | Violet–blue                        | People, roles, access              |
| Form Builder    | Indigo–violet                      | Templates, fields, versions        |
| Reports         | Cyan–indigo                        | Trends, summaries, export          |
| Maintenance     | Amber–teal                         | Tools, service timeline            |
| Settings / Auth | Brand emerald with restrained blue | Account, preferences, security     |

Use semantic success/warning/error styling separately from module accents. Status always includes text/icon, not color alone. Define named light/dark token pairs rather than spreading hardcoded palettes through screens. Verify text contrast over every gradient; vivid yellow/coral should generally be a tint or icon background, not white-text body surfaces.

### Vehicle name and images

Use existing `vehicleArt(category, subtype)` and the static asset registry. The asset pack documents 43 subtype illustrations, including motorcycles, scooters, electric variants, cars, trucks, tractors and machinery. Use `contain` with a consistent image stage; preserve the whole vehicle.

- Vehicle-specific pages: show vehicle identity immediately below the header. Browsing pages may use a compact hero; forms need a smaller identity card so inputs remain visible.
- Display nickname first, registration when available, then make/model/subtype as supporting information. Add a localized subtype/category fallback so unnamed machinery never renders a blank title.
- Show Owner/Pilot and KM/HOURS/BOTH where relevant. Do not expose financial summary values through a generic header.
- New entries may switch vehicle before saving, respecting existing draft behavior. Existing records retain their original vehicle and must not follow a later active-vehicle switch.
- Single-vehicle accounts have no redundant switch affordance. Multi-vehicle switcher rows show each name and subtype image.
- Unknown subtypes use a safe bundled fallback. Asset lookup remains static and Metro-compatible.
- These are representative subtype illustrations, not an exact make/model photo or a user-uploaded vehicle photograph. Real photo capture/upload stays deferred.
- Account-wide pages use brand/account imagery rather than attaching an unrelated active vehicle.

### Forms and details

- Organize by task: essential inputs first; optional details in labeled sections. Auto-expand sections containing validation errors.
- Keep visible labels, required indicators, helper text, field-specific keyboards and inline errors. Move focus/scroll to the first invalid input where practical.
- Reuse NumericValueField, DatePickerField, Timestamp, SearchField, FilterChips and AdditionalOptions rather than create parallel input systems.
- Use a fixed keyboard-aware primary action with busy state and duplicate-submit protection. Secondary actions must not compete visually.
- Preserve drafts and confirmation on navigation/vehicle changes. Distinguish locally saved/pending from server-confirmed success.
- Details start with the important value/status/date, followed by grouped metadata, provenance and actions. Destructive controls live in a separate section.
- Unknown values display as unknown/pending, never invented zeroes. Money stays in paise; visible readings retain their observation timestamps.
- No placeholder charts, fake loading percentages or decorative controls with no behavior.

### Layout, navigation and states

Use consistent gutters, spacing, radius, icon size and typography. Support 320–360dp widths, safe areas, large fonts and Android keyboard/back. Multi-column cards collapse when width or font scaling makes them crowded. Keep existing floating navigation on browsing routes and focused forms outside it. More remains the existing left drawer.

Every page needs loading, empty, no-search-results, permission-denied, offline/pending and retry states where applicable. Use existing module empty-state artwork, including document/reminder assets where appropriate. Keep reduced-motion behavior and accessible labels. Do not render unauthorized summaries while permissions are loading.

## Page-by-page backlog

Status labels below describe source implementation: **baseline** = established visual direction; **partial** = some refreshed components; **needs composition** = existing behavior requires a fuller layout pass. All visual QA is pending.

### Main tabs

| Page / route                      | Current source  | Planned work                                                                                                                                | Acceptance focus                                                                         |
| --------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Home — `/(tabs)`                  | Baseline        | Preserve approved hero/cards. Only align shared fixes, image/title fallbacks and responsive spacing.                                        | No regression for zero/one/multiple vehicles, roles or hidden financial data.            |
| Fuel tab — `/(tabs)/fuel`         | Partial         | Retain record cards; coordinate cyan summary, search/filter layout, reading-pending badges and prominent permitted add action.              | Full/partial/charge entries, unknown mileage, pending sync remain truthful.              |
| Expenses tab — `/(tabs)/expenses` | Partial         | Retain cards; coordinate violet summary, category icons and compact period/category filters. Distinguish operating costs from cash outflow. | EMI and category totals keep existing accounting semantics.                              |
| More — `/(tabs)/more`             | Partial, drawer | Polish current left drawer, grouped colored icons, active-vehicle identity where relevant, role labels and long-label spacing.              | All existing destinations remain reachable; Back/backdrop closes; permissions preserved. |

### Authentication

| Page / route                            | Current source          | Planned work                                                                                                            | Acceptance focus                                                             |
| --------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Welcome — `/auth/welcome`               | Existing onboarding art | Brand gradient introduction, balanced illustration/text area, clear page indicator and Continue/Sign in hierarchy.      | Three steps, large text and short devices; no fake progress.                 |
| Email/Google login — `/auth/login`      | Existing controls/cards | Branded introduction, distinct Google action, labeled email form and compact alternate auth links.                      | Existing provider/error/retry behavior; no secret exposure.                  |
| OTP verification — `/auth/verify`       | Needs composition       | Code-focused card, masked destination, clear resend timer and Change email action.                                      | Paste, numeric keyboard, expiration, failed verification and resend lockout. |
| Password login — `/auth/password`       | Shared PasswordScreen   | Match login composition; accessible show/hide control and recovery link.                                                | Keyboard, invalid credentials, busy state.                                   |
| Sign up — `/auth/signup`                | Shared PasswordScreen   | Clear email → verification → password stages; password help and confirmation grouped.                                   | Stage-specific errors and back navigation preserve correct state.            |
| Reset password — `/auth/reset-password` | Shared PasswordScreen   | Recovery-stage explanation, code/password sections and clear completion.                                                | Existing recovery flow remains intact; no false success.                     |
| Legal — `/auth/legal`                   | Local text              | Readable headings, paragraph spacing and clear pre-release context. Keep legal content readable rather than decorative. | Large-font scrolling and Back; no invented legal assurances.                 |
| OAuth callback — `/auth/callback`       | Technical route         | Compact brand loading/recovery screen matching auth.                                                                    | Real callback errors provide retry/back; no endless loading.                 |

### Garage

| Page / route                       | Current source          | Planned work                                                                                                                     | Acceptance focus                                                                  |
| ---------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Vehicle list — `/garage`           | Partial image grid      | Refine image stages, title/registration hierarchy, role/archive badges and responsive grid.                                      | Long vehicle names, all subtype families, no-result state.                        |
| Add vehicle — `/garage/add`        | Partial six-step wizard | Polish all six steps consistently: category, subtype, make/model, details, meters, review. Keep image choices and raised footer. | Back/Continue, defaults, custom models, drafts and validation.                    |
| Vehicle details — `/garage/[id]`   | Partial                 | Named image hero, identity/specification groups, colored feature actions and separate owner management section.                  | Route-specific vehicle stays fixed; archive/recover confirmation and access work. |
| Edit vehicle — `/garage/edit?id=…` | Shared wizard           | Reuse add styling with clear edit context and existing values; make meter/energy changes understandable.                         | Preserve historical data, drafts and current validation.                          |

### Fuel

| Page / route                          | Current source      | Planned work                                                                                                                                           | Acceptance focus                                                                |
| ------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| History — `/records/fuel`             | Shared with tab     | Same layout as Fuel tab; no second independent design.                                                                                                 | Deep-link vehicle context and pagination.                                       |
| Add — `/records/fuel/add`             | Partial shared form | Compact vehicle art card, amount/quantity/unit-price group, clear computed value, full/partial control, optional reading and payment/station sections. | Any-two calculation, correct energy/unit, save without meters and Save another. |
| Edit — `/records/fuel/edit?id=…`      | Same form           | Show edit state and current values; retain original vehicle and correction semantics.                                                                  | Revision conflicts, observation confirmation, no duplicate write.               |
| Details — `/records/fuel/[recordId]`  | Shared detail       | Cyan lead card, full/partial status, amount/quantity/rate, station/payment, reading provenance and grouped edit/archive actions.                       | Missing reading stays pending; no unsupported mileage claim.                    |
| Analytics — `/records/fuel/analytics` | Existing analytics  | Clear period/filter block, consumption/cost cards, qualifying interval list and readable coverage explanations.                                        | Full-to-full, partial accumulation and hours metrics; unknown remains unknown.  |

### Expenses

| Page / route                              | Current source      | Planned work                                                                                                                               | Acceptance focus                                                                                               |
| ----------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| History — `/records/expenses`             | Shared with tab     | Same Expenses-tab composition with category icon hierarchy.                                                                                | Scoped filters and pagination.                                                                                 |
| Add — `/records/expenses/add`             | Partial shared form | Amount-first layout, category chips, title and date; category-adaptive details in sections. Improve custom-category and line-item editors. | Service/repair/tyres/battery/insurance/EMI/document/toll/parking/wash/accessories/tax/permit/fine/other paths. |
| Edit — `/records/expenses/edit?id=…`      | Same form           | Match add, preserve existing category-specific data and display edit context.                                                              | Paise, line-item totals, EMI split and conflicts.                                                              |
| Details — `/records/expenses/[recordId]`  | Shared detail       | Violet lead amount card, category/vendor/payment, itemized breakdown, meter provenance and linked-reminder action.                         | No double counting; principal/interest remain explicit.                                                        |
| Analytics — `/records/expenses/analytics` | Existing analytics  | Coordinated totals and category breakdown rows with meaningful labels and period coverage.                                                 | Cash versus operating totals and permissions.                                                                  |

### Meter readings

| Page / route                                   | Current source      | Planned work                                                                                                                 | Acceptance focus                                                 |
| ---------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Meter records — `/records/meters`              | Generic record list | Blue/cyan reading summary and clear distinction from canonical observation history.                                          | Record source, observation time and reading type remain visible. |
| Add reading — `/records/meters/add`            | Shared form         | Compact vehicle card; KM/HOURS/BOTH input group, prominent observed date/time, optional explanation and owner reset section. | At least one valid reading; no future observation.               |
| Edit reading — `/records/meters/edit?id=…`     | Shared form         | Correction-focused layout, original observation context and clear validation.                                                | Existing revision/reset rules and audit retained.                |
| Reading details — `/records/meters/[recordId]` | Shared detail       | Reading value/unit first, observed versus entered timestamps, source and correction state.                                   | Do not confuse recorded time with observed time.                 |
| Meter history — `/meters/history`              | Partial ReadingCard | Preserve compact cards; add clear KM/HOURS hierarchy, measured interval cards and grouped correction/retraction controls.    | Resets, chronology, gaps and retained historical values.         |

### Daily Progress

| Page / route                             | Current source        | Planned work                                                                                                                         | Acceptance focus                                                          |
| ---------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| History — `/records/progress`            | Generic cards/filters | Progress-specific date/status cards, submitter and version information where authorized.                                             | Pilot sees permitted entries; no owner-only answer leakage.               |
| Add — `/records/progress/add`            | Dynamic form          | Vehicle identity, policy-aware Today/Yesterday date row, meter section, custom fields grouped by task, notes and submission summary. | All field types, vehicle timezone, backdate policy, offline drafts.       |
| Edit — `/records/progress/edit?id=…`     | Shared dynamic form   | Clearly show correction request and original schema version; same grouped input styling.                                             | Historical forms render against their original version.                   |
| Details — `/records/progress/[recordId]` | Shared detail/review  | Status banner, answer sections, submitter/timestamps, review history and compact owner review panel.                                 | Approve/reject/request correction and restricted fields.                  |
| Approval queue — `/progress/approvals`   | Prefiltered history   | Queue-specific heading, pending status and clear entry-to-review action; reuse progress cards.                                       | Owner access and server-backed transitions; no new bulk approval implied. |

### Documents

| Page / route                                  | Current source       | Planned work                                                                                          | Acceptance focus                                                           |
| --------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| List — `/records/documents`                   | Generic cards        | Blue document-type icons, expiry/date hierarchy, meaningful no-expiry label and document empty art.   | Access and expiry values; no fake file thumbnails.                         |
| Add details — `/records/documents/add`        | Shared metadata form | Group document type/title/reference, expiry and notes. Explicitly explain metadata-only storage.      | Existing supported metadata, validation and save; upload remains deferred. |
| Edit details — `/records/documents/edit?id=…` | Shared form          | Same groups with original values and clear edit state.                                                | Permission, revisions and data retention.                                  |
| Details — `/records/documents/[recordId]`     | Shared detail        | Reference/expiry information, notes and external official-reference actions in a clean document card. | No claim that locally entered metadata is legally verified.                |

### Reminders

| Page / route                              | Current source   | Planned work                                                                                          | Acceptance focus                                          |
| ----------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| List — `/records/reminders`               | Generic cards    | Amber/coral due-state cards, date versus meter thresholds and recurrence labels.                      | Overdue/upcoming/completed semantics use real data.       |
| Add — `/records/reminders/add`            | Shared form      | Title, due date and/or meter threshold, recurrence, visibility and optional notes in distinct groups. | Correct vehicle meter mode and existing recurrence rules. |
| Edit — `/records/reminders/edit?id=…`     | Shared form      | Same composition with current scheduling values.                                                      | No accidental duplicate notification scheduling.          |
| Details — `/records/reminders/[recordId]` | Existing actions | Clear due conditions, status, completion/snooze actions and notification permission recovery.         | Existing authorization and actual platform scheduling.    |

### Owner tools — first implementation priority

| Page / route                               | Current source            | Planned work                                                                                                                                                        | Acceptance focus                                                                                                       |
| ------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Members and permissions — `/owner/members` | Partial expandable cards  | Vehicle hero; separate Members, Pending email grants and Default Pilot access sections; compact role cards and guided grant/edit panels.                            | Verified-email automatic grants, primary-admin protection, last-owner protection, revocation and permission overrides. |
| Form Builder — `/owner/form-builder`       | Long configuration screen | Recompose as an owner workspace with image-led template chooser, ordered field cards, grouped policy settings, Pilot preview and versions. See detailed plan below. | Preserve drafts, original field IDs, immutable versions, permissions and publish API.                                  |

#### Form Builder implementation specification

1. **Vehicle context:** compact indigo/violet vehicle hero with real name, subtype illustration and role. Switching vehicle keeps the current draft protections.
2. **Workspace overview:** show existing published version, editable draft state and custom-field count from real local/server data. Do not invent a completion percentage or saved timestamp.
3. **Template chooser:** replace seven stacked template buttons with responsive image-led cards for Two-wheeler, Car, Commercial, Agriculture, Machinery, Taxi and Custom. Use representative bundled subtype art and concise descriptions. Recommend the matching category while keeping selection explicit.
4. **Template behavior:** current two-wheeler/car templates only create a Notes field; commercial/agriculture/machinery/taxi have different starter fields. Show the actual starter contents. Applying a template can replace fields, so show a clear replacement confirmation when a draft already has fields. Do not silently apply a recommended template or invent unsupported separate scooter/motorcycle business schemas.
5. **Workspace sections:** Templates → Fields → Submission rules → Preview → Versions. These can be local section controls on the existing route, not new backend entities. Preserve visibility of errors and draft state across sections.
6. **Field list:** compact numbered cards with type icon, label, required/visibility/reportable badges and an obvious Edit action. Keep accessible Move up/Move down, Duplicate and Remove actions; drag-and-drop is optional and not needed for completion.
7. **Field editor:** labeled groups for identity/helper, field type, options/default, constraints, visibility and reporting. Show only applicable settings. Use existing schema types and validators. Min/max/default numeric errors stay inline. Prevent destructive type changes from appearing to retain incompatible answers/settings.
8. **Submission rules:** group backdate window, review requirement, meter requirements and notes visibility/requirement. Only show meter requirements compatible with KM/HOURS/BOTH. Photo requirement remains clearly deferred.
9. **Pilot preview:** show vehicle context and standard system fields along with custom fields, so the preview resembles submission. Clearly mark it as preview; preview cannot create an actual record. Check that owner-only fields follow the intended Pilot visibility semantics.
10. **Publish:** stable primary action, clear version-creation explanation, busy lock, validation summary and retry. Do not add extra mandatory confirmations for routine saving unless needed for a concrete destructive change.
11. **Versions:** compact version/date/published rows with existing snapshot inspection behavior. No rollback or editable published history unless already supported.
12. **Empty/error states:** useful empty custom form, no vehicle, denied access, failed load/draft save/publish and offline behavior. Preserve server authority and immutable schema history.

### Reports and Maintenance

| Page / route                 | Current source                 | Planned work                                                                                                                                                                                 | Acceptance focus                                                                                       |
| ---------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Reports — `/reports`         | Partial summaries/cards/export | Named vehicle header, compact period filters, coordinated cash/operating/fuel cards, measured-distance coverage and grouped custom-field/member summaries. Export in its own action section. | Real totals only, reportable field aggregation, CSV/JSON/PDF actual behavior and export authorization. |
| Maintenance — `/maintenance` | Expense-backed RecordCards     | Amber/teal service history, category icons, service date/amount, permitted Add maintenance and useful empty illustration/action.                                                             | Links remain original expense records; no duplicated financial entries.                                |

### Settings and support

| Page / route                             | Current source             | Planned work                                                                                                                                       | Acceptance focus                                                                      |
| ---------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Settings — `/settings`                   | Partial colored menu cards | Compact account introduction; consistent Account, Preferences and Support groups with colored icons and helpful subtitles.                         | Correct links, notification recovery, sign out and disabled Hindi.                    |
| Profile/Appearance — `/settings/profile` | Existing inputs/choice     | Account identity card, grouped name/timezone fields, accessible theme choice previews and fixed Save. Use initials, not a fake uploaded avatar.    | Dirty-state confirmation, timezone validation and persisted theme/name.               |
| Security — `/settings/security`          | Existing actions           | Separate password/security actions, deletion explanation and destructive request card; platform settings as a secondary action.                    | Existing ownership dependencies and actual deletion-request behavior.                 |
| Sync Status — `/settings/sync`           | Operational list           | Actual pending/rejected/conflict counts, last successful sync, queue cards, retry actions and structured local/server conflict comparison.         | Draft export/remove, offline retry, revoked access and no silent financial overwrite. |
| Help — `/settings/help`                  | Text/actions               | Scannable task/recovery sections with relevant icons and working in-app links.                                                                     | Help reflects real flows; no invented contact service.                                |
| About — `/settings/about`                | Partial brand cards        | Balanced logo/brand header, concise product information and legal/help links. Only show version/build data if obtained from actual config/runtime. | Accurate product claims and readable legal links.                                     |
| Initial redirect — `/`                   | Technical route            | Retain routing behavior; align startup feedback only if needed.                                                                                    | Authenticated versus signed-out routing remains correct.                              |

## Shared implementation work and file ownership

| Work                | Existing source                                                                       | Planned approach                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Theme and gradients | `src/lib/theme.tsx`, `src/components/ui/GradientSurface.tsx`, `premium.tsx`           | Add named module accent tokens and gradient variants; verify light/dark contrast and consistent corner clipping.                                                   |
| Vehicle identity    | `VehicleHeader.tsx`, `src/lib/assets.ts`, subtype registry                            | Extend shared variants only as needed; centralize reliable title/art fallback. Keep record-specific vehicle binding.                                               |
| Forms               | `src/components/ui/fields.tsx`, NumericValueField, DatePickerField, AdditionalOptions | Reuse existing controls; add a small section wrapper only if multiple pages need it.                                                                               |
| Record composition  | `src/features/records/screens.tsx`, `RecordCard.tsx`                                  | Extract kind-specific presentational sections into feature-owned components where the shared file becomes difficult to review. Preserve APIs/hooks and validation. |
| Owner builder       | `src/features/progress/Builder.tsx`, `DynamicFields.tsx`                              | Extract template cards, field summaries/editors, policy sections and preview composition. Keep builder state/schema behavior intact.                               |
| Members             | `src/features/members/screens.tsx`                                                    | Group grant/member/default panels with existing permission editor.                                                                                                 |
| Other pages         | Garage, auth, meters, reports and sync feature files                                  | Apply the shared visual language in small page-focused changes. Route files remain entrypoints only.                                                               |
| Copy                | `src/lib/i18n.ts`, feature copy catalogs                                              | Localize all new user-facing headings, helper text, errors and accessible labels.                                                                                  |

## Execution order and review checkpoints

Implement one focused batch at a time. Update this plan with source changes and actual verification after each batch.

1. **Foundation alignment:** agree on the named palettes, vehicle-card variants, image sizing and section/form patterns. Preserve Home's approved composition. Make only the shared changes needed by the first page.
2. **First page: Owner Form Builder:** implement the detailed workspace above; review image templates, field editing, rules, preview and publish together. This addresses the explicitly identified older view first.
3. **Owner Members:** align access/grant/default panels with the builder's visual standard.
4. **Daily Progress:** history, submission/edit, detail and approvals, including dynamic field rendering.
5. **Fuel and Expenses:** finish forms/details/analytics while preserving the existing tab/card direction.
6. **Meters:** entry/detail/history and interval presentation.
7. **Documents and Reminders:** metadata, expiry/due states and operational actions.
8. **Garage:** finish list/detail and wizard consistency across all vehicle families.
9. **Reports and Maintenance:** summaries, coverage and export grouping.
10. **Auth, Settings and support:** coordinated layouts and recovery states.
11. **Cross-page review:** navigation, loading, errors, light/dark, assets, large fonts, roles and final consistency. Only necessary shared corrections on Home.

## Verification and completion criteria

For every batch, record changed pages, commands and PASS/FAIL/BLOCKED honestly. A UI-only refresh does not require changing SQL. If authorization, payloads or persistence change, run the relevant backend tests too.

Required implementation checks as appropriate:

- Formatting on changed files; lint; strict TypeScript; existing unit tests relevant to touched behavior. Use repository scripts (`npm run lint`, `npm run typecheck`, `npm test`) and record actual results. Add tests for changed domain behavior or meaningful regressions, not cosmetic snapshots that mirror implementation.
- Expo config validation and Android build smoke test when feasible for release gates. Record environment blockers rather than claim success.
- Visual review on Android at 320/360dp and a larger width, light/dark, large font, keyboard open and reduced motion. Browser review supplements Android; it does not replace it.
- Vehicle matrix: motorcycle, scooter/electric scooter, car, commercial truck/tipper, tractor and excavator; KM/HOURS/BOTH; unnamed/custom vehicle; long name; unknown subtype.
- Access matrix: Owner, authorized Pilot, restricted Pilot, revoked/denied route; one account with different roles per vehicle.
- State matrix: zero/one/multiple vehicles; first load, empty/no results, populated, offline draft/pending, failed request/retry, conflict and validation errors.
- Task flows: switch vehicle, enter/edit/save, duplicate-submit prevention, navigate away with draft, resume draft, approve/correct, export and return/back navigation.

A page is complete only when its intended composition is implemented, existing business actions work, appropriate states/recovery paths are present, image/name/role context is correct and verification status is documented. Runtime-blocked pages remain marked unverified.

## Planning decisions and boundaries

- Deliver this plan as repository Markdown so implementation can track it alongside source. No app code or database changes are part of this planning task.
- Use existing bundled subtype illustrations and brand/empty-state assets. No new image generation, remote manufacturer images or photo-upload implementation is required.
- Reuse dynamic record routes; add dedicated visual compositions where needed rather than duplicate backend logic or create artificial pages.
- Template imagery improves selection; adding new domain templates or fields beyond the existing schema is a separate scoped behavior change.
- No new paid features, Hindi resources, GPS or fake upload controls.
- Visual work must not weaken SQL/RPC financial privacy, verified-identity grants, offline revocation checks, version history or audit provenance.

## Progress tracker

| Batch                              | Status                                       |
| ---------------------------------- | -------------------------------------------- |
| Source audit and page-by-page plan | Complete; runtime visual audit not performed |
| Shared foundation alignment        | Planned                                      |
| Owner Form Builder                 | Planned — first page                         |
| Owner Members                      | Planned                                      |
| Daily Progress                     | Planned                                      |
| Fuel / Expenses completion         | Planned                                      |
| Meters                             | Planned                                      |
| Documents / Reminders              | Planned                                      |
| Garage refinements                 | Planned                                      |
| Reports / Maintenance              | Planned                                      |
| Auth / Settings / Support          | Planned                                      |
| Cross-page visual and behavior QA  | Planned                                      |
