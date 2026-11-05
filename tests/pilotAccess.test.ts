import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("enforces per-vehicle pilot grants, two local days of history, and owner-only edits", async () => {
  const db = new PGlite();
  const owner = "10000000-0000-4000-8000-000000000001";
  const pilot = "10000000-0000-4000-8000-000000000002";
  const other = "10000000-0000-4000-8000-000000000003";
  const pending = "10000000-0000-4000-8000-000000000004";
  const vehicle = "20000000-0000-4000-8000-000000000001";
  const secondVehicle = "20000000-0000-4000-8000-000000000002";
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select current_user::text $$;
      grant usage on schema auth,public to authenticated;
      grant execute on function auth.uid() to authenticated;
    `);
    // Exercise the later migration behavior using a temporary in-memory syntax
    // repair to 005; the authoritative full-chain test still checks the real file.
    for (const file of [
      "202610210001_foundation.sql",
      "202610210002_records.sql",
      "202610210003_collaboration.sql",
      "202610210004_hardening.sql",
      "202610240005_vehicle_fuel_profiles.sql",
      "202610240006_form_validation.sql",
      "202611040007_vehicle_deletion.sql",
      "202611040008_record_soft_deletion.sql",
      "202611040009_manual_meter_monotonic.sql",
      "202611040010_pilot_access.sql",
      "202611040011_pilot_progress.sql",
    ]) {
      let sql = readFileSync(`supabase/migrations/${file}`, "utf8");
      if (file === "202610240005_vehicle_fuel_profiles.sql")
        sql = sql.replace(
          "if units is distinct from case when fuel='ELECTRIC' then 'KWH' when fuel in ('CNG','HYDROGEN') then 'KG' else 'L' end then",
          "if units is distinct from (case when fuel='ELECTRIC' then 'KWH' when fuel in ('CNG','HYDROGEN') then 'KG' else 'L' end) then",
        );
      await db.exec(sql);
    }
    await db.exec(`
      insert into auth.users values
        ('${owner}','owner@example.com',now()),
        ('${pilot}','pilot@example.com',now()),
        ('${other}','other@example.com',now()),
        ('${pending}','pending@example.com',null);
      insert into public.vehicles(id,created_by,nickname,category,subtype,energy_type,meter_mode,timezone)
        values ('${vehicle}','${owner}','Truck','commercial','truck','DIESEL','KM','Asia/Kolkata');
      insert into public.vehicle_settings(vehicle_id) values ('${vehicle}');
      insert into public.vehicle_members(vehicle_id,user_id,role,is_primary_admin,created_by)
        values ('${vehicle}','${owner}','OWNER',true,'${owner}');
      insert into public.vehicles(id,created_by,nickname,category,subtype,energy_type,meter_mode,timezone)
        values ('${secondVehicle}','${pilot}','Car','four_wheeler','car','PETROL','KM','Asia/Kolkata');
      insert into public.vehicle_settings(vehicle_id) values ('${secondVehicle}');
      insert into public.vehicle_members(vehicle_id,user_id,role,is_primary_admin,created_by)
        values ('${secondVehicle}','${pilot}','OWNER',true,'${pilot}');
      insert into public.fuel_logs(id,vehicle_id,created_by,payload,client_operation_id) values
        ('30000000-0000-4000-8000-000000000001','${vehicle}','${owner}',jsonb_build_object('amount_paise',100,'quantity',1,'unit_price_paise',100,'is_full_tank',false,'energy_type','DIESEL','unit','L','payment_method','CASH','event_at',now()),'40000000-0000-4000-8000-000000000001'),
        ('30000000-0000-4000-8000-000000000002','${vehicle}','${owner}',jsonb_build_object('amount_paise',100,'quantity',1,'unit_price_paise',100,'is_full_tank',false,'energy_type','DIESEL','unit','L','payment_method','CASH','event_at',((now() at time zone 'Asia/Kolkata')::date - 1 + time '12:00') at time zone 'Asia/Kolkata'),'40000000-0000-4000-8000-000000000002'),
        ('30000000-0000-4000-8000-000000000003','${vehicle}','${owner}',jsonb_build_object('amount_paise',100,'quantity',1,'unit_price_paise',100,'is_full_tank',false,'energy_type','DIESEL','unit','L','payment_method','CASH','event_at',now()-interval '4 days'),'40000000-0000-4000-8000-000000000003');
      insert into public.meter_readings(id,vehicle_id,reading_type,value,observed_at,source,created_by) values
        ('50000000-0000-4000-8000-000000000001','${vehicle}','KM',100,now(),'MANUAL','${owner}'),
        ('50000000-0000-4000-8000-000000000002','${vehicle}','KM',90,now()-interval '4 days','MANUAL','${owner}');
      insert into public.expenses(id,vehicle_id,created_by,payload,client_operation_id) values
        ('70000000-0000-4000-8000-000000000001','${vehicle}','${owner}',jsonb_build_object('amount_paise',100,'title','Recent','category','TOLL','payment_method','CASH','event_at',now()),'71000000-0000-4000-8000-000000000001'),
        ('70000000-0000-4000-8000-000000000002','${vehicle}','${owner}',jsonb_build_object('amount_paise',100,'title','Old','category','TOLL','payment_method','CASH','event_at',now()-interval '4 days'),'71000000-0000-4000-8000-000000000002');
      insert into public.expense_items(expense_id,title,amount_paise) values
        ('70000000-0000-4000-8000-000000000001','Recent item',100),
        ('70000000-0000-4000-8000-000000000002','Old item',100);
      insert into public.maintenance_records(vehicle_id,expense_id,details) values
        ('${vehicle}','70000000-0000-4000-8000-000000000002','{}');
      insert into public.meter_events(id,vehicle_id,created_by,payload,client_operation_id) values
        ('72000000-0000-4000-8000-000000000001','${vehicle}','${owner}',jsonb_build_object('km',100,'reading_at',now(),'event_at',now()),'73000000-0000-4000-8000-000000000001'),
        ('72000000-0000-4000-8000-000000000002','${vehicle}','${owner}',jsonb_build_object('km',90,'reading_at',now()-interval '4 days','event_at',now()-interval '4 days'),'73000000-0000-4000-8000-000000000002');
      select set_config('request.jwt.claim.sub','${owner}',false);
      set role authenticated;
      select public.grant_vehicle_access('${vehicle}','pilot@example.com','PILOT','{}');
      select public.grant_vehicle_access('${vehicle}','pending@example.com','PILOT','{}');
      reset role;
      select set_config('request.jwt.claim.sub','${pilot}',false);
      set role authenticated;
    `);
    const rows = await db.query("select id from public.fuel_logs order by id");
    expect(rows.rows).toHaveLength(2);
    expect(
      (await db.query("select id from public.meter_readings")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.expenses")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.expense_items")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.maintenance_records")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select id from public.meter_events")).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          `select public.has_vehicle_permission('${vehicle}','fuel.create') as allowed`,
        )
      ).rows[0],
    ).toEqual({ allowed: true });
    expect(
      (
        await db.query(
          `select public.has_vehicle_permission('${vehicle}','fuel.edit_own') as allowed`,
        )
      ).rows[0],
    ).toEqual({ allowed: false });
    expect(
      (await db.query(`select * from public.read_form_versions('${vehicle}')`))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          `select public.is_vehicle_owner('${secondVehicle}') as owner`,
        )
      ).rows[0],
    ).toEqual({ owner: true });
    await db.exec(
      `select public.save_record('expenses','${vehicle}',jsonb_build_object('amount_paise',100,'title','Toll','category','TOLL','payment_method','CASH','event_at',now()),'60000000-0000-4000-8000-000000000001')`,
    );
    expect(
      (await db.query("select id from public.expenses")).rows,
    ).toHaveLength(2);
    await db.exec(
      `select public.save_record('fuel','${vehicle}',jsonb_build_object('amount_paise',100,'quantity',1,'unit_price_paise',100,'unit','L','energy_type','DIESEL','is_full_tank',false,'payment_method','CASH','event_at',now()),'60000000-0000-4000-8000-000000000005')`,
    );
    await db.exec(
      `select public.save_record('meters','${vehicle}',jsonb_build_object('km',101,'event_at',now(),'reading_at',now()),'60000000-0000-4000-8000-000000000006')`,
    );
    await expect(
      db.exec(
        `select public.save_record('meters','${vehicle}',jsonb_build_object('km',101,'event_at',now(),'reading_at',now()),'60000000-0000-4000-8000-000000000007','60000000-0000-4000-8000-000000000006',1,'ARCHIVED')`,
      ),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      db.exec(
        `select public.save_record('expenses','${vehicle}',jsonb_build_object('amount_paise',100,'title','Edit','category','TOLL','payment_method','CASH','event_at',now()),'60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',1)`,
      ),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      db.exec(
        `select public.correct_meter_observation('${vehicle}','50000000-0000-4000-8000-000000000001',100,99,'test','60000000-0000-4000-8000-000000000003')`,
      ),
    ).rejects.toThrow("PERMISSION_DENIED");
    await db.exec(`
      reset role; select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated;
      select public.publish_progress_form('${vehicle}',jsonb_set(
        (select definition from public.read_form_versions('${vehicle}') where published), '{fields}',
        '[{"id":"80000000-0000-4000-8000-000000000001","label":"Public","type":"text","visibility":"ALL","required":false,"reportable":false,"aggregation":"LAST","options":[]},{"id":"80000000-0000-4000-8000-000000000002","label":"Private","type":"text","visibility":"OWNER","required":false,"reportable":false,"aggregation":"LAST","options":[]}]'::jsonb));
      reset role;
      insert into public.daily_progress(id,vehicle_id,created_by,payload,client_operation_id,status)
        select '81000000-0000-4000-8000-000000000001','${vehicle}','${pilot}',
          jsonb_build_object('form_version_id',id,'progress_date',(now() at time zone 'Asia/Kolkata')::date,'answers',jsonb_build_object('80000000-0000-4000-8000-000000000001','visible','80000000-0000-4000-8000-000000000002','private')),
          '82000000-0000-4000-8000-000000000001','PENDING_REVIEW' from public.progress_form_versions where vehicle_id='${vehicle}' and published;
      insert into public.daily_progress(id,vehicle_id,created_by,payload,client_operation_id,status)
        select '81000000-0000-4000-8000-000000000002','${vehicle}','${pilot}',
          jsonb_build_object('form_version_id',id,'progress_date',(now() at time zone 'Asia/Kolkata')::date-4,'answers','{}'::jsonb),
          '82000000-0000-4000-8000-000000000002','PENDING_REVIEW' from public.progress_form_versions where vehicle_id='${vehicle}' and published;
      insert into public.daily_progress(id,vehicle_id,created_by,payload,client_operation_id,status)
        select '81000000-0000-4000-8000-000000000003','${vehicle}','${owner}',
          jsonb_build_object('form_version_id',id,'progress_date',(now() at time zone 'Asia/Kolkata')::date,'answers','{}'::jsonb),
          '82000000-0000-4000-8000-000000000003','PENDING_REVIEW' from public.progress_form_versions where vehicle_id='${vehicle}' and published;
      select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated;
      select public.set_vehicle_membership('${vehicle}','${pilot}','PILOT','ACTIVE','{"progress.view":true,"progress.submit":true,"progress.edit_own":true}');
      reset role; select set_config('request.jwt.claim.sub','${pilot}',false); set role authenticated;
    `);
    const progress = await db.query<{
      payload: { answers: Record<string, unknown> };
    }>(`select payload from public.read_progress_records('${vehicle}')`);
    expect(progress.rows).toHaveLength(1);
    expect(progress.rows[0].payload.answers).toEqual({
      "80000000-0000-4000-8000-000000000001": "visible",
    });
    expect(
      (
        await db.query(
          `select public.has_vehicle_permission('${vehicle}','progress.edit_own') as allowed`,
        )
      ).rows[0],
    ).toEqual({ allowed: false });
    await expect(
      db.exec(`select public.submit_progress('${vehicle}',jsonb_build_object(
      'form_version_id',(select id from public.read_form_versions('${vehicle}') where published limit 1),
      'progress_date',(now() at time zone 'Asia/Kolkata')::date,
      'answers',jsonb_build_object('80000000-0000-4000-8000-000000000002','private')),
      '83000000-0000-4000-8000-000000000003')`),
    ).rejects.toThrow("PRIVATE_FIELD");
    await expect(
      db.exec(`select public.submit_progress('${vehicle}',jsonb_build_object(
      'form_version_id',(select id from public.read_form_versions('${vehicle}') where published limit 1),
      'progress_date',(now() at time zone 'Asia/Kolkata')::date,
      'answers',jsonb_build_object('unknown','value')),
      '83000000-0000-4000-8000-000000000004')`),
    ).rejects.toThrow("UNKNOWN_FIELD");
    await db.exec(`select public.submit_progress('${vehicle}',jsonb_build_object(
      'form_version_id',(select id from public.read_form_versions('${vehicle}') where published limit 1),
      'progress_date',(now() at time zone 'Asia/Kolkata')::date,
      'answers',jsonb_build_object('80000000-0000-4000-8000-000000000001','new')),
      '83000000-0000-4000-8000-000000000001')`);
    expect(
      (
        await db.query(
          `select id from public.read_progress_records('${vehicle}')`,
        )
      ).rows,
    ).toHaveLength(2);
    await expect(
      db.exec(`select public.submit_progress('${vehicle}',jsonb_build_object(
      'form_version_id',(select id from public.read_form_versions('${vehicle}') where published limit 1),
      'progress_date',(now() at time zone 'Asia/Kolkata')::date,
      'answers',jsonb_build_object('80000000-0000-4000-8000-000000000001','changed')),
      '83000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000001',1)`),
    ).rejects.toThrow("PERMISSION_DENIED");
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated;
      select public.review_progress('${vehicle}','83000000-0000-4000-8000-000000000001',1,'APPROVED','');
      reset role; select set_config('request.jwt.claim.sub','${pilot}',false); set role authenticated`);
    expect(
      (
        await db.query(
          `select status from public.read_progress_records('${vehicle}') where id='83000000-0000-4000-8000-000000000001'`,
        )
      ).rows[0],
    ).toEqual({ status: "APPROVED" });
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${other}',false); set role authenticated`,
    );
    expect(
      (await db.query("select id from public.fuel_logs")).rows,
    ).toHaveLength(0);
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated`,
    );
    expect(
      (await db.query("select id from public.fuel_logs")).rows,
    ).toHaveLength(4);
    await db.exec(
      `select public.set_vehicle_membership('${vehicle}','${pilot}','PILOT','ACTIVE','{"fuel.read":false,"fuel.edit_own":true}'); reset role; select set_config('request.jwt.claim.sub','${pilot}',false); set role authenticated`,
    );
    expect(
      (await db.query("select id from public.fuel_logs")).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          `select public.has_vehicle_permission('${vehicle}','fuel.create') as allowed`,
        )
      ).rows[0],
    ).toEqual({ allowed: true });
    expect(
      (
        await db.query(
          `select public.has_vehicle_permission('${vehicle}','fuel.edit_own') as allowed`,
        )
      ).rows[0],
    ).toEqual({ allowed: false });
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${pending}',false); set role authenticated`,
    );
    await expect(
      db.exec("select public.resolve_my_access_grants()"),
    ).rejects.toThrow("EMAIL_NOT_VERIFIED");
    expect(
      (await db.query("select id from public.fuel_logs")).rows,
    ).toHaveLength(0);
    await db.exec(
      `reset role; update auth.users set email_confirmed_at=now() where id='${pending}'; set role authenticated; select public.resolve_my_access_grants()`,
    );
    expect(
      (await db.query("select id from public.fuel_logs")).rows,
    ).toHaveLength(3);
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated`,
    );
    await db.exec(
      `select public.set_vehicle_membership('${vehicle}','${pilot}','PILOT','REVOKED','{}'); reset role; select set_config('request.jwt.claim.sub','${pilot}',false); set role authenticated`,
    );
    expect(
      (await db.query("select id from public.fuel_logs")).rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `select public.save_record('expenses','${vehicle}',jsonb_build_object('amount_paise',100,'title','Toll','category','TOLL','payment_method','CASH','event_at',now()),'60000000-0000-4000-8000-000000000004')`,
      ),
    ).rejects.toThrow("PERMISSION_DENIED");
  } finally {
    await db.close();
  }
}, 30000);
