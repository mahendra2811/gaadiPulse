import { listDrafts,clearDraft } from '@/src/lib/db';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Screen,
  Card,
  AppText,
  AppButton,
  ErrorState,
  ConfirmDialog,
  Sheet,
  useToast,
} from "@/src/components/ui";
import { useSession, useAccountId } from "@/src/features/auth/session";
import {
  operations,
  removeOperation,
  putOperation,
  type Operation,
} from "@/src/lib/sync/outbox";
import { synchronize, listRecords } from "./api";
import { readLocal } from "@/src/lib/localStore";
import { exportText } from "@/src/features/reports/export";
import { r } from "./copy";
export default function SyncScreen() {
  const user = useAccountId();
  const { development } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Operation | null>(null);
  const [server, setServer] = useState<unknown>(null);
  const query = useQuery({
    queryKey: [user, "outbox"],
    enabled: !!user,
    queryFn: () => operations(user!),
    refetchInterval: 5000,
  });
  const drafts=useQuery({queryKey:[user,"form-drafts"],enabled:!!user,queryFn:()=>listDrafts(user!)});
  const last = useQuery({
    queryKey: [user, "last-sync"],
    enabled: !!user,
    queryFn: () => readLocal(`user.${user}.lastSync`),
  });
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await qc.invalidateQueries();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={r("sync")} loading={query.isPending || busy}>
      {development && <AppText>{r("development")}</AppText>}
      <AppText>{r("offline")}</AppText>
      <AppText>
        {r("lastSync")}: {String(last.data ?? "—")}
      </AppText>
      <AppText>
        {r("pendingOps")}: {query.data?.length ?? 0}
      </AppText>
      <AppButton
        label={r("retrySync")}
        disabled={busy || development}
        onPress={() =>
          void run(async () => {
            await synchronize(user!, true);
          })
        }
      />
      <AppText large>{r('localDrafts')}</AppText>{drafts.data?.map(draft=><Card key={draft.key}><AppText>{draft.key}</AppText><AppText muted>{draft.updated_at}</AppText><AppButton secondary label={r('exportDraft')} onPress={()=>void run(()=>exportText(JSON.stringify(draft,null,2),`GaadiPulse-form-draft.json`,'application/json'))}/><AppButton secondary label={r('deleteDraft')} onPress={()=>ConfirmDialog(r('deleteDraft'),r('offline'),()=>void run(()=>clearDraft(user!,draft.key)))}/></Card>)}
      {query.data?.map((op) => (
        <Card key={op.operation_id}>
          <AppText>
            {r(op.kind)} · {op.status}
          </AppText>
          <AppText>{String(op.payload.title ?? op.created_at)}</AppText>
          {op.error && <AppText>{op.error}</AppText>}
          {op.status === "CONFLICT" && <AppText>{r("conflict")}</AppText>}
          {op.status === "REJECTED" && <AppText>{r("rejected")}</AppText>}
          <AppButton
            secondary
            label={r("detail")}
            onPress={() =>
              void run(async () => {
                setSelected(op);
                try {
                  const entries = await listRecords(
                    user!,
                    op.vehicle_id,
                    op.kind,
                    false,
                  );
                  setServer(entries.find((r) => r.id === op.entity_id) ?? null);
                } catch (e) {
                  setServer(String(e));
                }
              })
            }
          />
          <AppButton
            secondary
            label={r("exportDraft")}
            onPress={() =>
              void run(() =>
                exportText(
                  JSON.stringify(op, null, 2),
                  `GaadiPulse-draft-${op.operation_id}.json`,
                  "application/json",
                ),
              )
            }
          />
          <AppButton
            secondary
            label={r("deleteDraft")}
            onPress={() =>
              ConfirmDialog(
                r("deleteDraft"),
                r("offline"),
                () => void run(() => removeOperation(user!, op.operation_id)),
              )
            }
          />
        </Card>
      ))}
      {error && <ErrorState message={error} retry={() => setError("")} />}
      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <AppText large>{r("conflict")}</AppText>
            <AppText>{JSON.stringify(selected.payload, null, 2)}</AppText>
            <AppText>{JSON.stringify(server, null, 2)}</AppText>
            <AppButton
              secondary
              label={r("exportDraft")}
              onPress={() =>
                void run(() =>
                  exportText(
                    JSON.stringify(selected, null, 2),
                    `draft-${selected.operation_id}.json`,
                    "application/json",
                  ),
                )
              }
            />
            {server && typeof server === "object" && "revision" in server && (
              <AppButton
                label={r("retry")}
                onPress={() =>
                  ConfirmDialog(
                    r("retry"),
                    r("conflict"),
                    () =>
                      void run(async () => {
                        await putOperation({
                          ...selected,
                          expected: Number(
                            (server as { revision: number }).revision,
                          ),
                          status: "PENDING",
                          error: null,
                          next_retry_at: new Date().toISOString(),
                        });
                        setSelected(null);
                        toast(r("pending"));
                      }),
                  )
                }
              />
            )}
          </>
        )}
      </Sheet>
      <AppButton secondary label={r("back")} onPress={() => router.back()} />
    </Screen>
  );
}
