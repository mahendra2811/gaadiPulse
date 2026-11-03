import { isNumericDraft, type NumericInputOptions } from "@/src/utils/formInput";
import { ToastHost } from "./ToastHost";
import { showToast, type ToastType } from "@/src/lib/toast";
export type { ToastType } from "@/src/lib/toast";
import { usePathname } from "expo-router";
import {
  FloatingNavigation,
  hasBrowseNavigation,
} from "@/src/components/navigation/FloatingNavigation";
import { PageHeader } from "@/src/components/navigation/PageHeader";
import { readableError } from "@/src/lib/errors";
import React, { createContext, useContext, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { addEventListener } from "@react-native-community/netinfo";
import { useTheme } from "@/src/lib/theme";
import { t, type TranslationKey } from "@/src/lib/i18n";
import { artwork } from "@/src/lib/assets";
export function AppText({
  children,
  large = false,
  muted = false,
}: {
  children: ReactNode;
  large?: boolean;
  muted?: boolean;
}) {
  const c = useTheme();
  return (
    <Text
      style={{
        color: muted ? c.muted : c.ink,
        fontSize: large ? 28 : 16,
        lineHeight: large ? 36 : 24,
        fontWeight: large ? "700" : "400",
        flexShrink: 1,
      }}
    >
      {children}
    </Text>
  );
}
export function AppButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? c.surface : c.primary,
        borderWidth: 1,
        borderColor: c.primary,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: secondary ? c.primary : c.background,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function InputField({
  label,
  error,
  required,
  optional,
  numeric,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  numeric?: NumericInputOptions;
}) {
  const c = useTheme();
  const [inputError, setInputError] = useState(false);
  const numericOptions =
    numeric ??
    (["number-pad", "numeric", "decimal-pad"].includes(props.keyboardType ?? "")
      ? { scale: props.keyboardType === "number-pad" ? 0 : 3 }
      : undefined);
  const validationError = error || (inputError ? t("numericOnly") : undefined);
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <AppText>{label}</AppText>
        {required ? (
          <Text style={{ color: c.danger, fontSize: 12 }}>*</Text>
        ) : optional ? (
          <Text style={{ color: c.muted, fontSize: 11 }}>{t("optionalField")}</Text>
        ) : null}
      </View>
      <TextInput
        accessibilityLabel={`${label}${required ? `, ${t("requiredField")}` : optional ? `, ${t("optionalField")}` : ""}`}
        placeholderTextColor={c.muted}
        {...props}
        onChangeText={(value) => {
          if (numericOptions && !isNumericDraft(value, numericOptions)) {
            setInputError(true);
            return;
          }
          setInputError(false);
          props.onChangeText?.(value);
        }}
        style={{
          minHeight: 52,
          borderWidth: 1,
          borderColor: validationError ? c.danger : c.line,
          borderRadius: 14,
          padding: 14,
          fontSize: 16,
          color: c.ink,
          backgroundColor: c.surface,
        }}
      />
      {validationError && (
        <Text accessibilityRole="alert" style={{ color: c.danger }}>
          {validationError}
        </Text>
      )}
    </View>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return (
    <View
      style={[
        {
          padding: 20,
          gap: 12,
          borderRadius: 20,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function LoadingLine({ loading, progress }: { loading: boolean; progress?: number }) {
  const c = useTheme();
  const [reduced, setReduced] = useState(true);
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(0));
  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  React.useEffect(() => {
    if (!loading || reduced || progress !== undefined) return;
    position.setValue(0);
    const animation = Animated.loop(
      Animated.timing(position, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [loading, reduced, progress, position]);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: 3, overflow: "hidden" }}
    >
      {loading && (
        <Animated.View
          accessibilityRole="progressbar"
          accessibilityLabel={t("loading")}
          accessibilityValue={
            progress === undefined
              ? undefined
              : { min: 0, max: 100, now: Math.round(progress * 100) }
          }
          style={{
            height: 3,
            backgroundColor: c.accent,
            width:
              progress === undefined
                ? reduced
                  ? "100%"
                  : "35%"
                : `${Math.max(0, Math.min(1, progress)) * 100}%`,
            transform:
              progress === undefined && !reduced
                ? [
                    {
                      translateX: position.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-width * 0.35, width],
                      }),
                    },
                  ]
                : [],
          }}
        />
      )}
    </View>
  );
}
export function Screen({
  title,
  children,
  loading = false,
  action,
  onBack,
  compact = false,
  contentKey,
}: {
  title: string;
  children: ReactNode;
  loading?: boolean;
  action?: ReactNode;
  onBack?: () => void;
  compact?: boolean;
  contentKey?: string | number;
}) {
  const c = useTheme();
  const path = usePathname();
  const inset = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const showNavigation = !action && hasBrowseNavigation(path);
  const [offline, setOffline] = useState(false);
  React.useEffect(() => addEventListener((s) => setOffline(s.isConnected === false)), []);
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <PageHeader title={title} onBack={onBack} />
      <LoadingLine loading={loading} />
      {offline && (
        <View style={{ padding: 12 }}>
          <AppText>{t("offline")}</AppText>
        </View>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          key={contentKey}
          style={{ flex: 1, minHeight: 0 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: compact ? 16 : 20,
            gap: compact ? 12 : 18,
            paddingBottom: action ? 24 : Math.max(140, inset.bottom + 104 * fontScale),
          }}
        >
          {children}
        </ScrollView>
        {action && (
          <SafeAreaView
            edges={["bottom"]}
            style={{
              backgroundColor: c.background,
              flexShrink: 0,
              padding: 16,
              borderTopWidth: 1,
              borderColor: c.line,
            }}
          >
            {action}
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
      {showNavigation && <FloatingNavigation />}
    </SafeAreaView>
  );
}
export function EmptyState({
  kind = "garage",
  title,
  body,
  action,
}: {
  kind?: "garage" | "fuel" | "expenses" | "progress" | "offline" | "error";
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <Image
        source={artwork[kind]}
        accessibilityIgnoresInvertColors
        style={{ width: "100%", height: 160, resizeMode: "contain" }}
      />
      <AppText large>{title}</AppText>
      {body && <AppText muted>{body}</AppText>}
      {action}
    </Card>
  );
}
export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Card>
      <AppText>{t("error")}</AppText>
      <AppText muted>{readableError(message)}</AppText>
      <AppButton label={t("retry")} onPress={retry} />
    </Card>
  );
}
export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const c = useTheme();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#0008",
        }}
      >
        <SafeAreaView
          style={{
            maxHeight: "85%",
            backgroundColor: c.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 20,
            gap: 12,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 12 }}>{children}</ScrollView>
          <AppButton label={t("cancel")} onPress={onClose} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
export { requestConfirmation as ConfirmDialog } from "@/src/lib/confirmation";
const ToastContext = createContext<(message: string, type?: ToastType) => void>(showToast);
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastHost />
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function Choice<T extends string>({
  values,
  value,
  onChange,
  compact = false,
}: {
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  const c = useTheme();
  if (compact)
    return (
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="radio"
            accessibilityState={{ checked: v === value }}
            onPress={() => onChange(v)}
            style={({ pressed }) => ({
              minHeight: 46,
              paddingHorizontal: 15,
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: v === value ? c.primary : c.line,
              backgroundColor: v === value ? c.primary : c.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: v === value ? c.background : c.ink,
              }}
            >
              {t(v as TranslationKey) ?? v}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      {values.map((v) => (
        <AppButton
          key={v}
          label={`${v === value ? "✓  " : ""}${t(v as TranslationKey) ?? v}`}
          secondary={v !== value}
          onPress={() => onChange(v)}
        />
      ))}
    </View>
  );
}
export function Skeleton() {
  return <ActivityIndicator accessibilityLabel={t("loading")} />;
}
