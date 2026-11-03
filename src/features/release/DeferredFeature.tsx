import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppButton, AppText, Screen } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import { useTheme } from "@/src/lib/theme";
export function DeferredFeature() {
  return (
    <Screen title={t("releaseLaterTitle")}>
      <AppText>{t("releaseLaterBody")}</AppText>
      <AppButton label={t("home")} onPress={() => router.replace("/(tabs)")} />
    </Screen>
  );
}
export function VehicleComingSoon({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const c = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backgroundColor: "#0008",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 20,
            borderRadius: 20,
            backgroundColor: c.surface,
            gap: 16,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{ color: c.ink, fontSize: 20, fontWeight: "700" }}
          >
            {t("releaseVehiclesTitle")}
          </Text>
          <AppText>{t("releaseVehiclesBody")}</AppText>
          <AppButton label={t("cancel")} onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
