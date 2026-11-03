import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("checks the preceding active observation for each vehicle and meter type", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create table public.vehicles(id uuid primary key);
      create table public.meter_readings(id serial primary key, vehicle_id uuid, reading_type text, value numeric, observed_at timestamptz, status text default 'ACTIVE', source text, linked_entity_type text, is_reset boolean default false);
      insert into public.vehicles values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
      insert into public.meter_readings(vehicle_id, reading_type, value, observed_at, source) values
        ('00000000-0000-4000-8000-000000000001','KM',1300,'2026-01-01','FUEL'),
        ('00000000-0000-4000-8000-000000000001','HOURS',100,'2026-01-01','FUEL'),
        ('00000000-0000-4000-8000-000000000001','KM',2000,'2026-03-01','FUEL');
    `);
    await db.exec(
      readFileSync(
        "supabase/migrations/202611040009_manual_meter_monotonic.sql",
        "utf8",
      ),
    );
    const insert = (
      type: string,
      value: number,
      date: string,
      vehicle = "00000000-0000-4000-8000-000000000001",
      reset = false,
    ) =>
      db.query(
        "insert into public.meter_readings(vehicle_id,reading_type,value,observed_at,source,linked_entity_type,is_reset) values ($1,$2,$3,$4,'MANUAL','MANUAL',$5)",
        [vehicle, type, value, date, reset],
      );
    await expect(insert("KM", 1200, "2026-02-01")).rejects.toThrow(
      "METER_BELOW_PREVIOUS",
    );
    await expect(insert("HOURS", 99, "2026-02-01")).rejects.toThrow(
      "METER_BELOW_PREVIOUS",
    );
    await insert("KM", 1300, "2026-02-01");
    await insert("HOURS", 101, "2026-02-01");
    await insert("KM", 12, "2025-12-01");
    await insert(
      "KM",
      12,
      "2026-02-01",
      "00000000-0000-4000-8000-000000000002",
    );
    await expect(
      insert("KM", 10, "2026-04-01", undefined, true),
    ).rejects.toThrow("METER_RESET_NOT_ALLOWED");
  } finally {
    await db.close();
  }
});
