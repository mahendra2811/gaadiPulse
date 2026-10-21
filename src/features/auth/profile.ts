import { readLocal, writeLocal } from "@/src/lib/localStore";
import {
  developmentProfile,
  saveDevelopmentProfile,
} from "@/src/features/development/repository";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/src/lib/supabase";
import { useSession, useAccountId } from "./session";
import type { ThemeMode } from "@/src/lib/theme";
export type Profile = {
  id: string;
  display_name: string;
  locale: "en";
  theme: ThemeMode;
  timezone: string;
};
export function useProfile() {
  const { session, development } = useSession();
  const user = useAccountId();
  return useQuery({
    queryKey: [user, "profile"],
    enabled: !!user,
    queryFn: async (): Promise<Profile> => {
      if (development) return developmentProfile();
      const key = `user.${user}.profile`;
      try {
        const { data, error } = await client()
          .from("profiles")
          .select("id,display_name,locale,theme,timezone")
          .eq("id", session!.user.id)
          .single();
        if (error) throw new Error(error.message);
        const record = z
          .object({
            id: z.uuid(),
            display_name: z.string(),
            locale: z.literal("en"),
            theme: z.enum(["system", "light", "dark"]),
            timezone: z.string(),
          })
          .parse(data);
        await writeLocal(key, record);
        return record;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const cache = (await readLocal(key)) as Profile | null;
        if (/network|fetch|offline|connection|timeout/i.test(message) && cache)
          return cache;
        throw error;
      }
    },
  });
}
export async function updateProfile(
  user: string,
  values: Pick<Profile, "display_name" | "theme" | "timezone">,
  development = false,
) {
  if (development) return saveDevelopmentProfile(values);
  const { error } = await client()
    .from("profiles")
    .update(values)
    .eq("id", user);
  if (error) throw new Error(error.message);
}
