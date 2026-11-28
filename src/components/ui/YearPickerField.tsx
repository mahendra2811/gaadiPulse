import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Popup } from "./Popup";
import { AppText } from "./index";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";

const FIRST_YEAR = 1950;
const YEAR_ROW_HEIGHT = 48;
const YEARS = Array.from(
  { length: new Date().getFullYear() - FIRST_YEAR + 1 },
  (_, index) => String(new Date().getFullYear() - index),
);

export function YearPickerField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (year: string) => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const [visible, setVisible] = useState(false);
  const selectedIndex = YEARS.indexOf(value);

  useEffect(() => {
    if (!visible) return;
    const rowIndex = Math.max(0, selectedIndex) / 4;
    requestAnimationFrame(() =>
      list.current?.scrollTo({
        y: Math.floor(rowIndex) * YEAR_ROW_HEIGHT,
        animated: false,
      }),
    );
  }, [visible, selectedIndex]);

  return (
    <View style={{ gap: 6 }}>
      <AppText>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || t("selectOption")}`}
        accessibilityState={{ disabled, expanded: visible }}
        disabled={disabled}
        onPress={() => setVisible(true)}
        style={{
          minHeight: 56,
          paddingHorizontal: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          flexDirection: "row",
          alignItems: "center",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: value ? colors.ink : colors.muted,
            fontSize: 16,
          }}
        >
          {value || t("selectOption")}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Popup
        visible={visible}
        onClose={() => setVisible(false)}
        title={label}
        maxWidth={360}
      >
        <ScrollView
          ref={list}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={{ height: YEAR_ROW_HEIGHT * 6 }}
          contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}
        >
          {YEARS.map((year) => {
            const selected = year === value;
            return (
              <Pressable
                key={year}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onChange(year);
                  setVisible(false);
                }}
                style={{
                  width: "25%",
                  height: YEAR_ROW_HEIGHT,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    minWidth: 54,
                    minHeight: 56,
                    paddingHorizontal: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    backgroundColor: selected ? colors.primary : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.surface : colors.ink,
                      fontSize: 15,
                      fontWeight: selected ? "700" : "500",
                    }}
                  >
                    {year}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {!!value && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onChange("");
              setVisible(false);
            }}
            style={{
              minHeight: 56,
              justifyContent: "center",
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              {t("clearYear")}
            </Text>
          </Pressable>
        )}
      </Popup>
    </View>
  );
}
