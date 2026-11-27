# Product limitations and future scope

This is a short boundary reference, not a feature verification record. Check the [comprehensive product brief](GAADIPULSE_COMPREHENSIVE_PRODUCT_BRIEF.md) for current rollout language and the [latest handoff](STAGE_3_HANDOFF.md) for implementation and validation evidence.

## Current constraints

- Authenticated records and permissions require a network connection. Failed or uncertain writes are not queued for automatic replay.
- Hindi is not available until complete, reviewed translations are shipped.
- The ledger currently has INR constraints; the currency foundation does not make the user-facing ledger fully multi-currency.
- Photo capture/upload, receipt OCR, live GPS/telematics, legal ownership transfer, resale marketplace, subscriptions and ads are not supported features.
- Vehicle/document metadata does not constitute an official government document or legal verification.
- Reminder delivery depends on local OS permissions and scheduling behavior; it is not guaranteed live monitoring.
- Code and local previews do not establish that a feature is deployed, tested with live accounts, or present in the published Android build.

## Future work principles

- Preserve source/time provenance when adding GPS, telematics, OCR or imported data; do not silently overwrite manual observations.
- Secure future attachments with explicit consent, storage policies and short-lived authorized access.
- Keep in-app administrative roles distinct from legal vehicle ownership.
- Enable additional currencies only after all read/write, legacy-client, mixed-currency total, report and export paths safely preserve each record's currency.
- Complete local backend, authenticated RLS, Android device and release-candidate checks before making availability claims.
