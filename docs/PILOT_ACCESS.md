# Vehicle owner and pilot access

## Owner workflow

1. Select the vehicle in the header, open **More → Vehicle members**, and choose **Grant access by verified email**.
2. Enter the person's email, choose **Pilot** or **Owner**, review any pilot read/create restrictions, and grant access. The role applies only to the selected vehicle.
3. An existing verified account receives the grant automatically. An unregistered or unverified email gets access after signing in with that verified email; no acceptance link is needed. Owners can revoke a grant or membership from the same screen.

The grant screen and pilot reads require the server-side pilot policy marker. If the server policy is not installed or cannot be reached, the app shows an error and blocks new grants or pilot reads. Revoking existing access remains available. This client gate does not protect direct API access on an older backend: the SQL migration must be applied before assigning pilots.

## Pilot experience

For each assigned vehicle, a pilot can by default add fuel/charging, expenses and meter readings, and read the entries they are allowed to see. The owner can independently restrict read or create access for each of those categories, and can optionally grant Daily Progress viewing and submission. Progress edit and deletion remain owner-only. The server rejects pilot edits, deletions, and meter corrections, including requests made outside the UI. A pilot can be an owner of another vehicle.

The server limits pilot fuel, expense, meter and permitted progress history to **today and yesterday in the vehicle's time zone**, using the event or observation time. The UI also filters cached records as the day changes. Owners retain their normal historical access. The pilot screen hides monthly totals and long-range filters so the limited history is not presented as a complete monthly total. All vehicle categories are enabled for creation and records.

## Deployment and verification

On 2026-11-05, migrations 005–011, including the Pilot migrations 010 and 011, were applied to the linked project. Migration 005 was corrected before its first application on that project; the full migration chain compiled in the PGlite fixture. The linked migration list confirms 001–011 applied, and a database query returned `true` from `pilot_access_policy_ready()`. Other environments must verify their migration history before applying changes.

After deployment, test verified Google and email sign-in, existing and newly registered grants, two vehicles with different roles, create operations, direct API/RLS attempts to read older rows or modify data, permission overrides, revocation and time-zone boundaries. Do not rely only on a hidden button or the local PGlite fixture. Physical-device UI and hosted Supabase tests remain required.

The migration 005 repair parenthesizes the CASE expression in `enforce_vehicle_fuel_profile`; no reset or manual migration-history repair was used.
