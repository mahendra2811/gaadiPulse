# ADR-005: Bundle reviewed locale catalogs with English fallback

Status: Proposed

Decision: Store UI messages in locale catalogs keyed by stable IDs, use BCP-47 locale fallback to English, and use `Intl` for dates, numbers, units, plurals and currency display. Hindi is the first additional activated locale; RTL activation requires layout QA.

Reason: Translated labels must not leak into domain data, and partial translations must remain understandable and recoverable.
