# GaadiPulse focused first release — plan and implementation register

Updated 3 November 2026. Online-only requirements in [ONLINE_ONLY_PLAN.md](ONLINE_ONLY_PLAN.md) supersede the original offline-draft/outbox portions of this plan. This scope follows the latest user request and temporarily narrows PROJECT_REFERENCE.md’s larger Phase 1 scope. This is an implemented rollout plan, not a claim that device QA or live backend integration is complete.

## Product goal

Validate a small, real end-to-end bike/car flow before enabling collaboration, fleet tools and advanced reporting. Keep the existing application, database migrations, audit trail, permissions and server history. Nothing is dropped or reset. Advanced source is retained behind a feature control rather than large commented-out blocks, so TypeScript continues checking it and restoration remains manageable.

## Available now

| Area | First-release behavior |
| --- | --- |
| Vehicle setup | Two-wheelers and four-wheelers; subtype illustrations, optional make/model and identity, energy configuration, KM odometer, optional baseline observation. |
| Vehicle choice | Existing header switcher, centered picker, nickname then registration fallback; selected vehicle drives scoped queries. |
| Home | Chosen vehicle, latest observed odometer with actual observation time, fuel/charging and expense summaries, Add Fuel/Charging, Add Expense, Add Meter Reading, recent activity. |
| Fuel/Charging | Real existing forms, amount/quantity/unit price arithmetic, timestamps, optional odometer, full/partial fill or charge, in-memory forms, online save, edit and history. |
| Expenses | Amount, title and category; vendor/payment/notes and category details under Additional options. Service/repair costs can still be recorded as ordinary expenses; no separate Add Maintenance workflow. |
| Meter readings | Standalone observed odometer entry, history and corrections retained to repair erroneous observations without falsifying history. |
| More | Add vehicle, garage, meter entry/history, profile, settings, connection status, security, help/about and sign-out. |
| Foundation | Auth, verified identity, per-vehicle server permissions, account deletion safeguards, online-only idempotency and conflict recovery remain active. |

## Paused feature register

`src/features/release/scope.ts` sets `releaseFeatures.advancedTools = false`. UI visibility and route entrypoints consult this control. Backend authorization is unchanged; this is product rollout control, not a security boundary. Direct API clients still have only their existing SQL/RPC permissions.

| Paused item | Preserved implementation | Suppression |
| --- | --- | --- |
| Daily Progress/history | `src/features/progress`, records progress domain | Home/More/detail links hidden; progress record routes show deferred screen. |
| Form builder and versions | `src/features/progress/Builder.tsx`, existing schema/version services | Owner builder route deferred; links hidden. |
| Vehicle members/access grants | `src/features/members`, existing grants/RLS | Owner members route deferred; links hidden. Existing memberships still enforced. |
| Approval/review tools | Progress record status workflows | Approval route deferred; Home/More actions hidden. |
| Revision/audit display | Record audit query/view and server audit events | Record audit panel/query disabled. Revision comparison, immutable server audit and revision conflicts remain active for correctness. |
| Reports/export/analytics | `src/features/reports`, `RecordAnalytics` | Reports route and record analytics routes deferred; navigation hidden. Ordinary ledger histories remain available. |
| Documents metadata | Records documents domain | Menu/detail links hidden; document routes deferred. |
| Maintenance module | `Maintenance` in reports feature | Maintenance route and Add Maintenance shortcuts hidden. Service/repair expense categories are retained. |
| Reminders | Reminder schemas, notification/reconciliation services, linked reminder metadata | Routes and links hidden; reminder record queries/reconciliation disabled; settings permission action hidden; linked reminder controls hidden. Previously scheduled app notifications are cleared on startup with retry on failure; reminder records are preserved. |
| Commercial/agricultural/heavy vehicle creation | Category cards, assets, schemas and existing records | Cards remain visible. Selecting one shows a centered coming-soon pop-up and does not change the chosen category. Continue/save also guard form inputs. |

Existing vehicles of deferred categories are not deleted or silently filtered out. Their stored history remains accessible; new fuel/expense/meter forms show the deferred screen for these vehicles. Legacy outbox data is left untouched but is never read or replayed; online-only saves require explicit action. Existing access grants may still resolve after verified login; no membership security is removed.

## Fuel and electric behavior

| Vehicle powertrain | Purchase choices | Unit |
| --- | --- | --- |
| Petrol / diesel | Matching fuel | Litres |
| Petrol + CNG | Petrol or CNG | Litres / kg |
| Petrol + LPG | Petrol or LPG | Litres |
| CNG / LPG | Matching fuel | kg / litres |
| Electric only | Charging only; no petrol selector | kWh |
| Conventional petrol hybrid | Petrol | Litres |
| Plug-in hybrid | Petrol or electric charging | Litres / kWh |
| Diesel hybrid | Diesel | Litres |

Existing powertrain-to-fuel mapping in `src/features/garage/energy.ts` remains authoritative for the form; no duplicate charging ledger is introduced. Electric vehicles use Charging in the visible bottom navigation, ledger title, add form and Home action. Quantity/price labels explicitly show kWh for charging, kg for CNG and litres for liquid fuels. kWh measures energy; do not label it kW (power). Money remains integer paise. Fuel/charging entries can omit odometer and show pending reading. Missing data must never produce invented mileage. No new charging integrations, charger GPS or notifications are promised.

## UI implementation order and acceptance

1. **Scope control:** retain advanced source; suppress actions and direct links consistently. Implemented.
2. **Vehicle onboarding:** preserve responsive square artwork cards and six compact steps; allow bikes/cars, show deferred-category pop-up, KM-focused setup. Implemented.
3. **Home/navigation:** retain selected vehicle and latest observed reading, three essential quick actions and history; hide advanced sections. Implemented.
4. **Energy entry:** preserve working powertrain mapping/arithmetic; improve electric/unit labels and navigation. Implemented.
5. **Basic expenses/history:** retain existing form, editing, timestamps, archive and in-memory forms; remove dedicated maintenance/reminder/report entry points. Implemented.
6. **Verification:** strict TypeScript, targeted lint/format and scope/powertrain tests; Android export/config checks. Record actual results in STAGE_3_HANDOFF.md. Manual acceptance below remains required.

Manual acceptance: sign in → add bike → fuel without odometer → add truthful meter reading → inspect history → add car → switch vehicles → ensure records do not leak between vehicles → record ordinary expense → add electric car → see Charging and kWh → save and reopen a charge → try deferred category and dismiss pop-up → try advanced direct links → failed online save → reconnect without automatic upload → explicit retry → logout. Repeat at 320/360dp, larger text, dark mode and wide web; verify safe areas, keyboard/footer and picker scrolling.

## Restoration plan

Enable advancedTools only in a deliberate follow-up release after testing the feature register. The flag restores routes, menus, advanced Home actions, supported categories, reminder effects and audit panels. Source/data/migrations remain in place. Run full unit/security/device tests and audit reminder schedules, online permissions and legacy-device-data isolation before release. Prefer splitting this coarse switch into separately approved feature controls when restoring one module at a time. Never reset Supabase or clear user ledgers to restore a feature.

Future sequence: stabilize bike/car core → restore reports → reminders/documents → collaboration and versioned Daily Progress → commercial/agricultural/heavy vehicles with HOURS/BOTH. No automatic “we will notify you” subscription exists; the category pop-up truthfully directs users to release updates.
