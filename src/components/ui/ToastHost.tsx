import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Animated,
  AppState,
  Easing,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  dismissToast,
  getToast,
  subscribeToast,
  TOAST_DURATION_MS,
} from "@/src/lib/toast";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { t } from "@/src/lib/i18n";
const tones = {
  success: { background: "#075A4C", icon: "checkmark-circle" },
  error: { background: "#8D2635", icon: "alert-circle" },
  warning: { background: "#754500", icon: "warning" },
  info: { background: "#294B87", icon: "information-circle" },
  reminder: { background: "#593B82", icon: "notifications" },
} as const;
export function ToastHost() {
  const toast = useSyncExternalStore(subscribeToast, getToast, () => null);
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [countdown] = useState(() => new Animated.Value(1));
  useEffect(() => () => dismissToast(), []);
  useEffect(() => {
    if (!toast) return;
    const remaining = toast.expiresAt - Date.now();
    if (remaining <= 0) {
      dismissToast(toast.id);
      return;
    }
    countdown.setValue(remaining / TOAST_DURATION_MS);
    if (reduced) return;
    const animation = Animated.timing(countdown, {
      toValue: 0,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [toast, countdown, reduced]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      const message = getToast();
      if (state === "active" && message && message.expiresAt <= Date.now())
        dismissToast(message.id);
    });
    return () => listener.remove();
  }, []);
  if (!toast) return null;
  const tone = tones[toast.type];
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: inset.top + 10,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: 12,
        zIndex: 1000,
      }}
    >
      <View
        style={{
          alignSelf: "center",
          maxWidth: Math.min(300, width - 24),
          borderRadius: 14,
          backgroundColor: tone.background,
          shadowColor: "#102438",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 8,
          elevation: 5,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            paddingLeft: 9,
            paddingRight: 2,
            minHeight: 44,
          }}
        >
          <View
            style={{
              width: 25,
              height: 25,
              borderRadius: 9,
              backgroundColor: "#FFFFFF24",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={tone.icon} size={16} color="#FFFFFF" />
          </View>
          <Text
            accessibilityRole="alert"
            numberOfLines={2}
            style={{
              color: "#FFFFFF",
              fontSize: 12,
              lineHeight: 17,
              fontWeight: "500",
              textAlign: "center",
              flexShrink: 1,
              paddingVertical: 7,
            }}
          >
            {toast.message}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("dismiss")}
            onPress={() => dismissToast(toast.id)}
            style={({ pressed }) => ({
              width: 40,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Ionicons name="close" size={15} color="#FFFFFF" />
          </Pressable>
        </View>
        {!reduced && (
          <View
            pointerEvents="none"
            style={{ height: 2, backgroundColor: "#FFFFFF30" }}
          >
            <Animated.View
              style={{
                height: 2,
                backgroundColor: "#FFFFFF",
                transform: [{ scaleX: countdown }],
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}
