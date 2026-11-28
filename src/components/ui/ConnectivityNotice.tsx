import { Text, View } from "react-native";
import { useNetworkStatus } from "@/src/lib/connectivity";
import { t } from "@/src/lib/i18n";

export function ConnectivityNotice() {
  const status = useNetworkStatus();
  if (status === "checking" || status === "online") return null;
  const message =
    status === "offline"
      ? t("offline")
      : status === "slow"
        ? t("slowConnection")
        : t("unstableConnection");
  const offline = status === "offline";
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        minHeight: 48,
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: offline ? "#FEF3C7" : "#E8F1FA",
      }}
    >
      <Text
        style={{
          color: offline ? "#78350F" : "#183D5B",
          fontSize: 15,
          lineHeight: 24,
          fontWeight: "600",
        }}
      >
        {message}
      </Text>
    </View>
  );
}
