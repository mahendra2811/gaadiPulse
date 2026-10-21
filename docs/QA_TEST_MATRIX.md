# QA and verification status

The user explicitly instructed: **do not do testing now; continue implementation**. No Stage 2/3 test, typecheck, lint, SQL migration run, Expo export or native build is claimed. Source-formatting and reading code are implementation activities, not runtime verification.

| Area | Implementation | Verification status |
|---|---|---|
| Stage 1 foundation baseline | Source and first Android APK implemented | Earlier 28 automated checks passed and native compilation/install succeeded before later changes; see STAGE_1_HANDOFF.md. Results do not cover current complete source. |
| Debug sign-in bypass | Local-only development identity and persistence; __DEV__ gate | NOT TESTED after addition |
| Auth providers | Supabase PKCE Google, email OTP, verified grants | Live provider credentials/configuration BLOCKED; NOT TESTED |
| Fuel two-of-three, paise, full/partial intervals | Domain services and entry/history/analysis | NOT TESTED, deferred |
| Expenses/EMI/line items/maintenance | Domain services, SQL validation and screens | NOT TESTED, deferred |
| Meter observations/reset/correction | History, provenance, replacement/retraction | NOT TESTED, deferred |
| Membership and permissions | Grant/revoke/defaults/overrides, SQL scopes | Stage 1 subset tested earlier; new hardening NOT TESTED |
| Progress builder/versioning/review | Immutable forms, typed fields, server validation, sanitized reads | NOT TESTED, deferred |
| Documents | Metadata CRUD, no-file notice and official link | NOT TESTED, deferred |
| Reminders | CRUD, recurrence, threshold/date scheduling and permission UX | NOT TESTED on Android; OS-delivery not guaranteed |
| Reports | Permission-scoped CSV/JSON/PDF export and measured intervals | NOT TESTED; PDF rendering and native sharing require new native build |
| Offline | SQLite/browser drafts, cache expiry, serialized outbox, conflicts/rejections | NOT TESTED, deferred |
| Account deletion | Recorded request, dependency checks, operator anonymization job | NOT TESTED; Edge Function deployment/scheduling required |
| Accessibility and visual layout | Safe areas, scalable text, local art, labels and reduced motion | Full 320dp/large type/TalkBack/manual flow NOT TESTED |
| Release | Expo/EAS config and external steps | New Android build, signed release, Play review NOT TESTED |

## Required next verification sequence (when testing is authorized)

1. `npm ci`, `npm run format:check`, `npm run typecheck`, `npm run lint`.
2. Extend/run domain and PostgreSQL tests against **all four** migrations. Existing security test fixture currently exercises Stage 1 only. Add service_role to fixtures for operator workflows as needed.
3. Run local Supabase/PostgREST/JWT adversarial tests with two Owners, two Pilots, outsider, unverified address, revoked membership, hidden financial access, hidden Owner-only custom answers, duplicate operations, invalid data and concurrent stale edits.
4. Configure providers and run first sign-in → two vehicles → full/partial fuel → service → meter correction → form publish → Pilot assignment/submission → review → reports → offline/reconnect/conflict.
5. `npx expo-doctor`, Android export, rebuild development client for newly added Print/Sharing modules, actual emulator/device flow, release build/signing, legal and Play policy review.

Until these gates pass, this is an unverified implementation and must not be described as production-ready.
