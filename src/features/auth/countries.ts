import countries from "./data/countries.json";
type ProfileCountry = { code: string; name: string };

// GaadiPulse is India-first: keep India at the top of the onboarding picker
// while retaining the full server-validated country catalog.
const india = (countries as ProfileCountry[]).find(
  (country) => country.code === "IN",
);
export const profileCountries: readonly ProfileCountry[] = india
  ? [
      india,
      ...(countries as ProfileCountry[]).filter((country) => country !== india),
    ]
  : countries;
export function isProfileCountry(code: string) {
  return profileCountries.some((country) => country.code === code);
}
export function profileCountryLabel(code: string | null) {
  return (
    profileCountries.find((country) => country.code === code)?.name ??
    code ??
    ""
  );
}
