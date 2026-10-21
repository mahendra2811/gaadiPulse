# Architecture decision record

| ID | Decision | Reason |
|---|---|---|
| ADR-001 | Android-first Expo Router + TypeScript | Mobile-first launch with reusable navigation and native build capability |
| ADR-002 | Supabase Auth/Postgres/RLS/Edge Functions | Fits shared-vehicle permissions without a permanently hosted custom API |
| ADR-003 | Local SQLite and idempotent outbox | Offline works for rural/heavy machinery users; prevents duplicate uploads |
| ADR-004 | `OWNER`/`PILOT` roles are per vehicle | One user can own a bike and pilot a truck; many members per vehicle |
| ADR-005 | Auto assignment by verified email | Owner grants without invitation acceptance; protect against email impersonation |
| ADR-006 | KM/HOURS/BOTH at vehicle create/edit | Different machine types, adaptive forms and analytics |
| ADR-007 | Fuel and expenses save without reading | Reduce friction; explicit late observation metadata preserves correctness |
| ADR-008 | Versioned custom Daily Progress forms | Each vehicle collects different trip/site information without losing history |
| ADR-009 | Header progress line shows actual/indeterminate | Honest loading, no fabricated 0–100% |
| ADR-010 | English first; Hindi later | Avoid fake untranslated copy; establish keys and selectable future locales |
| ADR-011 | No user photo capture/upload in first implementation round | Product owner deferred; bundled brand illustration assets are included |
| ADR-012 | Free launch, monetization omitted | Focus on reliability and adoption |
| ADR-013 | No hamburger navigation; four floating tabs | Avoid redundant navigation controls |
| ADR-014 | Current account primary admin is not legal RC owner | In-app control distinct from government vehicle title |

Any new implementation decision should be appended by Codex with date, context, alternatives and consequences. Do not silently override earlier decisions.
