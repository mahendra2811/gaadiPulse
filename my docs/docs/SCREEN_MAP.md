# Screen inventory, content and permissions

All screens are planned; Codex should implement with reusable screens/sheets where sensible. **R** = accessible to authenticated assigned Owner/Pilot if feature permission allows, **O** = Owner/admin, **A** = all.

| # | Route / view | Access | Required content and actions |
|---|---|---|---|
| 1 | Splash | A | Logo, session restoration, actual init loading, fallback |
| 2 | Welcome / onboarding | A | 3 illustrations, benefit narrative, skip/get started |
| 3 | Sign-in | A | Google sign in, email OTP, failure/retry |
| 4 | OTP verification | A | Code, resend cooldown, wrong/expired code |
| 5 | Profile | A | Name, language, settings |
| 6 | First garage setup | A | Assigned vehicles auto-resolved by verified email / Add vehicle |
| 7 | My Garage | R | Owned/assigned vehicle list, role badge, add/new |
| 8 | Vehicle category | O | Two-wheeler, four-wheeler, commercial, agricultural/heavy |
| 9 | Vehicle subtype | O | Bike, scooter, car subtype, pickup, tipper, tractor, JCB |
| 10 | Brand/model | O | Search, optional catalog, Other/manual |
| 11 | Vehicle details | O | Nickname, registration optional, make/model, fuel type, timezone |
| 12 | Meter mode | O | KM, HOURS, BOTH; optional initial readings |
| 13 | Vehicle profile/edit | R/O | Read record, edit if Owner, archive w/ protection |
| 14 | Home | R | User's role, selected vehicle, metrics/permissions and actions |
| 15 | Vehicle switcher sheet | R | Assigned vehicles, selection and role |
| 16 | Add daily progress | R (submit) | Dynamic vehicle form, allowed date, meter optional, Save |
| 17 | Progress history | R (view) | Date range, approval badges, submitter info when authorized |
| 18 | Progress detail | R (view) | Versioned answers, meter observations, audit/status |
| 19 | Edit progress | R (own edit or O) | Policy window, schema version, correction details |
| 20 | Progress review | O | Approve/reject/request correction |
| 21 | Add meter reading | R (configured) | Observed timestamp, KM/HOURS/BOTH, optional values |
| 22 | Fuel tab overview | R (fuel.read) | Statistics, filter, recent history |
| 23 | Add fuel | R (fuel.create) | Vehicle below header, amount, quantity, price, full/partial, optional meters |
| 24 | Fuel history | R | Paginated logs, pending meter badge |
| 25 | Fuel detail/edit | R own or O | Read, edit, confirm delete, audit, remarks |
| 26 | Fuel analytics | R (reports.read) | Qualifying intervals and truthful unknown states |
| 27 | Expenses tab overview | R (expenses.read) | Non-fuel summaries, category tabs, search |
| 28 | Add expense | R (expenses.create) | Amount, category, date, adaptive details, optional meter |
| 29 | Expense history | R | Paginated/filterable records |
| 30 | Expense detail/edit | R own or O | Line items, corrections, link service/reminder |
| 31 | Expense analytics | R (reports.read) | Cash vs operating, EMI principal handling |
| 32 | Members | O | Owners/Pilots, access, primary admin protection |
| 33 | Grant access | O | Verified-email assignment, no acceptance required |
| 34 | Member permissions | O | Vehicle defaults + individual overrides, revoke |
| 35 | Progress settings | O | Submission window, approval mode, field controls |
| 36 | Progress form builder | O | Reorder, add, edit, duplicate, remove fields, publish |
| 37 | Custom field editor | O | Type, label, required, min/max, allowed choices |
| 38 | Pilot form preview | O | Rendering of schema with current meter mode |
| 39 | Form versions | O | Immutable versions, published/draft, archives |
| 40 | More | R | Role-aware secondary pages, no hamburger |
| 41 | Documents | R configured | Metadata/expiry, official external refs, no pretend file uploads |
| 42 | Reminders | R configured | Date/meter/recurring, snooze/complete |
| 43 | Reports/export | R (reports.read) | Validated CSV/JSON, accurate metrics |
| 44 | App settings | A (signed in) | Language/theme/notifications/account/help |
| 45 | Sync & backup | R | Current state, retry queue, local export, errors |

### Global screen rules
- Four floating tabs: Home, Fuel, Expenses, More. All other forms pushed above tabs, fixed CTA above keyboard and safe area.
- Below the Add Fuel/Add Expense/Add Progress header show active vehicle with switch action where multiple assigned vehicles.
- Single vehicle never forces switching; multiple use searchable bottom sheet.
- Disable/hide forbidden screens AND reject unauthorized server request via RLS/RPC.
- Every loading/empty/error/offline/permission-denied state must be actionable.
