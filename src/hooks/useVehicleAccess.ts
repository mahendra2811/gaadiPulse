import { useQuery } from "@tanstack/react-query";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { client } from "@/src/lib/supabase";
export function useVehicleAccess(vehicleId?: string) {
  const { development } = useSession();
  const user = useAccountId();
  return useQuery({
    queryKey: [user, vehicleId, "access"],
    enabled: !!user && !!vehicleId,
    queryFn: async () => {
      if (development) return { metersRead: true };
      const { data, error } = await client().rpc("has_vehicle_permission", {
        p_vehicle: vehicleId,
        p_key: "meters.read",
      });
      if (error) throw error;
      return { metersRead: data === true };
    },
  });
}
