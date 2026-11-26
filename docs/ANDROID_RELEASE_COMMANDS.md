# GaadiPulse Android release commands

Use this guide whenever you prepare a new Android release. Run the commands from the project root:

```bash
cd '/Users/pooniya0092/Documents/p_project/a_App/9. GaadiPulse'
```

This document prepares a build and explains submission; it does not claim that a build has been tested or published. See [external setup and release](EXTERNAL_SETUP_AND_RELEASE.md), [QA test matrix](QA_TEST_MATRIX.md), and [focused release plan](FOCUSED_RELEASE_PLAN.md) for the remaining launch requirements.

## 1. Update the source and version

Make and review the intended code changes, then check the working tree:

```bash
git status --short
git diff
```

### Update the visible version for every release

Open `app.config.ts` and change `version` from the current value to the version you want users to see. For example:

```ts
// Before
version: "1.0.0",

// After — example only; choose your actual next version
version: "1.0.1",
```

Use the same version in `package.json` and the lockfile for consistency. For the example above, run:

```bash
npm version 1.0.1 --no-git-tag-version --ignore-scripts
```

Replace `1.0.1` with your chosen version. This command updates `package.json` and `package-lock.json`; it does **not** update `app.config.ts`, so edit that file separately. `app.config.ts` determines the version in the Android app.

### Update the Android version code

A new Android **version code is required** for each AAB uploaded to Google Play. It must be greater than every code previously uploaded to this Play app, including testing tracks. You normally **do not edit it manually** in this project: `eas.json` already sets `cli.appVersionSource` to `remote` and `production.autoIncrement` to `true`. EAS increments and assigns the remote Android code when you run a production build.

For example, if the highest previously uploaded code is `12` and the EAS remote counter is `12`, the next production build should receive `13`. Check the actual code on the completed EAS build page before uploading; the AAB and separate APK builds each consume a code. Changing the visible version does not increment the code by itself. Do not add a local `android.versionCode` expecting it to override the remote value.

Before the first build with remote versioning, or if EAS's number is behind Play Console, check the highest uploaded code in Play Console and initialize or correct EAS's remote Android version:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:version:set
```

Select Android and enter the highest code already uploaded to Play when prompted. The next auto-incrementing production build must have a higher code; check the resulting build details before upload. Do not reset the remote code to a lower value on later releases. See [Expo app version management](https://docs.expo.dev/build-reference/app-versions/).

## 2. Install and verify

Use Node 24 and the committed lockfile. These checks do not replace the real-device, provider, database and security checks in the QA matrix.

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test -- --maxWorkers=1
npx expo config --type public
```

Resolve failures before shipping. Review the public Expo config for package `com.pooniya.gaadipulse`, the intended version, and correct assets. The package must remain the same as the Play Console app. Review `ANDROID_PACKAGE` if it is set: it overrides the default in `app.config.ts`.

Confirm EAS project access, Android signing credentials, and the **production** EAS environment before building. Set the correct production values for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; set `EXPO_PUBLIC_OAUTH_REDIRECT` if needed, and ensure `ANDROID_PACKAGE` is unset or correct in the build environment. Public variables are embedded in the app: never put service-role keys, OAuth client secrets or signing secrets in them. Verify Google sign-in with the certificate fingerprints for the actual signing configuration. See [Expo environment variables](https://docs.expo.dev/eas/environment-variables/) and [Android release setup](EXTERNAL_SETUP_AND_RELEASE.md).

```bash
npx eas-cli@latest whoami
npx eas-cli@latest credentials --platform android
```

Use the existing upload key for an app already configured in Play Console. Do not replace it casually: Google Play App Signing and the upload key have distinct roles. Verify the backend migrations, authentication, privacy policy, Data Safety answers, permissions and release testing before submission.

## 3. Build the Play Store AAB

This repository is Expo-managed and does not check in an `android/` directory or
Gradle wrapper. Run the EAS build commands below from the project root; `./gradlew`
is available only after generating/maintaining a native Android project locally.

### Option A: EAS cloud build

```bash
npx eas-cli@latest build --platform android --profile production
```

The existing production profile produces a signed Android App Bundle (`.aab`) for Google Play. EAS builds the source present at invocation; include every intended change before starting. After the build completes, use the EAS build page/link to download the AAB and confirm its application ID, displayed version, version code, signing and production configuration. Save the build link and release notes with your release records.

```bash
npx eas-cli@latest build:list --platform android
```

### Option B: Build the AAB locally

To run the production build on this Mac instead of Expo's build servers:

```bash
npx eas-cli@latest build --platform android --profile production --local
```

Install Node 24, Java, Android SDK and NDK, and the other tools required by the project on your machine; configure the Android SDK before running the command. Log in to EAS and ensure the production signing credentials and environment values are available. EAS can retrieve managed credentials, but variables marked **Secret** in EAS are not available automatically to local builds and must be supplied locally. Never commit credentials or secrets. Local builds ignore tool-version settings in `eas.json`, so verify the installed versions yourself. See [Expo local build prerequisites and limitations](https://docs.expo.dev/build-reference/local-builds/).

After a successful build, the AAB is copied to the current directory by default; the final command output shows its path. Inspect the actual AAB's package, version, version code, signing and production configuration before uploading. The project uses remote version management, so keep the EAS counter aligned with Play Console as described above and verify the resulting code; do not assume a particular number.

## 4. Build an installable release APK

Google Play accepts the AAB; an APK is useful for direct installation and device smoke testing. The existing `preview` profile creates an APK but uses the preview profile/environment, so it is not automatically equivalent to the production build.

For an APK built using production settings, add this profile under `build` in `eas.json` once, alongside the existing profiles:

```json
"production-apk": {
  "extends": "production",
  "environment": "production",
  "android": {
    "buildType": "apk"
  }
}
```

Keep valid JSON commas between profiles. Then run:

```bash
npx eas-cli@latest build --platform android --profile production-apk
```

To build the same APK profile locally instead, run:

```bash
npx eas-cli@latest build --platform android --profile production-apk --local
```

Download the cloud APK from its EAS build page, or use the local build's output file, and install it on a connected test device:

```bash
adb devices
adb install -r /path/to/downloaded-gaadipulse.apk
```

Replace the path with the downloaded file. Android SDK Platform-Tools and USB debugging are required. The APK is a separate build and inherits production's auto-increment, so it receives its own version code; it is not a byte-for-byte test of the AAB. Installations signed with incompatible keys cannot update each other. For the closest Play delivery test, upload the AAB to a Play internal testing track and install it through Google Play before promoting that same AAB.

## 5. Submit and release

In Google Play Console, select GaadiPulse, upload the **AAB** to an internal test track first, review the generated release and test it on real devices. Once the release gates pass, promote the tested artifact to production, complete release notes and required declarations, and submit it for review. Production rollout is a separate, deliberate Play Console action. See [Google Play release guidance](https://support.google.com/googleplay/android-developer/answer/9859348).

Optionally, after Google Play API access and service-account setup, EAS can submit a build:

```bash
npx eas-cli@latest submit --platform android --profile production
```

The `production` submit profile in `eas.json` selects the internal testing track and creates a draft release. Configure Google Play service-account credentials in EAS before submitting. EAS Submit does not itself complete all Play Console declarations or guarantee production publication; a first upload may need to be performed manually. See [Expo Android submission](https://docs.expo.dev/submit/android/).
