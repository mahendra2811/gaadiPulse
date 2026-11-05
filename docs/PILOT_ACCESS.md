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

`supabase/migrations/202611040010_pilot_access.sql` and `202611040011_pilot_progress.sql` are additive migrations and has **not** been deployed as part of this change. The linked project's read-only migration listing showed 001–004 applied and 005–011 pending. The existing 005 migration fails to compile in a clean PostgreSQL fixture; an additive migration cannot fix a migration that runs before it. Resolve and review that bootstrap issue without resetting or altering production data, validate the complete chronological chain in a disposable environment, then deploy through the normal migration process. No remote SQL changes were made here.

After deployment, test verified Google and email sign-in, existing and newly registered grants, two vehicles with different roles, create operations, direct API/RLS attempts to read older rows or modify data, permission overrides, revocation and time-zone boundaries. Do not rely only on a hidden button or the local PGlite fixture. Physical-device UI and hosted Supabase tests remain required.

The isolated compilation failure in `202610240005_vehicle_fuel_profiles.sql` is the conditional in `enforce_vehicle_fuel_profile`. The minimal proposed repair is to parenthesize its CASE expression:

```sql
if units is distinct from (case when fuel='ELECTRIC' then 'KWH' when fuel in ('CNG','HYDROGEN') then 'KG' else 'L' end) then raise exception 'FUEL_UNIT_INVALID';end if;
```

This is a proposed change, not an applied migration. The linked project reports migration 005 as pending, but other environments' histories must also be checked. The project contract asks that previous migrations be preserved; approval of an exception and a reviewed migration-history plan are needed before modifying that file.
