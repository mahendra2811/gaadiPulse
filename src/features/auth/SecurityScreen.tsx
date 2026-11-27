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
        setError("This browser does not support notifications.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted")
        toast("Browser notifications are enabled.", "success");
      else if (permission === "denied")
        setError(
          "Notifications are blocked for this site. Allow them in your browser’s site settings.",
        );
      return;
    }
    if (typeof Linking.openSettings !== "function") {
      setError("Notification settings are unavailable on this device.");
      return;
    }
    await Linking.openSettings();
  };
  return (
    <Screen title={r("security")} compact>
      <AppText muted>
        Manage your sign-in and learn how vehicle information is handled.
      </AppText>
      <Card style={{ padding: 16 }}>
        <SectionHeading title="Account security" />
        <AppText muted>
          Keep your password and verification codes private. Access to each
          vehicle is controlled by its Owner and your verified account.
        </AppText>
        {!auth.development && !!auth.session?.user.email && (
          <MenuRow
            label={t("changePassword")}
            icon="key"
            tone="blue"
            onPress={() => router.push("/settings/password")}
          />
        )}
        <MenuRow
          label="Notification settings"
          icon="notifications"
          tone="amber"
          onPress={() => {
            void openNotificationSettings().catch((e) => setError(String(e)));
          }}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title="Your data" />
        <AppText muted>
          Records are stored online. Vehicle access may be revoked by an Owner.
          Exports create copies that recipients can keep. Signing out clears
          this device’s session and scheduled local notifications.
        </AppText>
        <MenuRow
          label={t("legal")}
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
