# Daily Progress removal plan

1. Remove Daily Progress, approvals and form-builder navigation and permissions controls from Home, More and garage; block old deep links.
2. Remove progress records, forms, summaries and exports from reports. Keep previously recorded meter observations and audit data intact.
3. Add a migration to disable authenticated access to progress RPCs and stop automatic progress form creation/adaptation, preserving existing tables and records. Do not reset or delete data.
4. Verify routing, permission boundaries, migrations, typecheck, lint, formatting and tests; document deployment and any remaining work.
