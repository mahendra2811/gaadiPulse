import { useQuery } from "@/src/lib/query";
import { client } from "@/src/lib/supabase";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { dateInZone } from "@/src/features/progress/schema";
import { listRecords } from "@/src/features/records/api";
import { validatePayload } from "@/src/features/records/payloadSchemas";
import { recordSchema } from "@/src/features/records/schema";
import { recentFuelRows, recentFuelWithFallback } from "./recentFuel";

export function useRecentFuel(
  vehicle: { id: string; role: "OWNER" | "PILOT"; timezone: string } | undefined,
  enabled: boolean,
  now: number
) {
  const user = useAccountId();
  const { development } = useSession();
  const localDate = vehicle ? dateInZone(new Date(now), vehicle.timezone) : "";
  return useQuery({
    queryKey: [user, vehicle?.id, "recent-fuel", vehicle?.role, localDate],
    enabled: !!user && !!vehicle && enabled,
    queryFn: async () => {
      if (development) {
        return recentFuelRows(
          await listRecords(user!, vehicle!.id, "fuel", true),
          vehicle!.role,
          vehicle!.timezone,
          Date.now()
        );
      }
      const result = await client().rpc("recent_fuel_activity", {
        p_vehicle: vehicle!.id,
        p_limit: 10,
      });
      const data = await recentFuelWithFallback(result, async () =>
        recentFuelRows(
          await listRecords(user!, vehicle!.id, "fuel", false),
          vehicle!.role,
          vehicle!.timezone,
          Date.now()
        )
      );
      return recordSchema
        .array()
        .parse(data)
        .map((row) => ({
          ...row,
          payload: validatePayload("fuel", row.payload),
        }));
    },
  });
}
