import { useEffect, useState } from "react";
import { View } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { usePathname } from "expo-router";
import { AppButton, AppText, Card } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";

const SEEN_VERSION_KEY = "gaadipulse.whats-new.version.v1";

export function WhatsNewPrompt() {
  const isHome = usePathname() === "/";
  const version = Constants.expoConfig?.version;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isHome || !version) return;
    void SecureStore.getItemAsync(SEEN_VERSION_KEY)
      .then((seenVersion) => {
        if (active) setVisible(seenVersion !== version);
      })
      .catch(() => {
        // Release notes are optional UI and must not block the Home screen.
        if (active) setVisible(false);
      });
    return () => {
      active = false;
    };
  }, [isHome, version]);

  if (!visible || !isHome) return null;
  const dismiss = async () => {
    setVisible(false);
    if (version) {
      try {
        await SecureStore.setItemAsync(SEEN_VERSION_KEY, version);
      } catch {
        // Keep the current session dismissed even if secure storage is unavailable.
      }
    }
  };

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <Card style={{ padding: 16, gap: 8 }}>
        <AppText large>{t("whatsNewTitle")}</AppText>
        <AppText muted>{t("whatsNewUpdates")}</AppText>
        <AppText muted>{t("whatsNewReviews")}</AppText>
        <AppButton
          label={t("whatsNewDismiss")}
          onPress={() => void dismiss()}
        />
      </Card>
    </View>
  );
}
