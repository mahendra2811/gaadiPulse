# Implemented route and permission map

Composed screens are reused for related modules; no empty files are counted as destinations. Four primary tabs persist. Other forms/details open outside the tabs.

| Route | Views and access |
|---|---|
| `/auth/welcome` | Three bundled onboarding illustrations, sign-in, legal content and debug-only local bypass |
| `/auth/login`, `/auth/verify`, `/auth/callback` | Google PKCE, email OTP, resend/change-email and callback recovery |
| `/auth/legal` | Real local pre-release Terms/Privacy text; operator review required |
| `/(tabs)` | Per-vehicle Owner/Pilot home, vehicle context, monthly permitted spending, latest observations, progress, reminders and Owner actions |
| `/(tabs)/fuel`, `/(tabs)/expenses` | Period/search/status history, local/pending badges, summary and authorized add/analysis |
| `/(tabs)/more` | Role-aware garage, meters, progress, documents, reminders, maintenance, reports, members, form builder and settings |
| `/garage` | Search owned/shared/archived vehicles and open profile |
| `/garage/add`, `/garage/edit?id=…` | Six-step category/subtype/make/model/details/meter/review wizard, persistent drafts, authenticated save or separate local development repository |
| `/garage/[id]` | Vehicle profile, Owner edit/archive/recover, per-vehicle role |
| `/records/[kind]` | `fuel`, `expenses`, `meters`, `progress`, `documents`, `reminders` history, filters and paging |
| `/records/[kind]/add` | Kind-specific transaction/metadata/progress form with vehicle card immediately below header; create/submit permission |
| `/records/[kind]/[recordId]?vehicle=…` | Authorized detail, provenance, notes, edits, archive/recover, progress review or reminder completion/snooze |
| `/records/[kind]/edit?id=…&vehicle=…` | Owner or authorized own-entry edit with revision conflict protection; existing vehicle fixed |
| `/records/[kind]/analytics?vehicle=…` | Report-authorized period totals, expense breakdowns, full-to-full fuel intervals; unknown metrics remain unknown |
| `/meters/history` | Canonical independent observations, baselines, resets, measured intervals, Owner correction/retraction and retained history |
| `/progress/approvals` | Progress history prefiltered to pending review; Owner review enforced by RPC |
| `/owner/members` | Owner grant by email, unresolved/resolved grants, member role/permission editing, protected admin and defaults |
| `/owner/form-builder` | Owner templates, typed fields, defaults/constraints/options, duplicate/reorder/remove, Pilot preview, date policy, immutable publish and version history |
| `/maintenance` | Authorized service/repair/tyre/battery history linked to original expense, without duplicate accounting |
| `/reports` | Scoped reports, measured intervals, custom reportable fields, CSV/JSON/PDF export; live export authorization in real mode |
| `/settings`, `/settings/profile` | English + disabled Hindi, theme/system, name/timezone, notifications, local legal text, sign-out/exit development |
| `/settings/sync` | Actual queue states, last successful operation sync, retries, local/server conflict comparison, draft export/remove |
| `/settings/security` | Account deletion request/dependency explanation and Android settings |
| `/settings/help`, `/settings/about` | Operational help, sync recovery and product identity |

Vehicle roles are resolved per membership. Financial read/create/edit permissions are independent. `progress.view` gives Pilots only their own submissions, with Owner-only fields removed by SQL. Permission checks in UI do not replace backend RLS/RPC authorization. Owner-only deep links are rejected by the server. Native date/time dialogs are Android-specific; ISO inputs remain the fallback. Photo capture, uploads, GPS and untranslated Hindi are deliberately unavailable.

Runtime navigation, keyboard, TalkBack, width and end-to-end validation are NOT RUN for Stage 2/3 under the user's instruction to defer testing.
