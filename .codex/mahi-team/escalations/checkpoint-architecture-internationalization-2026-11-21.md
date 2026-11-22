# Checkpoint: Architecture approval required

Project: GaadiPulse
Scope: Country, locale, timezone, multi-currency records and multi-language UI
Status: Awaiting human approval

## Proposed architecture

Use independent ISO 3166 country, BCP-47 locale, IANA timezone and ISO 4217 currency values. Add versioned reference catalogs, profile and vehicle defaults, and native currency/precision/minor-unit fields to financial records through two additive migrations. Existing INR data is backfilled as INR with exponent 2 and retained. New v2 RPCs provide exact arithmetic, RLS/RPC authorization, grouped totals and localized exports. The INR-only legacy guard remains until old clients are prevented from misreading non-INR data. English remains fallback; Hindi is the first activated additional locale.

## Artifacts

- `.codex/mahi-team/architecture/system-design.md`
- `.codex/mahi-team/architecture/database-schema.md`
- `.codex/mahi-team/architecture/api-spec.yaml`
- `.codex/mahi-team/architecture/sequence-diagrams.md`
- `.codex/mahi-team/architecture/adrs/ADR-001-independent-identifiers.md`
- `.codex/mahi-team/architecture/adrs/ADR-002-native-currency-records.md`
- `.codex/mahi-team/architecture/adrs/ADR-003-versioned-reference-catalogs.md`
- `.codex/mahi-team/architecture/adrs/ADR-004-legacy-client-gate.md`
- `.codex/mahi-team/architecture/adrs/ADR-005-localized-message-catalogs.md`

## Approval requested

Approve this architecture to begin implementation in the testing environment. Approval includes permission to create and run additive local/test migrations, but not to deploy them to the linked production project or publish a release.

Reply with: `architecture approved` to continue, or specify changes to the decisions above.
