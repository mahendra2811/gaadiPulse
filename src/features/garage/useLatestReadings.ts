import { useQuery } from "@/src/lib/query";
import { client } from "@/src/lib/supabase";
import { meterObservationSchema } from "@/src/lib/observations";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { useVehicleAccess } from "@/src/hooks/useVehicleAccess";
import { developmentReadings } from "@/src/features/development/repository";

export function useLatestReadings(vehicleId?: string) {
  const user = useAccountId();
  const { development } = useSession();
  const access = useVehicleAccess(vehicleId);
  return useQuery({
    queryKey: [user, vehicleId, "latest-observations"],
    enabled: !!user && !!vehicleId && access.data?.metersRead === true,
    refetchInterval: 15000,
    queryFn: async () => {
      if (development) return developmentReadings(vehicleId!);
      const { data, error } = await client().rpc("latest_meter_readings", {
        p_vehicle: vehicleId!,
      });
      if (error) throw error;
      return meterObservationSchema.array().parse(data);
    },
  });
}
