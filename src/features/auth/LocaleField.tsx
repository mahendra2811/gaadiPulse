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
  const enabledLocales = new Set(["en-IN", "hi-IN"]);
  const orderedLocales = [
    ...localeOptions.filter((option) => enabledLocales.has(option.code)),
    ...localeOptions.filter((option) => !enabledLocales.has(option.code)),
  ];
  const selected = orderedLocales.find((option) => option.code === value);
  return (
    <SearchPickerField
      label={t("language")}
      value={value}
      valueLabel={
        selected ? `${selected.englishName} (${selected.nativeName})` : ""
      }
      options={orderedLocales.map(({ code, englishName, nativeName }) => ({
        value: code,
        label: `${englishName} (${nativeName})`,
        disabled: !enabledLocales.has(code),
      }))}
      onChange={(next) => onChange(next as SupportedLocale)}
      disabled={disabled}
      searchLabel={t("languageSearch")}
      emptyLabel={t("languageNoResults")}
    />
  );
}
