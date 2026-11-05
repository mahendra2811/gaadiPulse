import { useCallback, useEffect, useState, type ReactNode } from "react";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SignOutButton } from "@/src/features/auth/SignOutButton";
import { MoreMenu } from "@/src/features/navigation/MoreMenu";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { t } from "@/src/lib/i18n";
import { useTheme } from "@/src/lib/theme";
import { DrawerContext, useMoreDrawer } from "./DrawerContext";

export { useMoreDrawer } from "./DrawerContext";

export function MoreDrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const c = useTheme();
  const drawerWidth = width * 0.75;
  const open = useCallback(() => {
    setMounted(true);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 0 : 220,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [progress, reduced, visible]);

  return (
    <DrawerContext.Provider value={{ open, close, visible }}>
      {children}
      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={close}
      >
        <View style={{ flex: 1 }}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "#071B38",
                opacity: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.35],
                }),
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("closePopup")}
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            style={{
              width: drawerWidth,
              height: "100%",
              backgroundColor: c.surface,
              paddingTop: inset.top,
              paddingBottom: inset.bottom,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-drawerWidth, 0],
                  }),
                },
              ],
              shadowColor: "#071522",
              shadowOpacity: 0.18,
              shadowRadius: 24,
              shadowOffset: { width: 4, height: 0 },
              elevation: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  flex: 1,
                  color: c.ink,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                {t("more")}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("closePopup")}
                onPress={close}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.background,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="close" size={22} color={c.ink} />
              </Pressable>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <MoreMenu
                navigate={(href) => {
                  close();
                  router.push(href);
                }}
              />
            </ScrollView>
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 12,
                borderTopWidth: 1,
                borderTopColor: c.line,
              }}
            >
              <SignOutButton onSignedOut={close} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </DrawerContext.Provider>
  );
}

export function MoreDrawerRoute() {
  const { open } = useMoreDrawer();
  useEffect(() => {
    router.replace("/(tabs)");
    open();
  }, [open]);
  return null;
}
