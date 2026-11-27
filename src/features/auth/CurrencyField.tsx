import { SearchPickerField } from "@/src/components/ui/SearchPickerField";
import { t } from "@/src/lib/i18n";
import {
  currencyOptions,
  currencyLabel,
  type CurrencyCode,
} from "@/src/utils/currency";

export function CurrencyField({
  value,
  onChange,
  disabled,
}: {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  disabled: boolean;
}) {
  return (
    <SearchPickerField
      label={t("currency")}
      value={value}
      valueLabel={currencyLabel(value)}
      options={currencyOptions.map((currency) => ({
        value: currency.code,
        label: currency.name,
        detail: `${currency.code} · ${currency.symbol}`,
      }))}
      onChange={(next) => onChange(next as CurrencyCode)}
      disabled={disabled}
      searchLabel={t("currency")}
      emptyLabel={t("currencyNoResults")}
    />
  );
}
