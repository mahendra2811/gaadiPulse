# Online-only implementation plan and backend verification TODOs

Updated 3 November 2026. The latest user instruction replaces the earlier offline-first requirement. This applies to the focused bike/car release and retained advanced modules. Frontend work can continue; live backend correctness is not yet accepted.

## Required behavior

- Authenticated records and permissions come from Supabase. No SQLite/browser record mirror, persisted form draft, permission lease, provisional record, outbox, synchronization timer or reconnect upload.
- Editing uses component/form memory. Failed saves keep inputs on the mounted form. Leaving/discarding, signing out, terminating or reloading the app loses unsaved inputs. Show a discard confirmation for dirty forms.
- Saves await the SQL/RPC response. Only a confirmed response permits success feedback, list invalidation, clearing a form or navigation. A connection failure can leave the server outcome unknown; never categorically claim the record was not uploaded.
- Retain stable operation UUIDs for explicit form-save retries, server operation receipts and revision checks. These prevent duplicate writes and stale edits; they are not an offline queue. An altered request with an already-committed UUID is rejected, requiring review of the latest server record.
- Query responses live in memory only, keyed by account/vehicle. Disable automatic write retries, fail requests promptly when offline and bound network requests to 20 seconds. Withhold cached query data on known disconnection or read error. Reconnection may refetch reads, but never submits a form.
- Keep secure session/PKCE storage and selected vehicle preference. Device notification identifiers remain small secure metadata for the retained reminder module; they do not store ledger data. Reminders remain paused in the focused release.
- Debug frontend preview remains explicitly labeled, development-build-only and isolated from authenticated data. Its records live in memory and clear on reload/exit. Preview success does not prove database integration.

## Implementation register

- [x] Remove garage, permissions, records, meters, profile and form-version persistent read fallbacks.
- [x] Remove queue persistence, workers, timers, provisional records and queue recovery UI.
- [x] Remove vehicle/record/form-builder draft loading, autosave and save-on-leave.
- [x] Keep mounted form inputs on request failure; make leaving a discard action.
- [x] Keep SQL/RPC authorization, atomic writes, receipts, financial validation and revision conflicts.
- [x] Replace Sync status with Connection, retaining `/settings/sync` as a compatible link.
- [x] Remove SQLite dependency/plugin and application storage adapters.
- [x] Make frontend preview ephemeral and label it globally.
- [x] Add automated tests for acknowledgement gating, failure propagation, same-ID explicit retry, missing acknowledgement, offline fail-fast, timeout and cancellation.
- [x] Update current architecture/protocol/decision and handoff documentation.

## Preservation of existing data

No server migration or reset is required. Existing SQL migrations, server receipts, account records and audit history are unchanged. Legacy device draft/cache/outbox files are not read, displayed or automatically uploaded by this version. They are left untouched rather than silently deleting potentially unsent user work. Any future legacy-data export/removal must be a separate reviewed migration; never replay old queues automatically.

## Backend integration TODO — required before release

All items below are **OPEN / NOT VERIFIED against live Supabase**, even where unit tests cover the client behavior. Do not mark the app production-ready based on frontend preview or bundling.

1. Resolve the existing full-migration SQL compilation failure (`syntax error at end of input`) and apply every chronological migration on disposable local Supabase. Do not reset a real project.
2. Configure and test real Google/OTP/password authentication as supported by the app, verified identity, session restoration/expiry and revoked sessions. Confirm preview data cannot appear under a real account.
3. Verify real per-vehicle access and SQL/RLS with two Owners, Pilots and an outsider. Attempt forged vehicle IDs, hidden financial fields, grants/revocation and direct API calls. Check all retained advanced modules before restoring them.
4. Save vehicle, fuel/charging, expenses and meter observations. Confirm each success corresponds to the correct database row and a fresh read after restart. Confirm account/vehicle isolation and integer-paise correctness.
5. On Android, disconnect before saving; confirm error, preserved current form, no list record and no upload after reconnect. Tap Retry explicitly and verify exactly one database write.
6. Disconnect after the server commits but before acknowledgement. Retry unchanged inputs with the same operation ID; verify one row/receipt and truthful uncertain-save feedback. Change inputs after uncertain outcome and verify the app requests review instead of silently duplicating or replacing data.
7. Fail a previously successful read. Confirm old records/permissions are withheld, failure is not displayed as an empty successful ledger or zero financial total, and Retry recovers.
8. Kill/reload the app with an unfinished form, reconnect with legacy drafts/outbox present, and restart under another account. Confirm no draft restoration, old-cache display or automatic uploads.
9. Edit the same record from two devices. Confirm revision conflict, visible recovery and no overwritten financial data. Validate profile update acknowledges an actual matching row.
10. Test slow requests/timeouts, airplane mode, connected Wi-Fi without internet, background/foreground, session expiry during save and double tapping Save. Verify loading always ends with success/error and that reconnect only refetches reads.
11. Test 320/360dp layouts, keyboard, large text, Android Back/discard, Save & add another, electric kWh labels and persistent frontend preview notice. Rebuild native clients after removing SQLite.
12. When advanced tools return: recheck publish/review/membership/document/reminder/export server behavior, uncertain-result retry semantics and authorization. Their frontend availability remains controlled by the existing release scope.

See `STAGE_3_HANDOFF.md` for exact executed validation and blockers. These TODOs deliberately remain open while frontend work proceeds.
