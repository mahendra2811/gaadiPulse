import { Pressable, ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { readableError } from "@/src/lib/errors";
import { t } from "@/src/lib/i18n";

/** Persistent form feedback alongside the save action, including on small screens. */
export function FormError({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const colors = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.danger,
        borderRadius: 14,
        backgroundColor: colors.surface,
        paddingLeft: 12,
        gap: 8,
      }}
    >
      <Ionicons
        name="alert-circle-outline"
        size={21}
        color={colors.danger}
        accessible={false}
      />
      <ScrollView
        style={{ flex: 1, maxHeight: 104 }}
        contentContainerStyle={{ paddingVertical: 10 }}
      >
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}
        >
          {readableError(message)}
        </Text>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("dismiss")}
        onPress={onDismiss}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="close" size={20} color={colors.danger} />
      </Pressable>
    </View>
  );
}
