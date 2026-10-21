import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001",
  coowner = "00000000-0000-4000-8000-000000000002",
  pilot = "00000000-0000-4000-8000-000000000003",
  outsider = "00000000-0000-4000-8000-000000000004",
  unverified = "00000000-0000-4000-8000-000000000005";
let vehicle: string;
async function actor(id: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
async function rpc(sql: string, params: unknown[] = []) {
  return db.query(sql, params);
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202610210001_foundation.sql", "utf8"),
  );
  await db.exec(
    `insert into auth.users values('${owner}','owner@example.com',now()),('${coowner}','coowner@example.com',now()),('${pilot}','pilot@example.com',now()),('${outsider}','outsider@example.com',now()),('${unverified}','unverified@example.com',null);`,
  );
  await actor(owner);
  const result = await db.query<{ id: string }>(
    `select public.save_vehicle($1::jsonb,'10000000-0000-4000-8000-000000000001') as id`,
    [
      JSON.stringify({
        nickname: "Test Tractor",
        registration_number: "",
        category: "agricultural",
        subtype: "tractor",
        brand: "",
        model: "",
        energy_type: "DIESEL",
        meter_mode: "BOTH",
        timezone: "Asia/Kolkata",
        km: "100",
        hours: "12.5",
        observed_at: "2026-01-01T10:00:00Z",
      }),
    ],
  );
  vehicle = result.rows[0].id;
}, 30000);
afterAll(() => db.close());
describe("SQL foundation on embedded PostgreSQL (Supabase integration still required)", () => {
  it("creates protected Owner and atomic baseline readings", async () => {
    const r = await rpc(
      "select * from public.meter_readings where vehicle_id=$1",
      [vehicle],
    );
    expect(r.rows).toHaveLength(2);
    const m = await rpc(
      "select * from public.vehicle_members where vehicle_id=$1",
      [vehicle],
    );
    expect(m.rows[0]).toMatchObject({ role: "OWNER", is_primary_admin: true });
  });
  it("rejects direct role escalation and vehicle mutation", async () => {
    await expect(
      rpc(
        `update public.vehicle_members set role='PILOT' where vehicle_id=$1`,
        [vehicle],
      ),
    ).rejects.toThrow();
    await expect(
      rpc(`update public.vehicles set nickname='Spoof' where id=$1`, [vehicle]),
    ).rejects.toThrow();
  });
  it("resolves a verified Pilot immediately without acceptance", async () => {
    await rpc(
      `select public.grant_vehicle_access($1,' PILOT@example.com ','PILOT')`,
      [vehicle],
    );
    await actor(pilot);
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(1);
    await expect(
      rpc("select public.archive_vehicle($1,true)", [vehicle]),
    ).rejects.toThrow("PERMISSION_DENIED");
  });
  it("prevents outsiders reading vehicles, meters and grant emails", async () => {
    await actor(outsider);
    for (const table of [
      "vehicles",
      "meter_readings",
      "vehicle_access_grants",
      "audit_events",
    ])
      expect((await rpc(`select * from public.${table}`)).rows).toHaveLength(0);
    await expect(
      rpc(
        `select public.grant_vehicle_access($1,'attacker@example.com','OWNER')`,
        [vehicle],
      ),
    ).rejects.toThrow("PERMISSION_DENIED");
  });
  it("protects the primary and final Owner", async () => {
    await actor(owner);
    await expect(
      rpc(`select public.set_vehicle_membership($1,$2,'PILOT','REVOKED')`, [
        vehicle,
        owner,
      ]),
    ).rejects.toThrow("PRIMARY_ADMIN_PROTECTED");
  });
  it("allows multiple Owners and revokes a co-owner safely", async () => {
    await rpc(
      `select public.grant_vehicle_access($1,'coowner@example.com','OWNER')`,
      [vehicle],
    );
    await actor(coowner);
    expect(
      (await rpc("select public.is_vehicle_owner($1) as allowed", [vehicle]))
        .rows[0],
    ).toMatchObject({ allowed: true });
    await actor(owner);
    await rpc(`select public.set_vehicle_membership($1,$2,'PILOT','REVOKED')`, [
      vehicle,
      coowner,
    ]);
    await actor(coowner);
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(0);
  });
  it("does not resolve unverified identities or a caller-supplied email", async () => {
    await actor(owner);
    await rpc(
      `select public.grant_vehicle_access($1,'unverified@example.com','PILOT')`,
      [vehicle],
    );
    await actor(unverified);
    await expect(
      rpc("select public.resolve_my_access_grants()"),
    ).rejects.toThrow("EMAIL_NOT_VERIFIED");
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(0);
    await actor(outsider);
    await rpc("select public.resolve_my_access_grants()");
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(0);
  });
  it("automatically resolves a grant after verification", async () => {
    await db.exec(
      `reset role;update auth.users set email_confirmed_at=now() where id='${unverified}';`,
    );
    await actor(unverified);
    await rpc("select public.resolve_my_access_grants()");
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(1);
  });
  it("rejects revoked Pilot writes and reads", async () => {
    await actor(owner);
    await rpc(`select public.set_vehicle_membership($1,$2,'PILOT','REVOKED')`, [
      vehicle,
      pilot,
    ]);
    await actor(pilot);
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(0);
    await expect(
      rpc("select public.archive_vehicle($1,true)", [vehicle]),
    ).rejects.toThrow("PERMISSION_DENIED");
    await rpc("select public.resolve_my_access_grants()");
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(0);
  });
  it("prevents profile email edits", async () => {
    await actor(owner);
    await expect(
      rpc(`update public.profiles set email='pilot@example.com' where id=$1`, [
        owner,
      ]),
    ).rejects.toThrow();
  });
  it("keeps audit append-only", async () => {
    await expect(rpc("delete from public.audit_events")).rejects.toThrow();
    await expect(
      rpc(
        `insert into public.audit_events(vehicle_id,action) values($1,'FORGED')`,
        [vehicle],
      ),
    ).rejects.toThrow();
  });
  it("retries create operations without duplicate vehicles or readings", async () => {
    await actor(owner);
    const result = await rpc(
      "select public.save_vehicle('{}','10000000-0000-4000-8000-000000000001') as id",
    );
    expect(result.rows[0]).toMatchObject({ id: vehicle });
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(1);
    expect(
      (await rpc("select * from public.meter_readings")).rows,
    ).toHaveLength(2);
  });
  it("rejects stale vehicle edits and outsider edits", async () => {
    await actor(owner);
    await expect(
      rpc(
        "select public.save_vehicle($1::jsonb,'20000000-0000-4000-8000-000000000001',$2,'2020-01-01')",
        [JSON.stringify({ timezone: "Asia/Kolkata" }), vehicle],
      ),
    ).rejects.toThrow("CONFLICT");
    await actor(outsider);
    await expect(
      rpc(
        "select public.save_vehicle($1::jsonb,'20000000-0000-4000-8000-000000000002',$2,null)",
        [JSON.stringify({ timezone: "Asia/Kolkata" }), vehicle],
      ),
    ).rejects.toThrow("PERMISSION_DENIED");
  });
  it("rolls back invalid baseline writes atomically", async () => {
    await actor(owner);
    const input = {
      nickname: "Invalid",
      registration_number: "",
      category: "two_wheeler",
      subtype: "motorcycle",
      brand: "",
      model: "",
      energy_type: "PETROL",
      meter_mode: "KM",
      timezone: "Asia/Kolkata",
      km: "-1",
      observed_at: "2026-01-01T10:00:00Z",
    };
    await expect(
      rpc(
        "select public.save_vehicle($1::jsonb,'30000000-0000-4000-8000-000000000001')",
        [JSON.stringify(input)],
      ),
    ).rejects.toThrow();
    expect((await rpc("select * from public.vehicles")).rows).toHaveLength(1);
  });
});
