# ADR-001: Keep country, locale, timezone and currency independent

Status: Proposed

Decision: Store ISO country, BCP-47 locale, IANA timezone and ISO currency as separate values. Country changes provide suggestions only and never overwrite explicit user choices.

Reason: Countries can have multiple currencies, languages and timezones. Coupling them creates incorrect defaults and makes future regional support unsafe.
