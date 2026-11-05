import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { AppText } from "./index";

export function InlineSelect<T extends string>({
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
        onPress={() => setOpen((current) => !current)}
        style={{
          minHeight: 52,
          paddingHorizontal: 14,
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
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={c.muted}
        />
      </Pressable>
      {open && !disabled && (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{
            maxHeight: 240,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 14,
            backgroundColor: c.surface,
          }}
          accessibilityRole="radiogroup"
        >
          {options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: option.value === value }}
              onPress={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor:
                  pressed || option.value === value ? c.background : c.surface,
              })}
            >
              <Text style={{ flex: 1, color: c.ink, fontSize: 15 }}>
                {option.label}
              </Text>
              {option.value === value && (
                <Ionicons name="checkmark" size={20} color={c.primary} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
