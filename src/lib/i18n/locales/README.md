# Locale catalogs

## Current editing rule

For now, edit translation strings only in `en.json` and `hi.json`. Do not add,
change, reformat, or remove content in any other language catalog (`*.json`).
All other locales use `en.json` at runtime until translation work is explicitly
resumed. Keep their files untouched.

This directory contains 45 catalogs: English plus 44 non-English languages. All 45 are available in onboarding and Settings. `en.json` is the source of truth. A locale whose catalog is unfinished remains selectable but displays English for missing or blank translations until that language is completed. The checkboxes below track verified catalog completion, not whether a language can be selected.

| Done | Language | Locale | File | 6. Play Store ratings and reviews
Medium

12 of 12 selected

Deselect all

Integrate expo-store-review for native in-app review requests

Show review requests after meaningful successful user actions

Avoid showing review prompts immediately after installation

Apply reasonable cooldown periods between review requests

Store the last review-request timestamp

Avoid interrupting forms, errors and important user workflows

Add a permanent Rate GaadiPulse option in Settings

Implement Play Store deep linking with browser fallback

Add Share GaadiPulse functionality

Add a separate Send Feedback option

Avoid incentivized reviews and positive-review filtering

Respect Google Play review quotas and policies

7. Application update management
   High

13 of 13 selected

Deselect all

Implement application version checking

Show an optional update available popup

Implement minimum supported version configuration

Implement mandatory updates only for critical compatibility or security issues

Add Update Now and Later actions for optional updates

Redirect users to the correct Play Store listing

Implement Expo EAS Update for compatible OTA updates

Configure runtimeVersion compatibility

Maintain separate development, preview and production update channels

Implement staged rollouts and rollback strategy

Display What's New after significant updates

Maintain application changelog

Implement remote feature flags

8. Error handling and application reliability
   High

0 of 14 selected

Select all

Implement global React Error Boundary

Integrate Sentry or an equivalent crash-reporting service

Capture handled and unhandled exceptions

Implement user-friendly error messages

Create reusable error and retry components

Handle API timeouts and server failures

Handle expired authentication sessions

Prevent duplicate submissions from repeated button taps

Use idempotency for critical record creation

Implement graceful handling of unexpected application states

Monitor crash-free sessions and Android ANRs

Upload production source maps securely

Remove unnecessary production console logs

Avoid logging tokens, passwords and personal informationStatus |
| ---- | -------------------- | ------ | ---------- | -------------------------------------------- |
| [ ] | Arabic | ar-SA | `ar.json` | Translation pending; English fallback |
| [ ] | Assamese | as-IN | `as.json` | Translation pending; English fallback |
| [ ] | Bengali | bn-IN | `bn.json` | Translation pending; English fallback |
| [ ] | Bodo | brx-IN | `brx.json` | Translation pending; English fallback |
| [ ] | Chinese (Simplified) | zh-CN | `zh.json` | Translation pending; English fallback |
| [ ] | Dogri | doi-IN | `doi.json` | Translation pending; English fallback |
| [ ] | Dutch | nl-NL | `nl.json` | In progress: 49/1,232; English fallback |
| [x] | English (India) | en-IN | `en.json` | Complete canonical source; grouped by domain |
| [ ] | Filipino | fil-PH | `fil.json` | Translation pending; English fallback |
| [ ] | French | fr-FR | `fr.json` | In progress: 49/1,232; English fallback |
| [ ] | German | de-DE | `de.json` | In progress: 49/1,232; English fallback |
| [ ] | Gujarati | gu-IN | `gu.json` | Translation pending; English fallback |
| [ ] | Hebrew | he-IL | `he.json` | Translation pending; English fallback |
| [ ] | Hindi | hi-IN | `hi.json` | In progress; missing strings use English fallback |
| [ ] | Indonesian | id-ID | `id.json` | Translation pending; English fallback |
| [ ] | Italian | it-IT | `it.json` | In progress: 49/1,232; English fallback |
| [ ] | Japanese | ja-JP | `ja.json` | Translation pending; English fallback |
| [ ] | Korean | ko-KR | `ko.json` | Translation pending; English fallback |
| [ ] | Kannada | kn-IN | `kn.json` | Translation pending; English fallback |
| [ ] | Kashmiri | ks-IN | `ks.json` | Translation pending; English fallback |
| [ ] | Konkani | kok-IN | `kok.json` | Translation pending; English fallback |
| [ ] | Maithili | mai-IN | `mai.json` | Translation pending; English fallback |
| [ ] | Malayalam | ml-IN | `ml.json` | Translation pending; English fallback |
| [ ] | Manipuri (Meitei) | mni-IN | `mni.json` | Translation pending; English fallback |
| [ ] | Marathi | mr-IN | `mr.json` | Translation pending; English fallback |
| [ ] | Malay | ms-MY | `ms.json` | Translation pending; English fallback |
| [ ] | Nepali | ne-NP | `ne.json` | Translation pending; English fallback |
| [ ] | Odia | or-IN | `or.json` | Translation pending; English fallback |
| [ ] | Persian | fa-IR | `fa.json` | Translation pending; English fallback |
| [ ] | Polish | pl-PL | `pl.json` | Translation pending; English fallback |
| [ ] | Portuguese (Brazil) | pt-BR | `pt.json` | Translation pending; English fallback |
| [ ] | Punjabi | pa-IN | `pa.json` | Translation pending; English fallback |
| [ ] | Russian | ru-RU | `ru.json` | Translation pending; English fallback |
| [ ] | Sanskrit | sa-IN | `sa.json` | Translation pending; English fallback |
| [ ] | Santali | sat-IN | `sat.json` | Translation pending; English fallback |
| [ ] | Sindhi | sd-IN | `sd.json` | Translation pending; English fallback |
| [ ] | Spanish | es-ES | `es.json` | In progress: 49/1,232; English fallback |
| [ ] | Swedish | sv-SE | `sv.json` | Translation pending; English fallback |
| [ ] | Swahili | sw-KE | `sw.json` | Translation pending; English fallback |
| [ ] | Tamil | ta-IN | `ta.json` | Translation pending; English fallback |
| [ ] | Telugu | te-IN | `te.json` | Translation pending; English fallback |
| [ ] | Thai | th-TH | `th.json` | Translation pending; English fallback |
| [ ] | Turkish | tr-TR | `tr.json` | Translation pending; English fallback |
| [ ] | Urdu | ur-PK | `ur.json` | Translation pending; English fallback |
| [ ] | Vietnamese | vi-VN | `vi.json` | Translation pending; English fallback |

`en.json` is the only source catalog for app-authored English copy. `registry.json` is the authoritative registry for all 45 options; `../i18n.ts`, profile validation, `LocaleField`, Expo's native locale list, and the additive supported-locales migration use those codes. English (`en-IN`) is the default and fallback. Any blank or missing value resolves to English, including while a locale is being translated. The onboarding and Settings picker is compact and searchable; each option shows its English language name followed by the native name in parentheses.

`registry.json` records each locale's catalog file, English and native names, direction, and translation status (`complete` or `partial`). Do not set a locale to `complete` until its catalog is fully translated and checked. Use `npm run i18n:check` for structural/placeholder validation and coverage reporting; `npm run i18n:check:complete` fails while any locale is partial.

## Localization quality rules

Translate the intended meaning, not the English sentence structure. Use natural
wording, familiar product terms, and the grammar and formality used in that
locale. A localized label or message may be shorter or longer than English;
keep it concise when the UI is a button, field label, status, or short hint, and
use a complete natural sentence when instructions or an error need more detail.
Do not remove safety, financial, access, date-range, or permission meaning just
to fit a length target. Preserve every `{placeholder}` exactly, and adapt the
surrounding sentence so that the placeholder reads naturally in that language.
Keep codes, units, amounts, and user-provided values intact unless that locale's
formatting rules explicitly require a display-format change.

## Verified catalog coverage

Catalog coverage is calculated by `npm run i18n:check` against the current
English source, so it cannot silently become stale when keys change. All locale
drafts must retain the same domain/key shape. Registered partial catalogs use
English fallback; unregistered drafts are never loaded by the app.

## Editing workflow

### Add, edit, remove, or rename a key

1. Add the semantic key to the appropriate domain in `en.json`. Keep key names
   stable and avoid using the English sentence itself as a key.
2. Add the corresponding key to every locale JSON with a natural translation.
   Preserve every `{placeholder}` exactly; do not translate user values, IDs,
   units, API values, or product names.
3. For work in progress, use an empty string only in a locale marked `partial`.
   Empty or missing text displays English at runtime. Never mark an incomplete
   catalog complete to silence validation.
4. Remove or rename a key in English and every locale in the same change. Run
   both i18n checks and relevant app checks before merging.

### Add, enable, disable, or remove a locale

1. Copy the English key shape into a new locale JSON and set root metadata:
   `_locale`, `_fallback: "en-IN"`, and an accurate `_status`. Metadata is
   ignored as translation content.
2. Add its static JSON import to `catalogs.ts` and an entry to `registry.json`
   with its native name, locale code, catalog filename, direction, and
   `partial` status. Every registered locale appears in onboarding and Settings,
   even while translation is in progress; blank strings use English fallback.
3. Translate every English key, preserve interpolation placeholders, and run
   `npm run i18n:check`. Mark the registry entry `complete` only after the
   catalog is fully translated and reviewed. Once it is registered, completed
   translations work through the existing runtime without additional UI wiring.
4. Add the language to Expo's `supportedLocales` in `app.config.ts`. Update the
   profile locale allowlist on the backend with an additive migration, and keep
   old profile values safely mapped if a locale is retired.
5. Disabling a locale means removing it from the registry and native locale
   config and adding a migration to deactivate its server allowlist entry. Do
   not delete historical catalogs or rewrite saved profile values casually.
6. RTL locales are listed and selectable, but app-level RTL layout is not
   implemented yet. Before treating Arabic, Hebrew, Persian, Kashmiri, Sindhi,
   or Urdu as release-ready, apply native/web direction at startup and check
   screens, navigation, icons, date pickers, and mixed-direction identifiers
   on devices. Registry direction metadata alone does not flip the app layout.

### Add or remove a domain section

Add the section to English and all catalogs together, or remove it from all of
them in one change. Use domain names such as `fuel`, `expenses`, or `members`;
do not put metadata or translator notes inside a domain. Keep runtime metadata
in `registry.json` and documented root fields only. `npm run i18n:check` catches
missing/extra paths and placeholder drift.

### Validation and release gate

- `npm run i18n:check`: JSON parse, catalog key parity, non-empty English,
  placeholder parity for translated strings, registry metadata, and translation
  coverage reporting.
- `npm run i18n:check:complete`: the same checks plus failure if any registered
  locale is partial or contains blank entries.
- `npm run typecheck`, `npm run lint`, and `npm test`: app checks.
- Manually inspect representative screens and verify date/number/currency
  formatting and RTL layout on supported devices before release.

Incomplete catalogs are allowed during development only when their registry
status is `partial`; they must be clearly described in Settings and must never
be called complete or reviewed. English fallback is a recovery behavior, not a
replacement for completing translations.
