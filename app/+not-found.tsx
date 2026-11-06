import { router } from "expo-router";
import { AppButton, AppText, Card, Screen } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";

export default function NotFound() {
  return (
    <Screen title={t("notFoundTitle")}>
      <Card>
        <AppText>{t("notFoundMessage")}</AppText>
        <AppButton
          label={t("notFoundHome")}
          onPress={() => router.replace("/")}
        />
        {router.canGoBack() && (
          <AppButton
            secondary
            label={t("back")}
            onPress={() => router.back()}
          />
        )}
      </Card>
    </Screen>
  );
}
