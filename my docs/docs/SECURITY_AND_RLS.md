# Security architecture and adversarial testing

**Backend authority:** Supabase PostgreSQL Row Level Security plus server-side RPC/Edge Functions for privileged operations. App UI permissions are cosmetic only.

## Identity and membership
- Account ID is `auth.uid()`; account role is **not global**. Membership `(vehicle_id,user_id)` has role `OWNER` or `PILOT`, member-specific permission overrides and active/revoked state.
- Multiple Owners/Pilots allowed. One protected administrative Owner; never auto-remove last Owner.
- Owner adds email to a vehicle. If verified account matches, membership is created immediately. If not, a pending access grant is held, then automatically resolved after that person verifies a matching email during trusted login. No acceptance required. Client MUST NOT specify `user_id` or claim verified email.
- The grant RPC validates owner membership, role changes, input email and target profile; it stores/audits updates. Access resolution reads `auth.users` server-side with a verified identity, not a value asserted in a REST request.

## Financial privacy
A Pilot permitted to add a fuel entry might not have permission to read all fuel expenses. SQL policies enforce EACH operation, but PostgreSQL RLS is row-level, not column-level. Sensitive amounts/owner notes require selective views/RPCs or separate protected tables. Avoid `SELECT *` with only a client-side hide toggle.

## Audit and revocation
- All membership grants/revocations, form publishes, reviews, and financial edits logged with actor and timestamp.
- Revocation prevents new server reads and writes. Previously downloaded local/offline data cannot be cryptographically revoked; limit cache lifetime, wipe scoped cache on authorization change and disclose limitations.
- Pending offline writes by revoked users rejected on reconnect; remain privately accessible as rejected drafts if appropriate, without leaking live remote data.

## Test matrix
| Scenario | Expected result |
|---|---|
| A Owner V1 and Pilot V2 | Correct per-vehicle capabilities |
| B co-Owner V1 | Authorized Owner operations within protected admin rules |
| C Pilot no expense.read | Expense totals unavailable through REST/RPC/export |
| D outsider guesses V1 UUID | Denied on all tables, storage and RPCs |
| E unverified address appears in grant | No membership until verified login |
| Owner grants C verified email | C automatically sees V1 after session refresh |
| Owner revokes C offline | Subsequent sync rejects unauthorized writes |
| C tries to set role OWNER via REST | Denied |
| Attempt to remove last Owner | Denied atomically |
| Pilot modifies `vehicle_id` in request | Denied |
| User attempts to access documents for V2 | Denied unless explicit permission |
| Auth logout with cached receipts | Sensitive authorized cache removed |

## Critical Supabase practices
- Expose only project URL + anon/publishable key on Android. Service role key and email service credentials stay in trusted functions only.
- Check RLS on INSERT/UPDATE/DELETE, not only SELECT. Test policies with real authenticated users and direct DB REST calls.
- Enforce client idempotency tokens for fuel, expense and progress writes. Sign exports for correct user and vehicle.
- Use rate limiting on grant resolution/OTP endpoints; avoid account enumeration via email lookup UI.
