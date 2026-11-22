# ADR-004: Fail closed for legacy financial clients

Status: Proposed

Decision: Keep the current INR-only guard during transition. New v2 financial RPCs and reads are introduced first; legacy paths are revoked or return `CLIENT_UPDATE_REQUIRED` before non-INR records are enabled.

Reason: An old app cannot be trusted to understand a client-supplied version or distinguish `amount_minor` from INR paise. UI-only hiding is unsafe.
