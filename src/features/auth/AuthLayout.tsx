import type { ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { LoadingLine } from "@/src/components/ui";
import { GradientSurface } from "@/src/components/ui/GradientSurface";
import { artwork } from "@/src/lib/assets";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";

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
  const c = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <LoadingLine loading={loading} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 460,
              alignSelf: "center",
              gap: 24,
              paddingVertical: 12,
            }}
          >
            <GradientSurface style={{ padding: 24, gap: 16 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Image
                  source={artwork.logo}
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 24,
                      fontWeight: "700",
                    }}
                  >
                    {t("app")}
                  </Text>
                  <Text
                    style={{ color: "#D6F5EA", fontSize: 13, lineHeight: 20 }}
                  >
                    {t("authTagline")}
                  </Text>
                </View>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#D6F5EA"
                />
                <Text style={{ color: "#D6F5EA", fontSize: 14, flex: 1 }}>
                  {t("authBrandHint")}
                </Text>
              </View>
            </GradientSurface>
            <View style={{ gap: 8 }}>
              {onBack && (
                <AuthLink
                  label={t("back")}
                  onPress={onBack}
                  disabled={loading}
                />
              )}
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: 30,
                  lineHeight: 38,
                  fontWeight: "700",
                  color: c.ink,
                }}
              >
                {title}
              </Text>
              <Text style={{ color: c.muted, fontSize: 16, lineHeight: 24 }}>
                {subtitle}
              </Text>
            </View>
            <View
              style={{
                padding: 20,
                borderRadius: 24,
                backgroundColor: c.surface,
                borderColor: c.line,
                borderWidth: 1,
                gap: 18,
              }}
            >
              {children}
            </View>
            <AuthLink
              label={t("legal")}
              onPress={() => router.push("/auth/legal")}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
