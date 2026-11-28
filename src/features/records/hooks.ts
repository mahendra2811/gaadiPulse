import { supportsRecord } from "@/src/features/release/scope";
import { useQuery } from "@/src/lib/query";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { access, listRecords } from "./api";
import type { Kind } from "./schema";
export function usePermissions(vehicleId?: string) {
  const user = useAccountId();
  const { development } = useSession();
  const query = useQuery({
    queryKey: [user, vehicleId, "permissions"],
    enabled: !!user && !!vehicleId,
    staleTime: 15_000,
    gcTime: 60_000,
    queryFn: () => access(vehicleId!, development),
  });
  return { ...query, data: query.error ? undefined : query.data };
}
export function useRecords(kind: Kind, vehicleId?: string, enabled = true) {
  const active = useActiveVehicle();
  const vehicle = vehicleId ?? active.vehicle?.id;
  const user = useAccountId();
  const { development } = useSession();
  const query = useQuery({
    queryKey: [user, vehicle, "records", kind],
    enabled: enabled && !!user && !!vehicle && supportsRecord(kind),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      listRecords(user!, vehicle!, kind, development, signal),
  });
  return { ...query, data: query.error ? undefined : query.data };
}
