import { DateTimeInput } from '@/src/components/ui/fields';
import { observations as loadObservations } from "@/src/features/meters/api";
import { useEffect, useState } from "react";
import { Linking, View, Switch } from "react-native";
import { router, useLocalSearchParams, usePreventRemove } from "expo-router";
import * as Crypto from "expo-crypto";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Screen,
  Card,
  AppText,
  AppButton,
  InputField,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  useToast,
  Skeleton,
} from "@/src/components/ui";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { useActiveVehicle, useVehicles } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { clearDraft, loadDraft, saveDraft } from "@/src/lib/db";
import { money, solveFuel } from "@/src/utils/money";
import { fuelIntervals, type FuelPoint } from "@/src/utils/fuelEconomy";
import { expenseAccounting } from "@/src/utils/expenseAccounting";
import {
  saveRecord,
  expenseCategories as loadCategories,
  addExpenseCategory,
} from "./api";
import { useRecords, usePermissions } from "./hooks";
import {
  kinds,
  defaultEntry,
  entryPayload,
  formFromRecord,
  expenseCategories,
  type Kind,
  type EntryForm,
  type RecordEntry,
} from "./schema";
import { r, recordCopy } from "./copy";
import { formVersions, reviewProgress } from "@/src/features/progress/api";
import { DynamicFields } from "@/src/features/progress/DynamicFields";
import {
  defaultDefinition,
  validateAnswers,
  validateProgressDate,
  dateInZone,
  shiftDay,
} from "@/src/features/progress/schema";
import {
  notificationPermission,
  reconcileReminders,
  nextRecurrence,
} from "@/src/features/reminders/notifications";
export function useRouteKind(fixed?: Kind) {
  const params = useLocalSearchParams<{
    kind: string;
    id?: string;
    vehicle?: string;
    title?: string;
    action?: string;
    source?: string;
  }>();
  const kind =
    fixed ??
    (kinds.includes(params.kind as Kind) ? (params.kind as Kind) : "fuel");
  return {
    ...params,
    kind,
    id:
      params.id ??
      (params.action && !["add", "edit", "analytics"].includes(params.action)
        ? params.action
        : undefined),
  };
}
function go(
  kind: Kind,
  action: "add" | "analytics" | string,
  vehicle?: string,
) {
  router.push({
    pathname: "/records/[kind]/[action]",
    params: { kind, action, ...(vehicle ? { vehicle } : {}) },
  });
}
function periodStart(period: string, timezone: string) {
  const today = dateInZone(new Date(), timezone);
  if (period === "month") return `${today.slice(0, 7)}-01`;
  if (period === "year") return `${today.slice(0, 4)}-01-01`;
  if (period === "week") {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    return shiftDay(today, -((day + 6) % 7));
  }
  return "0000-01-01";
}
function filterRecords(
  records: RecordEntry[],
  period: string,
  timezone: string,
  kind: Kind,
  includeArchived = false,
) {
  const start = periodStart(period, timezone);
  return records.filter(
    (e) =>
      (includeArchived || e.status !== "ARCHIVED") &&
      (kind === "progress"
        ? String(e.payload.progress_date)
        : dateInZone(
            new Date(
              String(
                kind === "meters"
                  ? (e.payload.reading_at ?? e.created_at)
                  : (e.payload.event_at ?? e.created_at),
              ),
            ),
            timezone,
          )) >= start,
  );
}
export function RecordsList({
  fixedKind,
  initialStatus,
}: {
  fixedKind?: Kind;
  initialStatus?: string;
}) {
  const { kind,vehicle:contextVehicle } = useRouteKind(fixedKind);
  const active = useActiveVehicle();
  const v = contextVehicle?active.data?.find(vehicle=>vehicle.id===contextVehicle):active.vehicle;
  const query = useRecords(kind,v?.id);
  const permissions = usePermissions(v?.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? "ALL");
  const [period, setPeriod] = useState(
    ["documents", "reminders", "meters"].includes(kind) ? "all" : "month",
  );
  const [limit, setLimit] = useState(30);
  const [showArchived, setShowArchived] = useState(false);
  const canCreate =
    permissions.data?.[
      kind === "progress" ? "progress.submit" : `${kind}.create`
    ];
  const rows = filterRecords(
    query.data ?? [],
    period,
    v?.timezone ?? "Asia/Kolkata",
    kind,
    showArchived,
  ).filter(
    (row) =>
      (statusFilter === "ALL" || row.status === statusFilter) &&
      `${row.payload.title ?? ""} ${row.payload.notes ?? ""} ${row.payload.category ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Screen
      title={r(kind)}
      loading={
        active.isPending || !!v&&(permissions.isPending || query.isPending)
      }
    >
      <VehicleHeader vehicleId={v?.id} allowSwitch={!contextVehicle}/>
      {!v ? (
        <EmptyState title={r("noVehicle")} />
      ) : (
        <>
          {canCreate&&!v.archived_at && (
            <AppButton label={r("add")} onPress={() => go(kind, "add")} />
          )}
          {kind === "progress" && (
            <View style={{ gap: 8 }}>
              {[
                "ALL",
                "PENDING_REVIEW",
                "APPROVED",
                "REJECTED",
                "CORRECTION_REQUESTED",
              ].map((status) => (
                <AppButton
                  key={status}
                  secondary={statusFilter !== status}
                  label={r(status as keyof typeof recordCopy) ?? status}
                  onPress={() => setStatusFilter(status)}
                />
              ))}
            </View>
          )}
          {["fuel", "expenses"].includes(kind) &&
            permissions.data?.[`${kind}.read`] && (
              <Card>
                <AppText>{r("cash")}</AppText>
                <AppText large>
                  {money(
                    rows
                      .filter(
                        (row) => !row.localStatus && row.status !== "ARCHIVED",
                      )
                      .reduce(
                        (sum, row) =>
                          sum + Number(row.payload.amount_paise ?? 0),
                        0,
                      ),
                  )}
                </AppText>
                <AppText muted>
                  {r("confirmed")}:{" "}
                  {rows.filter((row) => !row.localStatus).length}
                </AppText>
              </Card>
            )}
          {permissions.data?.["reports.read"] && (
            <AppButton
              secondary
              label={r("analytics")}
              onPress={() => go(kind, "analytics", v.id)}
            />
          )}
          <View style={{ gap: 8 }}>
            {(["week", "month", "year", "all"] as const).map((p) => (
              <AppButton
                key={p}
                secondary={period !== p}
                label={r(p)}
                onPress={() => {
                  setPeriod(p);
                  setLimit(30);
                }}
              />
            ))}
          </View>
          <AppButton
            secondary
            label={r(showArchived ? "hideArchived" : "showArchived")}
            onPress={() => setShowArchived((v) => !v)}
          />
          <InputField
            label={r("search")}
            value={search}
            onChangeText={setSearch}
          />
          {query.error ? (
            <ErrorState
              message={query.error.message}
              retry={() => void query.refetch()}
            />
          ) : query.isPending ? (
            <Skeleton />
          ) : !rows.length ? (
            <EmptyState
              kind={
                kind === "fuel" || kind === "expenses" || kind === "progress"
                  ? kind
                  : "garage"
              }
              title={r("noData")}
            />
          ) : (
            rows.slice(0, limit).map((row) => (
              <Card key={row.id}>
                <AppText>
                  {String(
                    row.payload.title || row.payload.progress_date || r(kind),
                  )}
                </AppText>
                {row.payload.amount_paise !== undefined && (
                  <AppText large>
                    {money(Number(row.payload.amount_paise))}
                  </AppText>
                )}
                <AppText muted>
                  {String(row.payload.event_at ?? row.created_at)}
                </AppText>
                <AppText>
                  {row.localStatus
                    ? r("pending")
                    : (r(row.status as keyof typeof recordCopy) ?? row.status)}
                </AppText>
                {kind === "fuel" && (
                  <AppText>
                    {r(row.payload.is_full_tank ? "full" : "partial")} ·{" "}
                    {row.payload.reading_at ? "" : r("pendingReading")}
                  </AppText>
                )}
                <AppButton
                  secondary
                  label={r("detail")}
                  onPress={() => go(kind, row.id, v.id)}
                />
              </Card>
            ))
          )}
          {rows.length > limit && (
            <AppButton
              secondary
              label={r("more")}
              onPress={() => setLimit((n) => n + 30)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
export function RecordForm() {
  const { kind, vehicle: routeVehicle, id, title, source } = useRouteKind();
  const { development } = useSession();
  const user = useAccountId();
  const active = useActiveVehicle();
  const vehicles = useVehicles();
  const [boundVehicle,setBoundVehicle]=useState<string|null>(null);
  const vehicle = id
    ? vehicles.data?.find((v) => v.id === routeVehicle)
    : boundVehicle?vehicles.data?.find(v=>v.id===boundVehicle):active.vehicle;
  const v = vehicle;
  const query = useRecords(kind, v?.id);
  const existing = query.data?.find((e) => e.id === id);
  const access = usePermissions(v?.id);
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [operation, setOperation] = useState(() => Crypto.randomUUID());
  const [customCategory, setCustomCategory] = useState("");
  const [itemAmounts, setItemAmounts] = useState<Record<number, string>>({});
  const form = useForm<EntryForm>({ defaultValues: defaultEntry() });
  const values = useWatch({ control: form.control }) as EntryForm;
  const key = `record.${kind}.${v?.id}.${id ?? "new"}`;
  const forms = useQuery({
    queryKey: [user, v?.id, "forms"],
    enabled: !!v && kind === "progress",
    queryFn: () => formVersions(v!.id, development),
  });
  const definition =
    forms.data?.find((f) => f.id === values.form_version_id)?.definition ??
    forms.data?.find((f) => f.published)?.definition ??
    defaultDefinition;
  const owner = access.data?.owner === true;
  const categories = useQuery({
    queryKey: [user, v?.id, "expense-categories"],
    enabled: !!v && kind === "expenses",
    queryFn: () => loadCategories(v!.id, development),
  });
  useEffect(() => {
    if (ready || !user || !v || (id && query.isPending)) return;
    let alive = true;
    void loadDraft(user, key)
      .then((d) => {
        if (!alive) return;
        const draft = d as { values?: EntryForm; operation?: string } | null;
        if (draft?.values) {
          form.reset({ ...defaultEntry(), ...draft.values });
          if (draft.operation) setOperation(draft.operation);
        } else if (existing) form.reset(formFromRecord(existing));
        else
          form.reset({
            ...defaultEntry(),
            title: title ?? "",
            metadata: source ? JSON.stringify({ expense_id: source }) : "{}",
            energy_type: v.energy_type,
            unit:
              v.energy_type === "ELECTRIC"
                ? "KWH"
                : v.energy_type === "CNG"
                  ? "KG"
                  : "L",
            progress_date: dateInZone(new Date(), v.timezone),
          });
        setBoundVehicle(v.id);setReady(true);
      })
      .catch((e) => {setError(String(e));setReady(true);});
    return () => {
      alive = false;
    };
  }, [ready, user, v, id, query.isPending, existing, key, form, title, source]);
  useEffect(() => {
    if (!ready || !user || leaving) return;
    const timer = setTimeout(() => {
      void saveDraft(user, key, { values, operation,vehicle_id:v?.id }).catch((e) =>
        setError(String(e)),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [ready, user, values, operation, key, leaving,v?.id]);
  const disablePrevention = usePreventRemove(
    form.formState.isDirty && !leaving,
    ({ repeat }) =>
      ConfirmDialog(r("back"), r("offline"), () => {
        setLeaving(true);
        repeat();
      }),
  );
  const field = (name: keyof EntryForm, label: string, numeric = false) => (
    <Controller
      key={name}
      control={form.control}
      name={name}
      render={({ field: { value, onChange } }) => ['event_at','observed_at','due_at'].includes(name)?<DateTimeInput label={label} value={String(value??'')} onChange={onChange} allowFuture={name==='due_at'}/>: (
        <InputField
          label={label}
          value={String(value ?? "")}
          onChangeText={onChange}
          keyboardType={numeric ? "decimal-pad" : "default"}
        />
      )}
    />
  );
  const choose = (
    name: "category" | "unit" | "payment_method" | "recurrence" | "energy_type",
    options: readonly string[],
  ) => (
    <View style={{ gap: 8 }}>
      {options.map((option) => (
        <AppButton
          key={option}
          secondary={values[name] !== option}
          label={r(option as keyof typeof recordCopy) ?? option}
          onPress={() =>
            form.setValue(name, option as never, { shouldDirty: true })
          }
        />
      ))}
    </View>
  );
  const updateMeta = (name: string, value: string) => {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(values.metadata) as Record<string, unknown>;
    } catch {}
    form.setValue("metadata", JSON.stringify({ ...meta, [name]: value }), {
      shouldDirty: true,
    });
  };
  const metaField = (name: string, label: string) => {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(values.metadata) as Record<string, unknown>;
    } catch {}
    return (
      <InputField
        key={name}
        label={label}
        value={String(meta[name] ?? "")}
        onChangeText={(value) => updateMeta(name, value)}
      />
    );
  };
  const selectVehicle=(nextId:string)=>{if(busy||!v||!user||nextId===v.id)return;const next=vehicles.data?.find(item=>item.id===nextId);if(!next)return;ConfirmDialog(r('switchVehicle'),r('vehicleChanged'),()=>{void saveDraft(user,key,{values,operation,vehicle_id:v.id}).then(()=>{form.reset({...values,km:next.meter_mode==='HOURS'?'':values.km,hours:next.meter_mode==='KM'?'':values.hours,energy_type:next.energy_type,unit:next.energy_type==='ELECTRIC'?'KWH':next.energy_type==='CNG'?'KG':'L',answers:kind==='progress'?{}:values.answers,form_version_id:''});setBoundVehicle(nextId);active.select(nextId);setOperation(Crypto.randomUUID());toast(r('vehicleChanged'),'info');}).catch(e=>setError(String(e)));});};
  const submit = async (another = false) => {
    if (busy || !user || !v) return;
    setBusy(true);
    setError("");
    try {
      const payload = entryPayload(kind, values);
      if (v.meter_mode === "HOURS") payload.km = null;
      if (v.meter_mode === "KM") payload.hours = null;
      if (kind === "progress") {
        const version = existing
          ? forms.data?.find((f) => f.id === existing.payload.form_version_id)
          : forms.data?.find((f) => f.published);
        if (!version) throw new Error(r("formChanged"));
        validateProgressDate(
          values.progress_date,
          v.timezone,
          version.definition.past_days,
        );
        payload.form_version_id = version.id;
        payload.answers = validateAnswers(
          version.definition.fields,
          values.answers,
          owner,
        );
        if (version.definition.notes_required && !values.notes.trim())
          throw new Error(r("notesRequired"));
        if (
          (version.definition.km_required && payload.km === null) ||
          (version.definition.hours_required && payload.hours === null)
        )
          throw new Error(r("pendingReading"));
      }
      const status =
        kind === "progress"
          ? definition.review_required
            ? "PENDING_REVIEW"
            : "APPROVED"
          : "ACTIVE";
      const saved = await saveRecord(
        user,
        development,
        kind,
        v.id,
        payload,
        operation,
        id,
        existing?.revision,
        status,
      );
      await clearDraft(user, key);
      await qc.invalidateQueries();
      toast(saved.pending ? r("pending") : r("saved"));
      if (another) {
        form.reset({
          ...defaultEntry(),
          energy_type: v.energy_type,
          unit:
            v.energy_type === "ELECTRIC"
              ? "KWH"
              : v.energy_type === "CNG"
                ? "KG"
                : "L",
        });
        setOperation(Crypto.randomUUID());
      } else {
        setLeaving(true);
        disablePrevention();
        router.back();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const createPermission =
    kind === "progress" ? "progress.submit" : `${kind}.create`;
  const allowed = id
    ? owner ||
      (existing?.created_by === user && access.data?.[`${kind}.edit_own`])
    : access.data?.[createPermission];
  if(id&&query.error)return <Screen title={r('edit')}><ErrorState message={query.error.message} retry={()=>void query.refetch()}/><AppButton secondary label={r('back')} onPress={()=>router.back()}/></Screen>;
  if(id&&!query.isPending&&!existing)return <Screen title={r('edit')}><AppText>{r('permission')}</AppText><AppButton secondary label={r('back')} onPress={()=>router.back()}/></Screen>;
  if (!v)
    return (
      <Screen title={r(kind)}>
        <EmptyState title={r("noVehicle")} />
        <AppButton label={r("back")} onPress={() => router.back()} />
      </Screen>
    );
  if (access.data && !allowed)
    return (
      <Screen title={r(kind)}>
        <AppText>{r("permission")}</AppText>
        <AppButton label={r("back")} onPress={() => router.back()} />
      </Screen>
    );
  let derived = "";
  if (kind === "fuel") {
    try {
      const solved = solveFuel(
        values.amount,
        values.quantity,
        values.unit_price,
      );
      derived = `${money(solved.amount_paise)} · ${solved.quantity} ${values.unit} · ${money(solved.unit_price_paise)}/${values.unit}`;
    } catch {}
  }
  let items: { title: string; amount_paise: number }[] = [];
  try {
    items = JSON.parse(values.items) as typeof items;
  } catch {}
  return (
    <Screen
      title={r(id ? "edit" : "add")}
      loading={!ready || busy || access.isPending}
      action={
        <View style={{ gap: 8 }}>
          <AppButton
            label={r(kind === "progress" ? "submit" : "save")}
            disabled={busy || !ready}
            onPress={() => void submit()}
          />
          {!id && kind === "fuel" && (
            <AppButton
              secondary
              label={r("saveAnother")}
              disabled={busy}
              onPress={() => void submit(true)}
            />
          )}
        </View>
      }
    >
      {id ? (
        <Card>
          <AppText>{v.nickname || v.model}</AppText>
        </Card>
      ) : (
        <VehicleHeader vehicleId={v.id} disabled={busy} onSelect={selectVehicle}/>
      )}
      {kind === "progress" ? (
        <>
          <AppText>{r("date")}</AppText>
          {field("progress_date", r("date"))}
          <AppButton
            secondary
            label={r("today")}
            onPress={() =>
              form.setValue(
                "progress_date",
                dateInZone(new Date(), v.timezone),
                { shouldDirty: true },
              )
            }
          />
          {definition.past_days >= 1 && (
            <AppButton
              secondary
              label={r("yesterday")}
              onPress={() =>
                form.setValue(
                  "progress_date",
                  shiftDay(dateInZone(new Date(), v.timezone), -1),
                  { shouldDirty: true },
                )
              }
            />
          )}
          <DynamicFields
            fields={definition.fields}
            answers={values.answers}
            owner={owner}
            onChange={(field, value) =>
              form.setValue(
                "answers",
                { ...values.answers, [field]: value },
                { shouldDirty: true },
              )
            }
          />
        </>
      ) : (
        field("event_at", r("event"))
      )}
      {kind === "fuel" && (
        <>
          {choose("energy_type", [
            "PETROL",
            "DIESEL",
            "ELECTRIC",
            "CNG",
            "HYBRID",
            "OTHER",
          ])}
          {choose("unit", ["L", "KG", "KWH"])}
          <AppButton
            secondary={!values.is_full_tank}
            label={r(values.is_full_tank ? "full" : "partial")}
            onPress={() =>
              form.setValue("is_full_tank", !values.is_full_tank, {
                shouldDirty: true,
              })
            }
          />
          {field("amount", r("amount"), true)}
          {field("quantity", r("quantity"), true)}
          {field("unit_price", r("price"), true)}
          {!!derived && (
            <Card>
              <AppText>{derived}</AppText>
            </Card>
          )}
          {field("station_name", r("station"))}
        </>
      )}
      {kind === "expenses" && (
        <>
          {field("amount", r("amount"), true)}
          {field("title", r("title"))}
          {choose("category", [
            ...expenseCategories,
            ...(categories.data ?? []),
          ])}
          {owner && (
            <Card>
              <InputField
                label={r("customCategory")}
                value={customCategory}
                onChangeText={setCustomCategory}
              />
              <AppButton
                secondary
                label={r("addCategory")}
                disabled={!customCategory.trim()}
                onPress={() => {
                  void addExpenseCategory(v.id, customCategory, development)
                    .then(() => {
                      setCustomCategory("");
                      void categories.refetch();
                    })
                    .catch((e) => setError(String(e)));
                }}
              />
            </Card>
          )}
          {values.category === "EMI" && (
            <>
              {field("principal", r("principal"), true)}
              {field("interest", r("interest"), true)}
              {metaField("lender", r("lender"))}
            </>
          )}
          {values.category === "INSURANCE" && (
            <>
              {metaField("provider", r("provider"))}
              {metaField("policy", r("policy"))}
              {metaField("start_date", r("startDate"))}
              {metaField("expiry_date", r("expiryDate"))}
            </>
          )}
          {values.category === "TYRES" && (
            <>
              {metaField("size", r("tyreSize"))}
              {metaField("position", r("position"))}
            </>
          )}
          {["SERVICE", "REPAIR", "BATTERY"].includes(values.category) && (
            <>
              {metaField("components", r("components"))}
              {access.data?.["reminders.create"] && (
                <>
                  {metaField("next_date", r("nextService"))}
                  {metaField("next_km", r("thresholdKm"))}
                  {metaField("next_hours", r("thresholdHours"))}
                </>
              )}
            </>
          )}
          <AppText>{r("items")}</AppText>
          <AppText muted>{r("itemsHelp")}</AppText>
          {items.map((item, index) => (
            <Card key={index}>
              <InputField
                label={r("itemTitle")}
                value={item.title}
                onChangeText={(title) =>
                  form.setValue(
                    "items",
                    JSON.stringify(
                      items.map((v, i) => (i === index ? { ...v, title } : v)),
                    ),
                    { shouldDirty: true },
                  )
                }
              />
              <InputField
                label={r("itemAmount")}
                value={itemAmounts[index] ?? String(item.amount_paise / 100)}
                keyboardType="decimal-pad"
                onChangeText={(text) => {
                  if (/^\d*(\.\d{0,2})?$/.test(text)) {
                    setItemAmounts((amounts) => ({
                      ...amounts,
                      [index]: text,
                    }));
                    form.setValue(
                      "items",
                      JSON.stringify(
                        items.map((v, i) =>
                          i === index
                            ? {
                                ...v,
                                amount_paise: Math.round(Number(text) * 100),
                              }
                            : v,
                        ),
                      ),
                      { shouldDirty: true },
                    );
                  }
                }}
              />
              <AppButton
                secondary
                label={r("remove")}
                onPress={() => {
                  setItemAmounts({});
                  form.setValue(
                    "items",
                    JSON.stringify(items.filter((_, i) => i !== index)),
                    { shouldDirty: true },
                  );
                }}
              />
            </Card>
          ))}
          <AppButton
            secondary
            label={r("addItem")}
            onPress={() =>
              form.setValue(
                "items",
                JSON.stringify([...items, { title: "", amount_paise: 0 }]),
                { shouldDirty: true },
              )
            }
          />
          {field("vendor", r("vendor"))}
        </>
      )}
      {kind === "documents" &&
        choose("category", [
          "RC",
          "INSURANCE",
          "PUC",
          "PERMIT",
          "FITNESS",
          "TAX",
          "LOAN",
          "OTHER",
        ])}
      {kind === "reminders" &&
        choose("category", ["SERVICE", "EMI", "INSURANCE", "OTHER"])}
      {["documents", "reminders"].includes(kind) && (
        <>
          {field("title", r("title"))}
          {field("reference", r("reference"))}
          {field("due_at", r("due"))}
        </>
      )}
      {kind === "reminders" && owner && (
        <View style={{ gap: 8 }}>
          <AppText>{r("sharePilot")}</AppText>
          <Switch
            accessibilityLabel={r("sharePilot")}
            value={values.pilot_visible}
            onValueChange={(value) =>
              form.setValue("pilot_visible", value, { shouldDirty: true })
            }
          />
        </View>
      )}
      {kind === "reminders" && (
        <>
          {field("threshold_km", r("thresholdKm"), true)}
          {field("threshold_hours", r("thresholdHours"), true)}
          {choose("recurrence", ["NONE", "MONTHLY", "YEARLY"])}
        </>
      )}
      {["fuel", "expenses"].includes(kind) &&
        choose("payment_method", ["CASH", "UPI", "CARD", "BANK", "OTHER"])}
      {["fuel", "expenses", "meters", "progress"].includes(kind) && (
        <>
          {v.meter_mode !== "HOURS" && field("km", r("distance"), true)}
          {v.meter_mode !== "KM" && field("hours", r("hours"), true)}
          {field("observed_at", r("observed"))}
          <AppText muted>{r("readingHelp")}</AppText>
        </>
      )}
      {kind === "fuel" && (values.km !== "" || values.hours !== "") && (
        <View style={{ gap: 8 }}>
          <AppText>{r("fillConfirmation")}</AppText>
          <Switch
            accessibilityLabel={r("fillConfirmation")}
            value={values.confirmed_observation}
            onValueChange={(value) =>
              form.setValue("confirmed_observation", value, {
                shouldDirty: true,
              })
            }
          />
        </View>
      )}
      {kind === "meters" && owner && (
        <View style={{ gap: 8 }}>
          <AppText>{r("reset")}</AppText>
          <Switch
            accessibilityLabel={r("reset")}
            value={values.is_reset}
            onValueChange={(value) =>
              form.setValue("is_reset", value, { shouldDirty: true })
            }
          />
        </View>
      )}
      {(kind !== "progress" || definition.notes_visible) &&
        field("notes", r("notes"))}
      <AppText muted>{r("photo")}</AppText>
      {kind === "documents" && <AppText>{r("legal")}</AppText>}
      {error && <ErrorState message={error} retry={() => setError("")} />}
      <AppButton
        secondary
        label={r("back")}
        disabled={busy}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
export function RecordDetail() {
  const { kind, id, vehicle } = useRouteKind();
  const user = useAccountId();
  const { development } = useSession();
  const query = useRecords(kind, vehicle);
  const row = query.data?.find((e) => e.id === id);
  const permissions = usePermissions(vehicle);
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const forms = useQuery({
    queryKey: [user, vehicle, "forms"],
    enabled: !!vehicle && kind === "progress",
    queryFn: () => formVersions(vehicle!, development),
  });
  const owner = permissions.data?.owner;
  const mutate = async (status: string, payload = row?.payload) => {
    if (!row || !user || !payload) return;
    setBusy(true);
    try {
      await saveRecord(
        user,
        development,
        kind,
        row.vehicle_id,
        payload,
        Crypto.randomUUID(),
        row.id,
        row.revision,
        status,
      );
      await qc.invalidateQueries();
      toast(r("saved"), "success");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const review = async (decision: string) => {
    if (!row || !user) return;
    setBusy(true);
    try {
      await reviewProgress(
        user,
        row.vehicle_id,
        row,
        decision,
        note,
        development,
      );
      await qc.invalidateQueries();
      toast(r("saved"), "success");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const editAllowed = owner||(row?.created_by===user&&permissions.data?.[`${kind}.edit_own`]&&!(kind==='progress'&&row?.status==='APPROVED'));
  return (
    <Screen title={r("detail")} loading={query.isPending || busy}>
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : row ? (
        <>
          <Card>
            <AppText large>
              {String(
                row.payload.title || row.payload.progress_date || r(kind),
              )}
            </AppText>
            <AppText>{row.status}</AppText>
            <AppText muted>
              {String(row.payload.event_at ?? row.created_at)}
            </AppText>
            {row.payload.amount_paise !== undefined && (
              <AppText large>{money(Number(row.payload.amount_paise))}</AppText>
            )}
            {kind === "fuel" && (
              <AppText>
                {String(row.payload.quantity)} {String(row.payload.unit)} ·{" "}
                {r(row.payload.is_full_tank ? "full" : "partial")}
              </AppText>
            )}
            <AppText>{String(row.payload.notes ?? "")}</AppText>
            <AppText>
              {r("author")}: {row.created_by}
            </AppText>
            <AppText>
              {r("observed")}: {String(row.payload.reading_at ?? "—")}
            </AppText>
            {row.payload.km !== null && row.payload.km !== undefined && (
              <AppText>{row.payload.km as number} KM</AppText>
            )}
            {row.payload.hours !== null && row.payload.hours !== undefined && (
              <AppText>{row.payload.hours as number} HOURS</AppText>
            )}
            {row.localStatus && (
              <AppText>
                {r(
                  row.localStatus === "PENDING"
                    ? "pending"
                    : row.localStatus === "CONFLICT"
                      ? "conflict"
                      : "rejected",
                )}
              </AppText>
            )}
          </Card>
          {kind === "progress" && (
            <>
              <DynamicFields
                fields={
                  forms.data?.find((f) => f.id === row.payload.form_version_id)
                    ?.definition.fields ?? []
                }
                answers={(row.payload.answers as Record<string, unknown>) ?? {}}
                owner={!!owner}
                onChange={() => undefined}
                readOnly
              />
              {row.payload.review_note !== undefined && (
                <AppText>{String(row.payload.review_note)}</AppText>
              )}
              {owner &&
                [
                  "PENDING_REVIEW",
                  "SUBMITTED",
                  "CORRECTION_REQUESTED",
                ].includes(row.status) && (
                  <>
                    <InputField
                      label={r("reviewNote")}
                      value={note}
                      onChangeText={setNote}
                    />
                    {(
                      ["APPROVED", "REJECTED", "CORRECTION_REQUESTED"] as const
                    ).map((decision, index) => (
                      <AppButton
                        key={decision}
                        disabled={busy}
                        label={r(
                          (["approve", "reject", "correction"] as const)[index],
                        )}
                        onPress={() => void review(decision)}
                      />
                    ))}
                  </>
                )}
            </>
          )}
          {editAllowed && !row.localStatus && (
            <AppButton
              label={r("edit")}
              onPress={() =>
                router.push({
                  pathname: "/records/[kind]/[action]",
                  params: {
                    kind,
                    action: "edit",
                    id: row.id,
                    vehicle: row.vehicle_id,
                  },
                })
              }
            />
          )}
          {(owner||["fuel","expenses"].includes(kind)&&editAllowed) && kind !== "progress" && !row.localStatus && (
            <AppButton
              secondary
              disabled={busy}
              label={r(row.status === "ARCHIVED" ? "restore" : "archive")}
              onPress={() =>
                ConfirmDialog(
                  r("archive"),
                  r("archiveBody"),
                  () =>
                    void mutate(
                      row.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
                    ),
                )
              }
            />
          )}
          {kind === "expenses" &&
            ["SERVICE", "REPAIR", "INSURANCE", "EMI"].includes(
              String(row.payload.category),
            ) && (
              <AppButton
                secondary
                label={r("reminders")}
                onPress={() =>
                  router.push({
                    pathname: "/records/[kind]/[action]",
                    params: {
                      kind: "reminders",
                      action: "add",
                      title: String(row.payload.title),
                      source: row.id,
                    },
                  })
                }
              />
            )}
          {kind === "reminders" && owner && (
            <>
              <AppButton
                label={r("complete")}
                disabled={busy}
                onPress={() => {
                  const next =
                    row.payload.due_at && row.payload.recurrence !== "NONE"
                      ? nextRecurrence(
                          String(row.payload.due_at),
                          String(row.payload.recurrence),
                        )
                      : null;
                  void mutate(
                    next ? "ACTIVE" : "COMPLETED",
                    next ? { ...row.payload, due_at: next } : row.payload,
                  );
                }}
              />
              <AppButton
                secondary
                label={r("snooze")}
                disabled={busy}
                onPress={() =>
                  void mutate("ACTIVE", {
                    ...row.payload,
                    due_at: new Date(Date.now() + 86400000).toISOString(),
                  })
                }
              />
              <AppButton
                secondary
                label={r("schedule")}
                onPress={() => {
                  void notificationPermission()
                    .then(async (permitted) => {
                      if (!permitted) {
                        toast(r("notificationDenied"));
                        return;
                      }
                      await reconcileReminders(
                        user!,
                        row.vehicle_id,
                        [row],
                        {},
                      );
                      toast(r("notificationScheduled"));
                    })
                    .catch((e) => setError(String(e)));
                }}
              />
            </>
          )}
          {kind === "documents" && (
            <>
              <AppText>{r("legal")}</AppText>
              <AppText>{r("noAttachment")}</AppText>
              <AppButton
                secondary
                label={r("official")}
                onPress={() =>
                  void Linking.openURL("https://www.digilocker.gov.in/").catch(
                    (e) => setError(String(e)),
                  )
                }
              />
            </>
          )}
        </>
      ) : (
        !query.isPending && <AppText>{r("permission")}</AppText>
      )}
      {error && <ErrorState message={error} retry={() => setError("")} />}
      <AppButton secondary label={r("back")} onPress={() => router.back()} />
    </Screen>
  );
}
export function RecordAnalytics() {
  const { kind, vehicle } = useRouteKind();
  const active = useActiveVehicle();
  const v = active.data?.find((item) => item.id === vehicle) ?? active.vehicle;
  const query = useRecords(kind, v?.id);
  const permissions = usePermissions(v?.id);
  const user = useAccountId();
  const { development } = useSession();
  const [period, setPeriod] = useState("month");
  const observations = useQuery({
    queryKey: [user, v?.id, "observations"],
    enabled: !!v && permissions.data?.["meters.read"] === true,
    queryFn: () => loadObservations(user!, v!.id, development),
  });
  const rows = filterRecords(
    query.data ?? [],
    period,
    v?.timezone ?? "Asia/Kolkata",
    kind,
  ).filter((row) => !row.localStatus && row.status !== "ARCHIVED");
  const total = rows.reduce(
    (sum, row) => sum + Number(row.payload.amount_paise ?? 0),
    0,
  );
  const operating = rows.reduce(
    (sum, row) =>
      sum +
      expenseAccounting(
        Number(row.payload.amount_paise ?? 0),
        String(row.payload.category),
        row.payload.principal_paise as number | null,
        row.payload.interest_paise as number | null,
      ).operating,
    0,
  );
  const intervals =
    kind === "fuel" && permissions.data?.["meters.read"]
      ? fuelIntervals(
          rows.map((row) => ({ id: row.id, ...row.payload }) as FuelPoint),
          observations.data ?? [],
        )
      : [];
  const grouped = (key: "category" | "month") =>
    Object.entries(
      rows.reduce<Record<string, number>>((result, row) => {
        const name =
          key === "category"
            ? String(row.payload.category ?? "OTHER")
            : dateInZone(
                new Date(String(row.payload.event_at ?? row.created_at)),
                v?.timezone ?? "Asia/Kolkata",
              ).slice(0, 7);
        result[name] =
          (result[name] ?? 0) + Number(row.payload.amount_paise ?? 0);
        return result;
      }, {}),
    );
  return (
    <Screen
      title={r("analytics")}
      loading={!!v&&(query.isPending || permissions.isPending)}
    >
      <VehicleHeader />
      {permissions.data && !permissions.data["reports.read"] ? (
        <AppText>{r("permission")}</AppText>
      ) : (
        <>
          {(["week", "month", "year", "all"] as const).map((p) => (
            <AppButton
              key={p}
              secondary={period !== p}
              label={r(p)}
              onPress={() => setPeriod(p)}
            />
          ))}
          {query.error ? (
            <ErrorState
              message={query.error.message}
              retry={() => void query.refetch()}
            />
          ) : (
            <>
              <Card>
                <AppText>
                  {r("confirmed")}: {rows.length}
                </AppText>
                {["fuel", "expenses"].includes(kind) && (
                  <>
                    <AppText>
                      {r("cash")}: {money(total)}
                    </AppText>
                    {kind === "expenses" && (
                      <AppText>
                        {r("operating")}: {money(operating)}
                      </AppText>
                    )}
                  </>
                )}
              </Card>
              {kind === "fuel" && (
                <>
                  <AppText large>{r("efficiency")}</AppText>
                  {intervals.length ? (
                    intervals.map((interval, index) => (
                      <Card key={index}>
                        <AppText>
                          {interval.from} → {interval.to}
                        </AppText>
                        <AppText>
                          {interval.distance === null
                            ? r("unknown")
                            : `${interval.distance} KM · ${interval.kmPerUnit?.toFixed(2)} KM/${interval.unit}`}
                        </AppText>
                        {interval.unit === "KWH" &&
                          interval.distance !== null && (
                            <AppText>
                              {(
                                (interval.quantity / interval.distance) *
                                100
                              ).toFixed(2)}{" "}
                              KWH/100 KM
                            </AppText>
                          )}
                        {interval.unitsPerHour !== null && (
                          <AppText>
                            {interval.unitsPerHour.toFixed(2)} {interval.unit}
                            /HOURS
                          </AppText>
                        )}
                        {interval.costPerKm !== null && (
                          <AppText>
                            {r("costKm")}: {money(interval.costPerKm)}
                          </AppText>
                        )}
                      </Card>
                    ))
                  ) : (
                    <AppText>{r("unknown")}</AppText>
                  )}
                </>
              )}
              {kind === "expenses" && (
                <>
                  <AppText large>{r("byCategory")}</AppText>
                  {grouped("category").map(([category, value]) => (
                    <Card key={category}>
                      <AppText>
                        {r(category as keyof typeof recordCopy) ?? category}
                      </AppText>
                      <AppText>{money(value)}</AppText>
                      <View
                        accessible={false}
                        style={{
                          height: 8,
                          width: `${total ? Math.max(1, (value / total) * 100) : 0}%`,
                          backgroundColor: "#147D69",
                          borderRadius: 4,
                        }}
                      />
                    </Card>
                  ))}
                </>
              )}
              <AppText large>{r("monthly")}</AppText>
              {grouped("month").map(([month, value]) => (
                <Card key={month}>
                  <AppText>{month}</AppText>
                  <AppText>{money(value)}</AppText>
                </Card>
              ))}
            </>
          )}
        </>
      )}
      <AppButton secondary label={r("back")} onPress={() => router.back()} />
    </Screen>
  );
}
