import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/features/auth/session";
import { useUI } from "@/src/state/ui";
import { listVehicles } from "./api";
import { selectActive } from "./schema";
export function useVehicles() {
  const { session } = useSession();
  return useQuery({
    queryKey: [session?.user.id, "vehicles"],
    queryFn: listVehicles,
    enabled: !!session,
  });
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
