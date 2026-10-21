import { useQuery } from "@tanstack/react-query";
import { client } from "@/src/lib/supabase";
import { useSession } from "./session";
import type { ThemeMode } from "@/src/lib/theme";
export type Profile = {
  id: string;
  display_name: string;
  locale: "en";
  theme: ThemeMode;
  timezone: string;
};
export function useProfile() {
  const { session } = useSession();
  return useQuery({
    queryKey: [session?.user.id, "profile"],
    enabled: !!session,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await client()
        .from("profiles")
        .select("id,display_name,locale,theme,timezone")
        .eq("id", session!.user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
export async function updateProfile(
  user: string,
  values: Pick<Profile, "display_name" | "theme" | "timezone">,
) {
  const { error } = await client()
    .from("profiles")
    .update(values)
    .eq("id", user);
  if (error) throw error;
}
