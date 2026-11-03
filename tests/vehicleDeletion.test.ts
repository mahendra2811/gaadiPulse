import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("enforces owner identity and exact confirmation, retains history and blocks deleted access", async () => {
  const db = new PGlite();
  const owner = "10000000-0000-4000-8000-000000000001";
  const pilot = "10000000-0000-4000-8000-000000000002";
  const outsider = "10000000-0000-4000-8000-000000000003";
  const vehicle = "20000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function public.require_verified() returns uuid language plpgsql as $$ begin
        if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_VERIFIED'; end if;
        return auth.uid(); end $$;
      create table public.vehicles(id uuid primary key,nickname text,registration_number text,model text,subtype text,archived_at timestamptz,updated_at timestamptz);
      create table public.vehicle_members(vehicle_id uuid,user_id uuid,role text,status text);
      create table public.vehicle_access_grants(vehicle_id uuid,status text,revoked_at timestamptz);
      create table public.audit_events(vehicle_id uuid,actor_id uuid,action text);
      grant usage on schema public to authenticated,anon;
      insert into auth.users values ('${owner}',now()),('${pilot}',now()),('${outsider}',now());
      insert into public.vehicles values ('${vehicle}','My bike',null,'Model','motorcycle',null,now());
      insert into public.vehicle_members values ('${vehicle}','${owner}','OWNER','ACTIVE'),('${vehicle}','${pilot}','PILOT','ACTIVE');
      insert into public.vehicle_access_grants values ('${vehicle}','UNRESOLVED',null);
    `);
    await db.exec(
      readFileSync(
        "supabase/migrations/202611040007_vehicle_deletion.sql",
        "utf8",
      ),
    );
    const asUser = async (user: string) => {
      await db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`,
      );
    };
    const remove = (name: string) =>
      db.query("select public.delete_vehicle($1,$2)", [vehicle, name]);
    for (const user of [pilot, outsider]) {
      await asUser(user);
      await expect(remove("My bike")).rejects.toThrow("PERMISSION_DENIED");
    }
    await asUser(owner);
    await expect(remove("my bike")).rejects.toThrow("VEHICLE_NAME_MISMATCH");
    await db.exec("reset role");
    await db.query(
      "update auth.users set email_confirmed_at=null where id=$1",
      [owner],
    );
    await asUser(owner);
    await expect(remove("My bike")).rejects.toThrow("EMAIL_NOT_VERIFIED");
    await db.exec("reset role");
    await db.query(
      "update auth.users set email_confirmed_at=now() where id=$1",
      [owner],
    );
    await asUser(owner);
    await remove("My bike");
    await remove("My bike"); // Explicit unchanged retry produces no second audit event.
    const access = await db.query<{ member: boolean; owner: boolean }>(
      "select public.is_vehicle_member($1) member, public.is_vehicle_owner($1) owner",
      [vehicle],
    );
    expect(access.rows[0]).toEqual({ member: false, owner: false });
    await db.exec("reset role");
    expect(
      (
        await db.query(
          "select * from public.vehicles where deleted_at is not null",
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          "select * from public.audit_events where action='VEHICLE_DELETED'",
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          "select * from public.vehicle_access_grants where status='REVOKED'",
        )
      ).rows,
    ).toHaveLength(1);
    await db.exec("set role anon");
    await expect(remove("My bike")).rejects.toThrow(/permission denied/);
  } finally {
    await db.close();
  }
}, 30000);
