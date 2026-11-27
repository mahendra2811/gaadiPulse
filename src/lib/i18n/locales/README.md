# Locale catalog scaffolding

The app currently configures English (`en-IN`) only. `en.json` and the locale
JSON files are catalogs for translation work. Hindi (`hi.json`) now contains an
initial set of translated strings, but is incomplete and remains disabled in
Expo, the profile schema, and the `supported_locales` active set. Other
non-English catalogs are placeholders unless they contain translated strings.

Before enabling a locale, translate and review every key in `i18n.ts`, keep
interpolation placeholders intact, change its status to `reviewed`, then enable
the locale in the app config, profile schema and the reference-data migration
together. Missing keys must continue to fall back to English.
