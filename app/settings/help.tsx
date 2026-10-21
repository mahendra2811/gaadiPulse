import { router } from "expo-router";
import { Screen, AppText, AppButton } from "@/src/components/ui";
import { r } from "@/src/features/records/copy";
export default function Help() {
  return (
    <Screen title={r("help")}>
      <AppText>{r("helpBody")}</AppText>
      <AppButton
        secondary
        label={r("sync")}
        onPress={() => router.push("/settings/sync")}
      />
      <AppButton secondary label={r("back")} onPress={() => router.back()} />
    </Screen>
  );
}
