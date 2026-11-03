import { Popup } from "./Popup";
import { useEffect, useSyncExternalStore } from "react";
import {
  AccessibilityInfo,
  Pressable,
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
import { t } from "@/src/lib/i18n";
export function ConfirmationHost() {
  useEffect(() => () => dismissConfirmation(), []);
  const request = useSyncExternalStore(
    subscribeConfirmation,
    currentConfirmation,
    () => null,
  );
  const c = useTheme();
  const { width } = useWindowDimensions();
  useEffect(() => {
    if (request)
      AccessibilityInfo.announceForAccessibility(
        `${request.title}. ${request.body}`,
      );
  }, [request]);
  const accent = request?.options.destructive ? c.danger : c.primary;
  return (
    <Popup
      visible={!!request}
      onClose={() => dismissConfirmation()}
      title={request?.title}
      maxWidth={360}
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
            name={
              request?.options.destructive
                ? "alert-circle-outline"
                : "help-circle-outline"
            }
            size={21}
            color={accent}
          />
        </View>
      </View>
      <Text
        style={{
          maxWidth: Math.min(288, width - 74),
          fontSize: 13,
          lineHeight: 19,
          color: c.muted,
          textAlign: "center",
          alignSelf: "center",
        }}
      >
        {request?.body}
      </Text>

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
            name={
              request?.options.destructive
                ? "trash-outline"
                : "checkmark-outline"
            }
            size={16}
            color={accent}
          />
          <Text style={{ fontSize: 12, fontWeight: "700", color: accent }}>
            {request?.options.confirmLabel ?? t("continue")}
          </Text>
        </Pressable>
      </View>
    </Popup>
  );
}
