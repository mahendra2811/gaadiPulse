# Locale catalogs

This directory contains 45 catalog files: the English source and 44 locale drafts. Only the locales in `registry.json` are enabled in the app. English is complete; Hindi is runtime-enabled with explicitly partial coverage and English fallback. The other 43 locale drafts are not selectable and remain untranslated.

| Language             | Locale | File       | Status                                       |
| -------------------- | ------ | ---------- | -------------------------------------------- |
| Arabic               | ar-SA  | `ar.json`  | Schema aligned; translation pending          |
| Assamese             | as-IN  | `as.json`  | Schema aligned; translation pending          |
| Bengali              | bn-IN  | `bn.json`  | Schema aligned; translation pending          |
| Bodo                 | brx-IN | `brx.json` | Schema aligned; translation pending          |
| Chinese (Simplified) | zh-CN  | `zh.json`  | Schema aligned; translation pending          |
| Dogri                | doi-IN | `doi.json` | Schema aligned; translation pending          |
| Dutch                | nl-NL  | `nl.json`  | Schema aligned; translation pending          |
| English (India)      | en-IN  | `en.json`  | Complete canonical source; grouped by domain |
| Filipino             | fil-PH | `fil.json` | Schema aligned; translation pending          |
| French               | fr-FR  | `fr.json`  | Schema aligned; translation pending          |
| German               | de-DE  | `de.json`  | Schema aligned; translation pending          |
| Gujarati             | gu-IN  | `gu.json`  | Schema aligned; translation pending          |
| Hebrew               | he-IL  | `he.json`  | Schema aligned; translation pending          |
| Hindi                | hi-IN  | `hi.json`  | Partial; blank entries fall back to English  |
| Indonesian           | id-ID  | `id.json`  | Schema aligned; translation pending          |
| Italian              | it-IT  | `it.json`  | Schema aligned; translation pending          |
| Japanese             | ja-JP  | `ja.json`  | Schema aligned; translation pending          |
| Korean               | ko-KR  | `ko.json`  | Schema aligned; translation pending          |
| Kannada              | kn-IN  | `kn.json`  | Schema aligned; translation pending          |
| Kashmiri             | ks-IN  | `ks.json`  | Schema aligned; translation pending          |
| Konkani              | kok-IN | `kok.json` | Schema aligned; translation pending          |
| Maithili             | mai-IN | `mai.json` | Schema aligned; translation pending          |
| Malayalam            | ml-IN  | `ml.json`  | Schema aligned; translation pending          |
| Manipuri (Meitei)    | mni-IN | `mni.json` | Schema aligned; translation pending          |
| Marathi              | mr-IN  | `mr.json`  | Schema aligned; translation pending          |
| Malay                | ms-MY  | `ms.json`  | Schema aligned; translation pending          |
| Nepali               | ne-NP  | `ne.json`  | Schema aligned; translation pending          |
| Odia                 | or-IN  | `or.json`  | Schema aligned; translation pending          |
| Persian              | fa-IR  | `fa.json`  | Schema aligned; translation pending          |
| Polish               | pl-PL  | `pl.json`  | Schema aligned; translation pending          |
| Portuguese (Brazil)  | pt-BR  | `pt.json`  | Schema aligned; translation pending          |
| Punjabi              | pa-IN  | `pa.json`  | Schema aligned; translation pending          |
| Russian              | ru-RU  | `ru.json`  | Schema aligned; translation pending          |
| Sanskrit             | sa-IN  | `sa.json`  | Schema aligned; translation pending          |
| Santali              | sat-IN | `sat.json` | Schema aligned; translation pending          |
| Sindhi               | sd-IN  | `sd.json`  | Schema aligned; translation pending          |
| Spanish              | es-ES  | `es.json`  | Schema aligned; translation pending          |
| Swedish              | sv-SE  | `sv.json`  | Schema aligned; translation pending          |
| Swahili              | sw-KE  | `sw.json`  | Schema aligned; translation pending          |
| Tamil                | ta-IN  | `ta.json`  | Schema aligned; translation pending          |
| Telugu               | te-IN  | `te.json`  | Schema aligned; translation pending          |
| Thai                 | th-TH  | `th.json`  | Schema aligned; translation pending          |
| Turkish              | tr-TR  | `tr.json`  | Schema aligned; translation pending          |
| Urdu                 | ur-PK  | `ur.json`  | Schema aligned; translation pending          |
| Vietnamese           | vi-VN  | `vi.json`  | Schema aligned; translation pending          |

`en.json` is the only source catalog for app-authored English copy. `registry.json` is the authoritative app locale registry; `../i18n.ts` uses it for supported locale codes and `LocaleField` uses it for the settings picker. Profile validation derives its accepted locale values from the same registry. English (`en-IN`) is the default and fallback. Hindi (`hi-IN`) remains selectable as a partial translation; a blank or missing value resolves to English. Its picker hint tells users that some copy remains English. The other 43 locale files are drafts only and are not registered or selectable.

`registry.json` records each enabled locale's catalog file, translated display-name key, native name, direction, and translation status (`complete` or `partial`). Do not set a locale to `complete` until its catalog is fully translated and linguistically reviewed. Use `npm run i18n:check` for structural/placeholder validation and coverage reporting; `npm run i18n:check:complete` fails while any registered locale is partial.

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
2. Import the JSON file in `../i18n.ts` and add it to the `importedCatalogs`
   file map. Translate and validate the catalog. Add it to `registry.json` only
   when it is appropriate to expose in Settings. Set the display `labelKey`, native
   name, and correct `ltr`/`rtl` direction.
3. Add the language to Expo's `supportedLocales` in `app.config.ts`. Update the
   profile locale allowlist on the backend with an additive migration, and
   keep old profile values safely mapped if a locale is retired.
4. Disabling a locale means removing it from the registry and native locale
   config and adding a migration to deactivate its server allowlist entry. Do
   not delete historical catalogs or rewrite saved profile values casually.
5. RTL enablement also requires applying native/web direction at startup and
   checking screens, navigation, icons, date pickers, and mixed-direction
   identifiers on a device. The current enabled locales are both LTR; merely
   setting `direction: "rtl"` is not sufficient to ship an RTL locale.

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
