import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Popup } from "./Popup";
import { AppText } from "./index";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";

export type SearchPickerOption = {
  value: string;
  label: string;
  detail?: string;
};

export function SearchPickerField({
  label,
  value,
  valueLabel,
  options,
  onChange,
  disabled = false,
  searchLabel,
  emptyLabel,
  clearLabel,
  error,
}: {
  label: string;
  value: string;
  valueLabel: string;
  options: readonly SearchPickerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchLabel: string;
  emptyLabel: string;
  clearLabel?: string;
  error?: string;
}) {
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLowerCase();
  const filtered = options.filter((option) =>
    `${option.label} ${option.value} ${option.detail ?? ""}`
      .toLowerCase()
      .includes(normalized),
  );

  return (
    <View style={{ gap: 6 }}>
      <AppText>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${valueLabel || t("selectOption")}`}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
        style={{
          minHeight: 52,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          gap: 10,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: valueLabel ? colors.ink : colors.muted,
            fontSize: 16,
          }}
        >
          {valueLabel || t("selectOption")}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}
      <Popup visible={open} onClose={() => setOpen(false)} title={label}>
        <TextInput
          autoFocus
          accessibilityLabel={searchLabel}
          value={search}
          onChangeText={setSearch}
          placeholder={searchLabel}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            minHeight: 52,
            paddingHorizontal: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.line,
            color: colors.ink,
            backgroundColor: colors.surface,
            fontSize: 16,
          }}
        />
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
          style={{ maxHeight: 360 }}
        >
          {clearLabel && value !== "" && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onChange("");
                setOpen(false);
              }}
              style={{
                minHeight: 52,
                justifyContent: "center",
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: colors.primary }}>{clearLabel}</Text>
            </Pressable>
          )}
          {!filtered.length && (
            <Text style={{ color: colors.muted, padding: 14 }}>
              {emptyLabel}
            </Text>
          )}
          {filtered.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  minHeight: 56,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: selected
                    ? colors.background
                    : colors.surface,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontSize: 15 }}>
                    {option.label}
                  </Text>
                  {!!option.detail && (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {option.detail}
                    </Text>
                  )}
                </View>
                {selected && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </Popup>
    </View>
  );
}
