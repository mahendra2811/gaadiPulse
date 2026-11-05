import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("checks fuel, expense and manual observations against both chronological neighbors", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create table vehicles(id uuid primary key);
      create table meter_readings(id serial primary key, vehicle_id uuid, reading_type text, value numeric, observed_at timestamptz, status text default 'ACTIVE', source text, linked_entity_type text, is_reset boolean default false);
      insert into vehicles values ('00000000-0000-4000-8000-000000000001');
      insert into meter_readings(vehicle_id,reading_type,value,observed_at,source) values
        ('00000000-0000-4000-8000-000000000001','KM',100,'2026-01-01','MANUAL'),
        ('00000000-0000-4000-8000-000000000001','KM',200,'2026-03-01','MANUAL');
    `);
    const sql = readFileSync(
      "supabase/migrations/202611050012_record_meter_chronology.sql",
      "utf8",
    ).split("-- Reveal only")[0];
    await db.exec(sql);
    const insert = (source: string, value: number, date: string) =>
      db.query(
        `insert into meter_readings(vehicle_id,reading_type,value,observed_at,source,linked_entity_type) values ('00000000-0000-4000-8000-000000000001','KM',$1,$2,$3,$3)`,
        [value, date, source],
      );
    for (const source of ["FUEL", "EXPENSE", "MANUAL"]) {
      await expect(insert(source, 99, "2026-02-01")).rejects.toThrow(
        "METER_BELOW_PREVIOUS",
      );
      await expect(insert(source, 201, "2026-02-01")).rejects.toThrow(
        "METER_ABOVE_NEXT",
      );
    }
    await insert("FUEL", 100, "2026-02-01");
    await insert("EXPENSE", 200, "2026-02-02");
    await insert("MANUAL", 200, "2026-04-01");
  } finally {
    await db.close();
  }
});
