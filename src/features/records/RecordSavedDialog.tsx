import { Popup } from "@/src/components/ui/Popup";
import { useEffect } from "react";
import { Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppButton, AppText } from "@/src/components/ui";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";

export function RecordSavedDialog({ onContinue }: { onContinue: () => void }) {
  const c = useTheme();
  useEffect(() => {
    const timer = setTimeout(onContinue, 4000);
    return () => clearTimeout(timer);
  }, [onContinue]);
  return (
    <Popup visible onClose={onContinue} maxWidth={400}>
      <Ionicons
        name="checkmark-circle"
        size={48}
        color={c.primary}
        style={{ alignSelf: "center" }}
      />
      <Text
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={{
          color: c.ink,
          fontSize: 24,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {t("fuelSavedTitle")}
      </Text>
      <AppText>{t("fuelSavedRedirect")}</AppText>
      <AppButton label={t("savedDialogOk")} onPress={onContinue} />
    </Popup>
  );
}
