# Locale catalog scaffolding

The app currently configures English (`en-IN`) only. `en.json` and the locale
JSON files are reserved key-compatible catalogs for later translation work.
Each non-English file intentionally contains only fallback metadata and is not
enabled in Expo, the profile schema, or the `supported_locales` active set.

When a translation is reviewed, add the same keys as the English catalog,
change its status to `reviewed`, then enable the locale in the app config,
profile schema and the reference-data migration together. Missing keys must
continue to fall back to English.
