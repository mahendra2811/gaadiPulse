# Start Here — exact Codex sequence

## Before first prompt
- Install Node LTS, Git, a supported Java version, Android Studio/SDK, and Supabase CLI as appropriate to this machine.
- Put all files of the extracted `GaadiPulse/` folder in one directory. **Do not execute or publish secrets** from the example env files.
- `PROJECT_REFERENCE.md` is the source of product truth. The visual assets are local and should be used from `assets/`.
- In Codex terminal say: **"Read AGENTS.md, PROJECT_REFERENCE.md and PROMPT_1_FOUNDATION.md completely; implement Stage 1 in this directory. Inspect every asset and preserve the existing files. At the end, run tests and produce docs/STAGE_1_HANDOFF.md."**

## Stage 1 gate
- Expo app boots on Android; real Supabase auth flow integrated (or environmental blockers called out).
- Shared design components, four floating tabs, correct header loader, toasts, modal/dialog primitives.
- One/multiple vehicle UI, Add Vehicle wizard with brand/model optional and KM/HOURS/BOTH persistence.
- English i18n wired; language setting architecture; bundled illustrations live on all required screens.

## Stage 2 instruction
Say: **"Read AGENTS.md, PROJECT_REFERENCE.md, PROMPT_2_FUEL_EXPENSES.md and STAGE_1_HANDOFF.md. Implement Stage 2, run its acceptance tests and create STAGE_2_HANDOFF.md. Keep Stage 1 working."**

## Stage 2 gate
- Fuel add/edit/history and **accurate** full/partial algorithms with missing meter handling.
- Other Expense add/edit/history, cash vs operating costs, maintenance and associated reminders.
- Independent meter readings, interval-safe analytics, measured/estimated labels, exports.

## Stage 3 instruction
Say: **"Read AGENTS.md, PROJECT_REFERENCE.md, PROMPT_3_COLLABORATION_RELEASE.md and all STAGE handoffs. Implement all remaining Phase 1 features, security and offline sync. Run the release QA matrix. Write final production verification and manual setup steps."**

## Stage 3 gate
- Automatic verified-email vehicle grants, member/permission administration, RLS proof.
- Versioned per-vehicle form builder, Pilot submissions, owner approvals and correction requests.
- Offline SQLite draft/outbox, idempotency, rejection/conflict flows; document metadata, reminders, reports.
- All accessible routes, local assets, tests, Android build and Play publishing checklist.

## What the user still needs to do
Create a real Supabase project, provide locally configured Auth/Google OAuth credentials, authorize Android SHA fingerprints, set up EAS/Play Console and legal policy links. See `docs/EXTERNAL_SETUP_AND_RELEASE.md`. Those actions cannot be safely hardcoded by Codex.
