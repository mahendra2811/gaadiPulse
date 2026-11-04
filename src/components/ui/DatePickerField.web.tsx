import { createElement, type ChangeEvent } from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme, palettes } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import {
  fieldDate,
  localDate,
  localTime,
  type DateFieldProps,
} from "./dateValues";
export function DatePickerField({
  value,
  onChange,
  error,
  label = t("observed"),
  allowFuture = false,
  mode = "datetime",
  required,
  optional,
}: DateFieldProps) {
  const c = useTheme();
  const current = fieldDate(value, mode);
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: "600" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {(["date", "time"] as const)
          .filter((part) => mode === "datetime" || mode === part)
          .map((part) => (
            <View
              key={part}
              style={{
                flexBasis: part === "date" ? "52%" : "35%",
                flexGrow: 1,
                minWidth: 120,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                minHeight: 50,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: error ? c.danger : c.line,
                backgroundColor: c.surface,
              }}
            >
              <Ionicons
                name={part === "date" ? "calendar-outline" : "time-outline"}
                size={20}
                color={part === "date" ? c.primary : "#8C65CA"}
              />
              {createElement("input", {
                type: part,
                "aria-label": `${label}: ${t(part === "date" ? "uiDate" : "uiTime")}`,
                value: !value
                  ? ""
                  : part === "date"
                    ? localDate(current)
                    : localTime(current),
                max:
                  part === "date" && !allowFuture
                    ? localDate(new Date())
                    : undefined,
                onChange: (event: ChangeEvent<HTMLInputElement>) => {
                  const next = event.target.value;
                  if (!next) {
                    onChange("");
                    return;
                  }
                  if (mode === part) {
                    onChange(next);
                    return;
                  }
                  const date = new Date(
                    `${part === "date" ? next : localDate(current)}T${part === "time" ? next : localTime(current)}:00`,
                  );
                  if (Number.isFinite(date.getTime()))
                    onChange(date.toISOString());
                },
                style: {
                  fontFamily: "inherit",
                  fontSize: 14,
                  color: c.ink,
                  colorScheme:
                    c.background === palettes.dark.background
                      ? "dark"
                      : "light",
                  background: "transparent",
                  border: 0,

                  width: "100%",
                  minWidth: 0,
                  minHeight: 48,
                },
              })}
            </View>
          ))}
      </View>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.danger, fontSize: 13 }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
