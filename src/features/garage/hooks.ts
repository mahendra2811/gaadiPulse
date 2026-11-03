import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/src/lib/query";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { useUI } from "@/src/state/ui";
import { listVehicles } from "./api";
import { selectActive } from "./schema";
export function useVehicles() {
  const { development } = useSession();
  const user = useAccountId();
  const qc = useQueryClient();
  const previous = useRef<string[]>([]);
  const result = useQuery({
    queryKey: [user, "vehicles"],
    queryFn: () => listVehicles(development),
    enabled: !!user,
    refetchInterval: 30000,
  });
  useEffect(() => {
    if (!result.data || !user) return;
    const ids = result.data.map((v) => v.id);
    for (const removed of previous.current.filter((id) => !ids.includes(id))) {
      qc.removeQueries({
        predicate: (q) => q.queryKey[0] === user && q.queryKey[1] === removed,
      });
    }
    previous.current = ids;
  }, [result.data, user, qc]);
  return { ...result, data: result.error ? undefined : result.data };
}
export function useActiveVehicle() {
  const query = useVehicles();
  const { active, setActive } = useUI();
  const id = selectActive(query.data ?? [], active);
  return {
    ...query,
    vehicle: query.data?.find((v) => v.id === id),
    select: setActive,
  };
}
