import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { PremiumAuthLayout } from "./PremiumAuth";

export function AuthLayout({
  title,
  subtitle,
  loading = false,
  children,
  onBack,
}: {
  title: string;
  subtitle: string;
  loading?: boolean;
  children: ReactNode;
  onBack?: () => void;
}) {
  return (
    <PremiumAuthLayout
      title={title}
      subtitle={subtitle}
      loading={loading}
      onBack={onBack}
    >
      {children}
    </PremiumAuthLayout>
  );
}
export function AuthLink({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 8,
        opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
      })}
    >
      <Text
        style={{
          color: c.primary,
          fontSize: 15,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function AuthDivider() {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      <Text style={{ color: c.muted, fontSize: 13 }}>{t("authOrEmail")}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
    </View>
  );
}
