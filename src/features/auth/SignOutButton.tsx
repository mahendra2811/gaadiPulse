import { useState } from "react";
import { router } from "expo-router";
import { AppButton, ConfirmDialog, ErrorState } from "@/src/components/ui";
import { useSession } from "./session";
import { t } from "@/src/lib/i18n";

export function SignOutButton({
  onSignedOut,
  afterDrawerClose,
}: {
  onSignedOut?: () => void;
  afterDrawerClose?: (callback: () => void) => void;
} = {}) {
  const auth = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await auth.signOut();
      onSignedOut?.();
      router.replace("/auth/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const askToSignOut = () =>
    ConfirmDialog(
      t(auth.development ? "exitDevelopment" : "logout"),
      t(auth.development ? "exitDevelopmentBody" : "signoutBody"),
      () => void signOut(),
    );
  return (
    <>
      <AppButton
        secondary
        label={t(auth.development ? "exitDevelopment" : "logout")}
        disabled={busy}
        onPress={() =>
          afterDrawerClose ? afterDrawerClose(askToSignOut) : askToSignOut()
        }
      />
      {!!error && <ErrorState message={error} retry={() => void signOut()} />}
    </>
  );
}
