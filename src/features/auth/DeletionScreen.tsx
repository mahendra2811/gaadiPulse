import { useState } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@/src/lib/query";
import {
  Screen,
  AppText,
  AppButton,
  Card,
  ConfirmDialog,
  ErrorState,
  useToast,
} from "@/src/components/ui";
import { SectionHeading } from "@/src/components/ui/premium";
import { client } from "@/src/lib/supabase";
import { errorMessage, readableError } from "@/src/lib/errors";
import { useAccountId, useSession } from "./session";
import { SignOutButton } from "./SignOutButton";
import { t } from "@/src/lib/i18n";
export default function DeletionScreen() {
  const auth = useSession();
  const user = useAccountId();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const status = useQuery({
    queryKey: [user, "account-deletion-request"],
    enabled: !!user && !auth.development,
    queryFn: async () => {
      const { data, error: issue } = await client()
        .from("account_deletion_requests")
        .select("requested_at,completed_at")
        .eq("user_id", user!)
        .maybeSingle();
      if (issue) throw issue;
      return data;
    },
  });
  const request = async () => {
    if (busy || auth.development) return;
    setBusy(true);
    setError("");
    try {
      const { error: issue } = await client().rpc("request_account_deletion");
      if (issue) throw issue;
      setSubmitted(true);
      toast(t("deletionRecordedToast"), "success");
      await status.refetch();
    } catch (e) {
      setError(readableError(errorMessage(e)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title={t("deletionRequestTitle")}
      compact
      loading={busy || (!auth.development && status.isPending)}
    >
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("deletionBeforeRequest")} />
        <AppText>{t("deletionBeforeRequestBody")}</AppText>
        <AppText muted>{t("deletionConsequences")}</AppText>
        <AppButton
          secondary
          label={t("deletionReviewGarage")}
          onPress={() => router.push("/garage")}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("deletionStatus")} />
        {auth.development ? (
          <AppText muted>{t("deletionDevelopmentUnavailable")}</AppText>
        ) : status.error && !submitted ? (
          <ErrorState
            message={errorMessage(status.error)}
            retry={() => void status.refetch()}
          />
        ) : submitted || status.data ? (
          <>
            <AppText>
              {status.data?.completed_at
                ? t("deletionComplete")
                : t("deletionPending")}
            </AppText>
            <AppText muted>{t("deletionContactProgress")}</AppText>
            <SignOutButton />
          </>
        ) : (
          <>
            <AppText muted>{t("deletionNoRequest")}</AppText>
            <AppButton
              disabled={busy || status.isPending}
              label={t("deletionSubmit")}
              onPress={() =>
                ConfirmDialog(
                  t("deletionConfirmTitle"),
                  t("deletionConfirmBody"),
                  () => void request(),
                  { confirmLabel: t("deletionConfirmButton") },
                )
              }
            />
          </>
        )}
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("contactTitle")} />
        <AppText muted>{t("deletionContactBody")}</AppText>
        <AppButton
          secondary
          label={t("emailOperator")}
          onPress={() => {
            setError("");
            void Linking.openURL(
              "mailto:mahendrapuniya92@gmail.com?subject=GaadiPulse%20account%20deletion%20request",
            ).catch((e) => setError(String(e)));
          }}
        />
      </Card>
      {error !== "" && (
        <ErrorState message={error} retry={() => setError("")} />
      )}
    </Screen>
  );
}
