import { useQuery } from "@/src/lib/query";
import { client } from "@/src/lib/supabase";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { dateInZone } from "@/src/features/progress/schema";
import { listRecords } from "@/src/features/records/api";
import { validatePayload } from "@/src/features/records/payloadSchemas";
import { recordSchema } from "@/src/features/records/schema";
import { recentFuelRows, recentFuelWithFallback } from "./recentFuel";

export async function loadRecentFuel(
  user: string,
  vehicle: { id: string; role: "OWNER" | "PILOT"; timezone: string },
  development: boolean,
  now: number,
  signal?: AbortSignal,
) {
  if (development)
    return recentFuelRows(
      await listRecords(user, vehicle.id, "fuel", true, signal),
      vehicle.role,
      vehicle.timezone,
      now,
    );
  let request = client().rpc("recent_fuel_activity", {
    p_vehicle: vehicle.id,
    p_limit: 10,
  });
  if (signal && "abortSignal" in request) request = request.abortSignal(signal);
  const result = await request;
  const data = await recentFuelWithFallback(result, async () =>
    recentFuelRows(
      await listRecords(user, vehicle.id, "fuel", false, signal),
      vehicle.role,
      vehicle.timezone,
      now,
    ),
  );
  return recordSchema
    .array()
    .parse(data)
    .map((row) => ({
      ...row,
      payload: validatePayload("fuel", row.payload),
    }));
}

export function useRecentFuel(
  vehicle:
    { id: string; role: "OWNER" | "PILOT"; timezone: string } | undefined,
  enabled: boolean,
  now: number,
) {
  const user = useAccountId();
  const { development } = useSession();
  const localDate = vehicle ? dateInZone(new Date(now), vehicle.timezone) : "";
  return useQuery({
    queryKey: [user, vehicle?.id, "recent-fuel", vehicle?.role, localDate],
    enabled: !!user && !!vehicle && enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      loadRecentFuel(user!, vehicle!, development, Date.now(), signal),
  });
}
