import { z } from "zod";
const result = z
  .object({
    url: z.url(),
    key: z.string().min(20),
    redirect: z.string().startsWith("gaadipulse://"),
  })
  .safeParse({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    redirect:
      process.env.EXPO_PUBLIC_OAUTH_REDIRECT ?? "gaadipulse://auth/callback",
  });
export const env = result.success ? result.data : null;
