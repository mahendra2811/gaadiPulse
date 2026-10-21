import { operations } from "@/src/lib/sync/outbox";
import { useQuery } from "@tanstack/react-query";
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
    queryFn: () => access(vehicleId!, development),
  });
  return { ...query, data: query.error ? undefined : query.data };
}
export function useRecords(kind: Kind, vehicleId?: string) {
  const active = useActiveVehicle();
  const vehicle = vehicleId ?? active.vehicle?.id;
  const user = useAccountId();
  const { development } = useSession();
  return useQuery({
    queryKey: [user, vehicle, "records", kind],
    enabled: !!user && !!vehicle,
    queryFn: async () => {
      if (development) return listRecords(user!, vehicle!, kind, true);
      const queue = (await operations(user!)).filter(
        (op) => op.vehicle_id === vehicle && op.kind === kind,
      );
      let confirmed: Awaited<ReturnType<typeof listRecords>> = [];
      try {
        confirmed = await listRecords(user!, vehicle!, kind, false);
      } catch (error) {
        if (!queue.length || /PERMISSION|JWT|AUTHENTICATED/.test(String(error)))
          throw error;
      }
      return [
        ...confirmed,
        ...queue.map((op) => ({
          id: op.operation_id,
          vehicle_id: op.vehicle_id,
          created_by: user!,
          revision: op.expected ?? 0,
          status: op.record_status,
          payload: op.payload,
          created_at: op.created_at,
          updated_at: op.created_at,
          localStatus:
            op.status === "CONFLICT"
              ? ("CONFLICT" as const)
              : op.status === "REJECTED"
                ? ("REJECTED" as const)
                : ("PENDING" as const),
        })),
      ];
    },
  });
}
