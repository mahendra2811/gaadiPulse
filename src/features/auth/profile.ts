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
import { isProfileCountry } from "./countries";
import { defaultProfileIcon, isProfileIcon, type ProfileIcon } from "./avatars";
export type Profile = {
  id: string;
  display_name: string;
  locale: "en";
  theme: ThemeMode;
  timezone: string;
  avatar_icon: ProfileIcon;
  avatar_available: boolean;
  country_code: string | null;
  country_available: boolean;
};
export function useProfile() {
  const { session, development } = useSession();
  const user = useAccountId();
  return useQuery({
    queryKey: [user, "profile"],
    enabled: !!user,
    queryFn: async (): Promise<Profile> => {
      if (development) {
        const profile = await developmentProfile();
        return {
          ...profile,
          avatar_icon: isProfileIcon(profile.avatar_icon)
            ? profile.avatar_icon
            : defaultProfileIcon,
          avatar_available: true,
          country_code: profile.country_code ?? null,
          country_available: true,
        };
      }
      const { data, error } = await client()
        .from("profiles")
        .select("*")
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
      return {
        ...record,
        avatar_icon: isProfileIcon(data.avatar_icon)
          ? data.avatar_icon
          : defaultProfileIcon,
        avatar_available: Object.prototype.hasOwnProperty.call(
          data,
          "avatar_icon",
        ),
        country_code:
          typeof data.country_code === "string" ? data.country_code : null,
        country_available: Object.prototype.hasOwnProperty.call(
          data,
          "country_code",
        ),
      };
    },
  });
}
export const profileInputSchema = z.object({
  display_name: z.string().trim().min(1, t("requiredValue")).max(120),
  theme: z.enum(["light", "dark", "system"]),
  avatar_icon: z.custom<ProfileIcon>(isProfileIcon).optional(),
  country_code: z
    .string()
    .refine(isProfileCountry, t("countryNoResults"))
    .nullable()
    .optional(),
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
  values: Pick<Profile, "display_name" | "theme" | "timezone"> & {
    avatar_icon?: ProfileIcon;
    country_code?: string | null;
  },
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
