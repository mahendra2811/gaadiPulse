import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/lib/theme";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { t } from "@/src/lib/i18n";

const BackgroundContext = createContext<(() => () => void) | undefined>(
  undefined,
);

export function PopupBackground({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0);
  const register = useCallback(() => {
    setOpenCount((count) => count + 1);
    return () => setOpenCount((count) => Math.max(0, count - 1));
  }, []);
  const canBlur =
    Platform.OS === "web" ||
    (Platform.OS === "android" && Number(Platform.Version) >= 31);
  return (
    <BackgroundContext.Provider value={register}>
      <View
        style={{
          flex: 1,
          ...(openCount > 0 && canBlur ? { filter: "blur(3px)" } : {}),
        }}
      >
        {children}
      </View>
    </BackgroundContext.Provider>
  );
}

/** Shared, content-sized dialog. The backdrop is a sibling so content taps never dismiss it. */
export function Popup({
  visible,
  onClose,
  children,
  title,
  maxWidth = 480,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxWidth?: number;
}) {
  const c = useTheme();
  const register = useContext(BackgroundContext);
  useEffect(() => {
    if (visible) return register?.();
  }, [visible, register]);
  const reduced = useReducedMotion();
  const inset = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? "none" : "fade"}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: Math.max(16, inset.top),
            paddingBottom: Math.max(16, inset.bottom),
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("closePopup")}
            onPress={onClose}
            style={[StyleSheet.absoluteFill, { backgroundColor: "#07152255" }]}
          />
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={{
              width: "100%",
              maxWidth,
              maxHeight: Math.max(120, height - inset.top - inset.bottom - 32),
              flexShrink: 1,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surface,
              padding: 16,
              gap: 8,
              shadowColor: "#071522",
              shadowOpacity: 0.18,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {title && (
                <Text
                  accessibilityRole="header"
                  style={{
                    flex: 1,
                    color: c.ink,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {title}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("closePopup")}
                onPress={onClose}
                hitSlop={2}
                style={({ pressed }) => ({
                  marginLeft: "auto",
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
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
