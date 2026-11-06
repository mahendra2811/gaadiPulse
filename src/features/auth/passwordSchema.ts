import { z } from "zod";
import { t } from "../../lib/i18n";

export const signupName = z
  .string()
  .trim()
  .min(1, t("authFullNameRequired"))
  .max(120, t("authFullNameRequired"));
export const accountEmail = z
  .string()
  .trim()
  .max(254, t("invalidEmail"))
  .pipe(z.email(t("invalidEmail")));
export const newPassword = z
  .string()
  .min(5, t("passwordRules"))
  .max(128, t("passwordRules"));
export const passwordPair = z
  .object({
    password: newPassword,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: t("passwordMismatch"),
    path: ["confirm"],
  });
export const emailCode = z.string().regex(/^\d{6,8}$/, t("invalidCode"));
