# GaadiPulse international foundation — system design

Status: architecture checkpoint — implementation has not started.

## Design goal

Support many countries, locales, time zones and currencies without coupling them together, while preserving the meaning of existing INR records and preventing older clients from displaying new currencies as INR.

## Canonical identifiers

- Country: ISO 3166-1 alpha-2 (`IN`, `US`, `AE`).
- Locale: BCP-47 (`en-IN`, `hi-IN`, `ar-AE`).
- Timezone: IANA identifier (`Asia/Kolkata`, `America/New_York`).
- Currency: ISO 4217 (`INR`, `USD`, `JPY`) plus a precision snapshot.

Country is a user preference and suggestion source only. It is not proof of residence and never silently changes a manually selected timezone, locale or currency.

## Runtime flow

```text
Expo app
  -> bundled versioned catalogs + Intl formatting
  -> typed profile/vehicle/record services
  -> versioned Supabase RPCs
  -> PostgreSQL reference catalogs + RLS + audit/operation receipts
```

The app remains online-only. Reference catalogs are bundled so selectors and formatting do not depend on a network request; server validation remains authoritative.

## Preferences and records

1. Profile stores country, locale, timezone, preferred currency and onboarding state.
2. Vehicle stores timezone and owner-controlled default currency.
3. A new financial record inherits the vehicle default, but stores its own currency and precision snapshot.
4. Editing a saved record preserves its stored currency. Currency correction, if enabled, is an explicit audited action.
5. Existing `amount_paise` values are interpreted as INR minor units and are never relabeled by a preference change.

## Money model

All monetary values use exact integer minor units. `currency_exponent` is stored with each record so future catalog changes cannot reinterpret history. Fuel quantities remain separate decimals; amount, unit price and quantity calculations use integer/decimal arithmetic with server-side validation.

Totals are grouped by currency. No automatic exchange conversion is part of this release.

## Language model

The current English catalog becomes `en-IN`/English fallback data. Additional locale catalogs are bundled and keyed by stable message IDs. Missing messages fall back to English. Domain values and database enums are never translated. `Intl` handles numbers, dates, currency, units and plural rules. RTL locales require explicit layout testing before activation.

## Compatibility gate

The existing INR-only constraint remains until the new API and read paths are deployed and verified. Before enabling non-INR:

- new clients use versioned v2 financial reads/writes;
- old direct table/RPC access is revoked or returns `CLIENT_UPDATE_REQUIRED`;
- mixed-currency totals cannot be produced by legacy paths;
- RLS, owner/pilot permissions, revocation and idempotency are tested.

The feature flag defaults to disabled in all environments until these checks pass.

## Migration minimization

Use two additive structural migrations:

1. `international_foundation`: reference catalogs, profile/vehicle preference columns, onboarding state, record currency/precision/minor-unit columns, and verified INR backfill.
2. `international_api_gate`: v2 RPCs/read contracts, legacy-path restrictions, feature flag and compatibility checks.

Adding a new supported locale, country suggestion or currency should be catalog data, not a schema migration. No previous migration is edited or reset.
