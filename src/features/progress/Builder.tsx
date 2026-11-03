import { NumericValueField } from "@/src/components/ui/NumericValueField";
import { Timestamp } from "@/src/components/ui/Timestamp";
import { t } from "@/src/lib/i18n";
import {
  Expandable,
  SectionHeading,
  MenuRow,
} from "@/src/components/ui/premium";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { useEffect, useState } from "react";
import { View, Switch } from "react-native";
import { router, usePreventRemove } from "expo-router";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/src/lib/query";
import {
  Screen,
  Card,
  AppText,
  AppButton,
  InputField,
  ErrorState,
  useToast,
  ConfirmDialog,
} from "@/src/components/ui";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { usePermissions } from "@/src/features/records/hooks";
import { r, recordCopy } from "@/src/features/records/copy";
import { formVersions, publishForm } from "./api";
import {
  defaultDefinition,
  fieldTypes,
  type ProgressField,
  type ProgressDefinition,
} from "./schema";
import { DynamicFields } from "./DynamicFields";
function newField(
  label: string,
  type: ProgressField["type"] = "text",
): ProgressField {
  return {
    id: Crypto.randomUUID(),
    label,
    helper: "",
    type,
    required: false,
    default_value: null,
    options: [],
    min: null,
    max: null,
    reportable: false,
    visibility: "ALL",
    aggregation: "LAST",
  };
}
export default function Builder() {
  const { vehicle } = useActiveVehicle();
  const user = useAccountId();
  return (
    <BuilderEditor
      key={`${user ?? "signed-out"}:${vehicle?.id ?? "no-vehicle"}`}
    />
  );
}
function BuilderEditor() {
  const active = useActiveVehicle();
  const vehicle = active.vehicle;
  const user = useAccountId();
  const { development } = useSession();
  const permissions = usePermissions(vehicle?.id);
  const query = useQuery({
    queryKey: [user, vehicle?.id, "forms"],
    enabled: !!vehicle,
    queryFn: () => formVersions(vehicle!.id, development),
  });
  const [definition, setDefinition] =
    useState<ProgressDefinition>(defaultDefinition);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [preview, setPreview] = useState(false);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [retryAction, setRetryAction] = useState<"load" | "publish">("load");
  const [busy, setBusy] = useState(false);
  const [invalidNumbers, setInvalidNumbers] = useState<Record<string, boolean>>(
    {},
  );
  const qc = useQueryClient();
  const toast = useToast();
  useEffect(() => {
    if (ready || !vehicle || !user || !query.data) return;
    // Initialize an editable copy of the published server definition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDefinition(
      query.data.find((f) => f.published)?.definition ?? defaultDefinition,
    );
    setReady(true);
  }, [ready, vehicle, user, query.data, loadAttempt]);
  const publishedDefinition =
    query.data?.find((version) => version.published)?.definition ??
    defaultDefinition;
  usePreventRemove(
    ready &&
      !leaving &&
      JSON.stringify(definition) !== JSON.stringify(publishedDefinition),
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
  const update = (id: string, changes: Partial<ProgressField>) =>
    setDefinition((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === id
          ? {
              ...field,
              ...(changes.type && changes.type !== field.type
                ? {
                    min: null,
                    max: null,
                    default_value: null,
                    ...(![
                      "integer",
                      "decimal",
                      "currency",
                      "trip_count",
                    ].includes(changes.type)
                      ? { reportable: false }
                      : {}),
                  }
                : {}),
              ...changes,
            }
          : field,
      ),
    }));
  const move = (index: number, by: number) => {
    if (index + by < 0 || index + by >= definition.fields.length) return;
    setDefinition((d) => {
      const fields = [...d.fields];
      [fields[index], fields[index + by]] = [fields[index + by], fields[index]];
      return { ...d, fields };
    });
  };
  const publish = async () => {
    if (!vehicle || !user || busy) return;
    setBusy(true);
    setError("");
    try {
      if (
        definition.fields.some((field) =>
          [`${field.id}.default`, `${field.id}.min`, `${field.id}.max`].some(
            (key) => invalidNumbers[key],
          ),
        )
      )
        throw new Error(t("numericOnly"));
      await publishForm(vehicle.id, definition, development);
      await qc.invalidateQueries({ queryKey: [user, vehicle.id, "forms"] });
      toast(r("saved"), "success");
    } catch (e) {
      setRetryAction("publish");
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (
    key:
      | "review_required"
      | "km_required"
      | "hours_required"
      | "notes_required"
      | "notes_visible",
    label: string,
  ) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <AppText>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={definition[key]}
        onValueChange={(value) =>
          setDefinition((d) => ({
            ...d,
            [key]: value,
            ...(key === "notes_visible" && !value
              ? { notes_required: false }
              : {}),
          }))
        }
      />
    </View>
  );
  if (permissions.error)
    return (
      <Screen title={r("builder")}>
        <ErrorState
          message={permissions.error.message}
          retry={() => void permissions.refetch()}
        />
        <AppButton secondary label={r("back")} onPress={() => router.back()} />
      </Screen>
    );
  return (
    <Screen
      compact
      title={r("builder")}
      loading={query.isPending || busy}
      action={
        permissions.data?.owner ? (
          <AppButton
            label={r("publish")}
            disabled={busy || !ready}
            onPress={() => void publish()}
          />
        ) : undefined
      }
    >
      <VehicleHeader
        disabled={busy}
        onSelect={(next) => {
          const change = () => {
            active.select(next);
          };
          if (
            ready &&
            JSON.stringify(definition) !== JSON.stringify(publishedDefinition)
          )
            ConfirmDialog(t("unsaved"), t("unsavedBody"), change, {
              cancelLabel: t("keepEditing"),
              confirmLabel: t("leaveForm"),
            });
          else active.select(next);
        }}
      />
      {permissions.data && !permissions.data.owner ? (
        <AppText>{r("permission")}</AppText>
      ) : (
        <>
          <AppText muted>{r("versionHistory")}</AppText>
          <AppButton
            secondary
            label={r("preview")}
            onPress={() => setPreview((v) => !v)}
          />
          {preview ? (
            <DynamicFields
              fields={definition.fields}
              answers={answers}
              onChange={(id, value) =>
                setAnswers((a) => ({ ...a, [id]: value }))
              }
            />
          ) : (
            <>
              <Card>
                <AppText>{r("template")}</AppText>
                {(
                  [
                    "two_wheeler",
                    "four_wheeler",
                    "commercial",
                    "agricultural",
                    "heavy_machinery",
                    "taxi",
                    "custom",
                  ] as const
                ).map((template) => (
                  <AppButton
                    key={template}
                    secondary
                    label={r(template as keyof typeof recordCopy) ?? template}
                    onPress={() => {
                      const labels =
                        template === "commercial"
                          ? [
                              newField(r("trip_count"), "trip_count"),
                              newField(r("start_location"), "start_location"),
                              newField(r("destination"), "destination"),
                              newField(r("quantity"), "decimal"),
                            ]
                          : template === "agricultural" ||
                              template === "heavy_machinery"
                            ? [
                                newField(r("location_text"), "location_text"),
                                newField(r("components")),
                                newField(r("quantity"), "decimal"),
                              ]
                            : template === "taxi"
                              ? [
                                  newField(r("trip_count"), "trip_count"),
                                  newField(r("route"), "route"),
                                  newField(r("currency"), "currency"),
                                ]
                              : template === "custom"
                                ? []
                                : [newField(r("notes"), "paragraph")];
                      setDefinition((d) => ({ ...d, fields: labels }));
                    }}
                  />
                ))}
              </Card>
              <InputField
                label={r("pastDays")}
                value={String(definition.past_days)}
                keyboardType="number-pad"
                onChangeText={(value) => {
                  if (/^\d*$/.test(value))
                    setDefinition((d) => ({ ...d, past_days: Number(value) }));
                }}
              />
              {toggle("review_required", r("reviewRequired"))}
              {vehicle?.meter_mode !== "HOURS" &&
                toggle("km_required", r("kmRequired"))}
              {vehicle?.meter_mode !== "KM" &&
                toggle("hours_required", r("hoursRequired"))}
              {toggle("notes_visible", r("hideNotes"))}
              {definition.notes_visible &&
                toggle("notes_required", r("notesRequired"))}
              <AppText muted>{r("photoDisabled")}</AppText>
              {definition.fields.map((field, index) => (
                <Card key={field.id} style={{ padding: 16, gap: 8 }}>
                  <SectionHeading
                    title={`${index + 1}. ${field.label || r("fieldLabel")}`}
                    action={r("edit")}
                    onAction={() =>
                      setExpandedField((current) =>
                        current === field.id ? null : field.id,
                      )
                    }
                  />
                  <Expandable expanded={expandedField === field.id}>
                    <InputField
                      label={r("fieldLabel")}
                      required
                      maxLength={120}
                      value={field.label}
                      onChangeText={(label) => update(field.id, { label })}
                    />
                    {["integer", "decimal", "currency", "trip_count"].includes(
                      field.type,
                    ) ? (
                      <NumericValueField
                        label={r("defaultsLabel")}
                        value={
                          field.default_value === null ||
                          field.default_value === undefined
                            ? null
                            : Number(field.default_value)
                        }
                        scale={
                          ["integer", "trip_count"].includes(field.type)
                            ? 0
                            : field.type === "currency"
                              ? 2
                              : 6
                        }
                        signed={field.type !== "trip_count"}
                        onValidityChange={(valid) =>
                          setInvalidNumbers((current) => ({
                            ...current,
                            [`${field.id}.default`]: !valid,
                          }))
                        }
                        onChange={(value) =>
                          update(field.id, { default_value: value })
                        }
                      />
                    ) : (
                      <>
                        <InputField
                          label={r("defaultsLabel")}
                          value={
                            field.default_value === null ||
                            field.default_value === undefined
                              ? ""
                              : Array.isArray(field.default_value)
                                ? field.default_value.join(", ")
                                : String(field.default_value)
                          }
                          onChangeText={(value) => {
                            let parsed: ProgressField["default_value"] =
                              value || null;
                            if (
                              [
                                "integer",
                                "decimal",
                                "currency",
                                "trip_count",
                              ].includes(field.type) &&
                              value !== ""
                            )
                              parsed = Number(value);
                            if (
                              ["boolean", "checkbox"].includes(field.type) &&
                              value !== ""
                            )
                              parsed = value.toLowerCase() === "true";
                            if (field.type === "multiselect" && value !== "")
                              parsed = value
                                .split(",")
                                .map((v) => v.trim())
                                .filter(Boolean);
                            update(field.id, { default_value: parsed });
                          }}
                        />
                      </>
                    )}
                    <InputField
                      label={r("fieldHelper")}
                      optional
                      maxLength={300}
                      value={field.helper}
                      onChangeText={(helper) => update(field.id, { helper })}
                    />
                    <FilterChips
                      items={fieldTypes.map((type) => ({
                        id: type,
                        label:
                          type === "date"
                            ? r("dateType")
                            : r(type as keyof typeof recordCopy),
                      }))}
                      value={field.type}
                      onChange={(type) =>
                        update(field.id, {
                          type: type as ProgressField["type"],
                        })
                      }
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <AppText>{r("required")}</AppText>
                      <Switch
                        accessibilityLabel={r("required")}
                        value={field.required}
                        onValueChange={(required) =>
                          update(field.id, { required })
                        }
                      />
                    </View>
                    {["select", "multiselect"].includes(field.type) && (
                      <InputField
                        label={r("options")}
                        required
                        value={
                          optionDrafts[field.id] ?? field.options.join(", ")
                        }
                        onChangeText={(options) => {
                          setOptionDrafts((d) => ({
                            ...d,
                            [field.id]: options,
                          }));
                          update(field.id, {
                            options: options
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          });
                        }}
                      />
                    )}
                    {![
                      "boolean",
                      "checkbox",
                      "date",
                      "time",
                      "select",
                      "multiselect",
                    ].includes(field.type) &&
                      (["min", "max"] as const).map((bound) => (
                        <NumericValueField
                          key={bound}
                          label={r(bound)}
                          value={field[bound]}
                          scale={
                            [
                              "integer",
                              "trip_count",
                              "text",
                              "paragraph",
                              "location_text",
                              "start_location",
                              "destination",
                              "route",
                            ].includes(field.type)
                              ? 0
                              : field.type === "currency"
                                ? 2
                                : 6
                          }
                          signed={["integer", "decimal", "currency"].includes(
                            field.type,
                          )}
                          onValidityChange={(valid) =>
                            setInvalidNumbers((current) => ({
                              ...current,
                              [`${field.id}.${bound}`]: !valid,
                            }))
                          }
                          onChange={(value) =>
                            update(field.id, { [bound]: value })
                          }
                        />
                      ))}
                    <AppButton
                      secondary={field.visibility !== "OWNER"}
                      label={r(
                        field.visibility === "OWNER" ? "private" : "public",
                      )}
                      onPress={() =>
                        update(field.id, {
                          visibility:
                            field.visibility === "OWNER" ? "ALL" : "OWNER",
                        })
                      }
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <AppText>{r("reportable")}</AppText>
                      <Switch
                        accessibilityLabel={r("reportable")}
                        value={field.reportable}
                        disabled={
                          ![
                            "integer",
                            "decimal",
                            "currency",
                            "trip_count",
                          ].includes(field.type)
                        }
                        onValueChange={(reportable) =>
                          update(field.id, { reportable })
                        }
                      />
                    </View>
                    {field.reportable && (
                      <FilterChips
                        items={(["SUM", "AVG", "LAST"] as const).map((id) => ({
                          id,
                          label: r(id),
                        }))}
                        value={field.aggregation}
                        onChange={(aggregation) =>
                          update(field.id, {
                            aggregation:
                              aggregation as ProgressField["aggregation"],
                          })
                        }
                      />
                    )}
                    <AppButton
                      secondary
                      label={r("moveUp")}
                      disabled={index === 0}
                      onPress={() => move(index, -1)}
                    />
                    <AppButton
                      secondary
                      label={r("moveDown")}
                      disabled={index === definition.fields.length - 1}
                      onPress={() => move(index, 1)}
                    />
                    <AppButton
                      secondary
                      label={r("duplicate")}
                      onPress={() =>
                        setDefinition((d) => ({
                          ...d,
                          fields: [
                            ...d.fields,
                            { ...field, id: Crypto.randomUUID() },
                          ],
                        }))
                      }
                    />
                    <AppButton
                      secondary
                      label={r("remove")}
                      onPress={() =>
                        setDefinition((d) => ({
                          ...d,
                          fields: d.fields.filter((f) => f.id !== field.id),
                        }))
                      }
                    />
                  </Expandable>
                </Card>
              ))}
              <AppButton
                secondary
                label={r("addField")}
                onPress={() =>
                  setDefinition((d) => ({
                    ...d,
                    fields: [...d.fields, newField(r("fieldLabel"))],
                  }))
                }
              />
            </>
          )}
          <Card>
            <AppText large>{r("versions")}</AppText>
            {query.data?.map((version) => (
              <View key={version.id} style={{ gap: 4, paddingBottom: 10 }}>
                <MenuRow
                  label={`${r("versions")} ${version.version}`}
                  subtitle={version.published ? r("published") : r("history")}
                  icon="layers-outline"
                  tone="violet"
                  onPress={() => {
                    setDefinition(version.definition);
                    setPreview(true);
                  }}
                />
                <Timestamp
                  value={version.created_at}
                  timezone={vehicle?.timezone}
                />
              </View>
            ))}
          </Card>
        </>
      )}
      {error && (
        <ErrorState
          message={error}
          retry={() => {
            setError("");
            if (retryAction === "load") setLoadAttempt((value) => value + 1);
            else if (retryAction === "publish") void publish();
          }}
        />
      )}
      {query.error && (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      )}
      <AppButton secondary label={r("back")} onPress={() => router.back()} />
    </Screen>
  );
}
