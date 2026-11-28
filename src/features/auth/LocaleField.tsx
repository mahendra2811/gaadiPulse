import { SearchPickerField } from "@/src/components/ui/SearchPickerField";
import { localeOptions, t, type SupportedLocale } from "@/src/lib/i18n";

export function LocaleField({
  value,
  onChange,
  disabled,
}: {
  value: SupportedLocale;
  onChange: (value: SupportedLocale) => void;
  disabled: boolean;
}) {
  const selected = localeOptions.find((option) => option.code === value);
  return (
    <SearchPickerField
      label={t("language")}
      value={value}
      valueLabel={
        selected ? `${selected.englishName} (${selected.nativeName})` : ""
      }
      options={localeOptions.map(({ code, englishName, nativeName }) => ({
        value: code,
        label: `${englishName} (${nativeName})`,
      }))}
      onChange={(next) => onChange(next as SupportedLocale)}
      disabled={disabled}
      searchLabel={t("languageSearch")}
      emptyLabel={t("languageNoResults")}
    />
  );
}
