# Owner-configurable Daily Progress form

## Scope
One published immutable schema version per vehicle. A new edit becomes a DRAFT version; Publish makes it current without destroying previous submissions. No owner-scripted code, no arbitrary network actions.

### Standard fields
- Vehicle ID (locked), progress date in vehicle timezone, record creator and timestamps.
- Optional odometer KM and/or engine HOURS per vehicle config; Owner may make enabled meter field required for Progress only.
- Optional note field and review status. Photo-required setting is **disabled** until photo capture implementation is actually shipped.

### Allowed custom field types
`text`, `paragraph`, `integer`, `decimal`, `currency`, `boolean`, `select`, `multiselect`, `date`, `time`, `location_text`, `start_location`, `destination`, `route`, `trip_count`. Each field has stable UUID, localized label key/fallback, optional helper, required flag, min/max/length/options, display order, visibility, reportability and aggregator (`SUM|AVG|LAST` where appropriate).

### Example templates
| Vehicle | Fields |
|---|---|
| Tipper | trips, start, destination, material, tonnage |
| Tractor | site/farm, work type, acres, attachment, machine hours |
| Excavator | site, work type, idle hours, quantity, notes |
| Taxi | trips, route, passenger count, fare collection as report-only |
| Personal bike | optional purpose, meter, notes |

### Business rules
- Pilot can choose Today/Yesterday by default; Owner can set 0/1/7/30 or bounded custom backdate window, applied with vehicle timezone and server clock. Future disabled by default.
- Multiple Pilot submissions same day remain distinct. One approved authoritative daily vehicle-meter snapshot per defined time, with owner review of conflicts; never SUM cumulative meter values.
- Custom currency fields are report-only unless explicitly reconciled to a real transaction; never auto-book to fuel/expense ledger.
- `required` and numeric min/max validated in mobile Zod and on server against exact recorded form version.
- Builder supports preview-as-Pilot, reorder, duplicate, publish, and version history with audit.
- Only publish with at least one meaningful field or enabled system measurement.
