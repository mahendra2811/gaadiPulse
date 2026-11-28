import { z } from "zod";
import { accountEmail } from "@/src/features/auth/passwordSchema";
import { t } from "@/src/lib/i18n";
import * as Crypto from "expo-crypto";
import { client } from "@/src/lib/supabase";
import { requirePilotPolicy } from "./pilotPolicy";
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
export const backdateWindows = [0, 1, 2, 10, 30, 60, -1] as const;
export type BackdateWindow = (typeof backdateWindows)[number];
export const backdatePermissionKey = "records.backdate_days" as const;
export const backdateWindowSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(10),
  z.literal(30),
  z.literal(60),
  z.literal(-1),
]);
export const memberRoleSchema = z.enum(["OWNER", "PILOT"]);
export const permissionMapSchema = z
  .record(z.string(), z.boolean())
  .refine(
    (value) =>
      Object.keys(value).every((key) =>
        permissionKeys.includes(key as (typeof permissionKeys)[number]),
      ),
    t("permissionsInvalid"),
  );
export type Member = {
  user_id: string;
  role: "OWNER" | "PILOT";
  is_primary_admin: boolean;
  status: string;
  permission_overrides: Record<string, boolean>;
  backdate_days: BackdateWindow | null;
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
  backdate_days: BackdateWindow | null;
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
        defaults: {
          "meters.read": true,
          "meters.create": true,
          [backdatePermissionKey]: 1,
        },
      }
    );
  }
  const [m, g] = await Promise.all([
    client().rpc("vehicle_member_details", { p_vehicle: vehicle }),
    client().rpc("vehicle_access_grants_for_owner", { p_vehicle: vehicle }),
  ]);
  for (const value of [m, g])
    if (value.error) throw new Error(value.error.message);
  return {
    members: m.data as Member[],
    grants: g.data?.grants as Grant[],
    defaults: {
      ...((g.data?.pilot_permissions as Record<string, boolean>) ?? {}),
      [backdatePermissionKey]: g.data?.pilot_backdate_days ?? 1,
    },
  };
}
export async function grantAccess(
  vehicle: string,
  email: string,
  role: string,
  permissions: Record<string, boolean>,
  backdateDays: BackdateWindow | null,
  development: boolean,
) {
  email = accountEmail.parse(email);
  role = memberRoleSchema.parse(role);
  permissions = permissionMapSchema.parse(permissions);
  if (backdateDays !== null)
    backdateDays = backdateWindowSchema.parse(backdateDays);
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
      backdate_days: backdateDays,
    };
    await writeDevelopment(`members.${vehicle}`, {
      ...state,
      grants: [grant, ...state.grants.filter((g) => g.id !== grant.id)],
    });
    return;
  }
  await requirePilotPolicy();
  const { error } = await client().rpc("grant_vehicle_access_with_backdate", {
    p_vehicle: vehicle,
    p_email: email,
    p_role: role,
    p_permissions: permissions,
    p_backdate_days: backdateDays,
  });
  if (error) throw new Error(error.message);
}
export async function changeMember(
  vehicle: string,
  user: string,
  role: string,
  permissions: Record<string, boolean>,
  status: string,
  backdateDays: BackdateWindow | null,
  development: boolean,
) {
  role = memberRoleSchema.parse(role);
  permissions = permissionMapSchema.parse(permissions);
  z.enum(["ACTIVE", "REVOKED"]).parse(status);
  if (development) {
    const state = await members(vehicle, true);
    const m = state.members.find((m) => m.user_id === user);
    if (!m) throw new Error("MEMBER_NOT_FOUND");
    if (
      m.role === "OWNER" &&
      m.status === "ACTIVE" &&
      (role !== "OWNER" || status !== "ACTIVE") &&
      state.members.filter(
        (item) => item.role === "OWNER" && item.status === "ACTIVE",
      ).length <= 1
    )
      throw new Error("LAST_OWNER_PROTECTED");
    if (m?.is_primary_admin && (role !== "OWNER" || status !== "ACTIVE"))
      throw new Error("PRIMARY_ADMIN_PROTECTED");
    await writeDevelopment(`members.${vehicle}`, {
      ...state,
      members: state.members.map((m) =>
        m.user_id === user
          ? {
              ...m,
              role,
              status,
              permission_overrides: permissions,
              backdate_days: backdateDays,
            }
          : m,
      ),
      grants:
        status === "REVOKED"
          ? state.grants.map((grant) =>
              grant.resolved_user_id === user
                ? { ...grant, status: "REVOKED" }
                : grant,
            )
          : state.grants,
    });
    return;
  }
  if (status === "ACTIVE") await requirePilotPolicy();
  const { error } = await client().rpc("set_vehicle_membership_with_backdate", {
    p_vehicle: vehicle,
    p_user: user,
    p_role: role,
    p_status: status,
    p_permissions: permissions,
    p_backdate_days: backdateDays,
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
  backdateDays: BackdateWindow,
  development: boolean,
) {
  permissions = permissionMapSchema.parse(permissions);
  backdateDays = backdateWindowSchema.parse(backdateDays);
  if (development) {
    const state = await members(vehicle, true);
    await writeDevelopment(`members.${vehicle}`, {
      ...state,
      defaults: permissions,
      backdate_days: backdateDays,
    });
    return;
  }
  const { error } = await client().rpc(
    "update_vehicle_defaults_with_backdate",
    {
      p_vehicle: vehicle,
      p_permissions: permissions,
      p_backdate_days: backdateDays,
    },
  );
  if (error) throw new Error(error.message);
}
