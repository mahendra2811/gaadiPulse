import countries from "./data/countries.json";
export const profileCountries: readonly { code: string; name: string }[] =
  countries;
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
