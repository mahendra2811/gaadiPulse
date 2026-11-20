# Notification revocation analysis

Existing reminder reconciliation checks only the active vehicle. To clean up after verified access loss, inspect OS scheduled requests and match their `gaadipulse.reminder`, accountId, vehicleId and reminderId metadata. Cancel only after a fresh successful authoritative access check confirms loss; preserve unrelated accounts, vehicles and requests. Network failures, stale responses, malformed/null results and account changes are not confirmation of revocation.

Clear or reconcile secure-storage markers after cancellation so restored access can reschedule. Coordinate cancellation and scheduling to avoid stale in-flight operations recreating a revoked reminder. Expose native API and storage failures with retry. Test multiple accounts/vehicles, permission restoration, offline/errors, malformed metadata, partial cancellation failure, races and Android delivery. This remains a verified source-level risk, not a reproduced physical-device result.
