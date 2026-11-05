import { DropdownField } from "@/src/components/ui/DropdownField";
import { allowedMeterModes } from "./meterOptions";
import { DeleteVehicle } from "./DeleteVehicle";
import { supportsVehicle, releaseFeatures } from "@/src/features/release/scope";
import { VehicleComingSoon } from "@/src/features/release/DeferredFeature";
import { SquareArtwork } from "@/src/components/ui/SquareArtwork";
import { AdditionalOptions } from "@/src/components/ui/AdditionalOptions";
import { allowedFuelTypes, fuelUnit, vehicleEnergyTypes } from "./energy";
import { TimezoneField } from "./TimezoneField";
import { defaultVehicleTimezone, timezoneLabel } from "./timezone";
import { readableDateTime } from "@/src/utils/dateDisplay";
import { DateTimeInput } from "@/src/components/ui/fields";
import { useEffect, useState } from "react";
import { BackHandler, View, Text } from "react-native";
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
import { useSession, useAccountId } from "@/src/features/auth/session";
import { useProfile } from "@/src/features/auth/profile";
import { VehicleSubtypeSelector } from "./VehicleSubtypeSelector";
import { subtypeOptions, subtypeLabel } from "./subtypes";
import { VehicleChoiceGrid } from "./VehicleChoiceGrid";
import { WizardSteps } from "./WizardSteps";
import {
  GradientButton,
  TextAction,
  SectionHeading,
  ChoiceChip,
} from "@/src/components/ui/premium";
import { useTheme } from "@/src/lib/theme";
import { vehicleArt } from "@/src/lib/assets";
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
const initial: VehicleInput = {
  nickname: "",
  registration_number: "",
  category: "two_wheeler",
  subtype: "",
  brand: "",
  model: "",
  energy_type: "PETROL",
  meter_mode: "KM",
  timezone: defaultVehicleTimezone,
  km: "",
  hours: "",
  observed_at: new Date().toISOString(),
};
export default function VehicleForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useVehicles();
  const profile = useProfile();
  const vehicle = query.data?.find((v) => v.id === id);
  const { development } = useSession();
  const user = useAccountId();
  const qc = useQueryClient();
  const toast = useToast();
  const colors = useTheme();
  const [comingSoon, setComingSoon] = useState(false);
  const [step, setStep] = useState(0);
  const [additionalStep, setAdditionalStep] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowExit, setAllowExit] = useState(false);
  const [operation] = useState(() => Crypto.randomUUID());
  const form = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { ...initial, observed_at: new Date().toISOString() },
  });
  const values = useWatch({ control: form.control }) as VehicleInput;
  useEffect(() => {
    if (
      ready ||
      !user ||
      (id && (query.isPending || query.error)) ||
      (!id && (profile.isPending || profile.error || !profile.data))
    )
      return;
    if (vehicle)
      form.reset({
        ...initial,
        ...vehicle,
        registration_number: vehicle.registration_number ?? "",
        observed_at: new Date().toISOString(),
      });
    else if (!id && profile.data)
      form.setValue("timezone", profile.data.timezone);
    // Initialize this editable form once from the confirmed server response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [
    user,
    id,
    query.isPending,
    query.error,
    ready,
    form,
    vehicle,
    profile.isPending,
    profile.error,
    profile.data,
  ]);
  const disablePrevention = usePreventRemove(
    form.formState.isDirty && !allowExit,
    ({ repeat }) => {
      ConfirmDialog(
        t("unsaved"),
        t("unsavedBody"),
        () => {
          setAllowExit(true);
          repeat();
        },
        { cancelLabel: t("keepEditing"), confirmLabel: t("leaveForm") },
      );
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
      render={({ field: { value, onChange } }) =>
        name === "observed_at" ? (
          <DateTimeInput
            label={label}
            value={String(value ?? "")}
            onChange={onChange}
            required={!!values.km || !!values.hours}
            error={form.formState.errors[name]?.message}
          />
        ) : (
          <InputField
            editable={!busy && ready}
            label={label.replace(/\s*\(optional\)$/i, "")}
            value={String(value ?? "")}
            onChangeText={onChange}
            optional
            numeric={numeric ? { scale: 3 } : undefined}
            maxLength={
              name === "registration_number"
                ? 40
                : name === "nickname"
                  ? 120
                  : name === "brand" || name === "model"
                    ? 80
                    : undefined
            }
            keyboardType={numeric ? "decimal-pad" : "default"}
            error={form.formState.errors[name]?.message}
          />
        )
      }
    />
  );
  const submit = form.handleSubmit(
    async (input) => {
      if (busy || !user) return;
      if (!supportsVehicle(input.category)) {
        setComingSoon(true);
        return;
      }
      if (
        id &&
        !allowedMeterModes(input.category, input.subtype).includes(
          input.meter_mode,
        )
      ) {
        form.setError("meter_mode", { message: t("chooseAllowedMeter") });
        setError(t("chooseAllowedMeter"));
        return;
      }
      setBusy(true);
      setError("");
      try {
        await saveVehicle(
          input,
          operation,
          id,
          vehicle?.updated_at,
          development,
        );
        setAllowExit(true);
        await qc.invalidateQueries({ queryKey: [user!, "vehicles"] });
        toast(t("saved"), "success");
        disablePrevention();
        if (router.canGoBack()) router.back();
        else router.replace("/garage");
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
  const next = async () => {
    if (busy || !ready) return;
    if (!supportsVehicle(values.category)) {
      setComingSoon(true);
      return;
    }
    if (step === 5) {
      await submit();
      return;
    }
    const fields: (keyof VehicleInput)[][] = [
      ["category"],
      ["subtype"],
      ["brand", "model"],
      ["nickname", "registration_number", "energy_type", "timezone"],
      ["meter_mode", ...(!id ? (["km", "hours", "observed_at"] as const) : [])],
    ];
    if (await form.trigger(fields[step], { shouldFocus: true })) {
      setError("");
      setStep(step + 1);
    } else setError(t("uiStepInvalid"));
  };
  const categoryArt = {
    two_wheeler: "motorcycle",
    four_wheeler: "suv",
    commercial: "truck",
    agricultural: "tractor",
    heavy_machinery: "excavator",
  };
  const titles = [
    t("categoryStep"),
    t("subtypeStep"),
    t("modelStep"),
    t("detailsStep"),
    t("meterStep"),
    t("reviewStep"),
  ];
  const timezoneField = (
    <TimezoneField
      value={values.timezone}
      disabled={busy || !ready}
      error={form.formState.errors.timezone?.message}
      onChange={(timezone) =>
        form.setValue("timezone", timezone, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    />
  );
  const fuelOptions = allowedFuelTypes(values.energy_type)
    .map(
      (fuel) =>
        `${t(fuel)} (${fuelUnit(fuel) === "KWH" ? "kWh" : fuelUnit(fuel) === "KG" ? "kg" : "L"})`,
    )
    .join(", ");
  const fuelHelp = (
    <View style={{ gap: 6 }}>
      <AppText muted>
        {t("vehicleFuelEntries").replace("{fuels}", fuelOptions)}
      </AppText>
      {values.energy_type === "OTHER" && (
        <AppText muted>{t("vehicleFuelOtherHelp")}</AppText>
      )}
      {values.energy_type === "HYBRID" && (
        <AppText muted>{t("fuelHybridHelp")}</AppText>
      )}
      {id && <AppText muted>{t("vehicleFuelChangeHelp")}</AppText>}
    </View>
  );
  const selectMeterMode = (mode: VehicleInput["meter_mode"]) => {
    const clearKm = mode === "HOURS" && !!values.km;
    const clearHours = mode === "KM" && !!values.hours;
    const apply = () => {
      if (clearKm) form.setValue("km", "", { shouldDirty: true });
      if (clearHours) form.setValue("hours", "", { shouldDirty: true });
      form.setValue("meter_mode", mode, { shouldDirty: true });
    };
    if (clearKm || clearHours)
      ConfirmDialog(t("meterStep"), t("meterModeClearHelp"), apply);
    else apply();
  };
  if (id && query.error)
    return (
      <Screen title={t("edit")}>
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      </Screen>
    );
  if (!id && profile.error)
    return (
      <Screen title={t("add")}>
        <ErrorState
          message={profile.error.message}
          retry={() => void profile.refetch()}
        />
      </Screen>
    );
  if (id && !query.isPending && (!vehicle || vehicle.role !== "OWNER"))
    return (
      <Screen title={t("edit")}>
        <AppText>{t("denied")}</AppText>
        <AppButton label={t("back")} onPress={() => router.back()} />
      </Screen>
    );
  if (id && vehicle?.archived_at)
    return (
      <Screen title={t("uiEditVehicle")}>
        <AppText>{t("archivedVehicleReadOnly")}</AppText>
        <AppButton secondary label={t("back")} onPress={() => router.back()} />
      </Screen>
    );
  if (id)
    return (
      <Screen title={t("uiEditVehicle")} compact loading={!ready || busy}>
        <View
          style={{ width: "100%", maxWidth: 640, alignSelf: "center", gap: 18 }}
        >
          <AppText muted>{t("vehicleIdentityHelp")}</AppText>
          {field("nickname", t("nickname"))}
          {field("registration_number", t("registration"))}
          <DropdownField
            label={t("categoryStep")}
            disabled={busy || !ready}
            options={categories
              .filter(supportsVehicle)
              .map((category) => ({ value: category, label: t(category) }))}
            value={values.category}
            onChange={(category) => {
              form.setValue("category", category, { shouldDirty: true });
              const subtype = subtypeOptions(category).some(
                (option) => option.id === values.subtype,
              )
                ? values.subtype
                : "";
              form.setValue("subtype", subtype, { shouldDirty: true });
              if (
                !allowedMeterModes(category, subtype).includes(
                  values.meter_mode,
                )
              )
                form.setValue("meter_mode", defaultMeter(category, subtype), {
                  shouldDirty: true,
                });
            }}
          />
          <DropdownField
            label={t("subtypeStep")}
            disabled={busy || !ready}
            options={subtypeOptions(values.category).map((option) => ({
              value: option.id,
              label: subtypeLabel(option.id),
            }))}
            value={values.subtype ?? ""}
            onChange={(subtype) => {
              form.setValue("subtype", subtype, { shouldDirty: true });
              const modes = allowedMeterModes(values.category, subtype);
              if (!modes.includes(values.meter_mode))
                form.setValue(
                  "meter_mode",
                  defaultMeter(values.category, subtype),
                  { shouldDirty: true },
                );
            }}
          />
          {form.formState.errors.subtype?.message && (
            <AppText>{form.formState.errors.subtype.message}</AppText>
          )}
          {field("brand", t("brand"))}
          {field("model", t("model"))}
          <AppText>{t("editEnergyLabel")}</AppText>
          <Choice
            compact
            values={vehicleEnergyTypes}
            value={values.energy_type}
            onChange={(energy) => {
              if (!busy)
                form.setValue("energy_type", energy, { shouldDirty: true });
            }}
          />
          {fuelHelp}
          <DropdownField
            label={t("meterStep")}
            disabled={busy || !ready || !values.subtype}
            options={allowedMeterModes(
              values.category,
              values.subtype ?? "",
            ).map((mode) => ({ value: mode, label: t(mode) }))}
            value={values.meter_mode}
            onChange={(mode) =>
              form.setValue("meter_mode", mode, { shouldDirty: true })
            }
          />
          <AppText muted>{t("editMeterHelp")}</AppText>
          <AppButton
            secondary
            label={t("addMeterReading")}
            disabled={busy || !ready}
            onPress={() =>
              router.push({
                pathname: "/records/[kind]/[action]",
                params: { kind: "meters", action: "add", vehicle: id },
              })
            }
          />
          {timezoneField}
          {!!error && <ErrorState message={error} retry={() => setError("")} />}
          <AppButton
            label={t("save")}
            disabled={busy || !ready || !vehicle}
            onPress={() => void submit()}
          />
          {vehicle?.role === "OWNER" && !development && (
            <DeleteVehicle
              vehicle={vehicle}
              onBusyChange={setBusy}
              disabled={busy || !ready}
              onDeleted={async () => {
                setAllowExit(true);
                disablePrevention();
                await qc.cancelQueries();
                qc.clear();
                toast(t("vehicleDeleted"), "success");
                router.replace("/garage");
              }}
            />
          )}
        </View>
      </Screen>
    );
  return (
    <Screen
      title={id ? t("uiEditVehicle") : t("add")}
      compact
      contentKey={step}
      onBack={step > 0 ? () => setStep((value) => value - 1) : undefined}
      loading={!ready || busy}
      action={
        <View
          style={{
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
            paddingBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          {step > 0 && (
            <TextAction
              label={t("back")}
              icon="arrow-back"
              onPress={() => {
                if (!busy) setStep((value) => value - 1);
              }}
            />
          )}
          <View style={{ flex: 1 }}>
            <GradientButton
              label={step === 5 ? t("save") : t("continue")}
              disabled={
                busy || !ready || (step === 1 && !values.subtype?.trim())
              }
              onPress={() => void next()}
            />
          </View>
        </View>
      }
    >
      <VehicleComingSoon
        visible={comingSoon}
        onClose={() => setComingSoon(false)}
      />
      <View
        style={{ width: "100%", maxWidth: 640, alignSelf: "center", gap: 12 }}
      >
        <WizardSteps
          step={step}
          titles={titles}
          disabled={busy || !ready}
          onStep={(value) => {
            setError("");
            setStep(value);
          }}
        />
        <SectionHeading title={titles[step]} />
        {step === 0 && <AppText muted>{t("uiCategoryHint")}</AppText>}
        {step === 0 && (
          <VehicleChoiceGrid
            options={categories.map((category) => ({
              id: category,
              label: t(category),
              image: vehicleArt(category, categoryArt[category]),
            }))}
            value={values.category}
            disabled={!ready || busy}
            onChange={(selected) => {
              const category = categories.find((item) => item === selected);
              if (!category) return;
              if (!supportsVehicle(category)) {
                setComingSoon(true);
                return;
              }
              form.setValue("category", category, { shouldDirty: true });
              if (
                category !== values.category &&
                !subtypeOptions(category).some(
                  (option) => option.id === values.subtype,
                )
              ) {
                form.setValue("subtype", "", { shouldDirty: true });
                if (!values.km && !values.hours)
                  form.setValue("meter_mode", defaultMeter(category, ""));
              }
            }}
          />
        )}
        {step === 1 && (
          <VehicleSubtypeSelector
            key={values.category}
            category={values.category}
            disabled={busy || !ready}
            value={values.subtype}
            onChange={(v) => {
              form.setValue("subtype", v, { shouldDirty: true });
              if (!values.km && !values.hours)
                form.setValue("meter_mode", defaultMeter(values.category, v));
            }}
          />
        )}
        {step === 2 && (
          <>
            <AppText muted>{t("uiModelHint")}</AppText>
            {field("brand", t("brand"))}
            {field("model", t("model"))}
            <AdditionalOptions
              open={additionalStep === step}
              onToggle={() =>
                setAdditionalStep((value) => (value === step ? null : step))
              }
            >
              <AppText muted>{t("catalog")}</AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {catalog.categories
                  .filter((category) => category.id === values.category)
                  .flatMap((category) => category.makes)
                  .filter(
                    (make) =>
                      !values.brand ||
                      make.name
                        .toLowerCase()
                        .includes(values.brand.toLowerCase()),
                  )
                  .slice(0, 6)
                  .map((make) => (
                    <ChoiceChip
                      key={make.name}
                      label={make.name}
                      selected={make.name === values.brand}
                      onPress={() =>
                        form.setValue("brand", make.name, { shouldDirty: true })
                      }
                    />
                  ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {catalog.categories
                  .filter((category) => category.id === values.category)
                  .flatMap((category) => category.makes)
                  .find((make) => make.name === values.brand)
                  ?.models.map((model) => (
                    <ChoiceChip
                      key={model}
                      label={model}
                      selected={values.model === model}
                      onPress={() =>
                        form.setValue("model", model, { shouldDirty: true })
                      }
                    />
                  ))}
              </View>
            </AdditionalOptions>
          </>
        )}
        {step === 3 && (
          <>
            <AppText muted>{t("uiDetailsHint")}</AppText>
            <AppText muted>{t("vehicleIdentityHelp")}</AppText>
            {field("nickname", t("nickname"))}
            {field("registration_number", t("registration"))}
            <AppText>{t("editEnergyLabel")}</AppText>
            <Choice
              compact
              values={vehicleEnergyTypes}
              value={values.energy_type}
              onChange={(v) =>
                form.setValue("energy_type", v, { shouldDirty: true })
              }
            />
            {fuelHelp}
            <AppText muted>{t("timezoneDefaultHint")}</AppText>
            <AdditionalOptions
              open={additionalStep === step}
              onToggle={() =>
                setAdditionalStep((value) => (value === step ? null : step))
              }
            >
              {timezoneField}
            </AdditionalOptions>
          </>
        )}
        {step === 4 && (
          <>
            <AppText muted>{t("uiMeterHint")}</AppText>
            <Choice
              compact
              values={releaseFeatures.advancedTools ? meterModes : ["KM"]}
              value={values.meter_mode}
              onChange={selectMeterMode}
            />
            {!id && (
              <AdditionalOptions
                open={additionalStep === step}
                onToggle={() =>
                  setAdditionalStep((value) => (value === step ? null : step))
                }
              >
                <AppText muted>{t("initialReadingHelp")}</AppText>
                {values.meter_mode !== "HOURS" && field("km", t("km"), true)}
                {values.meter_mode !== "KM" && field("hours", t("hours"), true)}
                {values.km || values.hours ? (
                  field("observed_at", t("observed"))
                ) : (
                  <AppText muted>{t("optionalObservation")}</AppText>
                )}
              </AdditionalOptions>
            )}
          </>
        )}
        {step === 5 && (
          <>
            <AppText muted>{t("uiReviewHint")}</AppText>
            <Card style={{ padding: 16, gap: 14 }}>
              <View style={{ alignItems: "stretch", gap: 10 }}>
                <SquareArtwork
                  source={vehicleArt(values.category, values.subtype)}
                  size={96}
                />
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <AppText large>
                    {values.nickname ||
                      values.model ||
                      values.registration_number ||
                      subtypeLabel(values.subtype)}
                  </AppText>
                  <AppText muted>{subtypeLabel(values.subtype)}</AppText>
                </View>
              </View>
              {[
                [t("categoryStep"), t(values.category)],
                [t("registration"), values.registration_number || "—"],
                [
                  t("modelStep"),
                  `${values.brand} ${values.model}`.trim() || "—",
                ],
                [t("uiEnergyType"), t(values.energy_type)],
                [t("meters"), t(values.meter_mode)],
                [t("timezone"), timezoneLabel(values.timezone)],
                ...(!id && values.km ? [[t("km"), `${values.km} km`]] : []),
                ...(!id && values.hours
                  ? [[t("hours"), `${values.hours} hrs`]]
                  : []),
                ...(!id && (values.km || values.hours)
                  ? [
                      [
                        t("observed"),
                        readableDateTime(values.observed_at, values.timezone),
                      ],
                    ]
                  : []),
              ].map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingVertical: 7,
                    borderTopWidth: 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <Text style={{ color: colors.muted, fontSize: 13, flex: 1 }}>
                    {label}
                  </Text>
                  <Text
                    style={{
                      color: colors.ink,
                      fontSize: 14,
                      fontWeight: "600",
                      flex: 1,
                      textAlign: "right",
                    }}
                  >
                    {value}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}
        {id && vehicle?.role === "OWNER" && !development && (
          <DeleteVehicle
            vehicle={vehicle}
            onBusyChange={setBusy}
            disabled={busy || !ready}
            onDeleted={async () => {
              setAllowExit(true);
              disablePrevention();
              await qc.cancelQueries();
              qc.clear();
              toast(t("vehicleDeleted"), "success");
              router.replace("/garage");
            }}
          />
        )}
        <AppText muted>{t("onlineFormNotice")}</AppText>
        {!!error && <ErrorState message={error} retry={() => void submit()} />}
      </View>
    </Screen>
  );
}
