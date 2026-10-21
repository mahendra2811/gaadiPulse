import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/features/auth/session";
import { client } from "@/src/lib/supabase";
export function useVehicleAccess(vehicleId?: string) {
  const { session } = useSession();
  return useQuery({
    queryKey: [session?.user.id, vehicleId, "access"],
    enabled: !!session && !!vehicleId,
    queryFn: async () => {
      const { data, error } = await client().rpc("has_vehicle_permission", {
        p_vehicle: vehicleId,
        p_key: "meters.read",
      });
      if (error) throw error;
      return { metersRead: data === true };
    },
  });
}
