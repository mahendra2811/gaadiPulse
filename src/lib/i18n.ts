import enCatalog from "./i18n/locales/en.json";
import localeRegistry from "./i18n/locales/registry.json";
import { importedCatalogs } from "./i18n/locales/catalogs";

export const en = enCatalog;
type CatalogSection = keyof typeof en;
type CatalogKey<Section extends CatalogSection> = Extract<
  keyof (typeof en)[Section],
  string
>;
type CatalogLeafKey = {
  [Section in CatalogSection]: CatalogKey<Section>;
}[CatalogSection];
type CatalogPath = {
  [Section in CatalogSection]: `${Section}.${CatalogKey<Section>}`;
}[CatalogSection];
export type TranslationKey = CatalogLeafKey | CatalogPath;
export const supportedLocales = Object.keys(
  localeRegistry,
) as (keyof typeof localeRegistry)[];
export type SupportedLocale = keyof typeof localeRegistry;
export const localeOptions = Object.entries(localeRegistry).map(
  ([code, metadata]) => ({
    code: code as SupportedLocale,
    ...metadata,
  }),
);
const localeCatalogs = Object.fromEntries(
  Object.entries(localeRegistry).map(([code, metadata]) => {
    const catalog =
      importedCatalogs[metadata.file as keyof typeof importedCatalogs];
    if (!catalog)
      throw new Error(`Locale catalog is not imported: ${metadata.file}`);
    return [code, catalog];
  }),
) as unknown as Record<SupportedLocale, Readonly<Record<string, unknown>>>;

let activeLocale: SupportedLocale = "en-IN";
const localeListeners = new Set<() => void>();
export function getLocale(): SupportedLocale {
  return activeLocale;
}
export function getLocaleDirection(locale: string = activeLocale) {
  if (!supportedLocales.includes(locale as SupportedLocale)) return "ltr";
  return localeRegistry[locale as SupportedLocale].direction;
}
export function formatDate(
  value: Date,
  options: Intl.DateTimeFormatOptions = {},
  timeZone?: string,
) {
  return new Intl.DateTimeFormat(activeLocale, {
    ...options,
    ...(timeZone ? { timeZone } : {}),
  }).format(value);
}
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat(activeLocale, options).format(value);
}
export function setLocale(locale: string) {
  const next: SupportedLocale = supportedLocales.includes(
    locale as SupportedLocale,
  )
    ? (locale as SupportedLocale)
    : "en-IN";
  if (next === activeLocale) return;
  activeLocale = next;
  localeListeners.forEach((listener) => listener());
}
export function subscribeLocale(listener: () => void) {
  localeListeners.add(listener);
  return () => localeListeners.delete(listener);
}

function catalogText(catalog: unknown, key: string): string | undefined {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog))
    return undefined;
  const root = catalog as Record<string, unknown>;
  const parts = key.split(".");

  if (parts.length > 1) {
    let value: unknown = root;
    for (const part of parts) {
      if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return typeof value === "string" ? value : undefined;
  }

  for (const section of Object.values(root)) {
    if (!section || typeof section !== "object" || Array.isArray(section))
      continue;
    const value = (section as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

export function t(key: TranslationKey): string {
  const keyText = String(key);
  const translated = localeCatalogs[activeLocale]?.[String(key)];
  const localized =
    catalogText(localeCatalogs[activeLocale], keyText) ??
    (typeof translated === "string" ? translated : undefined);
  if (localized && localized.trim().length > 0) return localized;
  const english = catalogText(en, keyText);
  if (english && english.trim().length > 0) return english;
  return keyText;
}
