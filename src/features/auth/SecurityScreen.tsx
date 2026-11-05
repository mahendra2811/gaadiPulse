import { Linking } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Screen, AppText, Card, ErrorState } from "@/src/components/ui";
import { MenuRow, SectionHeading } from "@/src/components/ui/premium";
import { useSession } from "./session";
import { r } from "@/src/features/records/copy";
import { t } from "@/src/lib/i18n";
export default function SecurityScreen() {
  const auth = useSession();
  const [error, setError] = useState("");
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
        {!auth.development && (
          <MenuRow
            label={t("resetPassword")}
            icon="key"
            tone="blue"
            onPress={() => router.push("/auth/reset-password")}
          />
        )}
        <MenuRow
          label="Notification settings"
          icon="notifications"
          tone="amber"
          onPress={() => {
            setError("");
            void Linking.openSettings().catch((e) => setError(String(e)));
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
            setError("");
            void Linking.openSettings().catch((e) => setError(String(e)));
          }}
        />
      )}
    </Screen>
  );
}
