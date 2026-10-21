import { useState } from "react";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { AppButton, AppText, Card, Sheet } from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
export function VehicleHeader() {
  const { vehicle, data, select } = useActiveVehicle();
  const [open, setOpen] = useState(false);
  const vehicles = data?.filter((v) => !v.archived_at) ?? [];
  if (!vehicle) return null;
  return (
    <>
      <Card>
        <AppText large>
          {vehicle.nickname || vehicle.registration_number || vehicle.model}
        </AppText>
        <AppText muted>
          {t(vehicle.role === "OWNER" ? "owner" : "pilot")} ·{" "}
          {t(vehicle.meter_mode)}
        </AppText>
        {vehicles.length > 1 && (
          <AppButton
            secondary
            label={t("switch")}
            onPress={() => setOpen(true)}
          />
        )}
      </Card>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        {vehicles.map((v) => (
          <AppButton
            key={v.id}
            secondary={v.id !== vehicle.id}
            label={`${v.nickname || v.model} · ${t(v.role === "OWNER" ? "owner" : "pilot")}`}
            onPress={() => {
              select(v.id);
              setOpen(false);
            }}
          />
        ))}
      </Sheet>
    </>
  );
}
