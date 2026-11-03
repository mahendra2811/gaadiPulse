import { useRef, useState } from "react";
import { View, Text } from "react-native";
import { AppButton, AppText, InputField } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import { useTheme } from "@/src/lib/theme";
import { deleteVehicle } from "./api";
import type { Vehicle } from "./schema";

export function DeleteVehicle({
  vehicle,
  disabled,
  onDeleted,
  onBusyChange,
}: {
  vehicle: Vehicle;
  disabled: boolean;
  onDeleted: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState("");
  const name =
    vehicle.nickname.trim() ||
    vehicle.registration_number?.trim() ||
    vehicle.model.trim() ||
    vehicle.subtype;
  if (vehicle.role !== "OWNER") return null;
  const remove = async () => {
    if (running.current || confirmation !== name || disabled) return;
    running.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      await deleteVehicle(vehicle.id, confirmation);
      await onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      running.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.danger,
        gap: 12,
      }}
    >
      <Text style={{ color: c.danger, fontSize: 18, fontWeight: "700" }}>
        {t("deleteVehicle")}
      </Text>
      <AppText muted>{t("deleteVehicleHelp")}</AppText>
      {open ? (
        <>
          <AppText>{t("deleteVehicleTypeName")}</AppText>
          <AppText>{name}</AppText>
          <InputField
            label={t("vehicleNameConfirmation")}
            value={confirmation}
            onChangeText={setConfirmation}
            editable={!busy && !disabled}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={254}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={{ color: c.danger }}>
              {error}
            </Text>
          )}
          <AppButton
            label={t("deleteVehicle")}
            disabled={busy || disabled || confirmation !== name}
            onPress={() => void remove()}
          />
          <AppButton
            secondary
            label={t("cancel")}
            disabled={busy}
            onPress={() => {
              setOpen(false);
              setConfirmation("");
              setError("");
            }}
          />
        </>
      ) : (
        <AppButton
          secondary
          label={t("deleteVehicle")}
          disabled={disabled}
          onPress={() => setOpen(true)}
        />
      )}
    </View>
  );
}
