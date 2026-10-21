# Stage 1 QA cases

Automated evidence lives in `tests/` and the stage handoff. The original full product matrix remains in FEATURE_ACCEPTANCE_MATRIX.md and should not be interpreted as completed by the source kit.

## Live-provider test gate

With a development Supabase configured, verify email OTP send/invalid/expired/resend, Google cancel/success, PKCE cold deep link, token refresh, profile setup, account switching and sign-out cleanup. Verify two Owners, two Pilots, outsider, an unverified email grant and a later verified account. Exercise direct REST mutation attempts as well as UI actions. PostgreSQL fixture tests do not replace these integrations.

## Garage test gate

### Add vehicle interaction fix — 2026-10-21

- Entire category cards (including artwork) now select the category and expose the checked radio state. Selection retains the existing subtype and meter defaults.
- Shared screen scroll areas have explicit flex/min-height constraints; the action footer cannot shrink, keeping Continue outside the scrolling category list.
- PASS: `npm run typecheck`, `npm run lint`, `npm test` (28 tests), `npx prettier --check src/features/garage/VehicleForm.tsx src/components/ui/index.tsx`.
- BLOCKED: live browser click verification; both Brave and Chrome computer-use access timed out. Manual check: reload `/garage/add`, click category artwork, verify its check mark, press Continue, and verify the matching subtype choices appear. Check a narrow viewport as well.
- No database or migration changes; Android build and SQL checks were not run for this UI fix.

Zero vehicles → add unregistered tractor with BOTH → baseline observations → review/save → retry same operation with network interruption → no duplicate. Add a second KM vehicle → switch → meters must not flash prior vehicle. Revoke Pilot while app is backgrounded → foreground refresh must remove access. Archive/recover → active fallback. Open same vehicle on two devices → save first, then second → CONFLICT instead of overwrite. Restore a locally saved wizard draft after process restart. Confirm logout deletes drafts. Decline navigation confirmation and retain input.

## Android/accessibility test gate

320dp and 360dp widths; light/dark/system theme; enlarged type; keyboard; gesture and three-button nav; hardware back through each wizard step; all 48dp targets; TalkBack labels; reduced motion; network unavailable and retry. Capture actual emulator/device evidence only. No screenshot is evidence of authenticated functionality unless a real account was used.

## Release gate

Repeat SQL tests on real Supabase with actual JWTs/REST and concurrent connections. Review npm audit findings in build tooling before release. Run a signed Android release build; validate SHA/provider configuration and Play requirements. Current pre-release legal content needs operator contact/policy review. No store publication is automated by this stage.
