# Operator-owned release checklist

Use this checklist with the [QA matrix](QA_TEST_MATRIX.md), [external setup guide](EXTERNAL_SETUP_AND_RELEASE.md), and the latest [stage handoff](STAGE_3_HANDOFF.md). It lists actions requiring the operator's own provider, database, device, or Play Console access.

## Backend and identity

- [ ] Configure a development Supabase project, public app URL/key, Auth providers, email delivery and deep-link redirects.
- [ ] Review the project's migration history; apply only reviewed pending migrations in order. Verify against disposable local Supabase before changing a real project.
- [ ] Test verified sign-in, session recovery, account switching and per-vehicle Owner/Pilot access using multiple test accounts.
- [ ] Check RLS through direct API requests, including denied reads/writes, financial visibility, revocation, archived vehicles and concurrent edits.
- [ ] Verify online-only behavior: failed reads are not shown as successful empty data, failed/uncertain writes have truthful recovery, and reconnect never silently submits a record.

## Android and release

- [ ] Exercise enabled app flows on Android at narrow widths and with larger text, keyboard, Back, accessibility services and reduced motion.
- [ ] Verify local reminder delivery and export/share behavior on the target Android version where those features are enabled.
- [ ] Build and install the intended signed release candidate; verify package name, signing certificate, OAuth configuration and Play Console setup.
- [ ] Review privacy/terms, support contact, retention/deletion operation and Play Data Safety declarations against the actual build and deployed services.
- [ ] Publish only after the release gates and open blockers in the latest handoff are resolved.

Never share OTPs or private signing/provider secrets in source control or public prompts. Keep production credentials in their intended provider or secret-management surfaces.
