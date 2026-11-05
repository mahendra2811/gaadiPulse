import { client } from "@/src/lib/supabase";
import { t } from "@/src/lib/i18n";

// Fail closed until the server-side restrictions have actually been installed.
export async function requirePilotPolicy() {
  const { data, error } = await client().rpc("pilot_access_policy_ready");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883")
      throw new Error(t("pilotPolicyUnavailable"));
    throw new Error(error.message);
  }
  if (data !== true) throw new Error(t("pilotPolicyUnavailable"));
}
