# Architecture decision record

| ID | Decision | Reason |
|---|---|---|
| ADR-001 | Android-first Expo Router + TypeScript | Mobile-first launch with reusable navigation and native build capability |
| ADR-002 | Supabase Auth/Postgres/RLS/Edge Functions | Fits shared-vehicle permissions without a permanently hosted custom API |
| ADR-003 | Local SQLite and idempotent outbox | Offline works for rural/heavy machinery users; prevents duplicate uploads |
| ADR-004 | `OWNER`/`PILOT` roles are per vehicle | One user can own a bike and pilot a truck; many members per vehicle |
| ADR-005 | Auto assignment by verified email | Owner grants without invitation acceptance; protect against email impersonation |
| ADR-006 | KM/HOURS/BOTH at vehicle create/edit | Different machine types, adaptive forms and analytics |
| ADR-007 | Fuel and expenses save without reading | Reduce friction; explicit late observation metadata preserves correctness |
| ADR-008 | Versioned custom Daily Progress forms | Each vehicle collects different trip/site information without losing history |
| ADR-009 | Header progress line shows actual/indeterminate | Honest loading, no fabricated 0–100% |
| ADR-010 | English first; Hindi later | Avoid fake untranslated copy; establish keys and selectable future locales |
| ADR-011 | No user photo capture/upload in first implementation round | Product owner deferred; bundled brand illustration assets are included |
| ADR-012 | Free launch, monetization omitted | Focus on reliability and adoption |
| ADR-013 | No hamburger navigation; four floating tabs | Avoid redundant navigation controls |
| ADR-014 | Current account primary admin is not legal RC owner | In-app control distinct from government vehicle title |

Any new implementation decision should be appended by Codex with date, context, alternatives and consequences. Do not silently override earlier decisions.

| ADR-015 | 2026-10-21: preserve `my docs/` and implement in repository root | The root was empty except the kit; original prompts and assets remain intact. |
| ADR-016 | Expo SDK 58 template and Expo-managed compatible native versions | Installed scaffold selected React 19.3 / RN 0.88; lockfile pins reproducible dependencies. |
| ADR-017 | PostgreSQL RPCs for foundation privileged workflows | Atomic authorization/grants need no service key or Edge Function. |
| ADR-018 | PGlite security tests in addition to required Supabase integration | Docker/Supabase CLI absent; actual PostgreSQL migration and RLS can still be tested, with hosted integration explicitly unverified. |
| ADR-019 | Stage 1 offline garage drafts; collaborative outbox in Stage 3 | Server remains authority for vehicle creation; local draft is never presented as a confirmed vehicle. |
| ADR-020 | PNG rasterizations of supplied SVG illustrations | Android-resolvable bundled assets retain editable vector sources and no runtime SVG-transformer dependency. |
| ADR-021 | Restrict privilege revocation to foundation functions | Avoid changing unrelated public-schema RPCs on a configured Supabase project; every new function has explicit execute privileges. |
| ADR-022 | User explicitly requested debug sign-in bypass | __DEV__ gates a separate local development identity/repository. No Supabase session is fabricated and local test data never uploads. |
| ADR-023 | User explicitly deferred testing during remaining implementation | Stage 2/3 validation is recorded NOT RUN. Prior baseline results are not reused as evidence for changed code. |
| ADR-024 | Owner-only progress answers are redacted in SQL RPC | Direct authenticated SELECT on progress rows/form definitions is revoked; safe reads enforce row scope and remove private answers/fields. |
| ADR-025 | Financial writes use revision checks and payload-bound operation receipts | Retrying the same operation cannot silently replace a different payload or overwrite a newer revision. |
| ADR-026 | Account deletion is a request plus operator retention/anonymization job | Protected administrators must archive their vehicles; ledger attribution UUIDs remain for required operational retention, access is revoked, and a protected Edge job anonymizes/blocks the account. Operator must configure retention/legal contact before release. |
| ADR-027 | PNG artwork remains local; uploads and GPS permissions excluded | Launch uses bundled assets; Print/Sharing exports do not require broad external storage or location access. |

## Page navigation and account exit — 2026-10-21

Secondary pages use the shared PageHeader through Screen, with an accessible top Back action and localized section/title context. URLs, UUIDs and route-group names are not shown as page labels. Primary tabs remain navigation roots. Back follows actual stack history, preserving the originating tab; explicit parent fallbacks cover direct links without history. Vehicle wizard step Back changes the step before leaving the route. Successful vehicle/profile saves return to their caller when history exists.

More exposes sign-out/exit-development at the top, plus Add vehicle, permission-gated Add meter reading and Add maintenance. Vehicle details exposes vehicle-scoped meter and maintenance entry links. Maintenance launches expense entry with SERVICE as its default category; existing drafts take precedence. Confirmation uses browser confirmation on web and native Alert on Android/iOS so sign-out and draft guards have a working confirmation path on both platforms.


## Updated asset pack — 2026-10-24

Use the user's `my docs/assets/` as canonical artwork. Replace obsolete root subtype SVGs with the supplied 43-image v2 PNG/static registry pack. Adapt the supplied combined agriculture/heavy catalog to the five existing persisted categories rather than rewriting saved category IDs. Add Other in every category and retain custom/unknown subtype values with safe illustration fallback. Import scripts copy approved PNGs unchanged instead of regenerating earlier art. Testing remains deferred under the user's explicit instruction.

## Vehicle-specific fuels and compact feedback — 2026-10-24

Separate vehicle powertrain profiles from actual purchased fuels. Fixed profiles show one fuel; dual profiles offer only their configured fuels; units follow the physical fuel. Treat conventional hybrids as engine-fuel-only and use a separate plug-in hybrid option for external charging. Preserve historical fuel types during vehicle configuration changes; enforce new writes in an additive SQL trigger and local development repository.

Use one in-app confirmation host rather than browser confirm dialogs. Flush supported form drafts before leaving. Format timestamps for UI only; keep ISO values in persistence/exports. Compact toasts auto-dismiss three seconds after each message and retain an accessible close target.

## 2026-11-03 — Add Vehicle responsive layout

All six wizard sections share a centered 640dp maximum content width, matching the action footer. Category and subtype choices use one measured grid: two columns on phones, three at 540dp available width, and one on very narrow layouts or very large text. Images keep a square contain frame; labels have a separate minimum 44dp area and may wrap for accessibility. The final category uses the same card dimensions instead of spanning a row. Optional catalog suggestions join timezone and initial observations under Additional options. Existing entry fields, drafts, validation and save services are preserved.

## 2026-11-03 — Compact image-first wizard cards

Supersedes the 44dp caption minimum above: category and subtype cards now have an edge-to-edge square image frame and a compact caption targeting approximately 10% of total card height (24dp minimum, expanding for wrapping/large text). The whole card remains the radio touch target. Absolute-fill contained artwork prevents intrinsic PNG dimensions from influencing image height on web. Rows align at the top rather than stretching shorter cards. All six wizard sections retain their shared content width; only image choice cards need this layout.

Image bounds correction: absolute positioning alone does not override React Native Web Image's intrinsic source width/height. Explicit percentage width and height must constrain the image to its square frame; retain contain mode to show the full vehicle without cropping.

## 2026-11-03 — Shared vehicle artwork bounds

Vehicle cards reuse `SquareArtwork`, a square parent with explicit percentage image dimensions and contain mode. Garage uses measured one/two/three-column widths within 640dp and keeps identity/type/role/meter/archive details below the image. Vehicle summary and wizard review identities also follow their square thumbnail. Switcher rows retain compact square thumbnails for list usability. Record/action cards without vehicle artwork retain their domain layouts. Onboarding and empty-state art already have explicit bounded dimensions and are unchanged.

## 2026-11-03 — Compact global header vehicle selector

Authenticated page headers show the active vehicle at right, preferring trimmed nickname then registration, model and subtype. Name truncates at the end to preserve its beginning. The entire control opens the selector when multiple non-archived vehicles exist; a single vehicle has no redundant switch icon. Selection uses the existing active vehicle store and query scoping. Authentication headers omit the selector; existing page titles and form back navigation remain available.

## 2026-11-03 — Focused bike/car rollout

The latest user request temporarily narrows the larger Phase 1 scope. Implement the plan in `docs/FOCUSED_RELEASE_PLAN.md`: bikes/cars, Home, fuel/charging, ordinary expenses, odometer and histories. Preserve advanced source under one reversible `advancedTools` rollout switch instead of commenting out large implementation blocks. Block advanced route entrypoints and hide shortcuts; preserve SQL authorization, migrations, server audit, revisions/conflicts, grants and already queued work. Existing unsupported vehicle history stays readable; creation/new ledger forms are deferred. Category notice directs users to release updates rather than promising an unimplemented notification subscription. Dedicated maintenance is paused while service/repair expense categories remain available. Electric charging remains in the existing fuel ledger with KWH storage units and kWh display labels.

## 2026-11-03 — Horizontal active vehicle summary

User requested a landscape active vehicle card: bounded square bundled artwork occupies 20% of the inner row, with compact identity, available registration/make/model, role and meter unit to its right. Text wraps for long names and larger fonts. The hero card no longer offers Switch vehicle; the existing top header picker handles active selection. Shared non-hero summaries also use the horizontal arrangement, retaining explicit form vehicle selection where needed. No numeric odometer is inferred from the vehicle's meter mode.


## 2026-11-03 — Online-only account data

Latest user instruction replaces the offline-first requirements in PROJECT_REFERENCE.md, stage prompts and older handoffs. Implement ONLINE_ONLY_PLAN.md: remove SQLite/browser account caching, draft persistence, outbox and background replay. Open forms use memory only; confirmed SQL/RPC writes gate success feedback and list refresh. Read errors/known disconnection hide old query results. Keep secure sessions, selected vehicle preference, atomic RPCs, operation UUID receipts and revisions. Debug frontend preview is visibly labeled and ephemeral, never a production fallback. Preserve migrations/server data and leave legacy device work untouched but inaccessible. Live-backend TODOs remain explicitly OPEN while frontend work proceeds; do not claim integration or release acceptance.
# 3 November 2026 — Confirmed Play Console application identity

The user has created the GaadiPulse app entry in Google Play Console and confirmed the Android package name as `com.pooniya.gaadipulse`. The existing default in `app.config.ts` matches. Keep this application ID for release builds and Android OAuth configuration; do not override `ANDROID_PACKAGE` for this Play app. Creating the Console entry does not establish that a build has been uploaded or published.

## 2026-11-04 — User-supplied signing fingerprint, pending verification

User supplied SHA-256: `DE:12:9E:53:8B:93:4A:DA:98:B0:28:8A:CC:E0:61:FD:F9:36:03:3D:A2:30:1C:17:15:95:2D:FE:EC:45:20:3C`. Format is 32 hexadecimal bytes; association with the actual Play app signing certificate has not been independently verified. The supplied SHA-1 repeats this 32-byte value and is invalid as SHA-1; obtain the separate 20-byte SHA-1 from the certificate page.

The supplied Digital Asset Links snippet uses `com.pooniya.gaadiPulse`, conflicting with the previously confirmed `com.pooniya.gaadipulse` and Expo configuration. Preserve the confirmed lowercase application ID pending clarification; any deployed assetlinks statement must match the actual application ID exactly. No website domain was supplied, and no assetlinks deployment or Android HTTPS intent-filter configuration was performed.

## 2026-11-04 — Corrected signing details (supersedes earlier supplied values)

User corrected the Digital Asset Links statement: package `com.pooniya.gaadipulse`; SHA-256 `41:16:50:BA:D9:2A:5D:11:97:F3:0A:0B:89:1B:67:8E:30:A3:CF:C4:FA:C8:68:CA:40:A3:3E:B4:03:95:2D:2D`. User subsequently supplied SHA-1 `4F:7B:BC:37:B7:77:D2:A3:B8:2F:F2:35:9E:F3:C4:31:1D:DF:52:5B` (valid 20-byte hexadecimal format). Use these values instead of the earlier fingerprint and mixed-case package. Certificate association is user-supplied, not independently verified. No domain/deployment was supplied or performed.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.pooniya.gaadipulse",
      "sha256_cert_fingerprints": [
        "41:16:50:BA:D9:2A:5D:11:97:F3:0A:0B:89:1B:67:8E:30:A3:CF:C4:FA:C8:68:CA:40:A3:3E:B4:03:95:2D:2D"
      ]
    }
  }
]
```


## 2026-11-04 — Replace initial authentication UI

User requested removal of the earlier onboarding/auth design and development entry flow. Signed-out launch and logout now target `/auth/login`; `/auth/welcome` remains a redirect for compatible links. Email/password login is the primary form with Google and optional email-code sign-in. Account creation progresses through email, password/confirmation and email verification; the existing authenticated profile write collects display name before first Home access. Established accounts retain the session/profile routing to Home. Password recovery remains on its route after verification establishes a session. Auth uses the shared palette, gradient, bundled brand art, safe areas, scrollable keyboard avoidance, accessible controls and English translation keys. Development entry buttons were removed from auth/session-error/settings UI; retained domain preview internals remain inaccessible from these entry points. No migrations, server data or credentials changed.

## 2026-11-04 — Header-only vehicle switching

User requested removal of Switch vehicle actions from the vehicle summary cards on Fuel, Expenses and other pages. Removed the action and its selection sheet from the shared `VehicleHeader` component. The global header picker remains the switching entry point. Existing explicitly bound record context is preserved; no persistence or access-control changes.

## 2026-11-04 — Owner edit and typed-name vehicle deletion

Owner Garage cards now have a separate Edit action. The edit wizard includes Delete vehicle below its content. Deletion requires the exact saved vehicle identity (nickname, registration, model, then subtype fallback), checked both client-side and in a verified-owner SQL RPC under the vehicle row lock. Unsaved identity edits cannot change the confirmation target. Use additive soft deletion (`deleted_at`) to preserve monetary records, receipts and audit history. Normal member/owner access helpers exclude deleted vehicles, removing them from garages and blocking normal record operations; unresolved/resolved email grants are revoked. An unchanged owner retry returns the same vehicle ID without a second deletion event. No permanent erase or restore UI is implied. UI explains retained history and impact on all members. This supersedes any earlier suggestion to use archive as deletion. New migration must be applied to the backend before the deletion RPC can work; no remote deployment performed in this session.

## 2026-11-04 — Single-page vehicle edit

User requested a plain single-page edit form instead of the add-vehicle wizard. Existing vehicle edits now show nickname, registration, category/subtype, make/model, energy type, meter mode and timezone together with Save/Delete at the bottom. New-vehicle creation retains its wizard. Ownership remains per-vehicle authorization, not an editable profile field. Meter values remain timestamped observations via the existing Add meter reading form, because `save_vehicle` does not update historical readings on edit; the edit page links directly to that form rather than presenting a nonfunctional kilometre input. Existing dirty-form confirmation applies when leaving for readings.

## 2026-11-04 — Edit dropdowns and subtype meter options

Single-page vehicle edit now uses accessible modal dropdown fields for category, subtype and meter mode. Since the catalog specifies recommended default modes rather than a separate capability matrix, use an explicit UI policy based on those defaults: KM subtypes offer KM; HOURS subtypes offer HOURS; BOTH subtypes offer KM/HOURS/BOTH. Category-specific Other defaults are respected. This is a product UI policy, not a claim about physical vehicle capabilities. Bike/car release restrictions on new category choices remain; retained supported dual-mode subtypes can select BOTH when those categories are available. Category/subtype changes reset an incompatible meter choice, and edit submit rejects unavailable modes. Historical readings remain intact; an existing incompatible mode requires an explicit valid selection before save. No new SQL restriction or migration; server permissions and historical mode support remain unchanged. New-vehicle wizard is unchanged.

## 2026-11-04 — Quick fuel and expense entry

User prioritizes fuel amount plus quantity; add/edit fuel submit now requires both, while the shared historical any-two arithmetic helper remains intact. Unit price is derived when blank; optional explicit receipt rate is under Additional options and retains consistency checks. Full/partial state also moves into that section without changing its stored meaning or full-to-full rules. Energy identity is compact, event timestamp stays visible after core fields, and missing readings remain allowed. Expense category uses a dropdown. Additional options has a compact header on these forms, and the record-form Connection shortcut is removed; online errors/retry and acknowledged server writes remain intact. No offline queue or fallback introduced.

## 2026-11-04 — No standalone Connection page

User approved removal of the former Sync/Connection screen for the online-only app. Remove all navigation entries; `/settings/sync` redirects to `/settings` for old links. Per-screen offline/error/retry handling remains. This supersedes earlier documentation describing a standalone Connection destination.

## 2026-11-04 — Shared compact fuel history

Fuel history uses one shared card with thin row separators. Each tappable row shows amount with purchased quantity in parentheses (L, kg or kWh), with a smaller timestamp and a partial fill/charge label only when applicable. Omit redundant fuel identity and full-fill labels from this list. Use theme primary color for amount and partial state; preserve stored values, detail navigation, archived status and existing data permissions. Missing historical quantity is omitted rather than inferred.

## 2026-11-04 — Fuel detail popup and owner-only ledger deletion

Fuel row chevrons indicate the existing full-row detail action; use a shared Sheet popup reusing RecordDetail, with icon-labeled Edit/Delete actions. Existing direct detail URLs remain supported and Edit opens the existing form. Fuel/expense histories omit archived filters and recovery actions. Delete retains ARCHIVED storage and audit history; a new SQL trigger requires verified vehicle ownership on fuel/expense deletion and rejects updates/restoration of deleted ledger rows. Apply migration 202611040008 to enforce the new rule on the connected backend. No remote deployment performed.

## 2026-11-04 — Application-wide centered popups

Latest user instruction replaces bottom-opening sheets with centered, content-height dialogs. `Popup.tsx` is the only app-managed React Native Modal: shared Sheets, fuel details, dropdowns, vehicle switching, More, confirmations, saved-record feedback, release notices and the iOS date-picker wrapper reuse it. Outside taps, the 44dp close icon, Android Back and accessibility Escape dismiss through each caller's existing close handler. Confirmations dismiss as cancel and never run their action on outside taps. Keep explicit confirm/save actions and existing navigation intact. Long content scrolls within safe-area/keyboard-aware bounds; no bottom-slide animation. Native Android system date/time pickers retain the platform dialog.

Use a subtle 3px filter on application content while any popup is visible (reference-counted for stacked popups), plus a dimmed backdrop; modal surfaces stay sharp in their separate modal layer. Web and Android 12+ support this blur; iOS and older Android keep the dimmed backdrop. Platform filter support: https://reactnative.dev/docs/view-style-props.html#filter . An attempted expo-blur installation was blocked by registry DNS and removed; no dependency or lockfile change is retained. Native blur/dismissal behavior still needs device verification.

## 2026-11-04 — Record deletion confirmation inside its popup

Delete now replaces RecordDetail content with an explicit confirmation in the same popup instead of opening the global confirmation Modal above an already-open Modal. This removes dialog stacking/hidden-confirmation behavior. The mutation stays mounted for busy state and retryable errors; successful acknowledged deletion closes the details popup, and Cancel closes it without deleting. Direct detail pages reuse the same confirmation state. Owner authorization and soft-deletion storage are unchanged.

## 2026-11-04 — Compact expense history

Expense history follows the fuel record presentation: one card with separated tappable rows, amount and expense title, compact category and timestamp, and a details chevron. Rows open the existing centered record details popup with existing edit and owner-only delete confirmation. Expense data, direct detail links and permissions are unchanged.

## 2026-11-04 — Manual meter readings cannot decrease

New Add Meter entries compare each supplied KM/HOURS value independently with the latest active observation strictly earlier than its selected observation timestamp, allowing equality. Show the previous value when the member can read meter history; surface history loading errors with retry. Late observations remain possible and are compared with the preceding observation at their actual time. Remove the reset switch from this form; historical reset/correction data remains intact. Migration 202611040009 enforces the rule on manual record-linked observations under a vehicle row lock and rejects new reset flags for this flow. Existing correction and initial-reading workflows are unchanged. Backend migration must be applied before this guard is active in the connected database.

## 2026-11-04 — Play privacy contact and shared records

The user supplied Mahendra Singh as developer name, `mahendrapuniya92@gmail.com` as public support contact and `https://pooniya.com/projects/gaadipulse` as the website. The website's availability and publishing access have not been established. For account deletion, the user chose to retain shared vehicle records while removing the departing user's identity. This is a product choice, not proof that retaining every field is anonymous or lawful; free-text and vehicle identifiers, retention periods, deletion of personal-only data and provider/backups require further implementation and review. Do not claim deletion is complete based on the existing anonymization job.

## 2026-11-04 — Vehicle pilot access and history

Expose vehicle membership management in the focused release. A verified pilot has the six fuel, expense and meter read/create permissions by default, subject to explicit per-vehicle or member restrictions; pilot edits, deletion and corrections are denied. Pilot history is restricted to today and yesterday in the vehicle time zone at SQL/RLS and in cached UI views. The server policy marker is required before the client grants access or displays pilot records. Existing vehicles in any category may use record forms; the earlier new-vehicle category rollout restriction remains. Full migration-chain and hosted enforcement are not yet verified; see `PILOT_ACCESS.md`.

## 2026-11-05 — Restore paused vehicle and advanced tools

The user requested restoring the focused-release feature register. `releaseFeatures.advancedTools` is enabled, restoring commercial/agricultural/heavy vehicle creation, editable KM/HOURS/BOTH meter settings, progress forms and review, document metadata, reminders, maintenance, reports, analytics and exports. Online-only behavior remains. Existing Pilot limitations remain: fuel/expense/meter history is limited to today and yesterday, Pilot records cannot be edited or deleted, and progress view/submission is available only when an owner explicitly grants it; its history has the same two-day restriction. Photo/file capture, GPS, Hindi and paid plans remain out of scope as already documented. This source change is not proof of deployed backend, real-device or store readiness.

### Home readings and fuel history — 2026-11-05

A reading is ordered by its actual observation time, not entry time. Fuel, expense and manual form observations must be no lower than the preceding active observation and no higher than the next active observation, with equality allowed. Existing history and explicit reset/correction workflows are retained. This permits a truthful late observation without silently backdating it. Home refreshes on focus and after local writes; while active it also polls every 15 seconds for changes from other sessions. This is not a realtime delivery guarantee.

Fuel history is filtered on the server under existing row-level security, returned in pages of 30 with matching count and total, and fetched one record at a time for detail/edit. A fuel author lookup is restricted to readers of that record; only vehicle Owners receive the author's email. Fuel fields and timestamps remain available for future full-to-full analysis; no new insight or inferred average is claimed here.

### Vehicle setup time zone and energy guidance — 2026-11-05

New vehicles default to the IANA zone `Asia/Kolkata` (India/IST, UTC+05:30); choosing a zone is optional, and stored zones are not reduced to fixed offsets because time-zone rules can change. The searchable picker uses the bundled canonical zone catalog generated from Node 24.22.0 / ICU 78.3 / tzdata 2026c; it filters zones unsupported by the current device and retains the current saved alias. Refresh that catalog when updating the runtime's time-zone data. Displayed offsets are current, can change seasonally, and are omitted if the device cannot format them. Source: https://www.iana.org/time-zones and https://www.nplindia.in/clockcode/html/index.php.

Vehicle setup describes the actual `allowedFuelTypes` and `fuelUnit` mapping used by record forms and enforced by migration 005. Conventional petrol/diesel hybrids record engine fuel; the existing plug-in hybrid profile supports petrol and electric charging. Diesel plug-in hybrids are not represented by the existing profiles; `OTHER` accepts litres only. Do not present these limitations as complete support for all real-world configurations. Plug-in hybrids can use other engine fuels in reality: https://afdc.energy.gov/vehicles/electric-basics-phev. Existing fuel history keeps its original fuel/unit after configuration edits. Starting readings are optional, dated by actual observation, and incompatible unsaved readings require confirmation before meter-mode changes clear them.

### Account defaults and currency preservation — 2026-11-05

The existing profile setup now asks for an account time zone, and new vehicles initialize their own time zone from that profile. Existing vehicles retain their own time zones. The authenticated email is displayed from the session and is not editable in this screen. A separate username and currency selection remain unimplemented.

The requested currency preference must not be implemented by changing the INR symbol: existing financial values are INR paise, while shared vehicle ledgers can be created by multiple users. Before enabling other currencies, associate a currency with every financial amount, define immutable legacy INR defaults and safe guarded writes, preserve each record's currency on edits, separate mixed-currency totals/filters/analytics and export currency metadata, and handle older clients. No conversion or currency reassignment is authorized by choosing a preference. Supported currency precision must match parsing and server arithmetic. This remains outstanding work, not a completed onboarding feature.

### Meter history presentation — 2026-11-05

Meter history uses the shared compact fuel/expense row and opens observation details in a sheet. KM and HOURS remain separate observations because matching timestamps alone do not establish that readings belong to the same entry. Show the type filter when the vehicle supports both types or its retained history contains both, so older readings remain accessible after a mode change. Dates continue to use the vehicle's configured time zone even though its name is not displayed on this screen. The More quick-add maintenance shortcut is removed; maintenance entry remains available through expenses.

### Retire Daily Progress — 2026-11-05

Remove user-facing Daily Progress, approvals, form builder, permissions and reports. Preserve existing submissions, form versions, audit history and meter observations rather than deleting user data. An additive migration revokes client RPC/table access and stops automatic form creation and adaptation. Retired implementation remains in source where shared code and historical compatibility still depend on it; it is not reachable through the app routes. The backend migration must be applied separately to disable older clients.
