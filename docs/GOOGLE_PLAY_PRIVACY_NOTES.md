# GaadiPulse — privacy and Google Play preparation

Internal working notes, not a public privacy policy or completed Data safety declaration. Review the exact release build, all SDKs and deployed services before submission. The operator is responsible for accurate declarations and legal review.

## What the repository currently indicates

- The focused release is online-only. Vehicles, fuel, expenses and meter records are in scope; advanced tools including vehicle member management, progress forms, documents, reminders, reports and exports are disabled by the current release flag. Existing backend capabilities are not proof that the release UI exposes them.
- Email/password, email code and Google authentication are implemented in source; provider configuration and real-device verification remain open. Supabase is used for authentication and backend data. The actual email provider, hosting region, logs, backups and any additional SDK/service processing require operator verification.
- The Android configuration blocks location, camera, microphone and broad external storage permissions. The merged release manifest and any SDK behavior still need checking. GPS and file/photo uploads are outside the current scope. Notifications code exists, while reminders are paused in the focused release.
- Session information and selected-vehicle preference may be stored on device; old offline files may remain from earlier versions and are not automatically uploaded. Confirm all release behavior on an upgraded device.
- The repository describes an in-app deletion request and a separate operator anonymization job, but the job has not been deployed or scheduled. Shared ledgers/attribution may remain, and the retention policy has not been approved. Verify that the in-app request is reachable in the released build, and assess the actual outcome against Play's account deletion policy. An anonymization job or disabled account alone does not establish compliance.

## Before publishing

1. Review and complete the outstanding production details in [the privacy policy](PRIVACY_POLICY.md), including actual providers, retention and deletion details. Review the policy against the production build and applicable law.
2. Publish the policy at a publicly accessible, active, non-geofenced URL that is not a PDF, and link it in Play Console and within the app. Confirm the page names GaadiPulse or the developer in the store listing. See [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311).
3. Provide a working, discoverable account deletion request path both in the app and on a public web page that does not require reinstalling it; enter the web link in Play Console. Explain verified prerequisite steps, deletion timing and any justified retained data. Implement and test request processing, including providers and backups, and review shared vehicle records and anonymization with counsel against [Google's account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111). Do not claim deletion is available until the full process works.
4. Complete the Data safety form for the **actual distributed build**, including third-party SDKs and services. Distinguish data sent off-device from device-only storage, and collection from sharing as Google defines them. Disclose mandatory versus optional collection, purposes, and whether data is processed ephemerally where applicable. Verify every security and deletion answer. See [Google's Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469).
5. Check the target audience and content declarations, permissions in the merged Android manifest, app access/reviewer instructions, and any other applicable Play Console declarations. Confirm if any prominent in-app disclosures or consent are required for the actual data and permissions used.
6. Replace the existing pre-release in-app legal text or link it to the approved policy. Revisit the policy and Play declarations whenever features, providers, permissions or data practices change.

## Data safety inventory to verify

| Potential data | Evidence / questions for the release review |
| --- | --- |
| Email address and account identifiers | Authentication uses Supabase; confirm Google-returned profile fields, email provider, purposes and whether each is required. |
| Name or other profile fields | Check the actual profile and Google sign-in payload; classify only what is collected or shared. |
| Vehicle details, registration, fuel/expense amounts, meter readings, dates and notes | Sent to the backend for the app's core functionality. Determine applicable Play data types, including user-provided content and financial information, using Google's definitions; do not assume one category covers every field. |
| Membership, access and audit records | Check whether any accessible release flows or backend services collect or disclose these and how they map to Play's categories. |
| IP address, device identifiers, diagnostics and crash data | Audit Supabase, email delivery, Google sign-in, Expo and all included SDKs and their production configuration; do not assume collection or absence based on dependencies alone. |
| Location, photos/files and notifications | Confirm the final manifest and runtime/network behavior. Typed place names, if later enabled, are different from device GPS, but may still be personal information. |
| Data sharing and security | Check actual recipients, service-provider exceptions, encryption for every transmitted data type and SDK, and working deletion mechanisms before choosing answers. |

Do not use this inventory as a prefilled declaration: optionality, purposes, collection and sharing depend on the production implementation and Google's current definitions.
