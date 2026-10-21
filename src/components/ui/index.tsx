import { readableError } from '@/src/lib/errors';
import { successFeedback } from "@/src/lib/feedback";
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
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
import { SafeAreaView,useSafeAreaInsets } from "react-native-safe-area-context";
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
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={{
          minHeight: 52,
          borderWidth: 1,
          borderColor: error ? c.danger : c.line,
          borderRadius: 14,
          padding: 14,
          fontSize: 16,
          color: c.ink,
          backgroundColor: c.surface,
        }}
      />
      {error && (
        <Text accessibilityRole="alert" style={{ color: c.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
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
export function LoadingLine({
  loading,
  progress,
}: {
  loading: boolean;
  progress?: number;
}) {
  const c = useTheme();
  const [reduced, setReduced] = useState(true);
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(0));
  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
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
      }),
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
}: {
  title: string;
  children: ReactNode;
  loading?: boolean;
  action?: ReactNode;
}) {
  const c = useTheme();
  const {fontScale}=useWindowDimensions();const safe=useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  React.useEffect(
    () => addEventListener((s) => setOffline(s.isConnected === false)),
    [],
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
        <AppText large>{title}</AppText>
      </View>
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
          style={{ flex: 1, minHeight: 0 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 140 }}
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
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
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
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            {children}
          </ScrollView>
          <AppButton label={t("cancel")} onPress={onClose} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
export function ConfirmDialog(title: string, body: string, action: () => void) {
  Alert.alert(title, body, [
    { text: t("cancel"), style: "cancel" },
    { text: t("continue"), onPress: action },
  ]);
}
export type ToastType = "success" | "error" | "warning" | "info";
const ToastContext = createContext<(message: string, type?: ToastType) => void>(
  () => {},
);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");
  return (
    <ToastContext.Provider
      value={(m, type = "info") => {
        setType(type);
        if (type === "success") void successFeedback();
        setMessage(m);
        AccessibilityInfo.announceForAccessibility(m);
      }}
    >
      {children}
      {message && (
        <View
          style={{
            position: "absolute",
            top: 60,
            left: 16,
            right: 16,
            backgroundColor:
              type === "error"
                ? "#6E2431"
                : type === "warning"
                  ? "#6A4A10"
                  : "#122C2A",
            padding: 16,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: "#fff" }} accessibilityRole="alert">
            {message}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMessage("")}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: "#8CE2BF" }}>{t("dismiss")}</Text>
          </Pressable>
        </View>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function Choice<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
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
