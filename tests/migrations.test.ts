import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

it("applies every authoritative migration in order on PostgreSQL", async () => {
  const db = new PGlite();
  try {
    // Minimal hosted roles/Auth fixture; this checks migration compilation,
    // not hosted Auth, REST, or the complete Supabase security matrix.
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      create function auth.role() returns text language sql stable as $$
        select current_user::text
      $$;
      grant usage on schema auth,public to authenticated;
      grant execute on function auth.uid() to authenticated;
    `);
    const migrations = readdirSync("supabase/migrations")
      .filter((file) => file.endsWith(".sql"))
      .sort();
    expect(migrations.length).toBeGreaterThanOrEqual(4);
    for (const file of migrations) {
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    }
    const retired = await db.query<{
      read_access: boolean;
      submit_access: boolean;
      trigger_count: number;
    }>(`select
      has_function_privilege('authenticated', 'public.read_progress_records(uuid,integer,integer)', 'execute') as read_access,
      has_function_privilege('authenticated', 'public.submit_progress(uuid,jsonb,uuid,uuid,integer)', 'execute') as submit_access,
      (select count(*)::int from pg_trigger where tgrelid = 'public.vehicles'::regclass and tgname in ('initial_progress_form', 'adapt_progress_meter') and not tgisinternal) as trigger_count`);
    expect(retired.rows[0]).toEqual({
      read_access: false,
      submit_access: false,
      trigger_count: 0,
    });
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values
      ('10000000-0000-4000-8000-000000000001','one@example.com',now()),
      ('10000000-0000-4000-8000-000000000002','two@example.com',now());
      select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
      set role authenticated;`);
    await db.exec(
      `update public.profiles set avatar_icon='rocket' where id='10000000-0000-4000-8000-000000000001'`,
    );
    expect(
      (
        await db.query<{ avatar_icon: string }>(
          `select avatar_icon from public.profiles`,
        )
      ).rows,
    ).toEqual([{ avatar_icon: "rocket" }]);
    await expect(
      db.exec(
        `update public.profiles set avatar_icon='invalid-icon' where id='10000000-0000-4000-8000-000000000001'`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `update public.profiles set country_code='IN' where id='10000000-0000-4000-8000-000000000001'`,
    );
    expect(
      (
        await db.query<{ country_code: string }>(
          `select country_code from public.profiles`,
        )
      ).rows,
    ).toEqual([{ country_code: "IN" }]);
    await expect(
      db.exec(
        `update public.profiles set country_code='ZZ' where id='10000000-0000-4000-8000-000000000001'`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `update public.profiles set country_code='US' where id='10000000-0000-4000-8000-000000000002'`,
    );
    await db.exec(
      `update public.profiles set avatar_icon='heart' where id='10000000-0000-4000-8000-000000000002'; reset role;`,
    );
    expect(
      (
        await db.query<{ avatar_icon: string }>(
          `select avatar_icon from public.profiles where id='10000000-0000-4000-8000-000000000002'`,
        )
      ).rows,
    ).toEqual([{ avatar_icon: "person-circle" }]);
    expect(
      (
        await db.query<{ country_code: string | null }>(
          `select country_code from public.profiles where id='10000000-0000-4000-8000-000000000002'`,
        )
      ).rows,
    ).toEqual([{ country_code: null }]);
    await db.exec(`insert into public.vehicles(id, created_by, nickname, category, subtype, energy_type, meter_mode, timezone) values
      ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Car','four_wheeler','car','PETROL','KM','Asia/Kolkata');
      insert into public.meter_readings(id, vehicle_id, reading_type, value, observed_at, source, created_by) values
      ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','KM',100,now(),'MANUAL','10000000-0000-4000-8000-000000000001');
      update public.vehicles set archived_at=now() where id='20000000-0000-4000-8000-000000000001';`);
    await expect(
      db.exec(
        `update public.meter_readings set notes='changed' where id='30000000-0000-4000-8000-000000000001'`,
      ),
    ).rejects.toThrow("VEHICLE_ARCHIVED");
    await expect(
      db.exec(
        `insert into public.meter_readings(id, vehicle_id, reading_type, value, observed_at, source, created_by) values ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','KM',101,now(),'MANUAL','10000000-0000-4000-8000-000000000001')`,
      ),
    ).rejects.toThrow("VEHICLE_ARCHIVED");
    await expect(
      db.exec(
        `update public.vehicles set nickname='Changed' where id='20000000-0000-4000-8000-000000000001'`,
      ),
    ).rejects.toThrow("VEHICLE_ARCHIVED");
    await db.exec(
      `update public.vehicles set archived_at=null where id='20000000-0000-4000-8000-000000000001'; update public.vehicles set nickname='Restored' where id='20000000-0000-4000-8000-000000000001';`,
    );
  } finally {
    await db.close();
  }
}, 30000);
