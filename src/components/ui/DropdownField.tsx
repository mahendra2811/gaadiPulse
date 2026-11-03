import { Popup } from "./Popup";
import { useState, type ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { AppText } from "./index";

function optionIcon(value: string): ComponentProps<typeof Ionicons>["name"] {
  if (value === "two_wheeler" || /motorcycle|scooter|moped/.test(value))
    return "bicycle-outline";
  if (value === "KM") return "speedometer-outline";
  if (value === "HOURS") return "time-outline";
  if (value === "BOTH") return "options-outline";
  if (value === "heavy_machinery" || value === "agricultural")
    return "construct-outline";
  return "car-outline";
}

export function DropdownField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const c = useTheme();
  const selected = options.find((option) => option.value === value);
  return (
    <View style={{ gap: 6 }}>
      <AppText>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? t("selectOption")}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 52,
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.surface,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Text style={{ flex: 1, color: c.ink, fontSize: 16 }}>
          {selected?.label ?? t("selectOption")}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>
      <Popup visible={open} onClose={() => setOpen(false)} title={label}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === value }}
            onPress={() => {
              onChange(option.value);
              setOpen(false);
            }}
            style={{
              minHeight: 64,
              padding: 14,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: 1,
              borderColor: option.value === value ? c.primary : c.line,
              backgroundColor:
                option.value === value ? c.background : c.surface,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: c.background,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={optionIcon(option.value)}
                size={22}
                color={c.primary}
              />
            </View>
            <Text
              style={{
                flex: 1,
                color: c.ink,
                fontSize: 16,
                fontWeight: option.value === value ? "600" : "400",
              }}
            >
              {option.label}
            </Text>
            <Ionicons
              name={
                option.value === value ? "checkmark-circle" : "ellipse-outline"
              }
              size={22}
              color={option.value === value ? c.primary : c.muted}
            />
          </Pressable>
        ))}
      </Popup>
    </View>
  );
}
