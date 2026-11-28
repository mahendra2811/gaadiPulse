import { Linking, Platform } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import {
  Screen,
  AppText,
  Card,
  ErrorState,
  useToast,
} from "@/src/components/ui";
import { MenuRow, SectionHeading } from "@/src/components/ui/premium";
import { useSession } from "./session";
import { r } from "@/src/features/records/copy";
import { t } from "@/src/lib/i18n";
export default function SecurityScreen() {
  const auth = useSession();
  const [error, setError] = useState("");
  const toast = useToast();
  const openNotificationSettings = async () => {
    setError("");
    if (Platform.OS === "web") {
      if (typeof Notification === "undefined") {
        setError(t("notificationBrowserUnsupported"));
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted")
        toast(t("notificationBrowserEnabled"), "success");
      else if (permission === "denied")
        setError(t("notificationBrowserBlocked"));
      return;
    }
    if (typeof Linking.openSettings !== "function") {
      setError(t("notificationSettingsUnavailable"));
      return;
    }
    await Linking.openSettings();
  };
  return (
    <Screen title={r("security")} compact>
      <AppText muted>{t("securityDescription")}</AppText>
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("securityAccountTitle")} />
        <AppText muted>{t("securityAccountBody")}</AppText>
        {!auth.development && !!auth.session?.user.email && (
          <MenuRow
            label={t("changePassword")}
            icon="key"
            tone="blue"
            onPress={() => router.push("/settings/password")}
          />
        )}
        <MenuRow
          label={t("securityNotificationSettings")}
          icon="notifications"
          tone="amber"
          onPress={() => {
            void openNotificationSettings().catch((e) => setError(String(e)));
          }}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("securityDataTitle")} />
        <AppText muted>{t("securityDataBody")}</AppText>
        <MenuRow
          label={t("account.legal")}
          icon="document-text"
          tone="violet"
          onPress={() => router.push("/auth/legal")}
        />
        <MenuRow
          label={r("requestDeletion")}
          icon="trash"
          tone="coral"
          onPress={() => router.push("/settings/deletion")}
        />
      </Card>
      {error !== "" && (
        <ErrorState
          message={error}
          retry={() => {
            void openNotificationSettings().catch((e) => setError(String(e)));
          }}
        />
      )}
    </Screen>
  );
}
