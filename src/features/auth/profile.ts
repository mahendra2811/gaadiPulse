import { t } from "@/src/lib/i18n";
import {
  developmentProfile,
  saveDevelopmentProfile,
} from "@/src/features/development/repository";
import { z } from "zod";
import { useQuery } from "@/src/lib/query";
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
      return record;
    },
  });
}
export const profileInputSchema = z.object({
  display_name: z.string().trim().min(1, t("requiredValue")).max(120),
  theme: z.enum(["light", "dark", "system"]),
  timezone: z
    .string()
    .trim()
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, t("invalidTimeZone")),
});
export async function updateProfile(
  user: string,
  values: Pick<Profile, "display_name" | "theme" | "timezone">,
  development = false,
) {
  const parsed = profileInputSchema.parse(values);
  if (development) return saveDevelopmentProfile(parsed);
  const { error } = await client()
    .from("profiles")
    .update(parsed)
    .eq("id", user)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}
