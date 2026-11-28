# GaadiPulse changelog

## Unreleased

- Added a skippable first-run introduction with per-vehicle Owner/Pilot guidance,
  inline first-vehicle setup progress and personalized empty-dashboard tips.
- Added vehicle-time-zone weekly/monthly Owner summaries backed by bounded
  server history aggregates and a separate ten-row recent expense feed.
- Added opt-in anonymous first-party analytics, strict event validation,
  aggregate operator views, and an additive 90-day retention path.
- Completed the Hindi catalog and added required English/Hindi locale coverage
  validation. Other unfinished locale catalogs retain English fallback.

## 1.0.8 — 2026-11-28

- Added a safe, use-based in-app review request policy and permanent Rate,
  Share and Send Feedback actions in Settings.
- Added optional Play Store updates, compatible Expo OTA update checking, and
  version-scoped What's New notes.
- Added a remotely configurable critical minimum-version policy and public
  feature flags. Critical updates remain inactive until an operator configures
  the Supabase policy after release validation.

## Release note maintenance

Add a version entry before each significant release. Update the version-specific
copy in `src/features/release/WhatsNewPrompt.tsx` and `src/lib/i18n/locales/en.json`
when release changes need different user-facing notes. OTA updates must keep the
same `runtimeVersion`; native changes require a new compatible binary.
