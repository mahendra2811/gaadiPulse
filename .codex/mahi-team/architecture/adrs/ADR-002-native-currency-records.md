# ADR-002: Store native currency on every financial record

Status: Proposed

Decision: Store currency code, precision snapshot and exact integer minor-unit amounts on fuel, expense, EMI and line-item values. Vehicle currency is only a default for future records.

Reason: Historical meaning must survive preference changes, shared vehicles and foreign purchases. Totals are grouped by currency; conversion is a later feature.
