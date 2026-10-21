# API and Edge Function contracts (implementation checklist)

The project uses Supabase PostgREST for safe simple CRUD and RPC / Edge Functions for privileged atomic operations. Types below are conceptual interfaces; Codex must implement, test and document concrete signatures.

| Action | Input | Authorization | Output / safety condition |
|---|---|---|---|
| `grant_vehicle_access` | vehicleId, normalized email, role, permissions | Active Owner on target vehicle | Creates grant, resolves verified user immediately if found; no acceptance |
| `resolve_my_access_grants` | no supplied email | Authenticated + verified email from Auth server | Claims only matching pending grants; idempotent |
| `revoke_vehicle_access` | vehicleId, memberId/grantId | Active Owner; cannot revoke final Owner/primary | Invalidates server access and audits |
| `publish_progress_form` | vehicleId, draftVersion, schema | Owner | Publishes immutable schema version atomically |
| `submit_progress` | vehicleId, formVersion, date, answers, opId | Progress.submit permission + date window | Server validates version, field types, status |
| `review_progress` | entryId, decision, comment | Owner | Status transition and audit trail |
| `upsert_fuel_entry` | vehicleId, details, opId, expectedVersion | Fuel.create/edit rights | Atomic paise/quantity validation, idempotent |
| `upsert_expense` | vehicleId, details/items, opId, expectedVersion | Expenses.create/edit rights | One financial transaction, safe line-item sum |
| `write_meter_observation` | vehicleId, reading type/value, observedAt, opId | Configured meter permission | Nonnegative, observedAt accurate, resets explicit |
| `export_vehicle_data` | vehicleId, filters | Reports.read with field-level privilege | Only authorized columns and rows |

## Error taxonomy
- `NOT_AUTHENTICATED`, `EMAIL_NOT_VERIFIED`, `VEHICLE_NOT_FOUND_OR_FORBIDDEN`, `PERMISSION_DENIED`, `DATE_WINDOW_VIOLATION`, `FORM_VERSION_CONFLICT`, `METER_READING_CONFLICT`, `AMOUNT_INVALID`, `DUPLICATE_IDEMPOTENCY_KEY`, `NETWORK_UNAVAILABLE`, `UNKNOWN_SERVER_ERROR`.
- Expose safe user-facing copy; never return internal SQL stack traces, other users' emails, or arbitrary vehicle existence to outsiders.

## HTTP/auth semantics
Use Supabase signed JWT/session for user context. Never grant access based on body `userId` or `email`. Use idempotency tokens per persistent write, server request validation and rate limiting for emailed access assignments.
