# Vehicle reminders: current behavior and improvement plan

## What exists

A permitted user can create a reminder from More → Reminders with a title and at least one date, KM threshold or HOURS threshold. The form offers Service, EMI, Insurance and Other categories, optional monthly/yearly date recurrence, and Pilot visibility. Owners can complete or snooze reminders in the detail screen. Completing a dated recurring item advances its date by a calendar month or year; a one-time item completes. Snooze changes the due date to 24 hours from the action. Document expiry, eligible EMI expenses and maintenance schedules can create linked reminders. Permissions, linked-record creation and ownership rules remain server-enforced.

With device notification permission, date notifications are scheduled locally. The currently selected vehicle's accessible reminders are reconciled while the app is active and when it returns to the foreground. KM/HOURS thresholds depend on the latest accessible recorded readings and reconciliation; they are not live GPS or guaranteed background monitoring. Android delivery depends on OS settings and limits. Signing out clears scheduled local notifications. Previously scheduled notifications may outlive a vehicle switch until the app reconciles or clears them; verify and address this before claiming full cross-vehicle or immediate revocation handling. No web notification delivery is implemented.

## Useful reminder templates

| Need | Current way to create | Recommended criterion |
| --- | --- | --- |
| Periodic service, oil, filters, tyres or brakes | Service or Other | Date, KM or HOURS; record both where useful. |
| Insurance, registration, permit, fitness, pollution certificate or licence | Insurance/Other or document expiry link | Actual expiry date; enter an earlier due date if advance notice is needed. |
| EMI or loan payment | EMI reminder or eligible linked expense | Payment due date and monthly recurrence where applicable. |
| Battery inspection, calibration or equipment servicing | Service/Other | Actual calendar date or observed KM/HOURS threshold. |
| Tax, permit fee or other custom obligation | Other | Actual deadline and yearly recurrence only where applicable. |

These are user-created suggestions, not automatically generated obligations. Verify deadlines with the relevant provider or authority.

## Proposed work, in order

1. Audit existing reminder and linked-source creation, edit, archive, recurrence, completion and snooze across roles. Include edge cases for month ends, DST and vehicle time zones; make due-time behavior explicit. Decide how recurring reminders with meter thresholds advance so a completed threshold cannot immediately retrigger without a new target.
2. Add optional lead times and multiple alerts (for example 30/7/1 days), and clear previews of the due date, device time zone and exact planned notifications. Keep the underlying due date distinct from an alert time. Ask for permission only in context and provide an OS-settings recovery path.
3. Add practical presets for the use cases above, prefilled but editable, with no invented vehicle deadlines. Link to a source document or expense when requested, prevent duplicates, and handle edits, completion, deletion and archive consistently.
4. Reconcile authorized reminders for all relevant vehicles, including revoked access and archived vehicles, cancelling obsolete scheduled notifications without exposing private data. Preserve clear offline/network failure and retry behavior; scope all local identifiers to account, vehicle and reminder. Never promise that a client immediately learns of a remote revocation while offline.
5. Make notification details and deep links permission-aware at open time, provide an in-app due/overdue view, and keep notification text free of sensitive details on the lock screen. Document Android reboot, notification permission, scheduling capacity and background execution limitations; do not claim exact delivery.
6. Test Owner/Pilot permissions, revoked access, multiple vehicles/accounts, expired sessions, device reboot, month ends, DST, timezone changes, edited/deleted linked sources, threshold resets, repeated reconciliation, OS permission denial and physical Android delivery. Check database authorization directly as well as UI behavior.

This is a plan, not a claim that presets, advance alerts, cross-vehicle reconciliation or guaranteed delivery have been implemented.
