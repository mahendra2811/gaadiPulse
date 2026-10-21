# Architecture specification

## Runtime
`Expo Router Screens → feature hooks / forms → typed repository → local SQLite cache/outbox + Supabase client → RLS + RPC/Edge Functions → PostgreSQL`.

## Directories to CREATE during Prompt 1
```text
app/
  _layout.tsx
  (auth)/welcome.tsx, sign-in.tsx, verify.tsx, profile.tsx
  (tabs)/_layout.tsx, index.tsx, fuel.tsx, expenses.tsx, more.tsx
  garage/index.tsx, add.tsx, [id].tsx, edit.tsx
  fuel/add.tsx, [id].tsx, analytics.tsx
  expenses/add.tsx, [id].tsx, analytics.tsx
  progress/add.tsx, index.tsx, [id].tsx, approvals.tsx
  owner/members.tsx, grant.tsx, permissions.tsx, form-builder.tsx, form-preview.tsx
  documents/index.tsx, add.tsx, [id].tsx
  reminders/index.tsx, add.tsx, [id].tsx
  reports/index.tsx
  settings/index.tsx, language.tsx, appearance.tsx, sync.tsx
src/
  components/ui/{Button,TextField,Card,Sheet,Toast,ConfirmDialog,Skeleton,EmptyState}.tsx
  components/navigation/{FloatingTabBar,VehicleContextHeader,PageProgressLine}.tsx
  components/forms/{MoneyInput,MeterOptionalFields,DateField,DynamicFieldRenderer}.tsx
  features/{auth,garage,fuel,expenses,meters,maintenance,progress,members,documents,reminders,reports,analytics}/
    api.ts, repository.ts, schemas.ts, hooks.ts, types.ts, components/
  hooks/{useActiveVehicle,useVehicleAccess,usePageLoad,useNetworkStatus,useTheme}.ts
  lib/{supabase,sqlite,sync,i18n,notifications,queryClient,env}.ts
  stores/{garageStore,uiStore}.ts
  theme/{colors,spacing,typography,motion}.ts
  utils/{money,mileage,readingIntervals,periods,dates}.ts
  types/{database,domain}.ts
supabase/migrations/
supabase/functions/
assets/
tests/{unit,integration,e2e}/
docs/
```
Do not create dummy empty modules simply to satisfy a tree. Consolidate where appropriate and explain structural differences.

## Hook contracts
- `useActiveVehicle()`: current vehicle ID, accessible vehicle list, switch w/ cleanup.
- `useVehicleAccess(vehicleId)`: read-only server-resolved permissions; cannot be authority for API security.
- `usePageLoad(key,prerequisites)`: line under header; determinate only for measurable tasks; errors reset.
- `useFuelEntries(vehicleId,filters)` / `useCreateFuel()` / `useUpdateFuel()`: typed query/mutation, idempotency and error status.
- `useExpenses()`, `useCreateExpense()`, `useMeterReadings()`, `useSaveMeterReading()`.
- `useProgressForm(vehicleId,version?)`, `usePublishProgressForm()`, `useSubmitDailyProgress()`, `useReviewDailyProgress()`.
- `useOfflineSync()`: outbox pending/syncing/failed counts, retry action.
- `useAppLocale()`: future-ready locale switch and string lookup; English only enabled until verified translations supplied.

## Page loading semantics
Route required data includes session check, authorized vehicle context and route-essential fetches. Header indicator begins on route navigation and stops only when all required prerequisites resolve or fail; errors show retry. Supplemental charts/images have independent skeletons. Do not display a fabricated numerical percent from elapsed time.

## App state contracts
Do not cache a prior vehicle's financial totals under a new selected vehicle. Query keys include user, vehicle and filter. Logout clears local copies according to privacy policy; offline drafts are never silently uploaded after permission revocation.
