import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/lib/theme";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { MoreMenu } from "@/src/features/navigation/MoreMenu";
import { t } from "@/src/lib/i18n";
import { DrawerContext, useMoreDrawer } from "./DrawerContext";
export { useMoreDrawer } from "./DrawerContext";
export function MoreDrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const c = useTheme();
  const reduced = useReducedMotion();
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.75, 460);
  const closing = useRef(false);
  const open = useCallback(() => {
    closing.current = false;
    setVisible(true);
  }, []);
  const close = useCallback(() => {
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: reduced ? 0 : 190,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && closing.current) setVisible(false);
    });
  }, [progress, reduced]);
  useEffect(() => {
    if (!visible) return;
    closing.current = false;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduced ? 0 : 240,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, progress, reduced]);
  return (
    <DrawerContext.Provider value={{ open, close, visible }}>
      {children}
      <Modal
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
        onDismiss={() => progress.setValue(0)}
      >
        <View style={{ flex: 1 }} accessibilityViewIsModal>
          <Animated.View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#071522",
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.48],
              }),
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("uiCloseMenu")}
              onPress={close}
              style={{ flex: 1 }}
            />
          </Animated.View>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: panelWidth,
              backgroundColor: c.background,
              borderTopRightRadius: 22,
              borderBottomRightRadius: 22,
              paddingTop: inset.top + 6,
              paddingBottom: inset.bottom,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 30,
              elevation: 20,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-panelWidth, 0],
                  }),
                },
              ],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 12,
                paddingBottom: 6,
                marginBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
                gap: 4,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="menu-outline" size={20} color={c.primary} />
              </View>
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  textAlign: "center",
                  color: c.ink,
                  flex: 1,
                }}
              >
                {t("more")}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("uiCloseMenu")}
                onPress={close}
                style={({ pressed }) => ({
                  width: 40,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Ionicons name="close" size={18} color={c.muted} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24,
              }}
              keyboardShouldPersistTaps="handled"
            >
              <MoreMenu
                navigate={(href) => {
                  close();
                  router.push(href);
                }}
              />
            </ScrollView>
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
