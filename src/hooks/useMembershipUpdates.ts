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
        () => {
          void query.invalidateQueries();
        },
      )
      .subscribe();
    return () => {
      void client().removeChannel(channel);
    };
  }, [session, development, query]);
}
