# GaadiPulse international foundation — database schema

Status: architecture checkpoint — conceptual schema for additive migrations.

## Reference data

```text
supported_countries
  code PK                 -- ISO 3166-1 alpha-2
  default_locale          -- BCP-47 suggestion, nullable
  active
  catalog_version

supported_locales
  code PK                 -- BCP-47
  language_code
  region_code nullable
  direction               -- ltr | rtl
  active
  catalog_version

supported_currencies
  code PK                 -- ISO 4217
  name_key
  symbol
  minor_units             -- 0, 2, 3, etc.
  active
  catalog_version

country_currency_options
  country_code FK
  currency_code FK
  is_default
  PK(country_code, currency_code)

country_timezone_options
  country_code FK
  timezone_name           -- IANA
  is_default
  PK(country_code, timezone_name)
```

Reference tables are read-only to normal users. The generated/bundled catalog and SQL reference data must share a version and source/license record.

## Profile and vehicle additions

```text
profiles
  country_code nullable
  locale                 -- default en-IN, validated against supported_locales
  preferred_currency_code -- default INR, validated against supported_currencies
  onboarding_version / completed_at

vehicles
  default_currency_code  -- default INR; Owner-controlled for future records
  currency_catalog_version
```

Existing timezone columns remain IANA identifiers. A country column on vehicles is optional and should only be added if country-specific regulatory features need it; it must not replace vehicle timezone.

## Financial records

Add top-level authoritative fields to fuel and expense records and line items rather than relying only on translated JSON payload keys:

```text
currency_code       text FK supported_currencies(code)
currency_exponent   smallint
amount_minor        bigint
unit_price_minor    bigint nullable
principal_minor     bigint nullable
interest_minor      bigint nullable
```

The exact table/column names must follow the existing `fuel_logs`, `expenses`, `expense_items` and report RPC shapes. Existing `amount_paise` values are copied to `amount_minor` with `currency_code=INR` and `currency_exponent=2`. Original payloads, revisions, timestamps, audit events and operation receipts are retained during transition.

Constraints:

- currency code must be active and exponent must match the catalog snapshot at write time;
- all amounts must be positive where the existing ledger requires positivity;
- line-item currency must match its parent unless a separately designed split transaction is introduced;
- no currency update through ordinary edit RPCs;
- range checks must remain JSON/JavaScript-safe.

## Security and rollout

Reference reads may be public to authenticated users, but financial reads/writes remain vehicle-scoped. v2 RPCs use `SECURITY DEFINER`, pinned `search_path`, verified identity, vehicle permissions, expected revisions and operation IDs. Direct table access used by legacy clients must be removed before non-INR records are enabled.

Do not apply this schema to the linked production project until migration history is reconciled and a restorable backup is verified. Local/disposable testing is allowed.
