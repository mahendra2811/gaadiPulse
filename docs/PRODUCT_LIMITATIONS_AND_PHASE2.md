# Explicit scope limits and future roadmap

The Phase 1 features below are implemented in source. Current validation is deferred by user instruction; this is not a release acceptance claim. See STAGE_3_HANDOFF.md and EXTERNAL_SETUP_AND_RELEASE.md for evidence and setup gates.

## Phase 1 included
English first, language selector wired but Hindi disabled until actual translations; Owner/Pilot per-vehicle permissions; automatic email grants after verified sign-in; KM/HOURS/BOTH; Fuel and Other Expense; daily progress form builder; documents metadata, date/km/hour reminders, reports; safe offline drafts/sync; bundled original visual assets.

## Deferred (must not be marketed as available)
1. Actual user photo picking/receipt images, vehicle pictures, document scan and file uploads.
2. OCR and receipt/odometer number recognition.
3. Automatic GPS/third-party telematics integrations and actual daily route tracking.
4. Legal vehicle ownership transfer, buyer sharing, sale listing/marketplace.
5. Hindi translation catalog and verified language strings (architecture only now).
6. Pricing/subscriptions, ads and monetization; launch stays free.
7. Smart hardware/battery diagnostics or predictions from unavailable telemetry.

## Phase 2 design guidelines
- Use future `gps_readings` with provider, measured timestamp, quality metadata and source; never overwrite manually measured odometer silently.
- Extend documents with attachment table pointing to RLS-protected storage bucket, short-lived signed URLs, photo permissions and user consent.
- For owner transfer, implement distinct legal-title vs in-app-admin and private history-sharing scopes.
- For Hindi, add fully reviewed `hi` resources and translation QA; only then enable selector.
