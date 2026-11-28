# Architecture checkpoint: application updates and remote release policy

**Scope:** user's selected Play Store review and update-management requirements.

## Recommended reversible design

- Expo EAS Update for JavaScript/assets only, with `runtimeVersion.policy = appVersion` so native-incompatible updates cannot target a build.
- Separate EAS channels: `development`, `preview`, and `production`; no publish/build/deploy in this task. EAS operator must link/configure the existing project and publish updates deliberately.
- Keep native binary updates as optional Play Store flexible updates. Reserve mandatory update gates for explicit minimum-supported-version policy entries marked critical for compatibility/security; default configuration has no mandatory minimum.
- Ship a versioned in-app changelog. Show the current release notes once after a version upgrade.
- Read public app-release policy/feature flags from an RLS-safe Supabase release configuration endpoint. Flags are presentation/rollout only and never replace authorization checks. Missing/offline policy defaults to no forced update and disabled remote-only features.
- Stage rollouts and roll back through EAS update operations; document commands and operator runbook, without changing hosted EAS state.

## Decision needed

Approve this design, or specify a different source for remote minimum-version policy and feature flags. This is the required mahi-team architecture checkpoint before changing EAS runtime/channel config and adding a public release-policy endpoint.

**Approved by user:** 2026-11-28 — “Approve Supabase policy + EAS Update (Recommended)”.

## Not included

Production deploy/publish, Play Console release changes, enabling mandatory minimum versions, remote flag activation, Sentry/crash telemetry or user data transmission to a new service.
