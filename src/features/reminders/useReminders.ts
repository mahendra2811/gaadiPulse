import { useEffect, useState } from "react";
import { AppState } from "react-native";
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
  const [failure, setFailure] = useState<{
    scope: string;
    message: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const scope = `${user}:${vehicle?.id}`;
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setAttempt((value) => value + 1);
    });
    return () => listener.remove();
  }, []);
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
    if (
      !user ||
      !vehicle ||
      !reminders.data ||
      reminders.error ||
      access.data?.["reminders.read"] !== true
    )
      return;
    let alive = true;
    const latest = {
      km:
        access.data?.["meters.read"] && !meters.error
          ? meters.data?.find((r) => r.reading_type === "KM")?.value
          : undefined,
      hours:
        access.data?.["meters.read"] && !meters.error
          ? meters.data?.find((r) => r.reading_type === "HOURS")?.value
          : undefined,
    };
    void reconcileReminders(user, vehicle.id, reminders.data, latest)
      .then(() => {
        if (alive) setFailure(null);
      })
      .catch((e) => {
        if (alive) setFailure({ scope, message: String(e) });
      });
    return () => {
      alive = false;
    };
  }, [
    user,
    vehicle,
    reminders.data,
    reminders.error,
    meters.data,
    meters.error,
    access.data,
    scope,
    attempt,
  ]);
  return {
    error:
      access.error?.message ??
      (access.data?.["reminders.read"] ? reminders.error?.message : null) ??
      (access.data?.["meters.read"] ? meters.error?.message : null) ??
      (failure?.scope === scope ? failure.message : null),
    retry: () => {
      void access.refetch();
      void reminders.refetch();
      if (access.data?.["meters.read"]) void meters.refetch();
      setAttempt((value) => value + 1);
    },
  };
}
