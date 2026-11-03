import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("allows owner soft deletion, rejects Pilot deletion and prevents recovery", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create function public.require_verified() returns uuid language plpgsql as $$ begin
        if current_setting('test.verified') <> 'true' then raise exception 'EMAIL_NOT_VERIFIED'; end if;
        return '10000000-0000-4000-8000-000000000001'::uuid; end $$;
      create function public.is_vehicle_owner(uuid) returns boolean language sql as $$ select current_setting('test.owner')='true' $$;
      create table public.fuel_logs(id int primary key, vehicle_id uuid, status text);
      create table public.expenses(like public.fuel_logs including all);
      select set_config('test.verified','true',false),set_config('test.owner','false',false);
    `);
    await db.exec(
      readFileSync(
        "supabase/migrations/202611040008_record_soft_deletion.sql",
        "utf8",
      ),
    );
    for (const table of ["fuel_logs", "expenses"]) {
      await db.exec(
        `insert into public.${table} values (1,'20000000-0000-4000-8000-000000000001','ACTIVE')`,
      );
      await expect(
        db.exec(`update public.${table} set status='ARCHIVED' where id=1`),
      ).rejects.toThrow("OWNER_REQUIRED");
      await db.exec(
        "select set_config('test.owner','true',false),set_config('test.verified','false',false)",
      );
      await expect(
        db.exec(`update public.${table} set status='ARCHIVED' where id=1`),
      ).rejects.toThrow("EMAIL_NOT_VERIFIED");
      await db.exec("select set_config('test.verified','true',false)");
      await db.exec(`update public.${table} set status='ARCHIVED' where id=1`);
      await expect(
        db.exec(`update public.${table} set status='ACTIVE' where id=1`),
      ).rejects.toThrow("RECORD_DELETED");
      expect(
        (await db.query(`select status from public.${table} where id=1`)).rows,
      ).toEqual([{ status: "ARCHIVED" }]);
      await db.exec("select set_config('test.owner','false',false)");
    }
  } finally {
    await db.close();
  }
});
