import { useEffect, useState } from "react";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useRecords, usePermissions } from "@/src/features/records/hooks";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/src/lib/supabase";
import { developmentReadings } from "@/src/features/development/repository";
import { reconcileReminders } from "./notifications";
export function useReminderReconciliation() {
  const user = useAccountId();
  const { development } = useSession();
  const active = useActiveVehicle();
  const vehicle = active.vehicle;
  const access = usePermissions(vehicle?.id);
  const reminders = useRecords("reminders");
  const [error, setError] = useState<string | null>(null);
  const meters = useQuery({
    queryKey: [user, vehicle?.id, "reminder-meters"],
    enabled: !!vehicle && access.data?.["meters.read"] === true,
    queryFn: async () => {
      if (development) return developmentReadings(vehicle!.id);
      const { data, error } = await client().rpc("latest_meter_readings", {
        p_vehicle: vehicle!.id,
      });
      if (error) throw new Error(error.message);
      return data as { reading_type: string; value: number }[];
    },
  });
  useEffect(() => {
    if (!user || !vehicle || !reminders.data) return;
    const latest = {
      km: meters.data?.find((r) => r.reading_type === "KM")?.value,
      hours: meters.data?.find((r) => r.reading_type === "HOURS")?.value,
    };
    void reconcileReminders(user, vehicle.id, reminders.data, latest)
      .then(() => setError(null))
      .catch((e) => setError(String(e)));
  }, [user, vehicle, reminders.data, meters.data]);
  return error;
}
