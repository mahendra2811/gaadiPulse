import { Popup } from "@/src/components/ui/Popup";
import { router } from "expo-router";
import { AppButton, AppText, Screen } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
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
  return (
    <Popup
      visible={visible}
      onClose={onClose}
      title={t("releaseVehiclesTitle")}
    >
      <AppText>{t("releaseVehiclesBody")}</AppText>
    </Popup>
  );
}
