import { RecordSavedDialog } from "./RecordSavedDialog";
import { releaseFeatures, supportsVehicle } from "@/src/features/release/scope";
import { DeferredFeature } from "@/src/features/release/DeferredFeature";
import { DropdownField } from "@/src/components/ui/DropdownField";
import { AdditionalOptions } from "@/src/components/ui/AdditionalOptions";
import { ZodError } from "zod";
import { errorMessage } from "@/src/lib/errors";
import { Timestamp, TimestampRange } from "@/src/components/ui/Timestamp";
import { readableDateTime } from "@/src/utils/dateDisplay";
import {
  allowedFuelTypes,
  defaultFuel,
  fuelUnit,
  permittedFuel,
} from "@/src/features/garage/energy";
import { RecordCard, RecordSummary, recordVisuals } from "./RecordCard";
import { SearchField } from "@/src/components/ui/SearchField";
import { FilterChips } from "@/src/components/ui/FilterChips";
import {
  SectionHeading,
  TextAction,
  Expandable,
  ChoiceChip,
  InfoRows,
  ColorIcon,
  GradientButton,
} from "@/src/components/ui/premium";
import { t } from "@/src/lib/i18n";
import { DateTimeInput } from "@/src/components/ui/fields";
import { observations as loadObservations } from "@/src/features/meters/api";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Linking, View, Switch } from "react-native";
import { router, useLocalSearchParams, usePreventRemove } from "expo-router";
import * as Crypto from "expo-crypto";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/src/lib/query";
import {
  Screen,
  Sheet,
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
import { money, solveFuel } from "@/src/utils/money";
import { fuelIntervals, type FuelPoint } from "@/src/utils/fuelEconomy";
import { expenseAccounting } from "@/src/utils/expenseAccounting";
import {
  recordAudit,
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
const metadataLabels: Record<string, string> = {
  start_date: "startDate",
  expiry_date: "expiryDate",
  next_date: "nextService",
  next_km: "thresholdKm",
  next_hours: "thresholdHours",
  size: "tyreSize",
};
export function useRouteKind(fixed?: Kind) {
  const params = useLocalSearchParams<{
    kind: string;
    id?: string;
    vehicle?: string;
    title?: string;
    action?: string;
    source?: string;
    category?: string;
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
  const { kind, vehicle: contextVehicle } = useRouteKind(fixedKind);
  const active = useActiveVehicle();
  const v = contextVehicle
    ? active.data?.find((vehicle) => vehicle.id === contextVehicle)
    : active.vehicle;
  const query = useRecords(kind, v?.id);
  const permissions = usePermissions(v?.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? "ALL");
  const [period, setPeriod] = useState(
    ["documents", "reminders", "meters"].includes(kind) ? "all" : "month",
  );
  const [limit, setLimit] = useState(30);
  const [showArchived, setShowArchived] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(!!initialStatus);
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
  const confirmed = rows.filter((row) => row.status !== "ARCHIVED");
  return (
    <Screen
      title={
        kind === "fuel" && v?.energy_type === "ELECTRIC"
          ? t("charging")
          : r(kind)
      }
      compact
      loading={
        active.isPending || (!!v && (permissions.isPending || query.isPending))
      }
    >
      <VehicleHeader vehicleId={v?.id} allowSwitch={!contextVehicle} />
      {active.error && (
        <ErrorState
          message={active.error.message}
          retry={() => void active.refetch()}
        />
      )}
      {permissions.error && (
        <ErrorState
          message={permissions.error.message}
          retry={() => void permissions.refetch()}
        />
      )}
      {!v ? (
        <EmptyState title={r("noVehicle")} />
      ) : (
        <>
          <SectionHeading
            title={t("uiRecords")}
            action={
              !["fuel", "expenses"].includes(kind) &&
              canCreate &&
              !v.archived_at
                ? r("add")
                : undefined
            }
            onAction={() => go(kind, "add", v.id)}
          />
          {["fuel", "expenses"].includes(kind) &&
            canCreate &&
            !v.archived_at && (
              <GradientButton
                label={r("addRecord")}
                onPress={() => go(kind, "add", v.id)}
              />
            )}
          {["fuel", "expenses"].includes(kind) &&
            permissions.data?.[`${kind}.read`] && (
              <RecordSummary
                kind={kind}
                value={
                  query.isPending || query.error
                    ? "—"
                    : money(
                        confirmed.reduce(
                          (sum, row) =>
                            sum + Number(row.payload.amount_paise ?? 0),
                          0,
                        ),
                      )
                }
                subtitle={`${r("cash")} · ${r(period as keyof typeof recordCopy)} · ${confirmed.length} ${r("confirmed")}`}
              />
            )}
          <SearchField
            label={r("search")}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setLimit(30);
            }}
          />
          <FilterChips
            items={["week", "month", "year", "all"].map((id) => ({
              id,
              label: r(id as keyof typeof recordCopy),
            }))}
            value={period}
            onChange={(value) => {
              setPeriod(value);
              setLimit(30);
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AppText muted>
              {rows.length} {t("uiRecords")}
            </AppText>
            <TextAction
              label={t("uiFilters")}
              icon={showFilters ? "chevron-up" : "options-outline"}
              onPress={() => setShowFilters((value) => !value)}
            />
          </View>
          <Expandable expanded={showFilters}>
            <View style={{ gap: 10 }}>
              {kind === "progress" && (
                <FilterChips
                  items={[
                    "ALL",
                    "PENDING_REVIEW",
                    "APPROVED",
                    "REJECTED",
                    "CORRECTION_REQUESTED",
                  ].map((id) => ({
                    id,
                    label: r(id as keyof typeof recordCopy) ?? id,
                  }))}
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setLimit(30);
                  }}
                />
              )}
              {kind !== "fuel" && kind !== "expenses" && (
                <ChoiceChip
                  label={r(showArchived ? "hideArchived" : "showArchived")}
                  selected={showArchived}
                  onPress={() => setShowArchived((value) => !value)}
                />
              )}
              {releaseFeatures.advancedTools &&
                permissions.data?.["reports.read"] && (
                  <TextAction
                    label={r("analytics")}
                    icon="stats-chart"
                    onPress={() => go(kind, "analytics", v.id)}
                  />
                )}
            </View>
          </Expandable>
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
          ) : kind === "fuel" || kind === "expenses" ? (
            <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
              {rows.slice(0, limit).map((row, index) => (
                <RecordCard
                  key={row.id}
                  row={row}
                  kind={kind}
                  timezone={v.timezone}
                  separated={index > 0}
                  onPress={() => setDetailId(row.id)}
                />
              ))}
            </Card>
          ) : (
            rows
              .slice(0, limit)
              .map((row) => (
                <RecordCard
                  key={row.id}
                  row={row}
                  kind={kind}
                  timezone={v.timezone}
                  onPress={() => go(kind, row.id, v.id)}
                />
              ))
          )}
          {detailId && v && (
            <Sheet visible onClose={() => setDetailId(null)}>
              <RecordDetail
                context={{ kind, id: detailId, vehicle: v.id }}
                onClose={() => setDetailId(null)}
              />
            </Sheet>
          )}
          {rows.length > limit && (
            <TextAction
              label={r("more")}
              icon="chevron-down"
              onPress={() => setLimit((value) => value + 30)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
export function RecordForm() {
  const {
    kind,
    vehicle: routeVehicle,
    id,
    title,
    source,
    category,
  } = useRouteKind();
  const { development } = useSession();
  const user = useAccountId();
  const active = useActiveVehicle();
  const vehicles = useVehicles();
  const [boundVehicle, setBoundVehicle] = useState<string | null>(
    routeVehicle ?? null,
  );
  const vehicle = id
    ? vehicles.data?.find((v) => v.id === routeVehicle)
    : boundVehicle
      ? vehicles.data?.find((v) => v.id === boundVehicle)
      : active.vehicle;
  const v = vehicle;
  const query = useRecords(kind, v?.id);
  const existing = query.data?.find((e) => e.id === id);
  const access = usePermissions(v?.id);
  const qc = useQueryClient();
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const completeFuel = useCallback(() => {
    router.replace("/(tabs)/fuel");
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [operation, setOperation] = useState(() => Crypto.randomUUID());
  const [customCategory, setCustomCategory] = useState("");
  const [itemAmounts, setItemAmounts] = useState<Record<number, string>>({});
  const form = useForm<EntryForm>({ defaultValues: defaultEntry() });
  const values = useWatch({ control: form.control }) as EntryForm;
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
  const meterHistory = useQuery({
    queryKey: [user, v?.id, "meter-history-for-entry"],
    enabled:
      !!user &&
      !!v &&
      kind === "meters" &&
      !id &&
      !!access.data?.["meters.read"],
    queryFn: () => loadObservations(user!, v!.id, development),
  });
  const previousReading = (type: "KM" | "HOURS") =>
    meterHistory.data
      ?.filter(
        (reading) =>
          reading.reading_type === type &&
          Date.parse(reading.observed_at) < Date.parse(values.observed_at),
      )
      .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
  const categories = useQuery({
    queryKey: [user, v?.id, "expense-categories"],
    enabled: !!v && kind === "expenses",
    queryFn: () => loadCategories(v!.id, development),
  });
  useEffect(() => {
    if (kind === "progress" && ready && !values.form_version_id) {
      const version = forms.data?.find((form) => form.published);
      if (version) form.setValue("form_version_id", version.id);
    }
  }, [kind, ready, values.form_version_id, forms.data, form]);
  useEffect(() => {
    if (ready || !user || !v || (id && (query.isPending || query.error)))
      return;
    if (existing) form.reset(formFromRecord(existing, v.timezone));
    else
      form.reset({
        ...defaultEntry(),
        title: title ?? "",
        category:
          kind === "expenses" && category === "SERVICE" ? "SERVICE" : "OTHER",
        metadata: source ? JSON.stringify({ expense_id: source }) : "{}",
        ...defaultFuel(v.energy_type),
        progress_date: dateInZone(new Date(), v.timezone),
      });
    // Bind the editable form once to the server-confirmed vehicle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoundVehicle(v.id);
    setReady(true);
  }, [
    ready,
    user,
    v,
    id,
    query.isPending,
    query.error,
    existing,
    form,
    title,
    source,
    category,
    kind,
  ]);
  const disablePrevention = usePreventRemove(
    form.formState.isDirty && !leaving,
    ({ repeat }) =>
      ConfirmDialog(
        t("unsaved"),
        t("unsavedBody"),
        () => {
          setLeaving(true);
          repeat();
        },
        { cancelLabel: t("keepEditing"), confirmLabel: t("leaveForm") },
      ),
  );
  const field = (name: keyof EntryForm, label: string, numeric = false) => {
    const required =
      (name === "title" &&
        ["expenses", "documents", "reminders"].includes(kind)) ||
      (["fuel", "expenses"].includes(kind) && name === "event_at") ||
      (kind === "progress" && name === "progress_date") ||
      (name === "notes" && kind === "progress" && definition.notes_required) ||
      (name === "km" && kind === "progress" && definition.km_required) ||
      (name === "hours" && kind === "progress" && definition.hours_required) ||
      (name === "km" && kind === "meters" && v?.meter_mode === "KM") ||
      (name === "hours" && kind === "meters" && v?.meter_mode === "HOURS") ||
      (name === "due_at" &&
        kind === "documents" &&
        metadata.create_reminder === true) ||
      (name === "observed_at" && (values.km !== "" || values.hours !== ""));
    const fuelRequired =
      kind === "fuel" && ["amount", "quantity"].includes(name);
    const money = ["amount", "unit_price", "principal", "interest"].includes(
      name,
    );
    return (
      <Controller
        key={name}
        control={form.control}
        name={name}
        render={({ field: { value, onChange } }) =>
          ["event_at", "observed_at", "due_at", "progress_date"].includes(
            name,
          ) ? (
            <DateTimeInput
              label={label}
              value={String(value ?? "")}
              onChange={onChange}
              allowFuture={name === "due_at"}
              mode={name === "progress_date" ? "date" : "datetime"}
              required={required}
              optional={!required}
              error={
                typeof form.formState.errors[name]?.message === "string"
                  ? String(form.formState.errors[name]?.message)
                  : undefined
              }
            />
          ) : (
            <InputField
              label={label}
              required={
                required ||
                fuelRequired ||
                (kind === "expenses" && name === "amount")
              }
              optional={
                !required &&
                !fuelRequired &&
                !(kind === "expenses" && name === "amount") &&
                !(kind === "meters" && ["km", "hours"].includes(name))
              }
              value={String(value ?? "")}
              onChangeText={onChange}
              keyboardType={numeric ? "decimal-pad" : "default"}
              numeric={
                numeric
                  ? { scale: money ? 2 : 3, wholeDigits: money ? 15 : 12 }
                  : undefined
              }
              maxLength={
                name === "notes"
                  ? 3000
                  : ["title", "vendor", "station_name", "reference"].includes(
                        name,
                      )
                    ? 160
                    : undefined
              }
              error={
                typeof form.formState.errors[name]?.message === "string"
                  ? String(form.formState.errors[name]?.message)
                  : undefined
              }
            />
          )
        }
      />
    );
  };
  const choose = (
    name: "category" | "unit" | "payment_method" | "recurrence" | "energy_type",
    options: readonly string[],
  ) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => (
        <ChoiceChip
          key={option}
          label={r(option as keyof typeof recordCopy) ?? option}
          selected={values[name] === option}
          onPress={() => {
            const apply = () => {
              form.setValue(name, option as never, { shouldDirty: true });
              if (name === "category" && kind === "expenses") {
                form.setValue("metadata", "{}", { shouldDirty: true });
                form.setValue("principal", "", { shouldDirty: true });
                form.setValue("interest", "", { shouldDirty: true });
              }
            };
            if (
              name === "category" &&
              kind === "expenses" &&
              values.category !== option &&
              (values.metadata !== "{}" || values.principal || values.interest)
            )
              ConfirmDialog(r("category"), t("categoryChanges"), apply);
            else if (values[name] !== option) apply();
          }}
        />
      ))}
    </View>
  );
  const updateMeta = (name: string, value: string | boolean) => {
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
    if (
      ["start_date", "expiry_date", "next_date", "reminder_due_at"].includes(
        name,
      )
    )
      return (
        <DateTimeInput
          key={name}
          label={label}
          value={String(meta[name] ?? "")}
          mode={
            ["next_date", "reminder_due_at"].includes(name)
              ? "datetime"
              : "date"
          }
          allowFuture
          required={name === "reminder_due_at"}
          optional={name !== "reminder_due_at"}
          onChange={(value) => updateMeta(name, value)}
        />
      );
    return (
      <InputField
        key={name}
        label={label}
        optional
        keyboardType={
          ["next_km", "next_hours"].includes(name) ? "decimal-pad" : "default"
        }
        numeric={
          ["next_km", "next_hours"].includes(name) ? { scale: 3 } : undefined
        }
        maxLength={160}
        value={String(meta[name] ?? "")}
        onChangeText={(value) => updateMeta(name, value)}
      />
    );
  };
  const selectVehicle = (nextId: string) => {
    if (busy || !v || !user || nextId === v.id) return;
    const next = vehicles.data?.find((item) => item.id === nextId);
    if (!next) return;
    ConfirmDialog(r("switchVehicle"), r("vehicleChanged"), () => {
      form.reset(
        {
          ...values,
          km: next.meter_mode === "HOURS" ? "" : values.km,
          hours: next.meter_mode === "KM" ? "" : values.hours,
          ...defaultFuel(next.energy_type),
          ...(kind === "fuel"
            ? { quantity: "", unit_price: "", is_full_tank: false }
            : {}),
          answers: kind === "progress" ? {} : values.answers,
          form_version_id: "",
        },
        { keepDefaultValues: true },
      );
      setBoundVehicle(nextId);
      active.select(nextId);
      setOperation(Crypto.randomUUID());
      toast(r("vehicleChanged"), "info");
    });
  };
  const submit = async (another = false) => {
    if (busy || saved || !user || !v) return;
    setBusy(true);
    setError("");
    try {
      if (
        kind === "fuel" &&
        (!values.amount.trim() || !values.quantity.trim())
      ) {
        if (!values.amount.trim())
          form.setError("amount", { message: t("requiredValue") });
        if (!values.quantity.trim())
          form.setError("quantity", { message: t("requiredValue") });
        throw new Error(t("fuelPrimaryRequired"));
      }
      if (
        kind === "fuel" &&
        (!permittedFuel(v.energy_type, values.energy_type, existing?.payload) ||
          values.unit !== fuelUnit(values.energy_type))
      )
        throw new Error(t("fuelMismatch"));
      form.clearErrors();
      if (kind === "meters" && !id) {
        for (const [key, type] of [
          ["km", "KM"],
          ["hours", "HOURS"],
        ] as const) {
          const previous = previousReading(type);
          if (values[key] && previous && Number(values[key]) < previous.value) {
            const message = t("readingBelowPrevious").replace(
              "{value}",
              `${previous.value} ${type}`,
            );
            form.setError(key, { message });
            throw new Error(message);
          }
        }
      }
      const payload = entryPayload(kind, form.getValues(), {
        meterMode: v.meter_mode,
        original: existing?.payload,
        kmRequired: kind === "progress" && definition.km_required,
        hoursRequired: kind === "progress" && definition.hours_required,
        notesRequired: kind === "progress" && definition.notes_required,
      });
      if (kind === "progress") {
        const version = forms.data?.find(
          (f) =>
            f.id ===
            (existing
              ? existing.payload.form_version_id
              : values.form_version_id),
        );
        if (!existing && version && !version.published)
          throw new Error(r("formChanged"));
        if (!version) throw new Error(r("formChanged"));
        if (!(
          existing &&
          owner &&
          values.progress_date === existing.payload.progress_date
        ))
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
      await saveRecord(
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
      await qc.invalidateQueries();
      if (kind === "fuel") {
        active.select(v.id);
        setLeaving(true);
        disablePrevention();
        setSaved(true);
        return;
      }
      toast(r("saved"), "success");
      if (another) {
        form.reset({
          ...defaultEntry(),
          ...defaultFuel(v.energy_type),
        });
        setOperation(Crypto.randomUUID());
      } else {
        setLeaving(true);
        disablePrevention();
        router.back();
      }
    } catch (e) {
      if (
        e instanceof ZodError &&
        e.issues.some((issue) =>
          [
            "metadata",
            "items",
            "vendor",
            "station_name",
            "principal",
            "interest",
            "due_at",
            "reference",
            "threshold_km",
            "threshold_hours",
            "recurrence",
            "notes",
            "km",
            "hours",
            "observed_at",
          ].includes(String(issue.path[0])),
        )
      )
        setAdditionalOpen(true);
      if (kind === "progress" && !(e instanceof ZodError))
        setAdditionalOpen(true);
      if (e instanceof ZodError)
        for (const issue of e.issues) {
          const name = issue.path[0];
          if (typeof name === "string")
            form.setError(name as keyof EntryForm, {
              type: "validate",
              message: issue.message,
            });
        }
      setError(errorMessage(e));
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
  if (id && query.error)
    return (
      <Screen title={r("edit")}>
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
        <AppButton secondary label={r("back")} onPress={() => router.back()} />
      </Screen>
    );
  if (id && !query.isPending && !existing)
    return (
      <Screen title={r("edit")}>
        <AppText>{r("permission")}</AppText>
        <AppButton secondary label={r("back")} onPress={() => router.back()} />
      </Screen>
    );
  if (!v)
    return (
      <Screen title={r(kind)}>
        {vehicles.error ? (
          <ErrorState
            message={vehicles.error.message}
            retry={() => void vehicles.refetch()}
          />
        ) : vehicles.isPending ? (
          <Skeleton />
        ) : (
          <EmptyState title={r("noVehicle")} />
        )}
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
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(values.metadata);
  } catch {}
  let items: { title: string; amount_paise: number }[] = [];
  try {
    items = JSON.parse(values.items) as typeof items;
  } catch {}
  const readingEditor = (
    <>
      {" "}
      {["fuel", "expenses", "meters", "progress"].includes(kind) && (
        <Card style={{ padding: 16, gap: 12 }}>
          <SectionHeading title={r("meters")} />
          <AppText muted>
            {t(
              kind === "meters"
                ? "meterOnlyTime"
                : kind === "progress" &&
                    (definition.km_required || definition.hours_required)
                  ? "progressMeterPolicy"
                  : "optionalMeters",
            )}
          </AppText>
          {existing &&
            ((v.meter_mode === "HOURS" && values.km !== "") ||
              (v.meter_mode === "KM" && values.hours !== "")) && (
              <AppText muted>{t("legacyReading")}</AppText>
            )}
          {kind === "meters" && !id && meterHistory.error && (
            <ErrorState
              message={meterHistory.error.message}
              retry={() => void meterHistory.refetch()}
            />
          )}
          {kind === "meters" &&
            !id &&
            previousReading("KM") &&
            v.meter_mode !== "HOURS" && (
              <AppText muted>
                {t("lastMeterReading").replace(
                  "{value}",
                  `${previousReading("KM")!.value} KM`,
                )}
              </AppText>
            )}
          {v.meter_mode !== "HOURS" && field("km", r("distance"), true)}
          {kind === "meters" &&
            !id &&
            previousReading("HOURS") &&
            v.meter_mode !== "KM" && (
              <AppText muted>
                {t("lastMeterReading").replace(
                  "{value}",
                  `${previousReading("HOURS")!.value} HOURS`,
                )}
              </AppText>
            )}
          {v.meter_mode !== "KM" && field("hours", r("hours"), true)}
          {values.km !== "" || values.hours !== "" ? (
            field("observed_at", r("observed"))
          ) : (
            <AppText muted>{t("optionalObservation")}</AppText>
          )}
          <AppText muted>{r("readingHelp")}</AppText>
        </Card>
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
    </>
  );
  if (v && !supportsVehicle(v.category)) return <DeferredFeature />;
  return (
    <Screen
      compact
      title={`${r(id ? "edit" : "add")} · ${kind === "fuel" && v?.energy_type === "ELECTRIC" ? t("charging") : r(kind)}`}
      loading={
        !ready ||
        busy ||
        access.isPending ||
        (kind === "progress" && forms.isPending)
      }
      action={
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <View style={{ flex: 1, minWidth: 130 }}>
            <GradientButton
              label={r(kind === "progress" ? "submit" : "save")}
              disabled={
                busy ||
                saved ||
                !ready ||
                (kind === "progress" &&
                  (forms.isPending || !values.form_version_id))
              }
              onPress={() => void submit()}
            />
          </View>
        </View>
      }
    >
      {saved && <RecordSavedDialog onContinue={completeFuel} />}
      {id ? (
        <VehicleHeader vehicleId={v.id} allowSwitch={false} />
      ) : (
        <VehicleHeader
          vehicleId={v.id}
          disabled={busy}
          onSelect={selectVehicle}
        />
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <ColorIcon
          name={recordVisuals[kind].icon}
          tone={recordVisuals[kind].tone}
        />
        <AppText large>{r(kind)}</AppText>
      </View>
      {kind === "progress" &&
        !id &&
        values.form_version_id &&
        forms.data?.find((f) => f.id === values.form_version_id)?.published ===
          false && (
          <Card>
            <AppText>{r("formChanged")}</AppText>
            <AppButton
              secondary
              label={r("reviewCurrentForm")}
              onPress={() =>
                ConfirmDialog(
                  r("reviewCurrentForm"),
                  r("reviewNewVersion"),
                  () => {
                    form.setValue("answers", {});
                    form.setValue(
                      "form_version_id",
                      forms.data!.find((f) => f.published)!.id,
                    );
                    setOperation(Crypto.randomUUID());
                  },
                )
              }
            />
          </Card>
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
            fields={definition.fields.filter((field) => field.required)}
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
      ) : null}
      {kind === "fuel" && (
        <>
          <Card style={{ padding: 16, gap: 10 }}>
            <AppText>
              {t("uiEnergyType")}:{" "}
              {r(values.energy_type as keyof typeof recordCopy) ??
                values.energy_type}{" "}
              · {values.unit}
            </AppText>
            {["HYBRID", "DIESEL_HYBRID"].includes(v.energy_type) && (
              <AppText muted>{t("fuelHybridHelp")}</AppText>
            )}
            {allowedFuelTypes(v.energy_type).length > 1 && (
              <FilterChips
                items={allowedFuelTypes(v.energy_type).map((id) => ({
                  id,
                  label: r(id),
                }))}
                value={values.energy_type}
                onChange={(type) => {
                  if (
                    type === values.energy_type ||
                    !allowedFuelTypes(v.energy_type).some(
                      (fuel) => fuel === type,
                    )
                  )
                    return;
                  const apply = () => {
                    form.setValue("energy_type", type, { shouldDirty: true });
                    form.setValue("unit", fuelUnit(type), {
                      shouldDirty: true,
                    });
                    form.setValue("quantity", "", { shouldDirty: true });
                    form.setValue("unit_price", "", { shouldDirty: true });
                    form.setValue("is_full_tank", false, { shouldDirty: true });
                  };
                  if (values.quantity || values.unit_price)
                    ConfirmDialog(
                      t("uiEnergyType"),
                      t("fuelSwitchAmounts"),
                      apply,
                    );
                  else apply();
                }}
              />
            )}
            {(!permittedFuel(
              v.energy_type,
              values.energy_type,
              existing?.payload,
            ) ||
              values.unit !== fuelUnit(values.energy_type)) && (
              <AppText>{t("fuelChanged")}</AppText>
            )}
            {existing &&
              !allowedFuelTypes(v.energy_type).some(
                (fuel) => fuel === existing.payload.energy_type,
              ) && <AppText muted>{t("fuelHistorical")}</AppText>}
            {(!permittedFuel(
              v.energy_type,
              values.energy_type,
              existing?.payload,
            ) ||
              values.unit !== fuelUnit(values.energy_type)) && (
              <TextAction
                label={r("edit")}
                onPress={() => {
                  const next = defaultFuel(v.energy_type);
                  form.setValue("energy_type", next.energy_type, {
                    shouldDirty: true,
                  });
                  form.setValue("unit", next.unit, { shouldDirty: true });
                  form.setValue("quantity", "", { shouldDirty: true });
                  form.setValue("unit_price", "", { shouldDirty: true });
                }}
              />
            )}
          </Card>
          <AppText muted>{t("fuelQuickHelp")}</AppText>
          {field("amount", r("amount"), true)}
          {field(
            "quantity",
            t(
              values.unit === "KWH"
                ? "chargeQuantity"
                : values.unit === "KG"
                  ? "massQuantity"
                  : "volumeQuantity",
            ),
            true,
          )}
          {!!derived && <AppText muted>{derived}</AppText>}
        </>
      )}
      {kind === "expenses" && (
        <>
          {field("amount", r("amount"), true)}
          {field("title", r("title"))}
          <DropdownField
            label={r("category")}
            value={values.category}
            disabled={busy}
            options={[
              ...new Set([...expenseCategories, ...(categories.data ?? [])]),
            ].map((category) => ({
              value: category,
              label: r(category as keyof typeof recordCopy) ?? category,
            }))}
            onChange={(category) =>
              form.setValue("category", category, { shouldDirty: true })
            }
          />
        </>
      )}
      {["fuel", "expenses"].includes(kind) && field("event_at", r("event"))}
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
      {["documents", "reminders"].includes(kind) && field("title", r("title"))}
      {kind === "reminders" && field("due_at", r("due"))}
      {(kind === "meters" ||
        (kind === "progress" &&
          (definition.km_required || definition.hours_required))) &&
        readingEditor}
      {kind === "progress" &&
        definition.notes_visible &&
        definition.notes_required &&
        field("notes", r("notes"))}
      {kind === "fuel" && !values.km && !values.hours && (
        <AppText muted>{r("pendingReading")}</AppText>
      )}
      <AdditionalOptions
        compact={["fuel", "expenses"].includes(kind)}
        open={additionalOpen}
        onToggle={() => setAdditionalOpen((value) => !value)}
      >
        {kind === "fuel" && (
          <>
            <FilterChips
              items={[
                {
                  id: "partial",
                  label: r(
                    values.energy_type === "ELECTRIC"
                      ? "partialCharge"
                      : "partial",
                  ),
                },
                {
                  id: "full",
                  label: r(
                    values.energy_type === "ELECTRIC" ? "fullCharge" : "full",
                  ),
                },
              ]}
              value={values.is_full_tank ? "full" : "partial"}
              onChange={(value) => {
                if (!busy)
                  form.setValue("is_full_tank", value === "full", {
                    shouldDirty: true,
                  });
              }}
            />
            {field(
              "unit_price",
              t(
                values.unit === "KWH"
                  ? "chargePrice"
                  : values.unit === "KG"
                    ? "massPrice"
                    : "volumePrice",
              ),
              true,
            )}
            {field("station_name", r("station"))}
          </>
        )}
        {kind === "expenses" && (
          <>
            {owner && (
              <Card>
                <InputField
                  label={r("customCategory")}
                  required
                  maxLength={60}
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
                {releaseFeatures.advancedTools &&
                  access.data?.["reminders.create"] && (
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
                  required
                  maxLength={160}
                  value={item.title}
                  onChangeText={(title) =>
                    form.setValue(
                      "items",
                      JSON.stringify(
                        items.map((v, i) =>
                          i === index ? { ...v, title } : v,
                        ),
                      ),
                      { shouldDirty: true },
                    )
                  }
                />
                <InputField
                  label={r("itemAmount")}
                  required
                  numeric={{ scale: 2, wholeDigits: 15 }}
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
        {kind === "documents" && (
          <>
            {field("reference", r("reference"))}
            {field("due_at", t("documentExpiry"))}
          </>
        )}
        {(kind === "documents" ||
          (kind === "expenses" && values.category === "EMI")) &&
          releaseFeatures.advancedTools &&
          access.data?.["reminders.create"] && (
            <Card style={{ padding: 16, gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText>{t("linkedReminder")}</AppText>
                </View>
                <Switch
                  accessibilityLabel={t("linkedReminder")}
                  value={metadata.create_reminder === true}
                  onValueChange={(value) =>
                    updateMeta("create_reminder", value)
                  }
                />
              </View>
              {metadata.create_reminder === true && (
                <>
                  <AppText muted>{t("linkedReminderHelp")}</AppText>
                  <AppText muted>{t("linkedOwnerOnly")}</AppText>
                  {kind === "expenses" && (
                    <>
                      {metaField("reminder_due_at", t("nextEmiDue"))}
                      <FilterChips
                        items={(["NONE", "MONTHLY", "YEARLY"] as const).map(
                          (id) => ({ id, label: r(id) }),
                        )}
                        value={String(
                          metadata.reminder_recurrence ?? "MONTHLY",
                        )}
                        onChange={(value) =>
                          updateMeta("reminder_recurrence", value)
                        }
                      />
                    </>
                  )}
                </>
              )}
            </Card>
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
            {v.meter_mode !== "HOURS" &&
              field("threshold_km", r("thresholdKm"), true)}
            {v.meter_mode !== "KM" &&
              field("threshold_hours", r("thresholdHours"), true)}
            {choose("recurrence", ["NONE", "MONTHLY", "YEARLY"])}
          </>
        )}
        {["fuel", "expenses"].includes(kind) &&
          choose("payment_method", ["CASH", "UPI", "CARD", "BANK", "OTHER"])}
        {(kind === "fuel" ||
          kind === "expenses" ||
          (kind === "progress" &&
            !definition.km_required &&
            !definition.hours_required)) &&
          readingEditor}
        {(kind !== "progress" ||
          (definition.notes_visible && !definition.notes_required)) &&
          field("notes", r("notes"))}
        {kind === "progress" && (
          <DynamicFields
            fields={definition.fields.filter((field) => !field.required)}
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
        )}
        <AppText muted>{r("photo")}</AppText>
        {kind === "documents" && (
          <>
            <AppText>{r("legal")}</AppText>
            <AppText muted>{t("documentStorage")}</AppText>
          </>
        )}
      </AdditionalOptions>
      {kind === "documents" && <AppText muted>{r("noAttachment")}</AppText>}
      {kind === "progress" && forms.error && (
        <ErrorState
          message={forms.error.message}
          retry={() => void forms.refetch()}
        />
      )}
      {access.error && (
        <ErrorState
          message={access.error.message}
          retry={() => void access.refetch()}
        />
      )}
      {error && <ErrorState message={error} retry={() => void submit()} />}
    </Screen>
  );
}
function DetailContainer({
  children,
  embedded,
  title,
  loading,
}: {
  children: ReactNode;
  embedded: boolean;
  title: string;
  loading: boolean;
}) {
  return embedded ? (
    <View style={{ gap: 12 }}>
      <AppText large>{title}</AppText>
      {loading && <Skeleton />}
      {children}
    </View>
  ) : (
    <Screen compact title={title} loading={loading}>
      {children}
    </Screen>
  );
}
export function RecordDetail({
  context,
  onClose,
}: {
  context?: { kind: Kind; id: string; vehicle: string };
  onClose?: () => void;
} = {}) {
  const route = useRouteKind();
  const { kind, id, vehicle } = context ?? route;
  const user = useAccountId();
  const { development } = useSession();
  const query = useRecords(kind, vehicle);
  const vehicleQuery = useVehicles();
  const timezone =
    vehicleQuery.data?.find((item) => item.id === vehicle)?.timezone ??
    "Asia/Kolkata";
  const row = query.data?.find((e) => e.id === id);
  const permissions = usePermissions(vehicle);
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mutationOperation, setMutationOperation] = useState(() =>
    Crypto.randomUUID(),
  );
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const forms = useQuery({
    queryKey: [user, vehicle, "forms"],
    enabled: !!vehicle && kind === "progress",
    queryFn: () => formVersions(vehicle!, development),
  });
  const owner = permissions.data?.owner;
  const audit = useQuery({
    queryKey: [user, vehicle, "record-audit", id],
    enabled:
      !!vehicle &&
      !!id &&
      releaseFeatures.advancedTools &&
      owner === true &&
      !development &&
      !!row,
    queryFn: () => recordAudit(vehicle!, id!),
  });
  const mutate = async (status: string, payload = row?.payload) => {
    if (!row || !user || !payload || busy) return;
    setBusy(true);
    try {
      await saveRecord(
        user,
        development,
        kind,
        row.vehicle_id,
        payload,
        mutationOperation,
        row.id,
        row.revision,
        status,
      );
      setMutationOperation(Crypto.randomUUID());
      await qc.invalidateQueries();
      toast(status === "ARCHIVED" ? r("recordDeleted") : r("saved"), "success");
      if (status === "ARCHIVED") {
        if (onClose) onClose();
        else router.back();
      }
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
  const editAllowed =
    row?.status !== "ARCHIVED" &&
    (owner ||
      (row?.created_by === user &&
        permissions.data?.[`${kind}.edit_own`] &&
        !(kind === "progress" && row?.status === "APPROVED")));
  // Confirm inside the existing popup: a second native Modal can sit behind it.
  if (confirmDelete) {
    return (
      <DetailContainer
        embedded={!!context}
        title={r("deleteRecord")}
        loading={busy}
      >
        <AppText>{r("deleteRecordBody")}</AppText>
        {row && <RecordCard row={row} kind={kind} timezone={timezone} />}
        {error && (
          <ErrorState message={error} retry={() => void mutate("ARCHIVED")} />
        )}
        <AppButton
          label={r("deleteRecord")}
          disabled={busy || !owner || !row || row.status === "ARCHIVED"}
          onPress={() => void mutate("ARCHIVED")}
        />
        <AppButton
          secondary
          label={t("cancel")}
          disabled={busy}
          onPress={() => {
            setConfirmDelete(false);
            setError("");
            onClose?.();
          }}
        />
      </DetailContainer>
    );
  }
  return (
    <DetailContainer
      embedded={!!context}
      title={`${r(kind)} · ${r("detail")}`}
      loading={query.isPending || busy}
    >
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : row ? (
        <>
          {!context && (
            <VehicleHeader vehicleId={row.vehicle_id} allowSwitch={false} />
          )}
          <RecordCard row={row} kind={kind} timezone={timezone} />
          <Card style={{ padding: 16, gap: 8 }}>
            <SectionHeading title={t("uiRecordInfo")} />
            <InfoRows
              items={[
                ...(kind === "fuel"
                  ? [
                      {
                        label: r("energy_type"),
                        value:
                          r(
                            String(
                              row.payload.energy_type,
                            ) as keyof typeof recordCopy,
                          ) ?? String(row.payload.energy_type),
                      },
                      {
                        label: r("fuel"),
                        value: r(
                          row.payload.energy_type === "ELECTRIC"
                            ? row.payload.is_full_tank
                              ? "fullCharge"
                              : "partialCharge"
                            : row.payload.is_full_tank
                              ? "full"
                              : "partial",
                        ),
                      },
                      ...(row.payload.unit_price_paise != null
                        ? [
                            {
                              label: r("unit_price"),
                              value: `${money(Number(row.payload.unit_price_paise))}/${row.payload.unit === "KWH" ? "kWh" : row.payload.unit === "KG" ? "kg" : "L"}`,
                            },
                          ]
                        : []),
                    ]
                  : []),
                { label: r("author"), value: row.created_by },
                ...(row.payload.reading_at
                  ? [
                      {
                        label: r("observed"),
                        value: readableDateTime(
                          String(row.payload.reading_at),
                          timezone,
                        ),
                      },
                    ]
                  : []),
                ...(row.payload.km !== null && row.payload.km !== undefined
                  ? [{ label: r("distance"), value: `${row.payload.km} KM` }]
                  : []),
                ...(row.payload.hours !== null &&
                row.payload.hours !== undefined
                  ? [{ label: r("hours"), value: `${row.payload.hours} HOURS` }]
                  : []),
                ...[
                  "station_name",
                  "vendor",
                  "payment_method",
                  "reference",
                  "notes",
                ]
                  .filter((key) => row.payload[key])
                  .map((key) => ({
                    label:
                      r(
                        (key === "payment_method"
                          ? "payment"
                          : key) as keyof typeof recordCopy,
                      ) ?? key,
                    value: String(row.payload[key]),
                  })),
              ]}
            />
          </Card>
          {kind === "expenses" && (
            <Card style={{ padding: 16 }}>
              <SectionHeading title={r("expenses")} />
              <InfoRows
                items={[
                  ...(row.payload.principal_paise !== null &&
                  row.payload.principal_paise !== undefined
                    ? [
                        {
                          label: r("principal"),
                          value: money(Number(row.payload.principal_paise)),
                        },
                      ]
                    : []),
                  ...(row.payload.interest_paise !== null &&
                  row.payload.interest_paise !== undefined
                    ? [
                        {
                          label: r("interest"),
                          value: money(Number(row.payload.interest_paise)),
                        },
                      ]
                    : []),
                  ...Object.entries(
                    (row.payload.metadata as Record<string, unknown>) ?? {},
                  )
                    .filter(
                      ([key, value]) =>
                        key !== "expense_id" && value !== null && value !== "",
                    )
                    .map(([key, value]) => ({
                      label:
                        r(
                          (metadataLabels[key] ??
                            key) as keyof typeof recordCopy,
                        ) ?? key.replaceAll("_", " "),
                      value:
                        typeof value === "string" &&
                        /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)
                          ? readableDateTime(value, timezone)
                          : String(value),
                    })),
                  ...(Array.isArray(row.payload.items)
                    ? row.payload.items.map(
                        (item: { title: string; amount_paise: number }) => ({
                          label: item.title,
                          value: money(item.amount_paise),
                        }),
                      )
                    : []),
                ]}
              />
            </Card>
          )}
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
                      maxLength={3000}
                      optional
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
          {editAllowed && (
            <TextAction
              icon="create-outline"
              label={r("edit")}
              onPress={() => {
                onClose?.();
                router.push({
                  pathname: "/records/[kind]/[action]",
                  params: {
                    kind,
                    action: "edit",
                    id: row.id,
                    vehicle: row.vehicle_id,
                  },
                });
              }}
            />
          )}
          {owner && row.status !== "ARCHIVED" && kind !== "progress" && (
            <TextAction
              icon="trash-outline"
              disabled={busy}
              label={r("deleteRecord")}
              onPress={() => {
                setError("");
                setConfirmDelete(true);
              }}
            />
          )}
          {releaseFeatures.advancedTools &&
            kind === "expenses" &&
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
          {releaseFeatures.advancedTools && owner && !development && (
            <Card>
              <AppText large>{r("audit")}</AppText>
              <AppText muted>{r("auditLatest")}</AppText>
              {audit.error ? (
                <ErrorState
                  message={audit.error.message}
                  retry={() => void audit.refetch()}
                />
              ) : audit.isPending ? (
                <Skeleton />
              ) : audit.data?.length ? (
                audit.data.map((event) => (
                  <View key={String(event.id)} style={{ gap: 4 }}>
                    <AppText>
                      {String(event.action).replaceAll("_", " ")}
                    </AppText>
                    <Timestamp value={event.created_at} timezone={timezone} />
                    <AppText muted>{event.actor_id ?? "—"}</AppText>
                    <AppText>
                      {JSON.stringify(
                        event.context,
                        (_key, value) =>
                          typeof value === "string" &&
                          /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)
                            ? readableDateTime(value, timezone)
                            : value,
                        2,
                      )}
                    </AppText>
                  </View>
                ))
              ) : (
                <AppText>{r("auditEmpty")}</AppText>
              )}
            </Card>
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
    </DetailContainer>
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
  ).filter((row) => row.status !== "ARCHIVED");
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
      compact
      title={`${r(kind)} · ${r("analytics")}`}
      loading={!!v && (query.isPending || permissions.isPending)}
    >
      <VehicleHeader vehicleId={v?.id} allowSwitch={!vehicle} />
      {permissions.data && !permissions.data["reports.read"] ? (
        <AppText>{r("permission")}</AppText>
      ) : (
        <>
          <FilterChips
            items={(["week", "month", "year", "all"] as const).map((id) => ({
              id,
              label: r(id),
            }))}
            value={period}
            onChange={setPeriod}
          />
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
                        <TimestampRange
                          from={interval.from}
                          to={interval.to}
                          timezone={v?.timezone}
                        />
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
    </Screen>
  );
}
