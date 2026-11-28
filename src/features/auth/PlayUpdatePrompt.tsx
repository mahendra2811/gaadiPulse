import { useEffect, useState } from "react";
import { AppState, Platform, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AppButton, AppText, Card } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import { checkAndStartPlayUpdate, checkPlayUpdate } from "./playStore";

const CHECKED_AT_KEY = "gaadipulse.play-update.checked-at.v1";
const SNOOZED_UNTIL_KEY = "gaadipulse.play-update.snoozed-until.v1";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function PlayUpdatePrompt() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android" || __DEV__) return;
    let checking = false;
    const check = async () => {
      if (checking || AppState.currentState !== "active") return;
      checking = true;
      try {
        const last = Number((await SecureStore.getItemAsync(CHECKED_AT_KEY)) ?? 0);
        if (Date.now() - last < CHECK_INTERVAL_MS) return;
        await SecureStore.setItemAsync(CHECKED_AT_KEY, String(Date.now()));
        const result = await checkPlayUpdate();
        if (result !== "available") return;
        const snoozedUntil = Number((await SecureStore.getItemAsync(SNOOZED_UNTIL_KEY)) ?? 0);
        if (Date.now() >= snoozedUntil) setAvailable(true);
      } catch {
        // Checking for updates should never block app startup or normal use.
      } finally {
        checking = false;
      }
    };
    void check();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => listener.remove();
  }, []);

  if (!available) return null;
  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await checkAndStartPlayUpdate();
      setAvailable(false);
    } catch {
      setBusy(false);
    }
  };
  const dismiss = async () => {
    await SecureStore.setItemAsync(CHECKED_AT_KEY, String(Date.now()));
    await SecureStore.setItemAsync(SNOOZED_UNTIL_KEY, String(Date.now() + CHECK_INTERVAL_MS));
    setAvailable(false);
  };

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <Card style={{ padding: 16, gap: 8 }}>
        <AppText large>{t("updateAvailableTitle")}</AppText>
        <AppText muted>{t("updateAvailableHint")}</AppText>
        <AppButton
          label={busy ? t("checkingForUpdates") : t("installUpdate")}
          disabled={busy}
          onPress={() => void start()}
        />
        <AppButton secondary label={t("updateLater")} onPress={() => void dismiss()} />
      </Card>
    </View>
  );
}
