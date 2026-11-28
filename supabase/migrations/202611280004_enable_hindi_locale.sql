-- Hindi catalog is enabled with runtime English fallback for untranslated keys.
update public.supported_locales
set active = true, catalog_version = '2026-11-hi-1'
where code = 'hi-IN';
