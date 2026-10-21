import { useEffect, useState } from "react";
import { View, Switch } from "react-native";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Screen,
  Card,
  AppText,
  AppButton,
  InputField,
  ErrorState,
  useToast,
} from "@/src/components/ui";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { usePermissions } from "@/src/features/records/hooks";
import { r, recordCopy } from "@/src/features/records/copy";
import { loadDraft, saveDraft, clearDraft } from "@/src/lib/db";
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
  const [preview, setPreview] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const key = `builder.${vehicle?.id}`;
  useEffect(() => {
    setReady(false);
  }, [vehicle?.id]);
  useEffect(() => {
    if (ready || !vehicle || !user || !query.data) return;
    let alive = true;
    void loadDraft(user, key)
      .then((d) => {
        if (!alive) return;
        setDefinition(
          (d as ProgressDefinition) ??
            query.data.find((f) => f.published)?.definition ??
            defaultDefinition,
        );
        setReady(true);
      })
      .catch((e) => {setError(String(e));setReady(true);});
    return () => {
      alive = false;
    };
  }, [ready, vehicle, user, key, query.data]);
  useEffect(() => {
    if (!ready || !user) return;
    const timer = setTimeout(() => {
      void saveDraft(user, key, definition).catch((e) => setError(String(e)));
    }, 300);
    return () => clearTimeout(timer);
  }, [definition, ready, user, key]);
  const update = (id: string, changes: Partial<ProgressField>) =>
    setDefinition((d) => ({
      ...d,
      fields: d.fields.map((f) => (f.id === id ? { ...f, ...changes } : f)),
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
      await publishForm(vehicle.id, definition, development);
      await clearDraft(user, key);
      await qc.invalidateQueries({ queryKey: [user, vehicle.id, "forms"] });
      toast(r("saved"), "success");
    } catch (e) {
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
          setDefinition((d) => ({ ...d, [key]: value,...key==='notes_visible'&&!value?{notes_required:false}:{} }))
        }
      />
    </View>
  );
  return (
    <Screen
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
      <VehicleHeader />
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
                <Card key={field.id}>
                  <InputField
                    label={r("fieldLabel")}
                    value={field.label}
                    onChangeText={(label) => update(field.id, { label })}
                  />
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
                  <InputField
                    label={r("fieldHelper")}
                    value={field.helper}
                    onChangeText={(helper) => update(field.id, { helper })}
                  />
                  {fieldTypes.map((type) => (
                    <AppButton
                      key={type}
                      secondary={field.type !== type}
                      label={
                        type === "date"
                          ? r("dateType")
                          : r(type as keyof typeof recordCopy)
                      }
                      onPress={() => update(field.id, { type })}
                    />
                  ))}
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
                      value={optionDrafts[field.id] ?? field.options.join(", ")}
                      onChangeText={(options) => {
                        setOptionDrafts((d) => ({ ...d, [field.id]: options }));
                        update(field.id, {
                          options: options
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        });
                      }}
                    />
                  )}
                  <InputField
                    label={r("min")}
                    value={field.min === null ? "" : String(field.min)}
                    keyboardType="decimal-pad"
                    onChangeText={(min) =>
                      update(field.id, { min: min === "" ? null : Number(min) })
                    }
                  />
                  <InputField
                    label={r("max")}
                    value={field.max === null ? "" : String(field.max)}
                    keyboardType="decimal-pad"
                    onChangeText={(max) =>
                      update(field.id, { max: max === "" ? null : Number(max) })
                    }
                  />
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
                      onValueChange={(reportable) =>
                        update(field.id, { reportable })
                      }
                    />
                  </View>
                  {field.reportable &&
                    (["SUM", "AVG", "LAST"] as const).map((aggregation) => (
                      <AppButton
                        key={aggregation}
                        secondary={field.aggregation !== aggregation}
                        label={r(aggregation)}
                        onPress={() => update(field.id, { aggregation })}
                      />
                    ))}
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
              <AppButton
                key={version.id}
                secondary
                label={`${version.version} · ${version.created_at} · ${version.published ? r("published") : r("history")}`}
                onPress={() => {
                  setDefinition(version.definition);
                  setPreview(true);
                }}
              />
            ))}
          </Card>
        </>
      )}
      {error && <ErrorState message={error} retry={() => setError("")} />}
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
