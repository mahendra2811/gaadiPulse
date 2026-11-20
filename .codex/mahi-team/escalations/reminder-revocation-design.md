# Reminder access-revocation fix: implementation decision

Currently, a scheduled local reminder can remain after a user loses vehicle access. A safe fix must handle an account switch or permission change while asynchronous scheduling is in flight.

Proposed local implementation: introduce a session-generation guard; coordinate scheduling and cancellation per account and vehicle for both background reconciliation and record-detail actions; check fresh authoritative access for scheduled vehicles without treating network failures or malformed data as revocation; reconcile OS schedules with local markers after interruptions; expose recoverable errors. Tests use mocked native APIs and synthetic users/vehicles, not actual device notifications. No hosted deployment is part of this change.

Tradeoff: this touches authentication-session lifecycle and notification scheduling, and the app's existing sign-out behavior must keep working. It requires multi-account, revocation, offline, race and Android-device verification. Alternative: leave existing behavior unchanged and document the stale-notification risk until a later release.

Production database migration deployment is a separate decision and is not included in this proposal.

Decision: user selected "Implement the coordinated fix". Implementation is authorized locally; no production deployment was authorized. Use mocked notification/storage adapters for tests. Remote revocation cannot be observed while the app is offline or not running; reconciliation occurs after a successful foreground/server refresh.
