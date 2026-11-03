# Online-only request protocol

The 3 November 2026 user decision replaces the earlier offline synchronization protocol. See [implementation plan and live-backend TODOs](ONLINE_ONLY_PLAN.md).

1. Fetch authenticated, vehicle-scoped data and permissions from Supabase. No persistent record cache or permission fallback is consulted. In-memory query data is withheld on known disconnection/read failure.
2. Keep edits only in the open form's memory. Confirm discard on navigation. No draft autosave/restoration and no queued upload.
3. Submit explicitly using the form's stable operation UUID and expected revision. SQL/RPCs verify identity, access and domain rules, perform atomic writes and retain payload-bound receipts.
4. Only confirmed saves trigger success feedback and query invalidation. Error/timeout leaves the current form intact. A missing acknowledgement means the result is uncertain; an unchanged explicit retry uses the same UUID. There is no automatic replay on network restoration.
5. Network requests fail immediately on known offline state and are aborted after 20 seconds. Query/mutation automatic retries are disabled. Read refetch on reconnect/foreground is allowed.
6. Logout/account changes clear live query state; secure auth storage and selected vehicle preference remain. Debug preview is in-memory, visibly labeled, isolated and clears on exit/reload.

Old device data is left untouched and inaccessible to the runtime; no server migration, data reset or queue replay occurs. Pre-existing migrations, receipts, audit and authorization remain authoritative. Live network, RLS and multi-device verification remains open in ONLINE_ONLY_PLAN.md; source implementation is not a production acceptance claim.
