# Reminder access fix handoff

## Implemented

- Serialize scheduling and cancellation by account and vehicle, including direct reminder detail actions.
- Reject asynchronous reconciliation after the authenticated account changes or its session generation is invalidated.
- On successful, validated server responses, remove only the signed-in account's schedules for vehicles no longer in the fresh vehicle list, archived vehicles, or vehicles with an explicit `reminders.read: false` grant.
- Preserve schedules after network, permission-query, malformed-response, or session errors. A null vehicle-list RPC response is now treated as malformed rather than an empty authorized list.
- Clear secure-storage schedule markers when an owned schedule is cancelled; recreate a missing OS schedule when the marker survived an interrupted app lifecycle.
- Reconcile every vehicle for the account when the reminders hook runs, including when there is no active vehicle. Reconciliation still runs to clean up revoked access when notification permission is currently disabled.
- Sign-out and account changes cancel/dismiss only GaadiPulse reminders for the affected account. Unrelated scheduled notifications and other accounts' reminders are preserved.

## Verification

| Command | Result |
| --- | --- |
| `npm test -- --maxWorkers=1` | PASS — 29 files, 101 tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx expo config --type public` | PASS |
| `npx expo export --platform android --output-dir /tmp/gaadipulse-reminder-review-export` | PASS — Android JS bundle exported |
| `git diff --check` | PASS |
| `npm run format:check` | FAIL — 21 files reported by Prettier; no unrelated bulk reformat applied |

Mock-notification tests cover vehicle removal, explicit reminder permission revocation, offline vehicle-list failure, account mismatch, recovery when the OS schedule disappeared but the secure marker remained, and cancellation after an in-flight schedule races with session invalidation. No physical-device notification delivery test was run. No hosted Supabase change, database migration, EAS build, or store submission was performed.

## Files changed

- `app/_layout.tsx`
- `src/features/auth/session.tsx`
- `src/features/garage/api.ts`
- `src/features/records/screens.tsx`
- `src/features/reminders/notifications.ts`
- `src/features/reminders/useReminders.ts`
- `tests/onlineOnly.test.ts`
- `tests/reminderAccess.test.ts`
