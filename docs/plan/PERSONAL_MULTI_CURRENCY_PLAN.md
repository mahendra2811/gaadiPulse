# Personal preferences and multi-currency records

Status: proposal only. No application code, ledger values, or database have been changed by this plan. It builds on `INTERNATIONAL_COUNTRY_CURRENCY_ONBOARDING.md` and the existing decision that each record keeps its original currency.

## Recommended behavior

1. Each account can choose a preferred currency in Profile. The preference is private to that account and can be changed without changing any existing record, other person's preference, or existing vehicle default. It supplies a suggested default when that person creates a new vehicle.
2. Each vehicle has an owner-controlled default currency. Existing vehicles retain INR as their legacy default. On a shared vehicle, that vehicle default is preselected for a new fuel or expense entry, even if the author has a different account preference. Show the currency code prominently.
3. Let an authorized author explicitly select the currency actually used for each new entry. Store that currency on the record. When editing, preserve it; a later separately authorized and audited correction may fix a wrongly entered currency. A new vehicle or record default must never silently relabel historical values.
4. A person's preference is not a conversion. Members see original transaction amounts and currency codes. Show separate totals and filters for each currency; never sum them as a single number. An optional converted display is a separate feature requiring a trustworthy exchange-rate source, rate date, timestamp, rounding and clear converted/original labels. Conversion cannot modify stored transactions.

Example: A's profile is INR, B's is USD, and their shared vehicle defaults to INR. B records fuel purchased for INR 500: both see INR 500. B can select USD for a purchase actually made in USD, and both see that entry in USD. A later profile preference change does not alter either entry. Vehicle totals show INR 500 and USD amounts separately.

## Implementation stages

1. Inventory all existing amount and rate fields, reads/writes, aggregations, filters, reports, exports, reminders and supported client versions. Confirm the meaning of historic values before treating them as INR. Preserve existing migrations and take a restorable verified backup before production deployment.
2. Define a versioned, bundled and licensed ISO 4217/CLDR-based currency catalog and supported codes, precision, input rules and fallback behavior. Show the unambiguous currency code. Use integer minor units with the stored currency and precision snapshot, exact decimal calculations and explicit rounding; account for 0-, 2- and 3-decimal currencies and sufficient fuel unit-price precision. Do not assume every currency has 100 minor units.
3. Add profile preference and vehicle default as separate fields. Use additive migrations, owner-only vehicle changes, SQL validation, RLS and audited writes. Preselect the profile preference for new vehicles, retaining the owner's ability to select another supported code. No change to existing vehicles merely because a profile changes.
4. Version financial record storage and APIs. Store an immutable currency and exact minor-unit amount with each fuel/expense record, including line items and EMI fields. Preserve legacy INR paise and audit history, backfill only after verification, and guard against dual-write disagreement. Write a deliberate separate correction workflow if currency corrections are supported.
5. Update forms, Profile, vehicle settings, history, dashboard, amount filters, reports, analytics and CSV/JSON/PDF export. Group totals by currency; ensure cost-per-distance is unavailable or separated when an interval has mixed currencies. Keep fuel quantity efficiency independent when it remains mathematically valid. Existing INR data and historical exports must not be silently relabeled.
6. Enforce a server-side legacy-client gate before any non-INR transaction is allowed. Existing app versions directly read/write INR-shaped paths and can otherwise mislabel data or show incomplete totals. Design and test a versioned authorization/API rollout or retire incompatible clients; merely hiding values in the new UI, trusting a client version, or filtering rows while still showing complete-looking totals is insufficient. Do not enable non-INR writes until a fail-closed approach has been proven.
7. Test fresh and existing accounts, mixed currencies, two users with different preferences on one vehicle, owner/Pilot permission and revocation, concurrent edits and retry/idempotency, record correction, 0/2/3 precision, overflow, rounding, filters, reports and all exports. Test old-client behavior, local and hosted RLS, Android and deployment recovery. Roll out schema and compatible clients first; enable other currencies only after checks pass.

## Decisions to confirm before implementation

- Whether choosing another currency per entry is wanted from the first release; recommended yes for real cross-border purchases.
- Whether users need conversion into their profile currency, and if so which rate provider and rate date; recommended separate later feature, no automatic conversion initially.
- How to verify legacy clients are retired or otherwise prevent them from accessing non-INR records. This is a release blocker, not just a client display option.
