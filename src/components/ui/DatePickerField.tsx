import { useState, type ComponentType, type ComponentProps } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { fieldDate, formatDateValue, type DateFieldProps } from "./dateValues";
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
  const [pickerError, setPickerError] = useState("");
  const [Picker, setPicker] = useState<ComponentType<
    ComponentProps<typeof import("@react-native-community/datetimepicker").default>
  > | null>(null);
  const [iosMode, setIosMode] = useState<"date" | "time">("date");
  const [draft, setDraft] = useState(() => fieldDate(value, mode));
  const choose = async (part: "date" | "time") => {
    setPickerError("");
    try {
      const module = await import("@react-native-community/datetimepicker");
      const current = fieldDate(value, mode);
      if (Platform.OS === "android")
        module.DateTimePickerAndroid.open({
          value: current,
          mode: part,
          display: part === "date" ? "calendar" : "clock",
          maximumDate: part === "date" && !allowFuture ? new Date() : undefined,
          onChange: (event: DateTimePickerEvent, date?: Date) => {
            if (event.type !== "set" || !date) return;
            const next = new Date(current);
            if (part === "date")
              next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
            else next.setHours(date.getHours(), date.getMinutes(), 0, 0);
            onChange(formatDateValue(next, mode));
          },
        });
      else {
        setDraft(current);
        setIosMode(part);
        setPicker(() => module.default);
      }
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : String(e));
    }
  };
  const current = fieldDate(value, mode);
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: "600" }}>
        {label}
        {required ? " *" : optional ? ` (${t("optionalField")})` : ""}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {(["date", "time"] as const)
          .filter((part) => mode === "datetime" || mode === part)
          .map((part) => (
            <Pressable
              key={part}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${t(part === "date" ? "uiPickDate" : "uiPickTime")}`}
              onPress={() => void choose(part)}
              style={({ pressed }) => ({
                flexBasis: part === "date" ? "52%" : "35%",
                flexGrow: 1,
                minWidth: 120,
                minHeight: 52,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: error ? c.danger : c.line,
                backgroundColor: c.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons
                name={part === "date" ? "calendar-outline" : "time-outline"}
                size={21}
                color={part === "date" ? c.primary : "#8C65CA"}
              />
              <Text style={{ color: c.ink, fontSize: 14, flex: 1 }}>
                {value
                  ? part === "date"
                    ? current.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : current.toLocaleTimeString("en-US", {
                        hour12: true,
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                  : t(part === "date" ? "uiPickDate" : "uiPickTime")}
              </Text>
            </Pressable>
          ))}
      </View>
      {!!(error || pickerError) && (
        <Text accessibilityRole="alert" style={{ color: c.danger, fontSize: 13 }}>
          {error || pickerError}
        </Text>
      )}
      {Picker && (
        <Modal transparent animationType="fade" onRequestClose={() => setPicker(null)}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              padding: 20,
              backgroundColor: "#0008",
            }}
          >
            <View
              style={{
                padding: 18,
                gap: 14,
                borderRadius: 24,
                backgroundColor: c.surface,
              }}
            >
              <Text style={{ color: c.ink, fontWeight: "700", fontSize: 17 }}>{label}</Text>
              <Picker
                value={draft}
                mode={iosMode}
                display="spinner"
                maximumDate={iosMode === "date" && !allowFuture ? new Date() : undefined}
                onChange={(_, date) => {
                  if (date) setDraft(date);
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 16,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPicker(null)}
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    padding: 10,
                  }}
                >
                  <Text style={{ color: c.muted }}>{t("cancel")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(formatDateValue(draft, mode));
                    setPicker(null);
                  }}
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    padding: 10,
                  }}
                >
                  <Text style={{ color: c.primary, fontWeight: "700" }}>{t("uiDone")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
