# External setup, credentials and release steps

These tasks require real accounts and secrets. Codex can implement integration code but cannot fabricate verified provider configuration.

## 1. Developer machine
- Install Node.js LTS, Android Studio, platform-tools, emulator/system image or physical Android test phone, a compatible JDK, and EAS CLI.
- Keep project in a git repository; use `.gitignore` for `.env`, keystores, credentials and generated files.
- Run: `npm install`, `npx expo-doctor`, `npx expo start --dev-client` (or stage-specific scripts). `npx expo run:android` if building a local native project.

## 2. Supabase project
1. Create a Supabase project in region reasonably close to primary users.
2. Obtain **Project URL and publishable/anon key**, store in `.env` (names in `config/.env.example`). Never put a `service_role` key in EXPO_PUBLIC variables.
3. Link local CLI using supported version, review SQL migrations, apply them to a **development** project first. Have Codex validate with Supabase local stack and tests before prod.
4. Configure mail OTP/template, redirect allowlist and Google identity provider. Rate-limit abuse and check account recovery.
5. Deploy required Edge Functions with secret env configured on the server; secrets never included in mobile binaries.
6. Configure database backups and permission audits. RLS required for every exposed table/view.

## 3. Google Sign-In / Android
1. Create provider OAuth credentials with correct Android application ID, signing certificate SHA-1/SHA-256 for development and release (Google service configuration varies by selected Expo/Supabase flow).
2. Set authorized redirect URIs exactly as required by the implemented AuthSession/Supabase design; use Expo scheme and production deep link.
3. Verify on **real Android build** (not Expo Go assumptions); test both Google and email OTP accounts, refresh, expired sessions, sign out and switching accounts.
4. Do not commit client secret. Test identity email verification before automatic vehicle email grant resolution.

## 4. App assets
- Use `assets/android-store-icon.png`, `assets/adaptive-icon-foreground.png`, `assets/splash-screen.png` and UI SVG/PNG resources.
- The provided `assets/brand/selected-logo-reference.png` is a user-approved visual reference; exact vectorization is optional future replacement.
- Run `python scripts/generate_assets.py` if asset regeneration is needed. Inspect image sizes and crop safety.

## 5. Google Play / Android release
1. Choose permanent application ID (e.g. `com.pooniya.gaadipulse`) before first upload; verify collisions independently.
2. Update `app.config.ts` and `eas.json` for development/preview/production. Create EAS project and configure signing credentials.
3. Set final Play title, feature graphic, screenshots, content rating, support email and valid public privacy policy URL.
4. Complete Google Play Data Safety truthfully based on actual code/SDKs and whether personal data, auth, receipts or analytics are collected.
5. Request minimal permissions. GPS/background location, photo access and all-files access **not** required for current Phase 1.
6. Test closed track/required Play testing, screen sizes, accessibility, cold boot, offline/reconnect, staged rollout and crash logs.
7. Review latest applicable Google Play requirements at publish time; API levels and policies change.

## 6. Legal/product support
- Provide real Privacy Policy and Terms URLs (not invented public links) describing email identity, vehicle data, collaborative permissions, local cache, deletion, analytics and retention.
- Define export/deletion rules when co-owners have shared records; avoid claiming government-backed ownership verification.

## Production release gate
No production-ready claim before external credentials, RLS tests, EAS Android build/install, physical device walkthrough and policy disclosures are actually verified.
