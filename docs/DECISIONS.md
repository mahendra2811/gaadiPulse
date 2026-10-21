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
