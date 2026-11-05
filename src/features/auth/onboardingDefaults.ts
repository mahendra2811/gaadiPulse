import countryZones from "./data/country-timezones.json";
import { isProfileCountry } from "./countries";
import { defaultVehicleTimezone } from "@/src/features/garage/timezone";

export function validTimezone(zone: string | undefined): zone is string {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
    return true;
  } catch {
    return false;
  }
}
export function localeCountry(locale: string): string | null {
  try {
    const region = new Intl.Locale(locale).region;
    return region && isProfileCountry(region) ? region : null;
  } catch {
    return null;
  }
}
export function singleCountryTimezone(country: string | null): string | null {
  if (!country) return null;
  const zones = (countryZones as Record<string, string[]>)[country] ?? [];
  return zones.length === 1 && validTimezone(zones[0]) ? zones[0] : null;
}
export function onboardingDefaults(
  locale: string,
  deviceZone: string | undefined,
) {
  const country = localeCountry(locale);
  return {
    country,
    timezone:
      singleCountryTimezone(country) ??
      (validTimezone(deviceZone) ? deviceZone : defaultVehicleTimezone),
  };
}
export function timezoneAfterCountryChange(
  country: string | null,
  current: string,
  manuallyChanged: boolean,
) {
  return manuallyChanged
    ? current
    : (singleCountryTimezone(country) ?? current);
}
