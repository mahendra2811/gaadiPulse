import { SearchPickerField } from "@/src/components/ui/SearchPickerField";
import { t } from "@/src/lib/i18n";
import { profileCountries, profileCountryLabel } from "./countries";

export function CountryField({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
}) {
  return (
    <SearchPickerField
      label={t("profileCountry")}
      value={value ?? ""}
      valueLabel={profileCountryLabel(value)}
      options={profileCountries.map((country) => ({
        value: country.code,
        label: country.name,
      }))}
      onChange={(next) => onChange(next || null)}
      disabled={disabled}
      searchLabel={t("countrySearch")}
      emptyLabel={t("countryNoResults")}
      clearLabel={t("clearCountry")}
    />
  );
}
