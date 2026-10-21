# Functional acceptance & QA matrix

Statuses default **NOT TESTED** until Codex actually executes checks. This is a test plan, not a claim of coverage.

| ID | Module | Must verify | Evidence / expected behavior | Status |
|---|---|---|---|---|
| A01 | Auth | Google sign-in | Session persists; verified email used | NOT TESTED |
| A02 | Auth | Email OTP | Valid/invalid/expired, resend and logout | NOT TESTED |
| A03 | Garage | Zero/one/many vehicles | Empty state, auto selected, switcher appears only when needed | NOT TESTED |
| A04 | Garage | KM / HOURS / BOTH | Correct forms and historical retention | NOT TESTED |
| A05 | Catalog | Model not listed | Other/manual model saves | NOT TESTED |
| A06 | Navigation | Four floating tabs | Safe area, Android back, no hidden content | NOT TESTED |
| A07 | Loading | Header line | No simulated numerical %, retry on failure | NOT TESTED |
| A08 | i18n | English strings | All UI behind keys; Hindi not falsely populated | NOT TESTED |
| F01 | Fuel | Any 2-of-3 values | Correct amount/price/quantity, validation and paise | NOT TESTED |
| F02 | Fuel | Full/partial/full interval | 1000km full, 1100km 3L partial, 1200km 7L full gives 20km/L | NOT TESTED |
| F03 | Fuel | No odometer | Save, pending label, later actual observed timestamp | NOT TESTED |
| F04 | Fuel | Edit old record | Recomputes valid mileage intervals | NOT TESTED |
| E01 | Expense | Fast form | Amount/category/description/date creates one record | NOT TESTED |
| E02 | Expense | Category metadata | Service/tyres/insurance/EMI fields validate | NOT TESTED |
| E03 | Expense | EMI accounting | EMI principal excluded from operating cost | NOT TESTED |
| E04 | Expense | Line items | Single ledger item, no double-count | NOT TESTED |
| M01 | Meter | Timestamp truth | Late entry observedAt vs recordedAt | NOT TESTED |
| M02 | Meter | Invalid/reset | No negative kilometres/hours | NOT TESTED |
| P01 | Progress | Form versioning | Old entry rendered using published old version | NOT TESTED |
| P02 | Progress | Today/yesterday | Server timezone/date window enforced | NOT TESTED |
| P03 | Progress | Multi-Pilot | Don't sum cumulative meter snapshots | NOT TESTED |
| P04 | Progress | Approval | Pending/approved/rejected audited and permission checked | NOT TESTED |
| R01 | Role | Verified email auto grant | No invitation acceptance but no access before verified sign in | NOT TESTED |
| R02 | Role | Pilot denied expense.read | No read via direct REST, charts, exports | NOT TESTED |
| R03 | Role | Multi-owner primary | Last Owner protected; role per vehicle | NOT TESTED |
| R04 | Role | Revocation | New reads and sync denied server-side | NOT TESTED |
| D01 | Documents | Metadata | Validity dates reminders, no false attachment claims | NOT TESTED |
| N01 | Reminders | Date / meter thresholds | Correct scheduler, permission UX, snooze and completion | NOT TESTED |
| O01 | Offline | Outbox persistence | Survives process death and retries idempotently | NOT TESTED |
| O02 | Offline | Conflict/revocation | Explicit rejection and conflict UI | NOT TESTED |
| X01 | Reports | CSV JSON export | Correct permitted vehicle/data and columns | NOT TESTED |
| Q01 | Accessibility | 320dp/large text | Tap targets, keyboard, overflow, TalkBack | NOT TESTED |
| Q02 | Visual | Assets/local | Every illustration loads without internet | NOT TESTED |
| Q03 | Build | Android physical/device | Actual signed/un-signed build and smoke outcomes documented | NOT TESTED |
