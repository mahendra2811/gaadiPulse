import { SearchPickerField } from "@/src/components/ui/SearchPickerField";
import { useMemo } from "react";
import { t } from "@/src/lib/i18n";
import { availableTimezones, timezoneLabel } from "./timezone";

export function TimezoneField({
  value,
  onChange,
  disabled,
  error,
  account = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
  account?: boolean;
}) {
  const options = useMemo(
    () =>
      availableTimezones(value).map((zone) => ({
        value: zone,
        label: timezoneLabel(zone),
        detail: zone,
      })),
    [value],
  );

  return (
    <SearchPickerField
      label={t(account ? "accountTimezone" : "timezoneOptional")}
      value={value}
      valueLabel={timezoneLabel(value)}
      options={options}
      onChange={onChange}
      disabled={disabled}
      searchLabel={t("timezoneSearch")}
      emptyLabel={t("timezoneNoResults")}
      error={error}
    />
  );
}
