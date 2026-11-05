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
      toast("Deletion request recorded.", "success");
      await status.refetch();
    } catch (e) {
      setError(readableError(errorMessage(e)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Request account deletion"
      compact
      loading={busy || (!auth.development && status.isPending)}
    >
      <Card style={{ padding: 16 }}>
        <SectionHeading title="Before you request" />
        <AppText>
          Archive every active vehicle for which you are the primary
          administrator before submitting. Review and export any records you
          need first.
        </AppText>
        <AppText muted>
          Submitting immediately revokes your vehicle memberships and resolved
          grants. This cannot be undone here. It records a request; account
          anonymization requires operator action and review, and some
          operational records may be retained.
        </AppText>
        <AppButton
          secondary
          label="Review vehicles in Garage"
          onPress={() => router.push("/garage")}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title="Request status" />
        {auth.development ? (
          <AppText muted>
            Deletion requests are unavailable in development preview.
          </AppText>
        ) : status.error && !submitted ? (
          <ErrorState
            message={errorMessage(status.error)}
            retry={() => void status.refetch()}
          />
        ) : submitted || status.data ? (
          <>
            <AppText>
              {status.data?.completed_at
                ? "The operator marked anonymization complete."
                : "Request recorded; operator action is pending."}
            </AppText>
            <AppText muted>
              Contact the operator for progress or questions. A recorded request
              does not by itself confirm account deletion.
            </AppText>
            <SignOutButton />
          </>
        ) : (
          <>
            <AppText muted>
              No request is currently recorded for this account.
            </AppText>
            <AppButton
              disabled={busy || status.isPending}
              label="Submit deletion request"
              onPress={() =>
                ConfirmDialog(
                  "Submit deletion request?",
                  "Your vehicle access will be revoked immediately. Operator action is required to complete the request. Continue?",
                  () => void request(),
                  { confirmLabel: "Submit request" },
                )
              }
            />
          </>
        )}
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title="Contact" />
        <AppText muted>
          For deletion or privacy questions, contact the app operator. Do not
          send your password or verification code.
        </AppText>
        <AppButton
          secondary
          label="Email the operator"
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
