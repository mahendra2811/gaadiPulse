-- GaadiPulse initial reference schema for Prompt 1.
-- IMPORTANT: reconcile into chronological migrations. This does NOT include
-- complete Fuel/Expense/Progress/Offline schema, covered by later prompts.
-- Review and test in a local Supabase project before deployment.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_lang_nonempty check (length(trim(preferred_language)) > 0)
);

create or replace function public.gaadi_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists gaadi_on_auth_user_created on auth.users;
create trigger gaadi_on_auth_user_created
  after insert on auth.users for each row
  execute function public.gaadi_handle_new_user();

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 120),
  registration_number text,
  category text not null check (category in ('TWO_WHEELER','FOUR_WHEELER','COMMERCIAL','AGRICULTURE_HEAVY')),
  subtype text not null,
  make text,
  model text,
  model_year smallint,
  energy_type text not null default 'PETROL',
  meter_mode text not null check (meter_mode in ('KM','HOURS','BOTH')),
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_members (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','PILOT')),
  is_primary_admin boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vehicle_id, user_id),
  constraint primary_is_owner check (not is_primary_admin or role = 'OWNER')
);
create unique index if not exists one_primary_admin_per_vehicle
on public.vehicle_members(vehicle_id) where is_primary_admin and status = 'ACTIVE';
create index if not exists members_user_status_idx on public.vehicle_members(user_id,status);
create index if not exists members_vehicle_status_idx on public.vehicle_members(vehicle_id,status);

-- Internal predicate helpers are SECURITY DEFINER to avoid RLS recursion.
-- These functions only answer boolean membership queries and never expose
-- member rows, privileged keys, or email addresses to the caller.
create or replace function public.gaadi_is_member(p_vehicle uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.vehicle_members m
    where m.vehicle_id = p_vehicle and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
  );
$$;
create or replace function public.gaadi_is_owner(p_vehicle uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.vehicle_members m
    where m.vehicle_id = p_vehicle and m.user_id = (select auth.uid())
      and m.role = 'OWNER' and m.status = 'ACTIVE'
  );
$$;

-- Creator becomes protected original in-app administrator in same transaction.
create or replace function public.gaadi_add_creator_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.vehicle_members(vehicle_id,user_id,role,is_primary_admin)
  values(new.id,new.created_by,'OWNER',true);
  return new;
end;
$$;
drop trigger if exists gaadi_vehicle_creator_member on public.vehicles;
create trigger gaadi_vehicle_creator_member
  after insert on public.vehicles for each row
  execute function public.gaadi_add_creator_membership();

create or replace function public.gaadi_prevent_creator_rewrite()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'Vehicle creator may not be changed through a direct update';
  end if;
  return new;
end;
$$;
drop trigger if exists gaadi_vehicle_protect_created_by on public.vehicles;
create trigger gaadi_vehicle_protect_created_by
  before update on public.vehicles for each row
  execute function public.gaadi_prevent_creator_rewrite();

create table if not exists public.vehicle_access_grants (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  email_normalized text not null check (email_normalized = lower(trim(email_normalized))),
  role text not null check (role in ('OWNER','PILOT')),
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','RESOLVED','REVOKED')),
  granted_by uuid not null references auth.users(id),
  resolved_user_id uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vehicle_id,email_normalized)
);
create index if not exists access_grants_email_status_idx
on public.vehicle_access_grants(email_normalized,status);

create table if not exists public.vehicle_audit_events (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists vehicle_audit_events_vehicle_created_idx
on public.vehicle_audit_events(vehicle_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_members enable row level security;
alter table public.vehicle_access_grants enable row level security;
alter table public.vehicle_audit_events enable row level security;

-- Definer functions must NOT bypass business authorization in later stages.
-- This reference intentionally does not expose direct grant-member mutations.
revoke all on public.vehicle_members from anon, authenticated;
revoke all on public.vehicle_access_grants from anon, authenticated;
revoke all on public.vehicle_audit_events from anon, authenticated;
grant select on public.vehicle_members to authenticated;
grant select on public.vehicle_access_grants to authenticated;
grant select on public.vehicle_audit_events to authenticated;
grant select,insert,update on public.vehicles to authenticated;
grant select,insert,update on public.profiles to authenticated;

-- Guard helper execution; callers are authenticated Supabase sessions.
revoke all on function public.gaadi_is_member(uuid) from public;
revoke all on function public.gaadi_is_owner(uuid) from public;
grant execute on function public.gaadi_is_member(uuid) to authenticated;
grant execute on function public.gaadi_is_owner(uuid) to authenticated;

create policy profile_select_self on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy profile_insert_self on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy profile_update_self on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy vehicle_select_member on public.vehicles
for select to authenticated using (public.gaadi_is_member(id));
create policy vehicle_create_creator on public.vehicles
for insert to authenticated with check (created_by = (select auth.uid()));
create policy vehicle_update_owner on public.vehicles
for update to authenticated using (public.gaadi_is_owner(id))
with check (public.gaadi_is_owner(id));

create policy member_select_self_or_owner on public.vehicle_members
for select to authenticated using (
  user_id = (select auth.uid()) or public.gaadi_is_owner(vehicle_id)
);
create policy access_grants_owner_select on public.vehicle_access_grants
for select to authenticated using (public.gaadi_is_owner(vehicle_id));
create policy audit_owner_select on public.vehicle_audit_events
for select to authenticated using (public.gaadi_is_owner(vehicle_id));

-- Stage 3 MUST implement secure grant_vehicle_access(), resolve_my_access_grants(),
-- update_member_permissions(), revoke_vehicle_access() and immutable audit
-- operations using privileged server-side RPC/Edge Functions. Direct DML on
-- vehicle_members / vehicle_access_grants stays forbidden to Android clients.
-- Verify last-Owner/primary-admin invariants and permissions in adversarial tests.
