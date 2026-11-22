# ADR-003: Use versioned bundled/server reference catalogs

Status: Proposed

Decision: Keep country, locale, currency and timezone catalogs versioned in the app bundle and mirrored in server reference data. New catalog entries should not require structural migrations.

Reason: Selectors work without a network round trip, server validation remains authoritative, and catalog growth does not create repeated schema work.
