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
  } finally {
    await db.close();
  }
}, 30000);
