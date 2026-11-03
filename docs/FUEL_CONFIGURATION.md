# Vehicle fuel configurations

Vehicle setup owns the configuration. Fuel add/edit uses the same shared policy; it never shows an unrestricted fuel or measurement-unit selector.

| Vehicle configuration | Allowed new fuel entries | Fixed units |
|---|---|---|
| Diesel | Diesel | L |
| Petrol | Petrol | L |
| Petrol + CNG | Petrol or CNG | L / KG |
| Petrol + LPG | Petrol or LPG | L |
| Electric | Electric charge | KWH |
| Hybrid (petrol + electric) | Petrol | L |
| Diesel hybrid | Diesel | L |
| Plug-in hybrid | Petrol or electric charge | L / KWH |
| CNG | CNG | KG |
| LPG | LPG | L |
| Hydrogen | Hydrogen | KG |
| Other | Other | L |

Conventional hybrids do not accept externally purchased charging entries; plug-in hybrids do. Fuel quantity/price is cleared only after confirmation when switching between supported fuels; paid amount stays. Vehicle changes, new entries and Save-and-add-another all use the same default mapping. An incompatible restored draft requires explicit review. Never silently reinterpret quantities in another unit.

Historical records retain their original physical fuel after vehicle configuration changes. Unchanged historical fuel/unit may be edited; changing fuel must satisfy the current configuration. Existing legacy HYBRID fuel records remain readable/editable without rewriting their history. Fuel analysis continues separating different energy types and units.

`202610240005_vehicle_fuel_profiles.sql` expands vehicle configurations and enforces compatible physical fuels/units in a database trigger. Apply this migration after 001–004 before saving new configurations to hosted Supabase. Membership/RPC authorization and immutable audit behavior remain unchanged. Local development persistence applies the same policy.

TypeScript checks passed. No migration execution, test suite or browser/device validation was performed in this follow-up. A connected browser was unavailable for the supplied localhost edit URL.
