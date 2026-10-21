import * as Crypto from "expo-crypto";
import { client } from "@/src/lib/supabase";
import {
  readDevelopment,
  writeDevelopment,
  requireDevelopment,
  DEVELOPMENT_USER,
} from "@/src/features/development/repository";
export const permissionKeys = [
  "fuel.read",
  "fuel.create",
  "fuel.edit_own",
  "expenses.read",
  "expenses.create",
  "expenses.edit_own",
  "meters.read",
  "meters.create",
  "progress.submit",
  "progress.view",
  "progress.edit_own",
  "reports.read",
  "documents.read",
  "documents.create",
  "reminders.read",
  "reminders.create",
] as const;
export type Member = {
  user_id: string;
  role: "OWNER" | "PILOT";
  is_primary_admin: boolean;
  status: string;
  permission_overrides: Record<string, boolean>;
  display_name?: string;
  joined_at?: string;
};
export type Grant = {
  id: string;
  normalized_email: string;
  desired_role: "OWNER" | "PILOT";
  status: string;
  resolved_user_id: string | null;
  created_at: string;
  permission_overrides: Record<string, boolean>;
};
export async function members(
  vehicle: string,
  development: boolean,
): Promise<{
  members: Member[];
  grants: Grant[];
  defaults: Record<string, boolean>;
}> {
  if (development) {
    requireDevelopment();
    return (
      ((await readDevelopment(`members.${vehicle}`)) as Awaited<
        ReturnType<typeof members>
      >) ?? {
        members: [
          {
            user_id: DEVELOPMENT_USER,
            role: "OWNER",
            is_primary_admin: true,
            status: "ACTIVE",
            permission_overrides: {},
            display_name: "Developer",
          },
        ],
        grants: [],
        defaults: { "meters.read": true, "meters.create": true },
      }
    );
  }
  const [m, g, s] = await Promise.all([
    client().rpc("vehicle_member_details", { p_vehicle: vehicle }),
    client()
      .from("vehicle_access_grants")
      .select(
        "id,normalized_email,desired_role,status,resolved_user_id,created_at,permission_overrides",
      )
      .eq("vehicle_id", vehicle),
    client()
      .from("vehicle_settings")
      .select("pilot_permissions")
      .eq("vehicle_id", vehicle)
      .single(),
  ]);
  for (const value of [m, g, s])
    if (value.error) throw new Error(value.error.message);
  return {
    members: m.data as Member[],
    grants: g.data as Grant[],
    defaults: (s.data?.pilot_permissions as Record<string, boolean>) ?? {},
  };
}
export async function grantAccess(
  vehicle: string,
  email: string,
  role: string,
  permissions: Record<string, boolean>,
  development: boolean,
) {
  if (development) {
    const state = await members(vehicle, true);
    const normalized = email.trim().toLowerCase();
    const old = state.grants.find(
      (g) => g.normalized_email === normalized && g.status !== "REVOKED",
    );
    const grant: Grant = {
      id: old?.id ?? Crypto.randomUUID(),
      normalized_email: normalized,
      desired_role: role as Grant["desired_role"],
      status: "UNRESOLVED",
      resolved_user_id: null,
      created_at: new Date().toISOString(),
      permission_overrides: permissions,
    };
    await writeDevelopment(`members.${vehicle}`, {
      ...state,
      grants: [grant, ...state.grants.filter((g) => g.id !== grant.id)],
    });
    return;
  }
  const { error } = await client().rpc("grant_vehicle_access", {
    p_vehicle: vehicle,
    p_email: email,
    p_role: role,
    p_permissions: permissions,
  });
  if (error) throw new Error(error.message);
}
export async function changeMember(
  vehicle: string,
  user: string,
  role: string,
  permissions: Record<string, boolean>,
  status: string,
  development: boolean,
) {
  if (development) {
    const state = await members(vehicle, true);
    const m = state.members.find((m) => m.user_id === user);
    if (m?.is_primary_admin && (role !== "OWNER" || status !== "ACTIVE"))
      throw new Error("PRIMARY_ADMIN_PROTECTED");
    await writeDevelopment(`members.${vehicle}`, {
      ...state,
      members: state.members.map((m) =>
        m.user_id === user
          ? { ...m, role, status, permission_overrides: permissions }
          : m,
      ),
    });
    return;
  }
  const { error } = await client().rpc("set_vehicle_membership", {
    p_vehicle: vehicle,
    p_user: user,
    p_role: role,
    p_status: status,
    p_permissions: permissions,
  });
  if (error) throw new Error(error.message);
}
export async function revokeGrant(
  vehicle: string,
  id: string,
  development: boolean,
) {
  if (development) {
    const state = await members(vehicle, true);
    await writeDevelopment(`members.${vehicle}`, {
      ...state,
      grants: state.grants.map((g) =>
        g.id === id ? { ...g, status: "REVOKED" } : g,
      ),
    });
    return;
  }
  const { error } = await client().rpc("revoke_vehicle_access", {
    p_vehicle: vehicle,
    p_grant: id,
  });
  if (error) throw new Error(error.message);
}
export async function saveDefaults(
  vehicle: string,
  permissions: Record<string, boolean>,
  development: boolean,
) {
  if (development) {
    const state = await members(vehicle, true);
    await writeDevelopment(`members.${vehicle}`, {
      ...state,
      defaults: permissions,
    });
    return;
  }
  const { error } = await client().rpc("update_vehicle_defaults", {
    p_vehicle: vehicle,
    p_permissions: permissions,
  });
  if (error) throw new Error(error.message);
}
