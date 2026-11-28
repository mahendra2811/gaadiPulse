# Locale catalogs

This directory contains **45 locale catalogs**: English plus 44 non-English locales. English is the complete source catalog. Hindi has a partial translation; the other 43 non-English catalogs are structurally aligned and pending translation.

| Language             | Locale | File                  | Status                                                                             |
| -------------------- | ------ | --------------------- | ---------------------------------------------------------------------------------- |
| Arabic               | ar-SA  | `ar.json`             | Schema aligned; translation pending                                                |
| Assamese             | as-IN  | `as.json`             | Schema aligned; translation pending                                                |
| Bengali              | bn-IN  | `bn.json`             | Schema aligned; translation pending                                                |
| Bodo                 | brx-IN | `brx.json`            | Schema aligned; translation pending                                                |
| Chinese (Simplified) | zh-CN  | `zh.json`             | Schema aligned; translation pending                                                |
| Dogri                | doi-IN | `doi.json`            | Schema aligned; translation pending                                                |
| Dutch                | nl-NL  | `nl.json`             | Schema aligned; translation pending                                                |
| English (India)      | en-IN  | `en.json`, `en-IN.ts` | Complete 1,229-string source catalog; grouped by domain                            |
| Filipino             | fil-PH | `fil.json`            | Schema aligned; translation pending                                                |
| French               | fr-FR  | `fr.json`             | Schema aligned; translation pending                                                |
| German               | de-DE  | `de.json`             | Schema aligned; translation pending                                                |
| Gujarati             | gu-IN  | `gu.json`             | Schema aligned; translation pending                                                |
| Hebrew               | he-IL  | `he.json`             | Schema aligned; translation pending                                                |
| Hindi                | hi-IN  | `hi.json`, `hi-IN.ts` | 117 source translations retained; remaining entries blank and fall back to English |
| Indonesian           | id-ID  | `id.json`             | Schema aligned; translation pending                                                |
| Italian              | it-IT  | `it.json`             | Schema aligned; translation pending                                                |
| Japanese             | ja-JP  | `ja.json`             | Schema aligned; translation pending                                                |
| Korean               | ko-KR  | `ko.json`             | Schema aligned; translation pending                                                |
| Kannada              | kn-IN  | `kn.json`             | Schema aligned; translation pending                                                |
| Kashmiri             | ks-IN  | `ks.json`             | Schema aligned; translation pending                                                |
| Konkani              | kok-IN | `kok.json`            | Schema aligned; translation pending                                                |
| Maithili             | mai-IN | `mai.json`            | Schema aligned; translation pending                                                |
| Malayalam            | ml-IN  | `ml.json`             | Schema aligned; translation pending                                                |
| Manipuri (Meitei)    | mni-IN | `mni.json`            | Schema aligned; translation pending                                                |
| Marathi              | mr-IN  | `mr.json`             | Schema aligned; translation pending                                                |
| Malay                | ms-MY  | `ms.json`             | Schema aligned; translation pending                                                |
| Nepali               | ne-NP  | `ne.json`             | Schema aligned; translation pending                                                |
| Odia                 | or-IN  | `or.json`             | Schema aligned; translation pending                                                |
| Persian              | fa-IR  | `fa.json`             | Schema aligned; translation pending                                                |
| Polish               | pl-PL  | `pl.json`             | Schema aligned; translation pending                                                |
| Portuguese (Brazil)  | pt-BR  | `pt.json`             | Schema aligned; translation pending                                                |
| Punjabi              | pa-IN  | `pa.json`             | Schema aligned; translation pending                                                |
| Russian              | ru-RU  | `ru.json`             | Schema aligned; translation pending                                                |
| Sanskrit             | sa-IN  | `sa.json`             | Schema aligned; translation pending                                                |
| Santali              | sat-IN | `sat.json`            | Schema aligned; translation pending                                                |
| Sindhi               | sd-IN  | `sd.json`             | Schema aligned; translation pending                                                |
| Spanish              | es-ES  | `es.json`             | Schema aligned; translation pending                                                |
| Swedish              | sv-SE  | `sv.json`             | Schema aligned; translation pending                                                |
| Swahili              | sw-KE  | `sw.json`             | Schema aligned; translation pending                                                |
| Tamil                | ta-IN  | `ta.json`             | Schema aligned; translation pending                                                |
| Telugu               | te-IN  | `te.json`             | Schema aligned; translation pending                                                |
| Thai                 | th-TH  | `th.json`             | Schema aligned; translation pending                                                |
| Turkish              | tr-TR  | `tr.json`             | Schema aligned; translation pending                                                |
| Urdu                 | ur-PK  | `ur.json`             | Schema aligned; translation pending                                                |
| Vietnamese           | vi-VN  | `vi.json`             | Schema aligned; translation pending                                                |

`en.json` is the source catalog for app-authored English copy. Runtime lookup and locale selection are in `../i18n.ts`. English (`en-IN`) is the default and fallback language. Hindi (`hi-IN`) is selectable but incomplete; absent or blank translations fall back to English. Other locale JSON files now share the same grouped key structure, but remain unregistered and untranslated.

To enable another language, complete and review its catalog, preserve interpolation placeholders, register it in `localeCatalogs` and `supportedLocales`, then update the profile schema and app locale configuration together. Do not enable unfinished catalogs. Keep English fallback for missing or blank translations.

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

The English source contains 1,229 leaf strings, grouped by app domain plus the
`records` and `validation` groups. Every locale JSON now has the same 1,229-key
shape. Hindi retains 117 existing translated source entries (137 populated
slots after identical shared labels are mapped); the other 43 non-English
catalogs have blank translation values. Blank values fall back to English.
These catalogs are structurally ready, not complete translations, and must not
be marked reviewed or enabled. Unsupported locale codes resolve to English.
