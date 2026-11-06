import { useState, type ReactNode, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Svg, Path } from "react-native-svg";
import { router } from "expo-router";
import { LoadingLine } from "@/src/components/ui";
import { GradientSurface } from "@/src/components/ui/GradientSurface";
import { artwork } from "@/src/lib/assets";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";

const hero = require("@/assets/images/auth/gaadipulse-auth-hero.png");
type IconName = ComponentProps<typeof Ionicons>["name"];
export function PremiumAuthLayout({
  title,
  subtitle,
  loading,
  children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  children: ReactNode;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const features: { label: string; icon: IconName }[] = [
    { label: t("authFuelCharging"), icon: "flash-outline" },
    { label: t("authTrackExpenses"), icon: "wallet-outline" },
    { label: t("authInsights"), icon: "analytics-outline" },
    { label: t("authAllVehicles"), icon: "car-sport-outline" },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={[]}>
      <StatusBar style="light" />
      <View
        style={{
          position: "absolute",
          top: insets.top,
          left: 0,
          right: 0,
          zIndex: 2,
        }}
      >
        <LoadingLine loading={loading} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 32 + insets.bottom,
          }}
        >
          <View style={{ width: "100%" }}>
            <View
              style={{
                width: "100%",
                aspectRatio: 1514 / 1039,
                backgroundColor: "#006F63",
                overflow: "hidden",
                borderBottomLeftRadius: 28,
                borderBottomRightRadius: 28,
              }}
            >
              <Image
                source={hero}
                resizeMode="cover"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  position: "absolute",
                  left: 18 + insets.left,
                  top: insets.top + 24,
                  right: 18 + insets.right,
                }}
              >
                <View style={{ flexShrink: 1, alignItems: "flex-start" }}>
                  <Image
                    accessibilityLabel={t("app")}
                    source={artwork.wordmarkDark}
                    resizeMode="contain"
                    style={{ width: 184, height: 46 }}
                  />
                  <Text
                    style={{
                      color: "#E0FAF1",
                      fontSize: 12,
                      fontWeight: "600",
                      paddingLeft: 8,
                    }}
                  >
                    {t("tagline")}
                  </Text>
                </View>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingHorizontal: 18,
                paddingVertical: 15,
              }}
              style={{
                flexGrow: 0,
                width: "100%",
                maxWidth: 520,
                alignSelf: "center",
              }}
            >
              {features.map((feature) => (
                <View
                  key={feature.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 13,
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.line,
                  }}
                >
                  <Ionicons name={feature.icon} color={c.primary} size={18} />
                  <Text
                    style={{ color: c.ink, fontSize: 12, fontWeight: "600" }}
                  >
                    {feature.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View
              style={{
                paddingHorizontal: 18,
                gap: 16,
                width: "100%",
                maxWidth: 520,
                alignSelf: "center",
              }}
            >
              <View style={{ gap: 5 }}>
                <Text
                  accessibilityRole="header"
                  style={{
                    fontSize: 29,
                    lineHeight: 36,
                    color: c.ink,
                    fontWeight: "800",
                  }}
                >
                  {title}
                </Text>
                <Text style={{ color: c.muted, lineHeight: 21, fontSize: 14 }}>
                  {subtitle}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: c.surface,
                  borderColor: c.line,
                  borderWidth: 1,
                  borderRadius: 22,
                  padding: 18,
                  gap: 15,
                  shadowColor: "#173E3A",
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 3,
                }}
              >
                {children}
              </View>
              {/* <Pressable
                accessibilityRole="link"
                onPress={() => router.push("/auth/legal")}
                style={{
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: c.primary, fontWeight: "600" }}>{t("legal")}</Text>
              </Pressable> */}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function AuthTextField({
  label,
  icon,
  secret = false,
  ...props
}: TextInputProps & { label: string; icon: IconName; secret?: boolean }) {
  const c = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.ink, fontWeight: "600", fontSize: 14 }}>
        {label} <Text style={{ color: c.danger }}>*</Text>
      </Text>
      <View
        style={{
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 14,
          paddingLeft: 13,
          backgroundColor: c.surface,
        }}
      >
        <Ionicons name={icon} size={21} color={c.primary} />
        <TextInput
          {...props}
          accessibilityLabel={label}
          secureTextEntry={secret && !visible}
          placeholderTextColor={c.muted}
          style={{
            flex: 1,
            minWidth: 0,
            color: c.ink,
            fontSize: 16,
            paddingVertical: 12,
            paddingRight: secret ? 0 : 12,
          }}
        />
        {secret && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t(visible ? "hidePassword" : "showPassword")}: ${label}`}
            accessibilityState={{ disabled: props.editable === false }}
            disabled={props.editable === false}
            onPress={() => setVisible(!visible)}
            style={{
              minWidth: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={c.primary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
function GoogleMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.39-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.97-6.19a24 24 0 0 0 0 21.56z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.92-2.13 15.89-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}
export function GoogleAuthButton({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("google")}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderWidth: 1,
        borderColor: c.primary,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <GoogleMark />
      <Text style={{ color: c.primary, fontWeight: "700", fontSize: 15 }}>
        {t("google")}
      </Text>
    </Pressable>
  );
}
export function AuthPrimaryButton({
  label,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
    >
      <GradientSurface
        style={{
          minHeight: 54,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
          shadowOpacity: 0,
          elevation: 0,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
              {label}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </>
        )}
      </GradientSurface>
    </Pressable>
  );
}
export function AuthConsent({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t("authAgree")}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={onChange}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          minHeight: 44,
        }}
      >
        <Ionicons
          name={checked ? "checkbox" : "square-outline"}
          size={23}
          color={c.primary}
        />
        <Text style={{ flex: 1, color: c.ink }}>{t("authAgree")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push("/auth/legal")}
        style={{ minHeight: 44, justifyContent: "center", paddingLeft: 32 }}
      >
        <Text style={{ color: c.primary, fontWeight: "600" }}>
          {t("legal")}
        </Text>
      </Pressable>
    </View>
  );
}
