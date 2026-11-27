# Personal charging with an unknown cost

Requested behavior: electric charging entries distinguish personal charger from charging station. Personal charging can be recorded with a quantity but without a known cost. A missing cost is unknown, not zero; quantity and actual observation times remain validated. Existing records must remain readable and editable.

Implementation needs to be atomic across client and server:

- Add a validated charging source for electric records, retaining a safe legacy value for existing records. Permit null amount and unit price only for personal electric charging. Preserve required positive quantity and normal monetary validation when a cost is supplied. Update the guarded save RPC and database check additively without weakening permission, chronology or idempotency checks.
- Update payload parsing, entry/edit forms and details; present an explicit cost-not-recorded state and avoid silently replacing it with zero. Keep station charging and non-electric records under existing monetary rules.
- Update paginated history, amount filters, dashboard, reports, PDF/CSV/JSON and cost-based analytics so unknown costs are not represented as free charging or complete totals. Identify incomplete totals and preserve null in exports. Maintain fuel efficiency calculations when energy quantity is known, but suppress cost metrics for intervals with unknown costs.
- Address older app clients that require positive cost on reads before enabling new writes on shared vehicles. Version-gate the feature or provide a compatible, server-enforced rollout; otherwise older clients may fail to read new records.
- Exercise migration chain, SQL validation and authorization for owners and pilots, existing data and edits, cost filters, totals and exports, nullable parsing, unknown versus zero, and real device interactions. Deploy the migration before enabling writes and verify hosted behavior.
