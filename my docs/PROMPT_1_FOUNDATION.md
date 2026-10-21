
> **Expanded implementation kit:** Before implementation, also read `AGENTS.md`, `docs/START_HERE.md`, `docs/ARCHITECTURE.md`, `docs/SCREEN_MAP.md`, `docs/SECURITY_AND_RLS.md`, `docs/SYNC_PROTOCOL.md`, `docs/UI_DESIGN_SYSTEM.md`, `docs/ASSET_MANIFEST.md`, `docs/FEATURE_ACCEPTANCE_MATRIX.md` and applicable `config/` templates. Integrate the real bundled `assets/` images, including splash, empty states and vehicle subtypes. Review `supabase/reference/001_core_schema.sql` for schema guidance, but apply only validated chronological migrations authored for the working app. After implementation, write an actual `docs/STAGE_N_HANDOFF.md` based on `docs/STAGE_HANDOFF_TEMPLATE.md`. The supporting files are part of the product contract, not optional reading.

# PROMPT_1_FOUNDATION.md — Codex Implementation Stage 1 of 3

You are the lead mobile engineer, architect, QA engineer, and accessibility-focused designer implementing GaadiPulse. Deliver real running code, not a plan. You have repository write access.

**READ FIRST:** `PROJECT_REFERENCE.md` and its supplied `assets/*.svg`. Treat it as the binding product contract. Stage 1 goal: fully working foundation, authentication, assets, vehicle garage and setup flows, and real RLS-protected vehicle access. All created screens functional and integrated; design tokens used everywhere.

## Non-negotiable working style for this stage
- Read `PROJECT_REFERENCE.md` completely before editing; verify preceding stage handoff and inspect the existing repository. Do not replace installed functionality. Work in current directory.
- Implement full source files, Supabase migrations/policies/functions, tests and documentation. No pseudo-implementations, fake charts, no-op Save buttons, or unsafe test-only shortcuts in production code.
- If credentials are unavailable, build using Supabase local development when possible, validate schema and tests, document exact external steps and report only what was actually validated. Do not claim Google sign-in works without live credentials.
- Test accessible 320dp widths, keyboard/Android safe area, dark theme, large font, reduced-motion, offline/no network, errors, empty states, concurrent mutations, stale data after switching active vehicle, and permission-denied handling.
- Keep PR size coherent; run typecheck, lint and tests; when tools unavailable document the exact blocking cause and retry steps.
- Ensure user-facing English copy lives under translation keys, not scattered literals; reserve Hindi translation wiring without inventing translations.
- The header progress indicator represents completed prerequisites where determinable; otherwise indeterminate. Do not use arbitrary percentages or mark full before required data ready.
- Include dedicated `docs/STAGE_N_HANDOFF.md` with implementation summary, files/routes/schema, actual commands/results, remaining external config, and next stage dependencies.


## Phase A — bootstrap and verify tooling
1. Inspect node/package manager/Expo SDK compatibility using installed toolchains; scaffold Expo Router strict TypeScript project if empty. Lock compatible dependency versions; do not independently select incompatible React/React Native versions.
2. Install and configure Expo Router, react-native-safe-area-context, react-native-screens, React Native Reanimated, react-native-gesture-handler, react-native-svg, expo-sqlite, expo-secure-store, expo-linking, expo-haptics, expo-notifications, react-hook-form, zod, @hookform/resolvers, @supabase/supabase-js, TanStack Query, zustand, netinfo, vector icon library, testing utilities. Install additional packages only when justified and documented.
3. Configure ESLint, Prettier, tsconfig strict, absolute aliases, environment parsing with Zod, `.env.example` (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY only, OAuth redirect scheme). Never commit credentials. Set `app.config.ts`, deep link scheme `gaadipulse`, Android package `com.pooniya.gaadipulse` (make configurable before first release), edge-to-edge safe areas, status/nav bar modes, app display title.
4. Implement folder layout specified in reference; create `docs/ARCHITECTURE.md`, `docs/LOCAL_SETUP.md`, and `docs/DESIGN_SYSTEM.md`.

## Phase B — image system and production UI
1. Convert provided `assets/app-icon.svg` into a correct full-resolution opaque app icon, Android adaptive icon foreground and splash asset using an automated repeatable script; ensure Google Play icon masks and safe zone. No text in icon; GaadiPulse wordmark may be UI text. Generate quality variants for light/dark logo placement. `scripts/generate-assets.*` must run without relying on proprietary editors. Explicitly record reference SVG is a newly made approximation of the chosen logo and how to replace with user's approved final logo later.
2. Integrate all 5 vehicle illustrations and 3 onboarding SVG images as actual bundled visible assets; no dead `require` or unsupported SVG runtime paths. Build SVG wrapper components, illustration fallback, layout responsive scaling, caching where appropriate.
3. Also generate from code a consistent matching visual set (no external copyrighted photos): empty garage, no fuel, no expense, no progress, no connectivity, permission restricted, generic completed state. Export as own SVG components or files. Create dark splash scene from shapes/gradients and UI screen layouts; onboarding and splash must be real polished, not stock placeholders.
4. Generate production asset checklist in `docs/ASSETS.md` with dimensions/placement/variants, image generation prompts copied from reference, and exact scripts for icon/splash regeneration. Include a feature graphic and screenshots production-guide (not fabricated Play Store screenshots). Any image assets that cannot be produced should be explicitly documented and replaced with finished local vector art.
5. Theme: light `#F7F8FA` backgrounds, deep green `#122C2A`, emerald `#24C48E`, accessible ink, muted grey, radii 16–28, spacing 4px scale, light/dark token system and typography. Maintain WCAG-considerate contrast. Build `AppText`, `AppButton`, `InputField`, `MoneyField`, `Screen`, `Sheet`, `BottomActionBar`, `ConfirmDialog`, `ToastProvider`, `LoadingLine`, `Skeleton`, `EmptyState`, `ErrorState`, `PermissionGate`, `DateTimeInput`, `VehicleContextCard`, `VehicleCategoryCard`, `MeterFields`, `FormSection`, `NumberField`, `LoadingBoundary`.
6. Header bottom loading line under shared app header; a `usePageLoad` coordinator API with required promises/events; both determinate and indeterminate modes; no fake 90% holds. Add success/error/warning/info toasts, accessible announcements, proper keyboard avoidance, saved draft warning, offline banner and retry, error boundary. Implement component tests.

## Phase C — auth and profile
1. Working Supabase singleton client with mobile-safe URL/session handling, secure persisted refresh tokens via appropriate supported adapter, deep-link/OAuth handling, refresh lifecycle and signed-out boundaries. Use Expo AuthSession / platform-supported approach for Google -> Supabase Auth, and passwordless email OTP with one-time code verification, resend countdown, email change handling and email verified status.
2. Auth screens: animated branded splash with session bootstrap; onboarding carousel with actual SVG artwork (3 screens); Welcome/Sign In, Google button, Email OTP input/send, Verify OTP, Profile Setup, auth error/retry states, Terms/Privacy placeholder must be REAL local document content, not fabricated web links.
3. User profile table and typed queries; update display name, locale preference, theme, timezone. Only verified email (trusted auth identity) may resolve precreated vehicle access grants; no separate invitation acceptance.
4. `useSession`, `useAuthActions`, `useProfile`, `useLocale`, `useThemeMode`, `useToast`, `usePageLoad` hooks with clean typed contracts. Gracefully handle email provider unavailable/misconfigured and not silently authenticate locally.

## Phase D — server foundation, permissions and invitations
Create ordered Supabase SQL migrations now, expanding later in stages 2–3; do not postpone base security. Include RLS for EVERY public table and future schema patterns.
Required initial tables:
- `profiles (id = auth.users.id, display_name, email snapshot, locale, theme, created_at, updated_at)` with appropriate profile self read/update only; protect email from client edits.
- `vehicles (id uuid, created_by, registration_number nullable, nickname, category, subtype, brand, model, variant, model_year, energy_type, meter_mode KM/HOURS/BOTH, default_meter_unit, timezone, archived_at, created_at, updated_at)`.
- `vehicle_members (vehicle_id, user_id, role OWNER/PILOT, is_primary_admin, status ACTIVE/REVOKED, joined_at, created_by, unique(vehicle_id,user_id))` with at least one protected Owner.
- `vehicle_access_grants (id, vehicle_id, normalized_email, desired_role, permission_overrides jsonb, granted_by, status UNRESOLVED/RESOLVED/REVOKED, resolved_user_id, created_at, revoked_at)` for no-accept email assignments. Multiple Owner/Pilot grants allowed but prevent duplicate active assignments for same email+vehicle. Existing verified users can resolve right away in secure server function. Avoid client CRUD on grants except via function. Never resolve based solely on user-submitted unverified email.
- `vehicle_settings` owner-managed configuration with pilot permissions defaults, progress policy seeds for stage 3.
- `meter_readings (vehicle_id, reading_type KM/HOURS, value numeric, observed_at, entered_at, source MANUAL/FUEL/EXPENSE/PROGRESS, created_by, linked_entity_type/id nullable)` with nonnegative constraints and indexes. Numeric value decimals for hours. Distinguish historical record from cached latest vehicle reading.
- `audit_events` append-only server-controlled sensitive operations log.
- optional `catalog_makes/models` seed (small curated list + Other manual, never assert exhaustive).
Create `is_vehicle_member(vehicle_id)`, `is_vehicle_owner(vehicle_id)`, `has_vehicle_permission(vehicle_id,permission_key)` helpers with safe search_path and RLS-conscious SQL, avoid recursion; protect DELETE/update last Owner. No broad table permissions for Pilots. RPC `grant_vehicle_access`, `revoke_vehicle_access`, `resolve_my_access_grants`, `set_vehicle_membership` with authenticated context, owner authorization, normalized email and verified identity from `auth.users` available only to privileged server function. If Edge Functions needed for checking auth.users, implement and document. RLS must not depend on spoofable JWT client-supplied app_metadata.
Seed deterministic development vehicles and example catalog ONLY in dev seed. Do not seed user data into production.

## Phase E — screens, navigation and garage
Route groups described in reference, implement:
- Floating bottom tabs Home, Fuel, Expenses, More with active pill animation and preserved tab scroll state, 16–20dp margins, 12–16dp above bottom inset; screen underlap padding. Icons plus labels; no hamburger. No tab bar on full-screen forms.
- Home Owner/Pilot skeleton and real vehicle summary header with latest meter values, chosen role, active vehicle; top switcher only for multiple; empty state when zero; responsive buttons into Garage, Progress (stage 3 future route should show explicit upcoming feature information temporarily but must be completed by stage 3), Fuel/Expenses (stage 2 likewise).
- Full Garage list with owned + shared vehicles; search, role badge, vehicle category icons, add vehicle; switcher modal/bottom sheet, automatic single selection, persisted active ID, fallback on revoked/archived records.
- Add Vehicle wizard screens: category card selection using bundled art; subtype list; optional brand/model searchable catalog plus manual other; details registration (normalize but don't assume verified), nickname, fuel type, optional purchase data; meter mode KM, HOURS, BOTH with type-aware default and optional initial readings; review and Save; support edit, archive and recover where allowed. All back navigation preserves values. Track created_at, who added and meter baseline. Initial meter readings create observed records with timestamp, not mutable only.
- Vehicle edit/settings for Owner with safeguards; Pilot read-only as permitted.
- More page with working entries for Garage, Profile, Settings, About, Sync Status and enabled future modules as staged; clearly mark later stages until delivered and remove markers by final stage.
- Settings language selector: English selected and working; Hindi listed as 'Coming soon' disabled until translation content provided. Locale keys/extraction/test exists, never silently change UI without translation. Theme selector light/dark/system and persistent preference.
- All screens accessible, real Supabase queries/mutations, no mock data except explicit demo mode (disabled production), error/loading/no access/empty states.

## Phase F — testing and handoff acceptance
- Unit: vehicle schema, registration normalization, meter config defaults, active selection, session flow, profile localization, progress line, back/draft guards.
- DB tests using local Supabase/pgTAP or scripted actors: one Owner, two Owners, two Pilots, Pilot denied vehicle modification, outsider cannot SELECT rows, revoked access denied, verified-email grant resolved without user accepting, same email cannot claim another account. Assert final Owner cannot be removed.
- Smoke E2E: first launch -> OTP or Google (with actual configured provider) -> add first vehicle -> saved garage -> add second -> switch -> refresh session -> role display.
- Run asset script/check file dimensions, `tsc --noEmit`, lint, tests, Expo export/build validation where environment permits. Write `docs/STAGE_1_HANDOFF.md` with commands/results and explicit items for stage 2.

Do not stop after planning. Start editing the repository now.
