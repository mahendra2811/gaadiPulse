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

