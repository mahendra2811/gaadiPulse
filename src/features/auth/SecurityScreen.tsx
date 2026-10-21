import { t } from "@/src/lib/i18n";
import { useState } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  AppText,
  AppButton,
  ErrorState,
  ConfirmDialog,
  useToast,
} from "@/src/components/ui";
import { client } from "@/src/lib/supabase";
import { useSession } from "./session";
import { r } from "@/src/features/records/copy";
export default function SecurityScreen() {
  const auth = useSession();
  const toast = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = async () => {
    if (auth.development) {
      toast(r("development"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await client().rpc("request_account_deletion");
      if (error) throw new Error(error.message);
      toast(r("deletionRequested"));
      await auth.signOut();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={r("security")} loading={busy}>
      {!auth.development && (
        <AppButton
          label={t("resetPassword")}
          onPress={() => router.push("/auth/reset-password")}
        />
      )}
      <AppText>{r("deleteAccountBody")}</AppText>
      <AppText>{r("deletionWorkflow")}</AppText>
      <AppButton
        disabled={busy || auth.development}
        label={r("requestDeletion")}
        onPress={() =>
          ConfirmDialog(
            r("deleteAccount"),
            r("deleteAccountBody"),
            () => void request(),
          )
        }
      />
      <AppButton
        secondary
        label={r("notificationPermission")}
        onPress={() =>
          void Linking.openSettings().catch((e) => setError(String(e)))
        }
      />
      {error && <ErrorState message={error} retry={() => setError("")} />}
      <AppButton secondary label={r("back")} onPress={() => router.back()} />
    </Screen>
  );
}
