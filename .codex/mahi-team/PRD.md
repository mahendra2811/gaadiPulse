# GaadiPulse premium and reliability improvements

## Objective
Improve the existing Android-first application according to the UI and functionality review: clear visual hierarchy, consistent light/dark styling, usable forms and navigation, trustworthy data states, accessibility, performance and verified release flows. Preserve existing user data, security, English localization and online-only behavior. Google sign-in stays hidden as previously requested.

## Delivery priorities
1. Verify release/backend configuration and core flows; external project selection pending.
2. Refine shared UI and Home/navigation without changing permissions or financial semantics.
3. Improve onboarding, vehicle, fuel, expenses, history and error/recovery experiences.
4. Improve reminders, documents, reports, insights, membership clarity and loading efficiency.
5. Check dark mode, accessibility, narrow screens, tests and Android build; record actual outcomes.

## Constraints
No destructive migrations, fictitious analytics, guessed data, deployment or publishing. New photo uploads, offline drafts, OCR, GPS and Hindi need scoped product/security design and are not represented as completed functionality. Existing state and uncommitted work must be preserved. Treat future-feature proposals as a separate roadmap until requirements and security controls are resolved.

## Open decisions
- Which Supabase project is the intended backend? Existing pamuveulonnbjocfprxh or newly created gmkpovngiwahwywwusih.
- Live QA depends on approved credentials, accounts, configuration and test devices.

## Backend choice — 2026-11-20
The user chose existing project pamuveulonnbjocfprxh. Local .env.local URL and publishable key were aligned to the existing .env, preserving a local backup. EAS production URL and publishable key were read and verified to match, without changing hosted settings. Hosted migrations, real auth and RLS remain unverified.

## Migration history check — 2026-11-20
Read-only `supabase migration list --linked` against the selected project found local migrations 013, 014, 016 and 018 absent from remote history, despite 015 and 017 being present. The normal dry run refused out-of-order migrations; an `--include-all` dry run listed those four. This is not proof of actual schema state. No migrations were applied, repaired or deployed. Schema reconciliation, backup and validation are required before any production action.
Read-only remote catalog inspection found the Daily Progress vehicle triggers still present and none of the inspected 014/016/018 functions, triggers or currency columns present. These observations are partial, not a full schema audit. No hosted write was performed.
