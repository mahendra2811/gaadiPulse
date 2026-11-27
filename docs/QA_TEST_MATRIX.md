# QA and release verification

This page is the forward-looking verification checklist. The [latest Stage 3 handoff](STAGE_3_HANDOFF.md) is the historical evidence log; use its newest dated entry for commands actually run. A source feature or bundle export is not proof of hosted or device behavior.

## Current verification boundary

- Source-level checks have passed for specific changes, including TypeScript, lint, tests, Expo export and a debug Android build; check the handoff entry for exact commands and scope.
- Hosted Supabase authorization, current migration deployment, live identity providers, and full real-account workflows still require explicit evidence from the target environment.
- Physical-device accessibility/layout checks and signed release validation must be recorded when performed.
- Authenticated data is online-only. There are no supported offline record drafts, local ledger cache, or automatic reconnect uploads.

## Before release

1. Run formatting, strict TypeScript, lint, and the complete unit/migration test suite. Record failures without treating unrelated checks as passed.
2. Apply pending migrations to a disposable local Supabase instance in order. Verify the full migration chain, then review target migration history before any hosted application. Never reset a real database.
3. Exercise authenticated Supabase flows with two Owners, multiple Pilots, and an outsider. Check direct API/RLS access, verified email grants, revocation, financial-field visibility, owner-only answers, archived/deleted vehicles, duplicate operations and revision conflicts.
4. With real development accounts, exercise garage, fuel/charging, expenses, meter observations, collaboration, progress, documents, reminders and reports that are enabled in the target build. Confirm failures have retry/recovery and no unintended write occurs.
5. On Android, test 320dp/360dp layouts, large text, keyboard and safe areas, Back/discard, loading/errors, accessibility labels and reduced motion. Verify notifications and export behavior on-device where applicable.
6. Build and install the intended signed release candidate. Verify package/signing/provider configuration, privacy declarations, deletion/retention operation and Play Console details before publication.

Use [feature acceptance scenarios](FEATURE_ACCEPTANCE_MATRIX.md) for detailed expected outcomes and [external setup](EXTERNAL_SETUP_AND_RELEASE.md) for operator-owned requirements.
