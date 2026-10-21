import { View } from "react-native";
import { AppText, Card, InputField } from "./index";
import { t } from "@/src/lib/i18n";
import type { ReactNode } from "react";
export function NumberField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <InputField
      label={label}
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      error={error}
    />
  );
}
export function MoneyField({
  label,
  paise,
  onChange,
}: {
  label: string;
  paise: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <NumberField
      label={label}
      value={paise === null ? "" : (paise / 100).toFixed(2)}
      onChange={(value) => {
        if (value === "") onChange(null);
        else if (/^\d+(\.\d{0,2})?$/.test(value))
          onChange(Math.round(Number(value) * 100));
      }}
    />
  );
}
export function DateTimeInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <InputField
      label={t("observed")}
      value={value}
      onChangeText={onChange}
      error={error}
      autoCapitalize="none"
    />
  );
}
export function MeterFields({
  mode,
  km,
  hours,
  onKm,
  onHours,
}: {
  mode: "KM" | "HOURS" | "BOTH";
  km: string;
  hours: string;
  onKm: (v: string) => void;
  onHours: (v: string) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      {mode !== "HOURS" && (
        <NumberField label={t("km")} value={km} onChange={onKm} />
      )}
      {mode !== "KM" && (
        <NumberField label={t("hours")} value={hours} onChange={onHours} />
      )}
    </View>
  );
}
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <AppText large>{title}</AppText>
      {children}
    </Card>
  );
}
export function PermissionGate({
  allowed,
  children,
  fallback,
}: {
  allowed: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return allowed ? (
    <>{children}</>
  ) : (
    <>{fallback ?? <AppText>{t("denied")}</AppText>}</>
  );
}
