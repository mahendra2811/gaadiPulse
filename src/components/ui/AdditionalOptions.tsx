import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { Expandable } from "./premium";
export function AdditionalOptions({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: c.surface,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("additionalOptions")}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 52,
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Ionicons name="options-outline" size={19} color={c.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.ink }}>
            {t("additionalOptions")}
          </Text>
          <Text style={{ fontSize: 11, color: c.muted }}>
            {t("additionalOptionsHint")}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={17}
          color={c.muted}
        />
      </Pressable>
      <Expandable expanded={open}>
        <View style={{ padding: 14, paddingTop: 4, gap: 14 }}>{children}</View>
      </Expandable>
    </View>
  );
}
