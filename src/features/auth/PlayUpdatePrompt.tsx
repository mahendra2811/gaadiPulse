import { useEffect, useState } from "react";
import { AppState, Platform, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { AppButton, AppText, Card } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import { usePathname } from "expo-router";
import { checkPlayUpdate, openPlayStore } from "./playStore";

const CHECKED_AT_KEY = "gaadipulse.play-update.checked-at.v1";
const SNOOZED_UNTIL_KEY = "gaadipulse.play-update.snoozed-until.v1";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function PlayUpdatePrompt() {
  const isHome = usePathname() === "/";
  const [source, setSource] = useState<"ota" | "play" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web" || __DEV__ || !isHome) return;
    let checking = false;
    const check = async () => {
      if (checking || AppState.currentState !== "active") return;
      checking = true;
      try {
        const last = Number(
          (await SecureStore.getItemAsync(CHECKED_AT_KEY)) ?? 0,
        );
        if (Date.now() - last < CHECK_INTERVAL_MS) return;
        await SecureStore.setItemAsync(CHECKED_AT_KEY, String(Date.now()));
        if (Updates.isEnabled) {
          const ota = await Updates.checkForUpdateAsync();
          if (ota.isAvailable) {
            const snoozedUntil = Number(
              (await SecureStore.getItemAsync(SNOOZED_UNTIL_KEY)) ?? 0,
            );
            if (Date.now() >= snoozedUntil) setSource("ota");
            return;
          }
        }
        if (Platform.OS === "android") {
          const result = await checkPlayUpdate();
          if (result !== "available") return;
          const snoozedUntil = Number(
            (await SecureStore.getItemAsync(SNOOZED_UNTIL_KEY)) ?? 0,
          );
          if (Date.now() >= snoozedUntil) setSource("play");
        }
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
  }, [isHome]);

  if (!source || !isHome) return null;
  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (source === "ota" && Updates.isEnabled) {
        const downloaded = await Updates.fetchUpdateAsync();
        if (downloaded.isNew) {
          await Updates.reloadAsync();
          return;
        }
      } else if (source === "play") {
        await openPlayStore();
      }
      setSource(null);
    } catch {
      if (source === "ota") {
        try {
          await openPlayStore();
          setSource(null);
        } catch {
          setBusy(false);
        }
      } else {
        setBusy(false);
      }
    }
  };
  const dismiss = async () => {
    try {
      const now = Date.now();
      await SecureStore.setItemAsync(CHECKED_AT_KEY, String(now));
      await SecureStore.setItemAsync(
        SNOOZED_UNTIL_KEY,
        String(now + CHECK_INTERVAL_MS),
      );
    } catch {
      // Dismissal still applies for this app session if storage is unavailable.
    } finally {
      setSource(null);
    }
  };

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <Card style={{ padding: 16, gap: 8 }}>
        <AppText large>{t("updateAvailableTitle")}</AppText>
        <AppText muted>{t("updateAvailableHint")}</AppText>
        <AppButton
          label={busy ? t("checkingForUpdates") : t("updateNow")}
          disabled={busy}
          onPress={() => void start()}
        />
        <AppButton
          secondary
          label={t("updateLater")}
          onPress={() => void dismiss()}
        />
      </Card>
    </View>
  );
}
