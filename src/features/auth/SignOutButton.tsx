import { useState } from "react";
import { router } from "expo-router";
import { AppButton, ConfirmDialog, ErrorState } from "@/src/components/ui";
import { useSession } from "./session";
import { t } from "@/src/lib/i18n";

export function SignOutButton() {
  const auth = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await auth.signOut();
      router.replace("/auth/welcome");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <AppButton
        secondary
        label={t(auth.development ? "exitDevelopment" : "logout")}
        disabled={busy}
        onPress={() =>
          ConfirmDialog(
            t(auth.development ? "exitDevelopment" : "logout"),
            t(auth.development ? "exitDevelopmentBody" : "signoutBody"),
            () => void signOut(),
          )
        }
      />
      {!!error && <ErrorState message={error} retry={() => void signOut()} />}
    </>
  );
}
