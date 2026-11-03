import { Screen, AppText, AppButton, ErrorState } from "@/src/components/ui";
import { useVehicles } from "@/src/features/garage/hooks";
import { useSession } from "@/src/features/auth/session";
import { t } from "@/src/lib/i18n";
export default function ConnectionScreen() {
  const vehicles = useVehicles();
  const { development } = useSession();
  return (
    <Screen title={t("sync")} loading={vehicles.isFetching}>
      <AppText>
        {t(development ? "developmentNotice" : "onlineOnlyBody")}
      </AppText>
      <AppText>{t("onlineFormNotice")}</AppText>
      {!development && (
        <>
          <AppButton
            label={t("refresh")}
            disabled={vehicles.isFetching}
            onPress={() => void vehicles.refetch()}
          />
          {vehicles.error && (
            <ErrorState
              message={vehicles.error.message}
              retry={() => void vehicles.refetch()}
            />
          )}
        </>
      )}
    </Screen>
  );
}
