import { useEffect, useState } from "react";
import { useURL } from "expo-linking";
import { completeOAuth } from "@/src/features/auth/api";
import { router } from "expo-router";
import { Screen, ErrorState, Skeleton, AppButton } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
export default function Callback() {
  const url = useURL();
  const [error, setError] = useState("");
  const run = () => {
    if (url) void completeOAuth(url).catch((e) => setError(String(e)));
  };
  useEffect(run, [url]);
  return (
    <Screen title={t("login")} loading={!error}>
      {error ? <ErrorState message={error} retry={run} /> : <Skeleton />}
      <AppButton
        secondary
        label={t("login")}
        onPress={() => router.replace("/auth/login")}
      />
    </Screen>
  );
}
