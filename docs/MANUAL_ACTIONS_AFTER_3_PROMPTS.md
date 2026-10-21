# GaadiPulse — what you personally do after Codex finishes Prompts 1, 2 and 3

## After Prompt 1
- [ ] Create Supabase development project; set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` locally using the root `.env.example`.
- [ ] Apply reviewed SQL migrations in development and confirm tables/RLS exist.
- [ ] Configure email OTP, Google OAuth identity provider and Android signing fingerprint(s). Test Google and email OTP on a real development build, not only Expo Go.
- [ ] Verify English screens, app icon, launch splash, onboarding images, category artwork, footer navigation and vehicle selection.
- [ ] Verify Owner can add/edit bike, car, truck, tractor and machine; confirm KM/HOURS/BOTH adapt correctly.
- [ ] Read `docs/STAGE_1_HANDOFF.md`; review its baseline evidence separately from later untested code.

## After Prompt 2
- [ ] Enter test fuel sequence: first full at 1000 km; 3 L partial at 1100 km; 7 L full at 1200 km. Mileage must be 20 km/L.
- [ ] Check fuel save without odometer, then separately record the accurate observation date and value.
- [ ] Test a HOURS-only excavator and BOTH-mode tipper, with optional readings.
- [ ] Add ₹2,500 service, EMI split principal/interest, repair, toll; verify reports have correct classifications.
- [ ] Force airplane mode and inspect actual handling. Foreground outbox sync is implemented; validate persistence, rejection and conflict behavior.
- [ ] Read `docs/STAGE_2_HANDOFF.md`; review it alongside the final Stage 3 handoff.

## After Prompt 3
- [ ] Create five actual test identities: Owners A/B, Pilots C/D, outsider E (never share OTPs).
- [ ] Owner A assigns Pilot C by email; C logs in with verified email; vehicle appears automatically, no acceptance step.
- [ ] Confirm C has only configured permissions. Test denied REST and export access, not UI alone.
- [ ] Add a customized Tipper Progress template (Trips, From, To, Material); publish and submit as Pilot; approve as Owner.
- [ ] Change the form; confirm old submissions show the correct old schema version.
- [ ] Test offline draft → reconnect → one server record, then revoked access while offline → rejected sync with explanation.
- [ ] Verify document **metadata** only; user file upload remains deferred. Check renewal notifications and measured vs estimated stats.
- [ ] Provide actual privacy policy and support URL/email. Review Play policies/data safety based on shipped SDKs, and complete EAS build/signing/closed test.
- [ ] Check `docs/STAGE_3_HANDOFF.md` and `docs/FEATURE_ACCEPTANCE_MATRIX.md` for every unresolved **NOT TESTED**, **FAIL**, **BLOCKED** item. Do not publish while critical issues remain.

## External services and secrets
All OAuth/Supabase configuration must live in your own provider dashboards and `.env` / server-side secret storage. Codex cannot provision or verify these without your actual authenticated environment and authorization. Do not paste private secrets into public GitHub issues or prompts.

Implementation has continued through all three prompts. These checklists are future operator/QA actions; the user explicitly deferred current testing. Configure the retention policy and server-only deletion job using EXTERNAL_SETUP_AND_RELEASE.md before enabling account anonymization.
