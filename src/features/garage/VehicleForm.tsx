import { useEffect, useState } from "react";
import { BackHandler, Image } from "react-native";
import { router, useLocalSearchParams, usePreventRemove } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import {
  vehicleSchema,
  categories,
  meterModes,
  defaultMeter,
  type VehicleInput,
} from "./schema";
import { useVehicles } from "./hooks";
import { saveVehicle } from "./api";
import { useSession } from "@/src/features/auth/session";
import { loadDraft, saveDraft, clearDraft } from "@/src/lib/db";
import { artwork } from "@/src/lib/assets";
import {
  Screen,
  AppText,
  AppButton,
  InputField,
  Choice,
  ErrorState,
  ConfirmDialog,
  useToast,
  Card,
} from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import catalog from "../../../config/vehicle-catalog.seed.json";
const subtypeOptions = {
  two_wheeler: ["motorcycle", "scooter", "moped"],
  four_wheeler: ["hatchback", "sedan", "suv", "muv"],
  commercial: ["pickup", "truck", "tipper", "bus", "van"],
  agricultural: ["tractor", "other"],
  heavy_machinery: ["excavator", "loader", "crane", "generator", "other"],
};
const initial: VehicleInput = {
  nickname: "",
  registration_number: "",
  category: "two_wheeler",
  subtype: "motorcycle",
  brand: "",
  model: "",
  energy_type: "PETROL",
  meter_mode: "KM",
  timezone: "Asia/Kolkata",
  km: "",
  hours: "",
  observed_at: new Date().toISOString(),
};
export default function VehicleForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useVehicles();
  const vehicle = query.data?.find((v) => v.id === id);
  const { session } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [allowExit, setAllowExit] = useState(false);
  const [operation, setOperation] = useState(() => Crypto.randomUUID());
  const form = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control: form.control }) as VehicleInput;
  const key = id ? `vehicle.${id}` : "vehicle.new";
  useEffect(() => {
    if (ready || !session || (id && query.isPending)) return;
    let active = true;
    void loadDraft(session.user.id, key)
      .then((d) => {
        if (!active) return;
        if (d && typeof d === "object" && "values" in d) {
          const draft = d as { values: VehicleInput; operation: string };
          form.reset(draft.values);
          setOperation(draft.operation);
        } else if (vehicle)
          form.reset({
            ...initial,
            ...vehicle,
            registration_number: vehicle.registration_number ?? "",
            observed_at: new Date().toISOString(),
          });
        setReady(true);
      })
      .catch((e) => {
        setError(String(e));
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [session, id, query.isPending, ready, form, key, vehicle]);
  useEffect(() => {
    if (!ready || !session || allowExit) return;
    const timer = setTimeout(() => {
      void saveDraft(session.user.id, key, { values, operation })
        .then(() => setDraftError(false))
        .catch(() => setDraftError(true));
    }, 300);
    return () => clearTimeout(timer);
  }, [values, ready, session, key, operation, allowExit]);
  const disablePrevention = usePreventRemove(
    form.formState.isDirty && !allowExit,
    ({ repeat }) => {
      ConfirmDialog(t("unsaved"), t("unsavedBody"), () => {
        setAllowExit(true);
        repeat();
      });
    },
  );
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step > 0) {
        setStep((s) => s - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step]);
  const field = (name: keyof VehicleInput, label: string, numeric = false) => (
    <Controller
      key={name}
      control={form.control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <InputField
          label={label}
          value={String(value ?? "")}
          onChangeText={onChange}
          keyboardType={numeric ? "decimal-pad" : "default"}
          error={form.formState.errors[name]?.message}
        />
      )}
    />
  );
  const submit = form.handleSubmit(
    async (input) => {
      if (busy || !session) return;
      setBusy(true);
      setError("");
      try {
        await saveVehicle(input, operation, id, vehicle?.updated_at);
        setAllowExit(true);
        await clearDraft(session.user.id, key);
        await qc.invalidateQueries({ queryKey: [session.user.id, "vehicles"] });
        toast(t("saved"));
        disablePrevention();
        router.replace("/garage");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    () =>
      setError(
        Object.values(form.formState.errors)
          .map((e) => e?.message)
          .join("\n"),
      ),
  );
  const titles = [
    t("categoryStep"),
    t("subtypeStep"),
    t("modelStep"),
    t("detailsStep"),
    t("meterStep"),
    t("reviewStep"),
  ];
  if (id && !query.isPending && (!vehicle || vehicle.role !== "OWNER"))
    return (
      <Screen title={t("edit")}>
        <AppText>{t("denied")}</AppText>
        <AppButton label={t("back")} onPress={() => router.back()} />
      </Screen>
    );
  return (
    <Screen
      title={titles[step]}
      loading={!ready || busy}
      action={
        <AppButton
          label={step === 5 ? t("save") : t("continue")}
          disabled={busy || !ready}
          onPress={() => (step < 5 ? setStep(step + 1) : void submit())}
        />
      }
    >
      <AppText muted>{`${step + 1} / 6`}</AppText>
      {step === 0 &&
        categories.map((category) => (
          <Card key={category}>
            <Image
              source={artwork[category]}
              style={{ width: "100%", height: 120, resizeMode: "contain" }}
            />
            <AppButton
              secondary={values.category !== category}
              label={t(category)}
              onPress={() => {
                form.setValue("category", category, { shouldDirty: true });
                const subtype = subtypeOptions[category][0];
                form.setValue("subtype", subtype);
                form.setValue("meter_mode", defaultMeter(category, subtype));
              }}
            />
          </Card>
        ))}
      {step === 1 && (
        <Choice
          values={subtypeOptions[values.category]}
          value={values.subtype}
          onChange={(v) => {
            form.setValue("subtype", v, { shouldDirty: true });
            form.setValue("meter_mode", defaultMeter(values.category, v));
          }}
        />
      )}
      {step === 2 && (
        <>
          {field("brand", t("brand"))}
          {field("model", t("model"))}
          <AppText muted>{t("catalog")}</AppText>
          {catalog.categories
            .flatMap((c) => c.makes)
            .filter(
              (m) =>
                !values.brand ||
                m.name.toLowerCase().includes(values.brand.toLowerCase()),
            )
            .slice(0, 6)
            .map((make) => (
              <AppButton
                key={make.name}
                secondary
                label={make.name}
                onPress={() =>
                  form.setValue("brand", make.name, { shouldDirty: true })
                }
              />
            ))}
          {catalog.categories
            .flatMap((c) => c.makes)
            .find((m) => m.name === values.brand)
            ?.models.map((m) => (
              <AppButton
                secondary
                key={m}
                label={m}
                onPress={() => form.setValue("model", m, { shouldDirty: true })}
              />
            ))}
        </>
      )}
      {step === 3 && (
        <>
          {field("nickname", t("nickname"))}
          {field("registration_number", t("registration"))}
          <Choice
            values={
              [
                "PETROL",
                "DIESEL",
                "ELECTRIC",
                "CNG",
                "HYBRID",
                "OTHER",
              ] as const
            }
            value={values.energy_type}
            onChange={(v) =>
              form.setValue("energy_type", v, { shouldDirty: true })
            }
          />
          {field("timezone", t("timezone"))}
        </>
      )}
      {step === 4 && (
        <>
          <Choice
            values={meterModes}
            value={values.meter_mode}
            onChange={(v) =>
              form.setValue("meter_mode", v, { shouldDirty: true })
            }
          />
          {!id && (
            <>
              {values.meter_mode !== "HOURS" && field("km", t("km"), true)}
              {values.meter_mode !== "KM" && field("hours", t("hours"), true)}
              {field("observed_at", t("observed"))}
            </>
          )}
        </>
      )}
      {step === 5 && (
        <Card>
          <Image
            source={artwork[values.category]}
            style={{ width: "100%", height: 140, resizeMode: "contain" }}
          />
          <AppText large>
            {values.nickname || values.model || values.registration_number}
          </AppText>
          <AppText>{`${values.brand} ${values.model}`}</AppText>
          <AppText>
            {t(values.category)} · {values.subtype}
          </AppText>
          <AppText>
            {t(values.energy_type)} · {t(values.meter_mode)}
          </AppText>
          <AppText>{values.timezone}</AppText>
        </Card>
      )}
      <AppText muted>{draftError ? t("draftError") : t("draft")}</AppText>
      {!!error && <ErrorState message={error} retry={() => setError("")} />}
      <AppButton
        secondary
        label={t("back")}
        disabled={busy}
        onPress={() => (step ? setStep(step - 1) : router.back())}
      />
    </Screen>
  );
}
