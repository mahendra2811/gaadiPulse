# GaadiPulse — PROJECT_REFERENCE.md

> Read this entire file before every implementation stage. This is the product contract for Codex. Three stage prompts follow in order. Android-first, English UI initially; Hindi translations later. Product is free.

## Product identity and goal
- Brand `GaadiPulse`; tagline `Every Vehicle. Every Detail.`; Hindi marketing tagline later: `हर गाड़ी का पूरा हिसाब।`
- Android application for private and shared management of two-wheelers, cars, commercial trucks, tippers, tractors, and heavy machinery. Responsive on small Android phones (320–360dp), tablets optional. iOS-compatible architecture, but Android is release target.
- React Native + Expo Router + TypeScript; Supabase Auth (Google sign-in plus Email OTP), Postgres, Storage-ready architecture, SQL/RLS, Edge Functions; Expo SQLite local database and durable sync queue; TanStack Query, Zustand for only client UI state, React Hook Form + Zod, React Native Reanimated, safe-area, notifications, SVG, testing.
- No subscriptions, ads, GPS tracking, or resale marketplace in Phase 1. Build clean extension boundaries for future ownership transfer, GPS and optional billing.
- Default English; settings language selector available; English fully translated through translation keys. Hindi displayed as 'Coming later' or disabled until actual locale resources exist; never show fake Hindi translations. Persist locale preference; future switch works after locale is installed.
- Image scope: actual **bundled app-brand vector illustrations now**. Use `assets/` delivered with these prompts: `app-icon.svg`, five category SVGs and three onboarding SVGs. Build vector icon components in UI or convert bundled SVGs into Android-resolvable assets through script. ALL screens use these real bundled assets and iconography; no remote image dependency, broken image, placeholder gray rectangles, or copyrighted car-manufacturer imagery. Full user photo capture, document file uploads, OCR, and generated vehicle model photos are outside this round. Keep dedicated interfaces and disabled/clear future entry points rather than falsely implying upload works. Generate app-icon PNG, splash adaptive icon PNGs from asset SVG using a repeatable script (preferred sharp or resvg) and verify dimensions. One additional visual asset spec in the prompts covers optional backgrounds and more vehicle illustrations.

## Hard UX contracts
- Four persistent, floating rounded bottom tabs **Home / Fuel / Expenses / More**; margin horizontal 16–20dp; bottom 12–16dp above system safe area; height 64–72dp; touch targets >=44dp (ideally 48dp); restrained animation and accessibility reduced-motion. Forms pushed modally outside tabs with fixed Save button above keyboard/safe area; no hamburger menu.
- Single vehicle: selected automatically, show its details and no redundant selector chevron. Multiple vehicles: switcher at top of primary tabs; in Add Fuel and Add Expense selected vehicle displayed **just below header** and can be changed before save. Role badge Owner/Pilot on garage cards. Switching active vehicle clears/rekeys query state (never flashes prior vehicle data).
- Intro/splash visuals and category art. Show realistic data only; empty/no-data/permission-denied/offline/retry states. Modal sheets, confirm dialogs, accessible toast notifications, haptics on appropriate actions. Do not fake completed API calls.
- **Header loading line**: thin animated progress line under header. Display determinate percentage ONLY where progress is truly measurable (e.g., count completed required requests, upload bytes when uploads exist); otherwise indeterminate bar. Must complete only after required data for route ready. Async images and supplementary charts may continue loading separately with their own skeletons. Cancellation and error states clear the bar; navigation race and double loading handled.
- Correct Android back behavior; drafts preserved or discard confirmation; no dead-end screens. Smooth limited animations 180–240ms, disabled for reduced-motion. Prevent double submits.
- App can serve **Owner and Pilot**; role PER VEHICLE, not global. One account Owner of some and Pilot of others; multiple Owners and multiple Pilots of a single vehicle. Owner configures per vehicle and per member permissions, role access, Daily Progress form and submission policy. Pilot only sees allowed records and actions. There is a protected primary administrator distinct from legal vehicle title; app-role assignment ≠ government RC ownership.
- Grant access by entered email immediately in backend, **without invite acceptance**. The grant becomes effective for an existing verified account immediately; for an unregistered email it automatically resolves on later verified login. No emailed acceptance action; authentication still Google verified identity or email OTP. Avoid exposing private vehicle data to unverified address or arbitrary email strings. Owners can revoke.
- Vehicles configurable category, subtype, optional searchable make/model + custom model, nickname/registration optional for unregistered machinery, fuel/energy type, initial readings, timezone, `KM`/`HOURS`/`BOTH`. Defaults: road car/bike KM, excavator HOURS, tractor/tipper BOTH, editable. Both readings optional on Fuel and Expenses entries and can be entered later, with accurate *observedAt* distinct from *enteredAt*. Never backdate inferred readings silently. Maintain history when meter mode changes.
- Fuel: full/partial fill support, quantity, price per unit, amount (user enters any two and third computed), station optional, date/time, meter values optional, payment method/notes, typed fuel or electric charge workflow if supported. Mileage only computed between qualifying full fills, with partial fills accumulated; no invented mileage. HOURS metric liters/hour. Handle revisions and anomalous values. Fuel entries saved with missing meter allowed and 'reading pending' state.
- Expenses: all non-fuel items, quick entry amount/category/title/date; category-adaptive details for service, repair, tyres, battery, insurance, EMI, toll, parking, wash, permits, tax, fines, accessories, other; optional reading, vendor/payment/notes, maintenance line items and linked reminder; avoid double counting. EMI principal vs running expenses; cash outflow vs operating costs separately. Store money as integer paise.
- Daily Progress: per-vehicle configurable/versioned forms: standard date, KM/HOURS, notes and photo requirement setting (actual photo feature deferred). Custom text, paragraph, integer, decimal, currency, select/multiselect, yes/no, date/time, location-as-text, route origin/destination, trip count; field order, required, min/max, options, visibility/reportable, presets, preview. Progress initially Today/Yesterday by owner default; allow 0/1/7/30/custom past-day policy (max policy enforced backend), future disabled by default, timezone-aware. Multiple pilots submissions, owner approval, corrections, immutable schema versions, audit history. Only show 'photo required' when capture feature has been implemented; until then disable this setting with explanation, do not block submission.
- Fuel and expense records can be saved without odometer; separate Add Meter Reading action with observed timestamp and validation. Weekly/monthly distance from observed readings: show **measured intervals** and optional labeled estimates, never precise calendar period when boundary observations absent. Non-monotonic corrections flagged, not overwritten.
- Vehicle docs: record metadata, expiry dates, reminders; actual uploads later, show 'Add document details' not pretend file attached. Redirect to authoritative DigiLocker/mParivahan for official documents; locally entered metadata is not legally valid RC/DL.
- Reminders: date and KM/HOURS-based, recurring EMI/insurance/service, manual completion, notification permissions, pending-readings evaluation. Device-local notifications for offline tasks; secure optional push infrastructure only if needed. Report/export CSV/JSON in app; PDF where feasible without new server.
- Offline: sqlite mirror/drafts and idempotent outbox; server authority always final for collaborative access; revoked Pilots cannot sync new writes. Filter sensitive cached data; logout clears scoped data. Conflict states resolved visibly, not last-write-wins on monetary fields.

## Suggested app information architecture (~45 destinations/views)
A Auth: splash, welcome/onboarding, login, email OTP verify, profile setup, first garage/assigned vehicles.
B Garage: garage list, add vehicle wizard category, subtype, brand/model, details, meter config; profile/edit, archive.
C Home: owner/pilot home, vehicle switcher bottom sheet, daily progress add/history/details/edit, approval queue, standalone meter reading.
D Fuel: overview, add, history, detail/edit, analysis.
E Expenses: overview, add, history, detail/edit, analysis.
F Owner: members, grant by email, member permissions, vehicle progress settings, form builder, field editor, pilot preview, form versions.
G More: garage, vehicle settings, documents/document metadata, reminders add/edit, reports, export, profile/settings, language/theme, help/sync status.
Use reusable shared sheets/detail views; all routes must be reachable, authorized, functional, and tested. Never count an inaccessible placeholder screen as complete.

## Default implementation layout
```
GaadiPulse/
  app/                          # Expo Router screens / route groups
    _layout.tsx
    (auth)/                     # welcome, login, OTP, profile
    (tabs)/                     # home, fuel, expenses, more
    garage/                     # all vehicles, add wizard, [id], edit
    fuel/                       # add, [id], edit, analytics
    expenses/                   # add, [id], edit, analytics
    progress/                   # add, list, [id], review
    owner/                      # members, share, permissions, form builder
    documents/ reminders/ reports/ settings/
  src/
    assets/                     # generated copied app png/vector assets
    components/ui/              # Button, MoneyField, Input, Card, Sheet, Toast, ErrorState, LoadingLine
    components/navigation/      # FloatingTabBar, VehicleHeader, VehicleSwitcher
    components/vehicle/         # category cards, meter fields, vehicle summary
    components/forms/           # dynamic form renderer/builder, attachments-disabled copy
    features/                   # auth, garage, fuel, expenses, meters, progress, members, docs, reminders, reporting
       <feature>/api.ts          # remote API, not directly called from UI
       <feature>/hooks.ts        # TanStack hooks, keys and mutations
       <feature>/schema.ts       # Zod validation and types
       <feature>/repository.ts   # SQLite / server data adapters as needed
       <feature>/components/     # feature-specific UI
    lib/supabase/                # typed client and auth session
    lib/db/                      # sqlite migrations, tables, outbox
    lib/sync/                    # queue, reconciliation, retry, idempotency
    lib/i18n/                    # English catalog, locale setting, future keys
    lib/notifications/
    lib/theme/                   # tokens, light/dark themes
    hooks/                       # useActiveVehicle, usePageLoad, useAccess, useOffline, useToast, useDebounce
    state/                       # minimal Zustand stores
    utils/                       # money, dates, meter and full-tank algorithms
    types/
  assets/                        # source svg artwork shipped in bundle
  supabase/migrations/           # deterministic ordered SQL and policies
  supabase/functions/            # email-grant, resolve-grant, change-role, submit-progress etc
  supabase/seed.sql              # dev-only safe sample brands/types
  scripts/                       # asset generation and verification
  tests/                         # unit/integration/e2e where feasible
  docs/                          # setup, architecture, migrations, QA, release, external steps
  .env.example
  eas.json
  app.config.ts
  package.json
```

## Boundary of future integrations
Phase 2: GPS/telematics source adapters, official VAHAN data via licensed API, second-hand legal transfer workflow, image/photo upload and OCR. Phase 1 must implement no fake API integrations and must preserve source/time provenance for records.

## Security, performance and deliverable bar
- Enable RLS for every public table, use auth.uid membership functions with safe SECURITY DEFINER + fixed search_path; prevent privilege escalation and impersonation. Keep service role keys out of client. SQL migration test for Owner A/B, Pilot C/D, outsider, cross-vehicle reads, UPDATE / INSERT policy, revoked members, email grants and last owner protection.
- Supabase Edge Functions only for privileged and atomic workflows; don't leak invitation recipient emails. Realtime scoped; signed/restricted storage if later added.
- TypeScript strict, no any for domain boundaries, lint, format, tests, clean imports; date handling/timezones and paise tested. No broken routing, duplicate records, infinite spinners, stale vehicle data, or unauthorised record display.
- Real setup requirements documented: Supabase project URL/publishable key, migrations and functions deploy, Auth Google configuration and Android SHA setup, email OTP provider settings, app package ID and EAS credentials, Play policy review. Codex should produce the app and complete local automated validations, but cannot truthfully declare Play published without credentials and actual review.
- Every stage ends with exact files modified, commands run, test results, issues and precise next stage instructions in `docs/STAGE_N_HANDOFF.md`; don't claim success if build is unverified.

## Image/illustration manifest: included files + additional optional assets
Included source vectors:
- `assets/app-icon.svg`: speedometer/pulse emerald mark, symbol only.
- `assets/vehicle-two-wheeler.svg`, `vehicle-four-wheeler.svg`, `vehicle-commercial.svg`, `vehicle-heavy-machinery.svg`, `vehicle-agricultural.svg`.
- `assets/onboarding-1.svg`, `onboarding-2.svg`, `onboarding-3.svg`.
Create and integrate Android icon PNG at 1024x1024, adaptive foreground 432x432 plus correct background, splash image, store feature graphic as needed. Use SVG as primary scalable category illustrations in vehicle wizard. Standard view: 512x384 (4:3) category cards, centered subject no brand marks, fixed object fit contain. All must look consistent.

IMAGE GENERATION PROMPTS (for Codex if image generation tool available; otherwise bundled vector images are acceptable, functional, and preferred over network imagery):
1. Splash 1080x1920: 'Elegant dark forest green automotive telemetry illustration, soft layered road lines forming a horizon, discreet emerald dashboard pulse motif, premium editorial mobile app background, no letters, no logos, leave centered negative space, clean vector or semi-flat, Android phone 9:16.'
2. Welcome 1080x1920: 'Premium friendly India-first vehicle tracking app scene showing bike, compact car, truck and tractor as equal-weight illustrated silhouettes, deep emerald and mint, 9:16, clean modern shapes, ample top/bottom safe areas, no text, no real manufacturer's badges.'
3. Onboarding fuel: 'Isometric petrol pump, measuring gauge, small receipt and route line, mint/forest green clean vector, 4:5, no text, no people, uniform visual language.'
4. Onboarding collaboration: 'Two human avatar symbols connected to a truck, secure shield and permission icons, premium abstract vector, 4:5, no text.'
5. Onboarding analytics: 'Speedometer, chart line and kilometre/hour symbols, understated teal vector, 4:5, no text.'
6. Empty states (transparent-background vector each): no vehicles, no fuel, no expenses, no progress, no network, permission restricted, successful saved; 512x512, matching palette, no captions.
7. Category illustration set: 'Individual side-profile vehicle silhouette [motorcycle/scooter/hatchback/sedan/SUV/pickup/truck/tipper/bus/tractor/excavator/crane/loader], mint-gradient light canvas, product-agnostic shape, no manufacturer's logos, consistent camera scale, 4:3, no text.'
Use assets only when generated/available; no false inference of specific vehicle model photograph from make/model dropdown. Document every asset's license or generation origin.

## Running the three stage prompts
1. Save this file and all `assets/` into project root. Paste `PROMPT_1_FOUNDATION.md` into Codex in same repo.
2. Verify stage 1 commands/test outputs and required external Supabase/Google setup; paste `PROMPT_2_FUEL_EXPENSES.md`.
3. Paste `PROMPT_3_COLLABORATION_RELEASE.md`; run final audit and deployment instructions.
4. Review `docs/EXTERNAL_SETUP_AND_RELEASE.md` for any manual credentials, real device tests and Play Console actions. These remain user-owned steps and cannot be performed by code generation alone.


## Expanded support kit (added for Codex implementation)
- `AGENTS.md` persistent agent instructions; `README.md` and `docs/START_HERE.md` for exact run sequence.
- `docs/ARCHITECTURE.md`, `docs/SCREEN_MAP.md`, `docs/UI_DESIGN_SYSTEM.md`, `docs/FORM_BUILDER_SPEC.md`, `docs/API_CONTRACTS.md` for implementation maps.
- `docs/SECURITY_AND_RLS.md`, `docs/SYNC_PROTOCOL.md`, `docs/FEATURE_ACCEPTANCE_MATRIX.md` for security and QA.
- `docs/EXTERNAL_SETUP_AND_RELEASE.md`, `docs/MANUAL_ACTIONS_AFTER_3_PROMPTS.md`, `docs/COMMANDS_AND_TROUBLESHOOTING.md` for user-owned setup and launch.
- `docs/ASSET_MANIFEST.md`, `docs/IMAGE_GENERATION_PROMPTS.md`, `assets/vehicle-subtypes/`, `assets/empty-*.png`, `assets/splash-screen.png`, `assets/auth-hero.png`, `scripts/generate_assets.py` for visuals.
- `config/` contains publishable-only environment example, vehicle model seed, progress form presets, English strings, tokens and release config examples; no secrets.
- `supabase/reference/001_core_schema.sql` is initial RLS-aware design reference. Codex must reconcile and validate full migrations; this reference is not automatically run.
- The generated source kit is not itself a completed Android application; Stage 1/2/3 are required to implement and test production code.
