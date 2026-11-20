import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it, vi } from "vitest";
import {
  recentFuelRows,
  recentFuelWithFallback,
  compareRecentEvents,
} from "../src/features/dashboard/recentFuel";
import type { RecordEntry } from "../src/features/records/schema";

it("sorts the development feed by event time before limiting and filters pilot dates", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  const entry = (
    id: string,
    event: string,
    status = "ACTIVE",
  ): RecordEntry => ({
    id,
    vehicle_id: "vehicle",
    created_by: "owner",
    revision: 1,
    status,
    payload: { event_at: event },
    created_at: "2026-11-20T11:00:00Z",
    updated_at: "2026-11-20T11:00:00Z",
  });
  const rows = [
    ...Array.from({ length: 35 }, (_, i) =>
      entry(String(i).padStart(2, "0"), "2026-11-10T12:00:00Z"),
    ),
    entry("recent-a", "2026-11-20T10:00:00.123456Z"),
    entry("recent-b", "2026-11-20T15:30:00.123456+05:30"),
    entry("recent-early", "2026-11-20T10:00:00.123455Z"),
    entry("archived", "2026-11-20T11:00:00Z", "ARCHIVED"),
  ];
  expect(
    recentFuelRows(rows, "OWNER", "Asia/Kolkata", now)
      .slice(0, 2)
      .map((row) => row.id),
  ).toEqual(["recent-b", "recent-a"]);
  expect(
    recentFuelRows(rows, "PILOT", "Asia/Kolkata", now).map((row) => row.id),
  ).toEqual(["recent-b", "recent-a", "recent-early"]);
});

it("orders the SQL feed by event time and respects owner, pilot, and outsider access", async () => {
  const db = new PGlite();
  const owner = "10000000-0000-4000-8000-000000000001";
  const pilot = "10000000-0000-4000-8000-000000000002";
  const outsider = "10000000-0000-4000-8000-000000000003";
  const vehicle = "20000000-0000-4000-8000-000000000001";
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
    const migrations = readdirSync("supabase/migrations")
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of migrations)
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await db.exec(`
      insert into auth.users values ('${owner}','owner@example.com',now()), ('${pilot}','pilot@example.com',now()), ('${outsider}','outside@example.com',now());
      insert into public.vehicles(id,created_by,nickname,category,subtype,energy_type,meter_mode,timezone)
        values ('${vehicle}','${owner}','Car','four_wheeler','car','PETROL','KM','Asia/Kolkata');
      insert into public.vehicle_settings(vehicle_id) values ('${vehicle}');
      insert into public.vehicle_members(vehicle_id,user_id,role,is_primary_admin,created_by)
        values ('${vehicle}','${owner}','OWNER',true,'${owner}');
      insert into public.fuel_logs(id,vehicle_id,created_by,payload,client_operation_id,created_at)
        select gen_random_uuid(),'${vehicle}','${owner}',
          jsonb_build_object('amount_paise',100,'quantity',1,'unit_price_paise',100,'is_full_tank',false,'energy_type','PETROL','unit','L','payment_method','CASH','event_at',now()-interval '10 days'),gen_random_uuid(),now()
        from generate_series(1,35);
      insert into public.fuel_logs(id,vehicle_id,created_by,payload,client_operation_id,created_at) values
        ('30000000-0000-4000-8000-000000000001','${vehicle}','${owner}',jsonb_build_object('amount_paise',100,'quantity',1,'unit_price_paise',100,'is_full_tank',false,'energy_type','PETROL','unit','L','payment_method','CASH','event_at',now()),gen_random_uuid(),now()-interval '20 days'),
        ('30000000-0000-4000-8000-000000000002','${vehicle}','${owner}',jsonb_build_object('amount_paise',100,'quantity',1,'unit_price_paise',100,'is_full_tank',false,'energy_type','PETROL','unit','L','payment_method','CASH','event_at',now()),gen_random_uuid(),now()-interval '20 days');
      select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated;
      select public.grant_vehicle_access('${vehicle}','pilot@example.com','PILOT','{}');
    `);
    const read = async () =>
      (
        await db.query<{ id: string }>(
          `select id from public.recent_fuel_activity('${vehicle}', 10)`,
        )
      ).rows.map((row) => row.id);
    const ownerRows = await read();
    expect(ownerRows).toHaveLength(10);
    expect(ownerRows.slice(0, 2)).toEqual([
      "30000000-0000-4000-8000-000000000002",
      "30000000-0000-4000-8000-000000000001",
    ]);
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${pilot}',false); set role authenticated`,
    );
    expect(await read()).toEqual(ownerRows.slice(0, 2));
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${outsider}',false); set role authenticated`,
    );
    expect(await read()).toEqual([]);
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${owner}',false); set role authenticated; select public.set_vehicle_membership('${vehicle}','${pilot}','PILOT','ACTIVE','{"fuel.read":false}'); reset role; select set_config('request.jwt.claim.sub','${pilot}',false); set role authenticated`,
    );
    expect(await read()).toEqual([]);
  } finally {
    await db.close();
  }
}, 20000);

it("uses the complete fallback only for a missing RPC and propagates failures", async () => {
  const fallback = vi.fn().mockResolvedValue(["safe, authorized rows"]);
  await expect(
    recentFuelWithFallback(
      { data: null, error: { code: "PGRST202" } },
      fallback,
    ),
  ).resolves.toEqual(["safe, authorized rows"]);
  await expect(
    recentFuelWithFallback({ data: null, error: { code: "42883" } }, fallback),
  ).resolves.toEqual(["safe, authorized rows"]);
  expect(fallback).toHaveBeenCalledTimes(2);
  for (const code of ["42501", "PGRST301", "NETWORK_ERROR"]) {
    await expect(
      recentFuelWithFallback({ data: null, error: { code } }, fallback),
    ).rejects.toEqual({ code });
  }
  await expect(
    recentFuelWithFallback({ data: null, error: null }, fallback),
  ).rejects.toThrow("RECENT_FUEL_RESPONSE_INVALID");
  expect(fallback).toHaveBeenCalledTimes(2);
});

it("matches PostgreSQL ordering across offsets, microsecond rounding, rollover and UUID ties", async () => {
  const db = new PGlite();
  const stamps = [
    "2026-11-20T10:00:00Z",
    "2026-11-20T15:30:00+05:30",
    "2026-11-20T05:00:00-05:00",
    "2026-11-20T10:00:00.1234554Z",
    "2026-11-20T10:00:00.1234555Z",
    "2026-11-20T10:00:00.123456Z",
    "2026-11-20T10:00:00.1234565Z",
    "2026-11-20T10:00:00.12345651Z",
    "2026-11-20T10:00:00.123457Z",
    "2026-11-20T10:00:00.9999995Z",
    "2026-11-20T10:00:01Z",
    "1969-12-31T23:59:59.9999995Z",
    "1970-01-01T00:00:00Z",
    "2000-02-29T23:59:59.9999995Z",
    "2000-03-01T00:00:00Z",
    "2027-01-01T00:00:00+14:00",
  ];
  const ids = [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-00000000000f",
  ];
  const row = (id: string, timestamp: string): RecordEntry => ({
    id,
    vehicle_id: "20000000-0000-4000-8000-000000000001",
    created_by: "10000000-0000-4000-8000-000000000001",
    revision: 1,
    status: "ACTIVE",
    payload: { event_at: timestamp },
    created_at: timestamp,
    updated_at: timestamp,
  });
  try {
    for (const firstId of ids) {
      for (const secondId of ids) {
        const expected = await db.query<{
          first_index: number;
          second_index: number;
          result: number;
        }>(
          `select a.ordinality::int as first_index, b.ordinality::int as second_index,
             case when a.value::timestamptz > b.value::timestamptz then -1
                  when a.value::timestamptz < b.value::timestamptz then 1
                  when $2::uuid > $3::uuid then -1
                  when $2::uuid < $3::uuid then 1 else 0 end as result
           from unnest($1::text[]) with ordinality as a(value, ordinality)
           cross join unnest($1::text[]) with ordinality as b(value, ordinality)`,
          [stamps, firstId, secondId],
        );
        for (const item of expected.rows) {
          const first = stamps[item.first_index - 1];
          const second = stamps[item.second_index - 1];
          expect(
            Math.sign(
              compareRecentEvents(row(firstId, first), row(secondId, second)),
            ),
            `${first} / ${second}`,
          ).toBe(item.result);
        }
      }
    }
  } finally {
    await db.close();
  }
}, 20000);
