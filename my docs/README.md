# GaadiPulse — Codex Implementation Kit

**Product:** GaadiPulse — Every Vehicle. Every Detail.  
**Target:** Android-first React Native / Expo app, Supabase backend, SQLite offline, free launch.  
**What this download is:** **implementation specifications, Codex instructions, visual assets, reference schema, templates and release checklists**. It is **not** a pre-built or certified production Android application. Codex must create the source and test it.

## Start here
1. Read `PROJECT_REFERENCE.md` and `docs/START_HERE.md` in full.
2. Keep this directory as the future Expo project's root, or copy its contents into your intended repository root.
3. Open Codex terminal in that directory; instruct it to read `AGENTS.md`, `PROJECT_REFERENCE.md` and `PROMPT_1_FOUNDATION.md` and **implement**, not summarize.
4. Complete and verify Prompt 1, then Prompt 2, then Prompt 3. Each stage should write `docs/STAGE_N_HANDOFF.md` listing actual test results and blockers.
5. Supply Supabase/Google/EAS credentials locally following `docs/EXTERNAL_SETUP_AND_RELEASE.md`; do not paste secrets into prompts or commit them.

## Primary files
| File | Purpose |
|---|---|
| `AGENTS.md` | Persistent Codex operating and engineering rules |
| `PROJECT_REFERENCE.md` | Authoritative product requirements and design decisions |
| `PROMPT_1_FOUNDATION.md` | Stage 1: Expo, auth, design system, navigation, garage, vehicle wizard |
| `PROMPT_2_FUEL_EXPENSES.md` | Stage 2: fuel, expenses, meter readings, analytics, maintenance |
| `PROMPT_3_COLLABORATION_RELEASE.md` | Stage 3: Owner/Pilot, progress builder, offline, documents, QA/release |
| `docs/` | Screens, UX rules, security model, sync, imagery, testing, external configuration |
| `assets/` | Actual bundled SVG/PNG illustration assets and extension art |
| `config/` | Environment and app configuration examples, vehicle catalog and English strings |
| `supabase/reference/` | Initial SQL implementation reference; Codex must reconcile with migrations |
| `scripts/generate_assets.py` | Rebuild extension artwork PNG files from editable SVGs |

## Final product navigation
**Home / Fuel / Expenses / More**, floating rounded bottom nav. Owners and Pilots see only authorized per-vehicle features. One vehicle auto-selected; multiple vehicles use a header bottom-sheet switcher. Form pages show selected vehicle directly below header and permit switching before saving.

## Must NOT claim complete until verified
- Google login + email OTP tested against actual Supabase identity provider.
- Owner/Pilot membership and RLS adversarial tests passed.
- Daily Progress forms saved under immutable versioned schemas.
- Offline outbox sync and idempotent retries tested.
- Document metadata, reminders, export, accessibility and loading state tested.
- `tsc`, lint, unit/integration tests and at least one real Android build/device smoke test pass.

## Deferred by explicit product decision
User-uploaded vehicle photos, bill/doc photos, real document file uploads, OCR, GPS integration, ownership-sale transfers, paid plans and Hindi translation text. The UI must never pretend deferred features work. This kit DOES include bundled graphics, all needed basic illustrations and architecture for later capabilities.
