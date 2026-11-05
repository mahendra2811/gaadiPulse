# Fixed vehicle currency implementation plan

## Product decisions

- Every vehicle has one currency chosen at creation and never changed afterward. Shared members use the vehicle currency. Existing vehicles and amounts are INR; no conversion or reassignment occurs.
- A new vehicle defaults to the account's most recently used vehicle currency, or INR when none is recorded; the user can choose a different supported currency before creating that vehicle. The remembered value is a preference, not an account-wide restriction.
- Currency code and precision must be authoritative and validated at SQL/RPC layer. Any correction to an incorrectly created vehicle requires a separately designed, audited workflow; an ordinary update must reject a currency change.
- Each financial amount must retain its meaning independently of future settings. With immutable vehicle currency, a transaction's currency can be derived from its immutable vehicle only if that relationship is protected on all write/read/export paths; exports must explicitly include the code and precision. Per-entry foreign-currency overrides and exchange-rate conversion are not part of this design.

## Safety gate

Legacy clients assume paise/INR and have direct RLS-authorized table access. A client-controlled version flag cannot prove that a reader understands non-INR. Until a versioned server boundary is implemented and verified, a database constraint must prevent non-INR vehicle creation and no UI may imply other currencies are usable. Never release non-INR data through legacy table, RPC, report or export paths. This is a compatibility requirement even in testing when older builds share a backend.

## Work and acceptance order

1. Build and test a versioned, license-documented supported currency catalog with code, name and fraction digits, and exact minor-unit parsing/formatting and fuel/expense arithmetic. Cover INR/USD, zero-decimal JPY and three-decimal KWD, invalid precision and overflow. Use exact integers/decimal strings, never floating-point money arithmetic.
2. Add chronological migrations to preserve existing data, assign legacy vehicles INR, persist immutable currency and the account's last-used preference, protect all direct and RPC writes, and provide a non-INR feature gate that fails closed. Keep prior migration history intact. Test SQL constraints, updates, idempotency, owner/Pilot and unauthorized reads/writes.
3. Design and implement versioned read/write/query/report paths with server authorization and eliminate unsafe old direct access to non-INR data; test actual legacy app behavior and migration of all current clients. Block non-INR entirely until this is proven. Do not depend on hidden UI or caller-supplied client version.
4. Add a searchable create-vehicle picker with a confirmation explaining permanence; show the saved code read-only for existing vehicles. Remember a new vehicle's currency only after a successful creation, per account. Pilot forms use the vehicle currency, never the Pilot's account preference.
5. Migrate every amount and precision assumption across fuel, expenses, EMI, line items, history, filters, dashboards, mileage cost, insights and reports. Preserve same-vehicle monetary consistency, ensure cross-vehicle totals are separated, and update JSON/CSV/PDF with currency/precision metadata. Define fuel unit-price precision and rounding identically on client and server.
6. Verify preserved INR history, new currencies, history edits, concurrent/retried writes, RLS, archived vehicles, unauthorized users, large numbers, precision and export round trips in a disposable backend, then test authenticated users and Android. Only after compatibility passes may the non-INR safety gate be lifted in a later migration.

## Rollout and unresolved decisions

Back up data and inventory active builds first. Prior migrations 013, 014 and 016 were still pending at the last recorded check; 015 and 017 were applied separately, so inspect current linked migration history and use reviewed `--include-all` dry runs when appropriate. Do not apply an incomplete non-INR implementation to the linked backend. The user permits disposable test data to be discarded, but a reset must be limited to an explicitly disposable environment. Select the final supported ISO currency set and confirm whether historical data may be deleted in that environment before any destructive action.
