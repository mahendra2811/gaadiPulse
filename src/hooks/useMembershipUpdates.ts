import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/src/features/auth/session";
import { client } from "@/src/lib/supabase";
export function useMembershipUpdates() {
  const { session, development } = useSession();
  const query = useQueryClient();
  useEffect(() => {
    if (!session || development) return;
    const channel = client()
      .channel(`memberships.${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_members",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const vehicleId = String(
            (payload.new as { vehicle_id?: string } | null)?.vehicle_id ??
              (payload.old as { vehicle_id?: string } | null)?.vehicle_id ??
              "",
          );
          if (!vehicleId) {
            void query.invalidateQueries({
              queryKey: [session.user.id, "vehicles"],
            });
            return;
          }
          void query.cancelQueries({
            predicate: (item) =>
              item.queryKey[0] === session.user.id &&
              item.queryKey[1] === vehicleId,
          });
          const revoked =
            (payload.new as { status?: string } | null)?.status === "REVOKED" ||
            (payload.old as { status?: string } | null)?.status === "ACTIVE";
          if (revoked) {
            query.removeQueries({
              predicate: (item) =>
                item.queryKey[0] === session.user.id &&
                item.queryKey[1] === vehicleId,
            });
          } else {
            void query.invalidateQueries({
              predicate: (item) =>
                item.queryKey[0] === session.user.id &&
                item.queryKey[1] === vehicleId,
            });
          }
          void query.invalidateQueries({
            queryKey: [session.user.id, "vehicles"],
          });
        },
      )
      .subscribe();
    return () => {
      void client().removeChannel(channel);
    };
  }, [session, development, query]);
}
