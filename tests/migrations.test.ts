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
  } finally {
    await db.close();
  }
}, 30000);
