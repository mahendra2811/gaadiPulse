import { useEffect, useSyncExternalStore } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  currentConfirmation,
  subscribeConfirmation,
  dismissConfirmation,
} from "@/src/lib/confirmation";
import { useTheme } from "@/src/lib/theme";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { t } from "@/src/lib/i18n";
export function ConfirmationHost() {
  useEffect(() => () => dismissConfirmation(), []);
  const request = useSyncExternalStore(subscribeConfirmation, currentConfirmation, () => null);
  const c = useTheme();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (request) AccessibilityInfo.announceForAccessibility(`${request.title}. ${request.body}`);
  }, [request]);
  const accent = request?.options.destructive ? c.danger : c.primary;
  return (
    <Modal
      transparent
      visible={!!request}
      animationType={reduced ? "none" : "fade"}
      statusBarTranslucent
      onRequestClose={() => dismissConfirmation()}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backgroundColor: "#07152266",
        }}
        accessibilityViewIsModal
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
          onPress={() => dismissConfirmation()}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          style={{
            maxWidth: Math.min(336, width - 40),
            maxHeight: height * 0.85,
            alignSelf: "center",
            paddingHorizontal: 12,
            paddingTop: 3,
            paddingBottom: 8,
            gap: 5,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.surface,
            shadowColor: "#102438",
            shadowOpacity: 0.13,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={request?.options.destructive ? "alert-circle-outline" : "help-circle-outline"}
                size={21}
                color={accent}
              />
            </View>
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 15,
                fontWeight: "700",
                textAlign: "center",
                color: c.ink,
                flexShrink: 1,
                maxWidth: width - 144,
              }}
            >
              {request?.title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("cancel")}
              onPress={() => dismissConfirmation()}
              style={{
                width: 40,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={16} color={c.muted} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flexGrow: 0, maxHeight: height * 0.45 }}
            contentContainerStyle={{
              alignItems: "center",
              paddingHorizontal: 5,
              paddingBottom: 5,
            }}
          >
            <Text
              style={{
                maxWidth: Math.min(288, width - 74),
                fontSize: 13,
                lineHeight: 19,
                color: c.muted,
                textAlign: "center",
              }}
            >
              {request?.body}
            </Text>
          </ScrollView>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              columnGap: 10,
              rowGap: 2,
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => dismissConfirmation()}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                minHeight: 44,
                paddingHorizontal: 10,
                borderRadius: 12,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Ionicons name="arrow-undo-outline" size={15} color={c.muted} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.ink }}>
                {request?.options.cancelLabel ?? t("cancel")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => dismissConfirmation(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                minHeight: 44,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: c.background,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Ionicons
                name={request?.options.destructive ? "trash-outline" : "checkmark-outline"}
                size={16}
                color={accent}
              />
              <Text style={{ fontSize: 12, fontWeight: "700", color: accent }}>
                {request?.options.confirmLabel ?? t("continue")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
