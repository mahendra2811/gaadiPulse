import { useQuery } from "@/src/lib/query";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { access } from "@/src/features/records/api";
export function useVehicleAccess(vehicleId?: string) {
  const { development } = useSession();
  const user = useAccountId();
  return useQuery({
    queryKey: [user, vehicleId, "access"],
    enabled: !!user && !!vehicleId,
    queryFn: async () => {
      if (development) return { metersRead: true };
      const permissions = await access(vehicleId!, false);
      return { metersRead: permissions["meters.read"] === true };
    },
  });
}
