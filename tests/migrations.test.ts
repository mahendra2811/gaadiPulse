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
    expect(
      (
        await db.query<{ allowed: boolean }>(
          `select has_function_privilege('authenticated', 'public.save_vehicle_legacy_inr(jsonb,uuid,uuid,timestamptz)', 'execute') as allowed`,
        )
      ).rows[0].allowed,
    ).toBe(false);
    await db.exec("set role authenticated");
    const saved = await db.query<{ id: string }>(
      `select public.save_vehicle($1::jsonb, '40000000-0000-4000-8000-000000000001') as id`,
      [
        JSON.stringify({
          nickname: "Legacy car",
          registration_number: "",
          category: "four_wheeler",
          subtype: "car",
          brand: "",
          model: "",
          energy_type: "PETROL",
          meter_mode: "KM",
          timezone: "Asia/Kolkata",
          km: "",
          hours: "",
          observed_at: "2026-01-01T00:00:00Z",
        }),
      ],
    );
    expect(saved.rows[0].id).toBeTruthy();
    await expect(
      db.exec(
        `select public.save_vehicle('{"currency_code":"USD"}'::jsonb, gen_random_uuid())`,
      ),
    ).rejects.toThrow("CURRENCY_NOT_ENABLED");
    await db.exec("reset role");
    await db.exec(`insert into public.vehicles(id, created_by, nickname, category, subtype, energy_type, meter_mode, timezone) values
      ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Car','four_wheeler','car','PETROL','KM','Asia/Kolkata');
      insert into public.meter_readings(id, vehicle_id, reading_type, value, observed_at, source, created_by) values
      ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','KM',100,now(),'MANUAL','10000000-0000-4000-8000-000000000001');
      update public.vehicles set archived_at=now() where id='20000000-0000-4000-8000-000000000001';`);
    expect(
      (
        await db.query<{ currency_code: string }>(
          `select currency_code from public.vehicles where id='20000000-0000-4000-8000-000000000001'`,
        )
      ).rows[0].currency_code,
    ).toBe("INR");
    await expect(
      db.exec(
        `update public.vehicles set currency_code='USD' where id='20000000-0000-4000-8000-000000000001'`,
      ),
    ).rejects.toThrow("VEHICLE_CURRENCY_IMMUTABLE");
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
    await db.exec(`
      insert into public.vehicle_members(vehicle_id,user_id,role,is_primary_admin,created_by)
      values
        ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','OWNER',true,'10000000-0000-4000-8000-000000000001'),
        ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','PILOT',false,'10000000-0000-4000-8000-000000000001');
      insert into public.vehicle_settings(vehicle_id,pilot_permissions)
      values ('20000000-0000-4000-8000-000000000001','{"expenses.read":true}'::jsonb);
      insert into public.expenses(id,vehicle_id,created_by,payload,client_operation_id,created_at,updated_at)
      values
        ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',jsonb_build_object('event_at',now(),'amount_paise',1234,'title','Brake repair','notes','Front axle','category','REPAIR','station_name','Garage A','payment_method','CASH'),'60000000-0000-4000-8000-000000000001',now(),now()),
        ('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',jsonb_build_object('event_at',now()-interval '3 days','amount_paise',2000,'title','Old repair','notes','','category','REPAIR','station_name','Garage B','payment_method','CASH'),'60000000-0000-4000-8000-000000000002',now()-interval '3 days',now()-interval '3 days');
      insert into auth.users(id,email,email_confirmed_at)
      values ('10000000-0000-4000-8000-000000000003','outsider@example.com',now());
      select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
      set role authenticated;
    `);
    const firstExpensePage = await db.query<{
      page: {
        rows: { id: string; created_at: string }[];
        count: number;
        total_paise: string;
      };
    }>(
      `select public.expense_history_page($1::uuid,null,null,'',null,null,1) as page`,
      ["20000000-0000-4000-8000-000000000001"],
    );
    expect(firstExpensePage.rows[0].page).toMatchObject({
      count: 2,
      total_paise: "3234",
    });
    expect(firstExpensePage.rows[0].page.rows).toHaveLength(1);
    const nextExpensePage = await db.query<{
      page: {
        rows: { id: string; created_at: string }[];
        count: number;
        total_paise: string;
      };
    }>(
      `select public.expense_history_page($1::uuid,null,null,'',$2::timestamptz,$3::uuid,1) as page`,
      [
        "20000000-0000-4000-8000-000000000001",
        firstExpensePage.rows[0].page.rows[0].created_at,
        firstExpensePage.rows[0].page.rows[0].id,
      ],
    );
    expect(nextExpensePage.rows[0].page.count).toBe(2);
    const searchedExpenses = await db.query<{
      page: { rows: { id: string }[]; count: number; total_paise: string };
    }>(
      `select public.expense_history_page($1::uuid,null,null,'Brake',null,null,30) as page`,
      ["20000000-0000-4000-8000-000000000001"],
    );
    expect(searchedExpenses.rows[0].page).toMatchObject({
      count: 1,
      total_paise: "1234",
    });
    await db.exec(
      `select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false)`,
    );
    const pilotExpenses = await db.query<{
      page: { rows: { id: string }[]; count: number; total_paise: string };
    }>(
      `select public.expense_history_page($1::uuid,null,null,'',null,null,30) as page`,
      ["20000000-0000-4000-8000-000000000001"],
    );
    expect(pilotExpenses.rows[0].page).toMatchObject({
      count: 1,
      total_paise: "1234",
    });
    await db.exec(
      `select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false)`,
    );
    const outsiderExpenses = await db.query<{
      page: { rows: unknown[]; count: number; total_paise: string };
    }>(
      `select public.expense_history_page($1::uuid,null,null,'',null,null,30) as page`,
      ["20000000-0000-4000-8000-000000000001"],
    );
    expect(outsiderExpenses.rows[0].page).toMatchObject({
      rows: [],
      count: 0,
      total_paise: "0",
    });
  } finally {
    await db.close();
  }
}, 30000);

it("applies the linked project's missing migrations after its recorded versions", async () => {
  const db = new PGlite();
  try {
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
    const all = readdirSync("supabase/migrations").filter((file) =>
      file.endsWith(".sql"),
    );
    const applyOrder = [
      ...all.filter((file) => /^202610/.test(file)),
      ...all.filter((file) => /^20261104/.test(file)),
      ...all.filter((file) => /^2026110500(12|15|17)/.test(file)),
      ...all.filter((file) => /^2026110500(13|14|16|18)/.test(file)),
      ...all.filter((file) => /^2026112000/.test(file)),
      ...all.filter((file) => /^2026112800/.test(file)),
    ];
    expect(applyOrder).toHaveLength(all.length);
    for (const file of applyOrder)
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    const result = await db.query<{
      record_author: string | null;
      recent_fuel: string | null;
      fuel_page: string | null;
      expense_page: string | null;
      currency_column: string | null;
      archived_guard: number;
      active_locale_count: number;
      arabic_direction: string | null;
      query_index_count: number;
      fuel_page_projects_needed_fields: boolean;
    }>(`select
      to_regprocedure('public.record_author_name(text,uuid,uuid)')::text as record_author,
      to_regprocedure('public.recent_fuel_activity(uuid,integer)')::text as recent_fuel,
      to_regprocedure('public.fuel_history_page(uuid,date,date,bigint,bigint,text,integer,integer)')::text as fuel_page,
      to_regprocedure('public.expense_history_page(uuid,date,text,text,timestamptz,uuid,integer)')::text as expense_page,
      (select column_name from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='currency_code') as currency_column,
      (select count(*)::int from pg_trigger where tgrelid='public.expenses'::regclass and tgname='archived_expense_guard' and not tgisinternal) as archived_guard,
      (select count(*)::int from public.supported_locales where active) as active_locale_count,
      (select direction from public.supported_locales where code='ar-SA') as arabic_direction,
      (select count(*)::int from pg_indexes where schemaname='public' and indexname in (
        'fuel_vehicle_history_cursor','expense_vehicle_history_cursor',
        'meter_vehicle_type_status_observed','vehicle_members_user_active_vehicle',
        'grants_resolved_user_status','expense_items_expense_currency',
        'maintenance_vehicle_expense','progress_vehicle_created_cursor'
      )) as query_index_count,
      (select position('select f.id, f.vehicle_id, f.created_by, f.revision, f.status' in pg_get_functiondef('public.fuel_history_page(uuid,date,date,bigint,bigint,text,integer,integer)'::regprocedure)) > 0) as fuel_page_projects_needed_fields`);
    expect(result.rows[0]).toEqual({
      record_author: "record_author_name(text,uuid,uuid)",
      recent_fuel: "recent_fuel_activity(uuid,integer)",
      fuel_page:
        "fuel_history_page(uuid,date,date,bigint,bigint,text,integer,integer)",
      expense_page:
        "expense_history_page(uuid,date,text,text,timestamp with time zone,uuid,integer)",
      currency_column: "currency_code",
      archived_guard: 1,
      active_locale_count: 45,
      arabic_direction: "rtl",
      query_index_count: 8,
      fuel_page_projects_needed_fields: true,
    });
    const plan = await db.query<{ "QUERY PLAN": string }>(
      `explain (analyze, buffers, format text)
       select id from public.fuel_logs
       where vehicle_id='10000000-0000-4000-8000-000000000001'
       order by created_at desc, id desc limit 30`,
    );
    expect(plan.rows.length).toBeGreaterThan(0);
    expect(plan.rows.map((row) => row["QUERY PLAN"]).join("\n")).toContain(
      "Execution Time",
    );
  } finally {
    await db.close();
  }
}, 30000);
