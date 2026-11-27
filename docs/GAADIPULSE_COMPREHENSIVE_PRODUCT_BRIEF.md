# GaadiPulse — comprehensive product brief

**Purpose of this document:** Give another ChatGPT conversation a reliable, detailed reference for what GaadiPulse is, who it serves, how its functions and pages are intended to work, the key data and security rules, and what is currently available versus paused or unverified.

**Last reconciled:** 27 November 2026, from the repository product contract, release-scope notes, route map, limitations, and latest handoffs. Treat this as a project reference, not proof that every feature is live in Google Play or verified against the hosted backend.

**App identity**

- Name: GaadiPulse
- Tagline: **Every Vehicle. Every Detail.**
- Android application ID: `com.pooniya.gaadipulse`
- Google Play listing: https://play.google.com/store/apps/details?id=com.pooniya.gaadipulse
- Product overview: https://www.pooniya.com/portfolio/gaadipulse
- Platform and stack: Android-first app built with Expo / React Native and TypeScript; Supabase Auth and Postgres provide the account and shared-data backend.

## 1. What GaadiPulse is

GaadiPulse is a vehicle logbook and operating-cost record app. It helps a person or small team organize fuel or charging entries, other vehicle expenses, and odometer/hour-meter readings by vehicle. Its broader product design supports shared vehicle access so an owner can work with drivers or collaborators while retaining vehicle-specific permission rules.

The core value is a clearer record of what has been entered for each vehicle. The app is not a live tracking service, does not automatically observe a vehicle, and does not independently verify that every receipt or entry is complete or correct.

## 2. Problem and product promise

### The problem

Vehicle information can be scattered across paper receipts, messages, spreadsheets, a driver's memory and an owner's notes. The owner may not be with the vehicle each day. When several vehicles are involved, it takes extra work to reconstruct fuel use, repairs and other costs for each one. A vehicle's records can also matter to more than one person: for example, the owner and the driver.

### The product response

GaadiPulse provides a vehicle-centered place to record fuel/charging, expenses and meter observations. Its collaboration design assigns roles for each vehicle, rather than treating a person as a global “owner” or “driver” across their entire account. The broader design supports several vehicle types and different measurement units such as kilometres and engine hours.

### Promise in one sentence

**Keep the information recorded for each vehicle organized, and share access with the people who help manage it.**

## 3. Intended users and use cases

| User | Need | Example use |
| --- | --- | --- |
| Individual vehicle owner | Remember and review vehicle costs | Record a bike's fuel and service expenses |
| Owner who works with a driver | Keep a shared vehicle record | Let a driver enter allowed records for a van; owner reviews entries |
| Small fleet operator | Organize information across vehicles | Switch between vehicles and review their separate histories |
| Driver / vehicle operator (called Pilot in the permission model) | Add assigned vehicle information | Enter fuel, expense or meter information when allowed |
| Farm, construction or machinery operator | Keep records for equipment that may use hours, not road distance | Track an excavator or tractor with the appropriate meter type when that scope is enabled |

One account can be an Owner of one vehicle and a Pilot of another. Multiple Owners and Pilots can be associated with one vehicle in the designed collaboration model, subject to the protected primary-administrator rules.

## 4. Product principles

- **Vehicle-scoped:** Selected vehicle determines the record context. Data from one vehicle must not leak into another vehicle's screen.
- **Truthful records:** Store the time a reading was observed separately from the time it was entered. Never invent a missing odometer value, mileage, or calendar-period total.
- **Permission-aware:** Roles and individual read/create rights apply per vehicle, and server authorization is the security boundary.
- **Online-only current behavior:** Authenticated records are fetched and saved online. There is no supported offline ledger, local record cache, persistent draft, or automatic upload queue in the current plan.
- **Android-first and accessible:** English UI, small-phone layouts, clear validation, accessible controls, retry/recovery on network errors.
- **No misleading automation:** The app records user-entered data; it does not have live GPS tracking, telematics or OCR in the currently documented scope.

## 5. Current release status — read before describing features

Repository documents describe a wider product than the current focused release. The latest rollout notes say the advanced release switch was enabled again on 5 November 2026, but the Stage 3 handoff and online-only plan still list substantial live-backend, security, and device acceptance work as open or unverified. Confirm the exact published build and deployed backend before promising any feature to a user.

| Area | What project records say | How to describe it safely |
| --- | --- | --- |
| Authentication | Email/password, Google sign-in, verification, recovery and profile flows exist in source; provider and hosted configuration need operator verification | “Sign-in options are present in the app; live provider setup must be confirmed.” |
| Core bike/car use | Focused release implements bike/car garage, Home, fuel/charging, ordinary expenses, odometer and histories in source | Verify the current Play build before claiming it is available to all users |
| Collaboration | Owner/Pilot membership, grants and permission logic are preserved; member UI is an advanced feature and live security proof remains an acceptance gate | Do not promise production-ready shared access until backend deployment and RLS tests are confirmed |
| Reports, exports, analytics | Source exists, but these are controlled by the advanced feature rollout and require authorization verification | Describe as planned/available in source only unless confirmed in the published app |
| Daily Progress and form builder | Preserved in source but was retired from auth messaging and later paused under rollout controls; route status must be checked | Do not advertise as an active user feature without current-build confirmation |
| Documents/reminders/maintenance | Implementations or schemas exist, but feature availability has been paused/gated in release notes | Do not imply file uploads or active reminders are available |
| Offline operation | Earlier requirements and docs mention it, but the 3 November 2026 online-only override supersedes them | The app requires connectivity for authenticated data operations; failed saves do not auto-upload later |
| Pricing | Project decisions say free launch and no subscriptions/ads | “Free to use” only after checking the current Play listing and in-app terms; never promise “free forever” |
| Play publication | App entry/package was confirmed in Play Console; this alone does not confirm an uploaded/published build | Use the supplied listing URL, but confirm its current availability and content |

## 6. Functional areas

### 6.1 Account and authentication

The app contains a sign-in/sign-up flow, onboarding/profile completion, verification, password recovery/reset, legal text, account security and sign-out. Project architecture supports Google OAuth and email/password; an email OTP route also exists in source, though it has not always been exposed in the primary sign-in UI. Provider configuration, deep links, email templates and real-user auth flows must be verified in the target environment.

The account identity is distinct from a user's role on any individual vehicle. Verified identity is required for email-based access grants; an unverified email string alone must never expose another person's vehicle data.

### 6.2 Profile and preferences

Profile fields and settings include a display name, country/timezone preferences, locale, theme, notification permission controls, legal information, and account deletion/security entry points. English is the supported UI language. Hindi is not translated and must remain disabled or clearly marked unavailable until reviewed translations are installed.

The ledger currently has an INR limitation. A currency utility and database foundation are not equivalent to complete multi-currency support; records, forms, reports and exports must not be described as multi-currency until the whole path is implemented and verified.

### 6.3 Garage and vehicle setup

The garage is the user's list of owned and shared vehicles. Vehicle setup is designed as a guided multi-step flow with category, subtype, optional make/model, identity/details, energy/fuel configuration, meter options and review. Registration/nickname and some machine identifiers may be optional, particularly for machinery.

The full product catalog includes two-wheelers, cars/four-wheelers, commercial vehicles, agricultural vehicles and heavy machinery. The focused bike/car scope temporarily suppressed creation and new ledger forms for some advanced categories; later restoration notes say the advanced switch was enabled. Existing records for a deferred category must not be deleted or silently filtered. Check the current category guard before claiming all categories are usable.

Vehicle information may include:

- Category and subtype, optional make/model and custom model.
- Nickname, registration or another identifying label where applicable.
- Energy profile such as petrol, diesel, CNG/LPG, electric or supported hybrid configuration.
- Meter configuration: KM, HOURS, or BOTH in the broad product design. The focused bike/car release uses KM.
- Vehicle timezone, used for date windows and local record interpretation.
- Initial meter baseline, only when the actual observation is known and timestamped.

The vehicle switcher appears when there are multiple accessible active vehicles. Switching must re-scope data immediately and prevent any flash of the previous vehicle's records. Vehicle roles are per vehicle. “Owner” in the app is not proof of legal title in government registration records.

### 6.4 Home

Home is centered on the currently selected vehicle. The focused version includes a vehicle summary, latest observed odometer and its observation time, fuel/charging and expense summaries, recent activity, and quick actions for adding fuel/charging, an expense or a meter reading.

The broader design adds permission-aware progress, reminders and owner actions, but these sections depend on advanced rollout controls and backend verification. The app must distinguish no records from a failed read; a read error must not be shown as a successful zero total.

### 6.5 Fuel and electric charging

Fuel/charging records are associated with one vehicle and can include:

- Energy/fuel type selected from the vehicle's configured powertrain options.
- Quantity and physical unit (for example litres, kg, or kWh for charging).
- Total amount and unit price, with arithmetic/validation for the values entered.
- Full/partial fill or charging context where supported.
- Event date/time, optional station, payment method and notes.
- Optional odometer/hour-meter reading; missing readings are allowed in the broad design and should be explicitly marked pending where applicable.

The current focused scope presents EV energy as **Charging** and uses kWh, not kW. Electric charging stays in the same ledger concept rather than a separate charging integration. No charger location tracking or automatic energy feed is promised.

Fuel-efficiency calculations must use valid meter intervals and qualifying fill data. Full-to-full calculations may account for intermediate partial fills. If required anchor readings are missing, mixed units/fuels invalidate an interval, or readings are inconsistent, show the metric as unavailable or explain the exclusion. Never fabricate mileage or a precise calendar-period efficiency from incomplete boundary readings.

### 6.6 Expenses

The expense ledger records non-fuel costs for a vehicle. The quick path is amount, title/category and date. Optional details may include vendor, payment method, notes, meter reading and category-specific fields.

Designed categories include service, repair, tyres, battery, insurance, EMI, toll, parking, wash, permits, tax, fines, accessories and other. The focused release keeps service and repair as ordinary expense categories even when the separate Maintenance module is paused.

Expense logic must avoid double counting. EMI principal/cash outflow and operating costs are distinct accounting views; maintenance line items must not be summed a second time if already represented by the parent expense. Store money as integer paise and round only at presentation/export boundaries. Current records are INR-gated; do not claim general currency support.

### 6.7 Meter readings

Meter readings are observations attached to a vehicle and may be added independently of a fuel/expense entry. Store the observed time separately from the time the user entered the value. The app should retain history of corrections and not silently overwrite older readings.

Validation must handle decreases, resets, duplicate timestamps and anomalous values transparently. A reading correction is not permission to erase history. In the broader fleet/machinery design, meters can represent distance (KM), engine hours (HOURS), or both; the focused bike/car scope is odometer-centric.

### 6.8 Owner/Pilot collaboration and access

The broader collaboration model assigns roles per vehicle:

- **Owner:** administers that vehicle's members and permissions, and has owner-level record access.
- **Pilot:** driver/operator assigned to a vehicle, with read/create rights controlled by the vehicle owner and server policy.
- **Multiple memberships:** a user may have different roles on different vehicles. More than one owner or pilot can participate where allowed; a protected primary administrator and last-owner safeguards apply.
- **Email grant:** an owner can grant access to an email. Existing verified users receive access after the server resolves identity; an unregistered person gains the grant only after signing in with the verified matching email. There is no separate invite-acceptance requirement in the design.
- **Revocation:** access can be revoked; server authorization must block future reads/writes even if a client has stale UI state.
- **Pilot restrictions:** read and create permissions are independent by record domain. Some documented Pilot policy limits accessible record history to today and yesterday in the vehicle timezone. The route and UI should not present a restricted history as a complete monthly total.

Important current-status caveat: collaboration source and migrations exist, but the current release/feature gates and live backend verification must be checked before describing access grants as available or production-secure. UI hiding is never a security boundary.

### 6.9 Daily Progress and custom forms (advanced / verify availability)

The broad design supports per-vehicle Daily Progress submissions. Owners can define versioned forms; Pilots submit against the version that was active for that entry. Field types may include short/long text, integer/decimal, currency, select/multiselect, yes/no, date/time, text location, route origin/destination and trip count. Owners can configure required status, order, options, limits, visibility/reportability and date-submission policy. Approval, rejection and correction workflows should be audited.

This module has been paused/retired in some release decisions and removed from auth marketing. Treat it as advanced preserved source, not a guaranteed active feature. Photo-required submissions are not valid while actual photo capture/upload is deferred.

### 6.10 Reports, insights and exports (advanced / verify availability)

The designed reporting area includes vehicle-scoped period totals, fuel and other expense breakdowns, valid fuel-efficiency intervals, observed meter trends, category summaries and optional vehicle comparisons. Export code/source references JSON, CSV and PDF. Reports must use exactly the same authorized data and definitions as their displayed figures.

Do not present estimates as measurements. Do not combine currencies, fuel units, energy types or meter types as if they were comparable. A Pilot's restricted records must not leak through totals, chart axes, tooltips, comparisons or exported files. Report routes, analytics and export permissions must be confirmed against the live build/backend before marketing.

### 6.11 Documents, reminders and maintenance (advanced / verify availability)

The broad design includes document metadata such as type and expiry, reminders by date or meter threshold, and maintenance history connected to expenses. Actual file/photo uploads are deferred; entering metadata must never be represented as an attached legal document. Locally entered metadata is not an official RC or driver's licence. Reminders and maintenance entry points were hidden/paused in the focused release; notification behavior and current route access need confirmation.

### 6.12 Help, About, connection and account security

Help/About provide operational guidance and product identity. Connection is the current name/intent of the former Sync status screen; it should explain network access and recovery rather than expose a fictional offline queue. Security/settings include account deletion request and sign-out flows. Account deletion can involve protected ownership dependencies and a retention/anonymization process rather than immediate destruction of every ledger row; public policy and operator handling must be configured before release.

## 7. Pages and navigation map

Expo Router files are route entry points. The product surface includes these main routes, with some routes gated by the release configuration:

| Page / route family | Purpose | Status note |
| --- | --- | --- |
| `/auth/login`, `/auth/signup` | Sign in or create account | Hosted providers and flows need real-environment verification |
| `/auth/verify`, `/auth/callback` | Complete verification / OAuth callback and recover from callback errors | Requires correct provider/deep-link configuration |
| `/auth/password`, `/auth/reset-password` | Password and recovery flows | Confirm provider policy and live email setup |
| `/auth/legal` | Local terms/privacy content | Operator review required before public distribution |
| `/onboarding` | Complete profile basics for a new account | Country/timezone suggestions; no full currency selection |
| `/(tabs)` or `/` | Home for the active vehicle | Primary authenticated landing screen |
| `/(tabs)/fuel` | Fuel/charging history | Search/filter/history; charging label depends on vehicle energy |
| `/(tabs)/expenses` | Other expense history | Search/filter/history |
| `/(tabs)/more` | More drawer/menu and grouped actions | Opens More over current browsing page; actions are role/scope-gated |
| `/garage` | Browse owned/shared/archived vehicle cards | Vehicle list and profile navigation |
| `/garage/add` | Add vehicle wizard | Category availability can be release-gated |
| `/garage/edit?id=…` | Edit a vehicle | Owner/permission rules apply |
| `/garage/[id]` | Vehicle profile/details | Owner actions may include edit/archive/recover |
| `/records/fuel`, `/records/expenses` | Record histories | Vehicle-scoped, authorized, paginated as implemented |
| `/records/[kind]/add` | Create fuel, expense, meter, or other record kind | Some kinds/routes are advanced or deferred |
| `/records/[kind]/[recordId]` | Record detail, history/provenance and available actions | Authorization and domain release gates apply |
| `/records/[kind]/edit` | Edit an allowed record | Revision conflict safeguards; cannot change vehicle context |
| `/records/[kind]/analytics` | Domain analytics | Advanced/gated; verify live access |
| `/meters/history` | Meter observations and history | Core in focused scope |
| `/owner/members` | Manage vehicle members and permissions | Advanced/gated; verify live access |
| `/progress/approvals` | Owner review of Pilot submissions | Advanced/gated and dependent on Progress availability |
| `/owner/form-builder` | Configure per-vehicle Progress forms | Advanced/gated |
| `/maintenance` | Service/repair detail view | Dedicated module paused; basic expense categories remain |
| `/reports`, `/insights` | Reports, analytics and exports | Advanced/gated; authorization must be confirmed |
| `/settings`, `/settings/profile` | Preferences and profile | English UI; Hindi disabled; INR limitation remains |
| `/settings/sync` | Compatibility route now intended to show Connection | No offline sync queue in current design |
| `/settings/security`, `/settings/deletion` | Security and account deletion request | Operator retention process required |
| `/settings/help`, `/settings/about` | Help and product info | Available route family |
| `+not-found` | Unknown route recovery | Avoid dead ends |

The primary navigation is four floating tabs: **Home, Fuel/Charging, Expenses, More**. Forms and detail screens sit outside the persistent tab bar. No hamburger menu is used. Check the actual current labels since some project notes use “Fuel” while electric vehicles display “Charging.”

## 8. Data model and correctness rules

### Core conceptual entities

- **Account/profile:** authenticated identity and profile preferences.
- **Vehicle:** identity, type, energy configuration, meter mode, timezone and archival state.
- **Vehicle membership:** account-to-vehicle relationship, role, grant/resolution state and permissions.
- **Fuel/charging record:** amount, quantity, price, energy/fuel type/unit, time and optional reading/context.
- **Expense record:** amount, title/category, event time, details and optional reading.
- **Meter observation:** value, metric/unit, observed time, entry time, provenance/correction status.
- **Progress form and submission:** advanced versioned schema and submitted answers, if enabled.
- **Reminder/document metadata:** advanced records where enabled; no actual file attachment implied.
- **Audit/revision/operation receipt:** server-side history and safe retry/conflict behavior.

### Money and units

- Persist money as integer paise (minor units), not floating-point rupees.
- Current ledger is INR-limited. A foundation for broader currency handling does not mean it is supported end-to-end.
- Quantity units must remain explicit: litres, kg, kWh, KM, HOURS.
- kWh is energy; kW is power. Never label charging quantity as kW.
- Never aggregate unlike currencies, fuels, energies or meter units as a comparable total.

### Time and observations

- Store timestamps in a stable machine format and render them in the vehicle's relevant timezone.
- Distinguish event/observed time from when data was entered.
- Late readings remain truthful; do not pretend the value was observed at entry time.
- Do not assume a missing reading is zero or infer a meter value from a previous record.

### Derived metrics

- Efficiency requires valid compatible fuel/charge and meter intervals. Use supported full/partial fill rules.
- Calendar period use/distance can only be measured when observations bracket that period; otherwise clearly label an estimate or say unavailable.
- Corrections, resets, missing anchors, mixed units and anomalous values need explicit handling and may invalidate affected intervals.
- Cash outflow, operating cost and financing/principal are different views and must be reconciled without double counting.

## 9. Online behavior and failure handling

The current override is online-only. Account data is not backed by SQLite, browser persistence or an outbox. Form inputs live in memory while the form remains mounted. Unsaved changes can be lost on reload, termination or leaving after confirmation.

- A save must wait for an acknowledged server response before showing success, clearing the form, navigating or invalidating lists.
- If a save fails, retain mounted inputs and offer a retry/recovery path.
- A connection interruption can leave the outcome uncertain. Do not say categorically that a record was not saved unless the server response proves it.
- Explicit retries use stable operation identifiers/receipts to prevent duplicate writes and payload changes under the same operation ID.
- Automatic write retries and reconnect uploads are not supported.
- On known disconnection/read error, withhold stale query data rather than showing it as current truth.
- Requests should fail promptly and have bounded timeouts. Reconnection can refetch reads, but must not submit a form.
- Loading uses an indeterminate line unless actual measurable progress exists; do not fabricate percentages.

## 10. Security and privacy requirements

These are product invariants, not optional UI behavior:

1. Supabase Row Level Security (RLS) and authorized SQL/RPC paths enforce access for every vehicle and record domain. Hiding a button or route is not security.
2. Role and permission scope is per vehicle. Query keys and reads must be scoped by account and vehicle; switching accounts/vehicles cannot reveal prior data.
3. Verified identity is required before an email grant resolves. Never authorize based on a user-typed email alone.
4. Sensitive financial fields and exports are filtered at the SQL/RPC layer. Charts, totals, tooltips, metadata and exports cannot reveal hidden records indirectly.
5. Revoked members lose server access. Any eventual offline write design must reject revoked Pilot writes; current online-only mode has no queued offline writes.
6. Use database transactions/atomic privileged functions for grants, protected writes and ownership safeguards. Apply fixed search paths to security-definer functions.
7. Never bundle service-role, JWT, signing, OAuth client-secret or private API credentials in the mobile app. Publishable client keys are the only keys permitted in client configuration.
8. Storage paths, exports and generated files are private and permission-scoped. No public permanent links for sensitive records by default.
9. Protect the primary administrator and last-owner case; application Owner role is not legal ownership of a vehicle.
10. Account deletion must revoke access and follow the documented dependency, retention and anonymization process; do not promise immediate erasure of retained operational history.
11. Debug preview is development-only, visibly labeled, ephemeral and isolated from authenticated records. It is not evidence of backend integration.

**Verification status:** Project handoffs explicitly leave full live Supabase migration/RLS/security testing and complete authenticated Android acceptance open. A future assistant must not infer that code or local tests prove production backend security.

## 11. Design and accessibility

- Android-first layouts support small 320–360 dp widths, safe areas, keyboard-aware forms and reachable save actions.
- Four floating tabs have generous touch targets; forms use explicit save and discard behavior.
- English strings are the supported language. Hindi must not be represented by placeholder or machine-generated UI strings.
- Use bundled local brand and vehicle illustrations. Do not depend on remote vehicle photos or manufacturer logos.
- Loading, empty, permission-denied, offline and retry states are distinct.
- Respect text scaling, accessibility labels, Android back navigation and reduced motion.
- Never show a fake progress percentage or claim a request succeeded before server acknowledgement.

## 12. Explicit limitations and deferred functionality

Do not describe these as currently available unless a later release note and published app confirm implementation:

- Offline ledger access, offline drafts, sync queue, background replay and conflict UI. These were superseded by the online-only override.
- Live GPS, route tracking, automatic telematics and third-party vehicle integrations.
- Receipt/vehicle/document photo capture, file uploads, document scanning and OCR.
- Smart fuel detection, automatic odometer recognition, battery diagnostics and predictive maintenance.
- Hindi translations.
- Multi-currency record entry/reporting/export end to end.
- Legal vehicle ownership transfer, sale listing or resale marketplace.
- Subscriptions, paid plans and ad-supported features; project intent is a free launch, subject to current listing/terms.
- Daily Progress, custom forms, approvals, collaboration UI, reports, reminders, documents and dedicated maintenance unless the active release controls and live environment confirm them.

## 13. Current known risks and release gates

Repository notes identify unresolved work that matters before treating the app as production-ready:

- Full chronological Supabase migration chain needs to be applied/verified on a disposable local environment; the online-only plan records a SQL compilation issue as open.
- Live Google/OTP/password authentication and verified identity/session lifecycle need confirmation.
- Owner/Pilot RLS and direct API behavior need adversarial testing across owners, pilots, outsiders, restricted permissions and revoked users.
- Real authenticated writes/reads for vehicles, fuel/charging, expenses and meter records need database-level confirmation.
- Unknown save outcome, duplicate-prevention retry, read failure, timeout and no-auto-upload behavior need real-device/backend acceptance.
- Android runtime/device checks, narrow layouts, keyboard/back behavior, account switching and accessibility checks remain incomplete in the handoffs.
- Privacy/terms and account deletion retention process require operator review/configuration.
- A Play Console application entry is not evidence that a current release has been published or approved.

Use the current `docs/STAGE_3_HANDOFF.md`, `docs/ONLINE_ONLY_PLAN.md`, `docs/FOCUSED_RELEASE_PLAN.md`, `docs/PRODUCT_LIMITATIONS_AND_PHASE2.md` and `docs/EXTERNAL_SETUP_AND_RELEASE.md` as the more detailed source for changing status.

## 14. Brand and communication guidance

- Spell the name **GaadiPulse**.
- Use the exact tagline **Every Vehicle. Every Detail.**
- Explain the problem concretely: scattered fuel/expense information and difficulty reviewing vehicle-by-vehicle costs.
- Describe the solution as record-keeping and shared access, not surveillance or automatic tracking.
- Do not imply every driver is dishonest or that the app guarantees savings or prevents fraud.
- Say “records entered” or “information recorded”; don't imply all data is complete or verified.
- If discussing “free,” confirm the current Play listing and terms. Do not say “free forever.”
- For public-facing app status, distinguish an implemented source feature from a tested feature in a published build.

## 15. How another ChatGPT should use this brief

Treat this document as the baseline product context. Before writing marketing claims, code, help content or release notes:

1. Ask what target is needed: public Play build, current source tree, or future product vision.
2. Treat “Current release status,” “Limitations,” and “Release gates” as binding guardrails.
3. If the request depends on current routes, build behavior or backend status, inspect the current repository and release documentation rather than assuming this brief is newer than code.
4. Preserve data, migration history, financial correctness, vehicle-level authorization and the online-only rule.
5. Clearly label a feature as current, gated, planned, or unverified; never turn a roadmap item into a shipped-feature claim.

## 16. Project references

- Product contract: `PROJECT_REFERENCE.md`
- Getting started and stage sequence: `docs/START_HERE.md`
- Current route map: `docs/SCREEN_MAP.md`
- Focused release scope: `docs/FOCUSED_RELEASE_PLAN.md`
- Online-only behavior and backend TODOs: `docs/ONLINE_ONLY_PLAN.md`
- Limitations and roadmap: `docs/PRODUCT_LIMITATIONS_AND_PHASE2.md`
- Security model: `docs/SECURITY_AND_RLS.md`
- Collaboration model: `docs/PILOT_ACCESS.md`
- Release acceptance matrix: `docs/FEATURE_ACCEPTANCE_MATRIX.md`
- Latest stage evidence: `docs/STAGE_3_HANDOFF.md`
- Social launch plan: `docs/GAADIPULSE_SOCIAL_LAUNCH_PLAN.md`

---

**Copy/paste summary:** GaadiPulse is an Android-first vehicle logbook for organizing fuel/charging entries, other expenses and meter readings by vehicle. It is designed for individual owners and teams that share vehicle work, with per-vehicle Owner/Pilot access in its broader scope. The current architecture is online-only. Core bike/car record workflows exist in source; collaboration, reports and other advanced modules have release gates and live-backend verification requirements. It does not provide live GPS tracking, OCR, document uploads, or fully offline sync. Always distinguish current published behavior from source code, paused features and roadmap plans.
