-- Authoritative foundation. All membership changes serialize on the vehicle row.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=120), email text,
 locale text not null default 'en' check(locale='en'), theme text not null default 'system' check(theme in ('system','light','dark')),
 timezone text not null default 'Asia/Kolkata', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.vehicles (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id),
 nickname text not null default '' check(length(nickname)<=120), registration_number text,
 category text not null check(category in ('two_wheeler','four_wheeler','commercial','agricultural','heavy_machinery')),
 subtype text not null check(length(subtype) between 1 and 80), brand text not null default '', model text not null default '', variant text, model_year smallint,
 energy_type text not null check(energy_type in ('PETROL','DIESEL','ELECTRIC','CNG','HYBRID','OTHER')),
 meter_mode text not null check(meter_mode in ('KM','HOURS','BOTH')), default_meter_unit text not null default 'KM', timezone text not null default 'Asia/Kolkata',
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(nickname<>'' or coalesce(registration_number,'')<>'' or model<>'')
);
create table public.vehicle_members (
 vehicle_id uuid not null references public.vehicles(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('OWNER','PILOT')), is_primary_admin boolean not null default false,
 status text not null default 'ACTIVE' check(status in ('ACTIVE','REVOKED')), permission_overrides jsonb not null default '{}',
 joined_at timestamptz not null default now(), created_by uuid not null references auth.users(id), primary key(vehicle_id,user_id),
 check(not is_primary_admin or (role='OWNER' and status='ACTIVE')), check(jsonb_typeof(permission_overrides)='object')
);
create unique index protected_admin on public.vehicle_members(vehicle_id) where is_primary_admin;
create index membership_lookup on public.vehicle_members(user_id,status);
create table public.vehicle_access_grants (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id),
 normalized_email text not null check(normalized_email=lower(trim(normalized_email))), desired_role text not null check(desired_role in ('OWNER','PILOT')),
 permission_overrides jsonb not null default '{}', granted_by uuid not null references auth.users(id),
 status text not null default 'UNRESOLVED' check(status in ('UNRESOLVED','RESOLVED','REVOKED')), resolved_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(), revoked_at timestamptz
);
create unique index active_email_grant on public.vehicle_access_grants(vehicle_id,normalized_email) where status<>'REVOKED';
create table public.vehicle_settings (
 vehicle_id uuid primary key references public.vehicles(id), pilot_permissions jsonb not null default '{"meters.read":true,"meters.create":true}',
 progress_policy jsonb not null default '{"past_days":1,"future_allowed":false,"photo_required":false}'
);
create table public.meter_readings (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id), reading_type text not null check(reading_type in ('KM','HOURS')),
 value numeric(15,3) not null check(value>=0), observed_at timestamptz not null check(observed_at<=now()), entered_at timestamptz not null default now(),
 source text not null check(source in ('MANUAL','FUEL','EXPENSE','PROGRESS')), created_by uuid not null references auth.users(id), linked_entity_type text, linked_entity_id uuid
);
create index meter_history on public.meter_readings(vehicle_id,reading_type,observed_at desc);
create table public.audit_events (
 id bigint generated always as identity primary key, vehicle_id uuid not null references public.vehicles(id), actor_id uuid references auth.users(id),
 action text not null, context jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.operation_receipts (
 operation_id uuid primary key, user_id uuid not null references auth.users(id), vehicle_id uuid not null references public.vehicles(id), created_at timestamptz not null default now()
);
create function public.is_vehicle_member(p_vehicle uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vehicle_members m join auth.users u on u.id=m.user_id where m.vehicle_id=p_vehicle and m.user_id=auth.uid() and m.status='ACTIVE' and u.email_confirmed_at is not null); $$;
create function public.is_vehicle_owner(p_vehicle uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vehicle_members m join auth.users u on u.id=m.user_id where m.vehicle_id=p_vehicle and m.user_id=auth.uid() and m.status='ACTIVE' and m.role='OWNER' and u.email_confirmed_at is not null); $$;
create function public.has_vehicle_permission(p_vehicle uuid,p_key text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_vehicle_member(p_vehicle) and coalesce((select m.role='OWNER' or coalesce((m.permission_overrides->>p_key)::boolean,(s.pilot_permissions->>p_key)::boolean,false)
 from public.vehicle_members m join public.vehicle_settings s using(vehicle_id) where m.vehicle_id=p_vehicle and m.user_id=auth.uid() and m.status='ACTIVE'),false); $$;
create function public.require_verified() returns uuid language plpgsql stable security definer set search_path='' as $$
 begin
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_VERIFIED' using errcode='42501'; end if;
 return auth.uid(); end; $$;
create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
 begin insert into public.profiles(id,email) values(new.id,new.email) on conflict(id) do update set email=excluded.email; return new; end; $$;
insert into public.profiles(id,email) select id,email from auth.users on conflict(id) do nothing;
create trigger auth_profile after insert or update of email on auth.users for each row execute function public.create_profile();
create function public.profile_guard() returns trigger language plpgsql set search_path='' as $$
 begin if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'INVALID_TIMEZONE'; end if; new.email=old.email; new.created_at=old.created_at; new.updated_at=clock_timestamp(); return new; end; $$;
create trigger profile_guard before update on public.profiles for each row execute function public.profile_guard();
-- No table mutation grants for vehicles or memberships; atomic RPCs only.
create function public.save_vehicle(p_data jsonb,p_operation uuid,p_id uuid default null,p_expected timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
 declare actor uuid:=public.require_verified(); v uuid; old public.vehicles; mode text:=p_data->>'meter_mode'; kind text; raw text;
 begin
 perform pg_advisory_xact_lock(hashtextextended(p_operation::text,0));
 select vehicle_id into v from public.operation_receipts where operation_id=p_operation and user_id=actor;
 if found then if not public.is_vehicle_member(v) then raise exception 'PERMISSION_DENIED'; end if; return v; end if;
 if not exists(select 1 from pg_timezone_names where name=p_data->>'timezone') then raise exception 'INVALID_TIMEZONE'; end if;
 if p_id is null then
 insert into public.vehicles(created_by,nickname,registration_number,category,subtype,brand,model,energy_type,meter_mode,default_meter_unit,timezone)
 values(actor,trim(p_data->>'nickname'),nullif(regexp_replace(upper(p_data->>'registration_number'),'[^A-Z0-9]','','g'),''),p_data->>'category',p_data->>'subtype',p_data->>'brand',p_data->>'model',p_data->>'energy_type',mode,case when mode='HOURS' then 'HOURS' else 'KM' end,p_data->>'timezone') returning id into v;
 insert into public.vehicle_members(vehicle_id,user_id,role,is_primary_admin,created_by) values(v,actor,'OWNER',true,actor);
 insert into public.vehicle_settings(vehicle_id) values(v);
 else
 select * into old from public.vehicles where id=p_id for update;
 if not public.is_vehicle_owner(p_id) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if old.updated_at is distinct from p_expected then raise exception 'CONFLICT'; end if;
 v:=p_id;
 update public.vehicles set nickname=trim(p_data->>'nickname'),registration_number=nullif(regexp_replace(upper(p_data->>'registration_number'),'[^A-Z0-9]','','g'),''), category=p_data->>'category',subtype=p_data->>'subtype',brand=p_data->>'brand',model=p_data->>'model',energy_type=p_data->>'energy_type',meter_mode=mode,timezone=p_data->>'timezone',updated_at=clock_timestamp() where id=v;
 end if;
 if p_id is null then
 foreach kind in array array['KM','HOURS'] loop
 raw:=p_data->>case when kind='KM' then 'km' else 'hours' end;
 if nullif(raw,'') is not null and (mode=kind or mode='BOTH') then
 insert into public.meter_readings(vehicle_id,reading_type,value,observed_at,source,created_by) values(v,kind,raw::numeric,(p_data->>'observed_at')::timestamptz,'MANUAL',actor);
 end if; end loop; end if;
 insert into public.operation_receipts(operation_id,user_id,vehicle_id) values(p_operation,actor,v);
 insert into public.audit_events(vehicle_id,actor_id,action) values(v,actor,case when p_id is null then 'VEHICLE_CREATED' else 'VEHICLE_UPDATED' end);
 return v; end; $$;
create function public.archive_vehicle(p_vehicle uuid,p_archived boolean) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.require_verified(); perform 1 from public.vehicles where id=p_vehicle for update;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 update public.vehicles set archived_at=case when p_archived then now() else null end,updated_at=clock_timestamp() where id=p_vehicle;
 insert into public.audit_events(vehicle_id,actor_id,action) values(p_vehicle,auth.uid(),case when p_archived then 'ARCHIVED' else 'RECOVERED' end); end; $$;
create function public.set_vehicle_membership(p_vehicle uuid,p_user uuid,p_role text,p_status text default 'ACTIVE',p_permissions jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
 declare target public.vehicle_members;
 begin perform public.require_verified(); perform 1 from public.vehicles where id=p_vehicle for update;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 select * into target from public.vehicle_members where vehicle_id=p_vehicle and user_id=p_user;
 if p_status='ACTIVE' and not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_VERIFIED'; end if;
 if target.is_primary_admin and (p_role<>'OWNER' or p_status<>'ACTIVE') then raise exception 'PRIMARY_ADMIN_PROTECTED'; end if;
 if target.role='OWNER' and target.status='ACTIVE' and (p_role<>'OWNER' or p_status<>'ACTIVE') and (select count(*) from public.vehicle_members where vehicle_id=p_vehicle and role='OWNER' and status='ACTIVE')<=1 then raise exception 'LAST_OWNER_PROTECTED'; end if;
 insert into public.vehicle_members(vehicle_id,user_id,role,status,permission_overrides,created_by) values(p_vehicle,p_user,p_role,p_status,p_permissions,auth.uid()) on conflict(vehicle_id,user_id) do update set role=excluded.role,status=excluded.status,permission_overrides=excluded.permission_overrides;
 if p_status='REVOKED' then update public.vehicle_access_grants set status='REVOKED',revoked_at=now() where vehicle_id=p_vehicle and resolved_user_id=p_user and status<>'REVOKED'; end if;
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,auth.uid(),'MEMBERSHIP_CHANGED',jsonb_build_object('user',p_user,'role',p_role,'status',p_status)); end; $$;
create function public.resolve_my_access_grants() returns void language plpgsql security definer set search_path='' as $$
 declare actor uuid:=public.require_verified(); address text; g public.vehicle_access_grants;
 begin select lower(trim(email)) into address from auth.users where id=actor;
 for g in select * from public.vehicle_access_grants where normalized_email=address and status='UNRESOLVED' order by vehicle_id loop
 perform 1 from public.vehicles where id=g.vehicle_id for update;
 perform 1 from public.vehicle_access_grants where id=g.id and status='UNRESOLVED' for update;
 if not found then continue; end if;
 -- Primary admin cannot be downgraded by an email grant.
 if not exists(select 1 from public.vehicle_members where vehicle_id=g.vehicle_id and user_id=actor and is_primary_admin) then
 insert into public.vehicle_members(vehicle_id,user_id,role,permission_overrides,created_by) values(g.vehicle_id,actor,g.desired_role,g.permission_overrides,g.granted_by)
 on conflict(vehicle_id,user_id) do update set role=excluded.role,status='ACTIVE',permission_overrides=excluded.permission_overrides;
 end if;
 update public.vehicle_access_grants set status='RESOLVED',resolved_user_id=actor where id=g.id;
 insert into public.audit_events(vehicle_id,actor_id,action) values(g.vehicle_id,actor,'GRANT_RESOLVED');
 end loop; end; $$;
create function public.grant_vehicle_access(p_vehicle uuid,p_email text,p_role text,p_permissions jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
 declare address text:=lower(trim(p_email)); target uuid; grant_id uuid;
 begin perform public.require_verified(); perform 1 from public.vehicles where id=p_vehicle for update;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
 if (select count(*) from public.audit_events where vehicle_id=p_vehicle and actor_id=auth.uid() and action='ACCESS_GRANTED' and created_at>now()-interval '1 hour')>=30 then raise exception 'RATE_LIMIT'; end if;
 insert into public.vehicle_access_grants(vehicle_id,normalized_email,desired_role,permission_overrides,granted_by) values(p_vehicle,address,p_role,p_permissions,auth.uid())
 on conflict(vehicle_id,normalized_email) where status<>'REVOKED' do update set desired_role=excluded.desired_role,permission_overrides=excluded.permission_overrides returning id into grant_id;
 select id into target from auth.users where lower(trim(email))=address and email_confirmed_at is not null;
 if target is not null then
 perform public.set_vehicle_membership(p_vehicle,target,p_role,'ACTIVE',p_permissions);
 update public.vehicle_access_grants set status='RESOLVED',resolved_user_id=target where id=grant_id;
 end if;
 insert into public.audit_events(vehicle_id,actor_id,action) values(p_vehicle,auth.uid(),'ACCESS_GRANTED'); end; $$;
create function public.revoke_vehicle_access(p_vehicle uuid,p_grant uuid) returns void language plpgsql security definer set search_path='' as $$
 declare target uuid;
 begin perform 1 from public.vehicles where id=p_vehicle for update;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 select resolved_user_id into target from public.vehicle_access_grants where id=p_grant and vehicle_id=p_vehicle;
 if target is not null then perform public.set_vehicle_membership(p_vehicle,target,'PILOT','REVOKED'); end if;
 update public.vehicle_access_grants set status='REVOKED',revoked_at=now() where id=p_grant and vehicle_id=p_vehicle;
 insert into public.audit_events(vehicle_id,actor_id,action) values(p_vehicle,auth.uid(),'ACCESS_REVOKED'); end; $$;
create function public.list_my_vehicles() returns table(id uuid,nickname text,registration_number text,category text,subtype text,brand text,model text,energy_type text,meter_mode text,timezone text,archived_at timestamptz,updated_at timestamptz,role text) language sql stable security invoker set search_path='' as $$
 select v.id,v.nickname,v.registration_number,v.category,v.subtype,v.brand,v.model,v.energy_type,v.meter_mode,v.timezone,v.archived_at,v.updated_at,m.role from public.vehicles v join public.vehicle_members m on m.vehicle_id=v.id where m.user_id=auth.uid() and m.status='ACTIVE' order by v.created_at; $$;
-- Explicit table grants, RLS on every exposed relation.
DO $$ declare t text; begin foreach t in array array['profiles','vehicles','vehicle_members','vehicle_access_grants','vehicle_settings','meter_readings','audit_events','operation_receipts'] loop
 execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon,authenticated',t); end loop; end $$;
grant select on public.profiles,public.vehicles,public.vehicle_members,public.vehicle_access_grants,public.vehicle_settings,public.meter_readings,public.audit_events to authenticated;
grant update(display_name,locale,theme,timezone) on public.profiles to authenticated;
create policy profile_self on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy vehicle_member on public.vehicles for select to authenticated using(public.is_vehicle_member(id));
create policy members_visible on public.vehicle_members for select to authenticated using(public.is_vehicle_owner(vehicle_id) or (user_id=auth.uid() and status='ACTIVE'));
create policy grants_owner on public.vehicle_access_grants for select to authenticated using(public.is_vehicle_owner(vehicle_id));
create policy settings_member on public.vehicle_settings for select to authenticated using(public.is_vehicle_member(vehicle_id));
create policy meters_permission on public.meter_readings for select to authenticated using(public.has_vehicle_permission(vehicle_id,'meters.read'));
create policy audit_owner on public.audit_events for select to authenticated using(public.is_vehicle_owner(vehicle_id));
-- Functions are executable only by authenticated users; trigger/internal helpers are private.
revoke execute on function public.is_vehicle_member(uuid),public.is_vehicle_owner(uuid),public.has_vehicle_permission(uuid,text),public.require_verified(),public.create_profile(),public.profile_guard(),public.save_vehicle(jsonb,uuid,uuid,timestamptz),public.archive_vehicle(uuid,boolean),public.set_vehicle_membership(uuid,uuid,text,text,jsonb),public.resolve_my_access_grants(),public.grant_vehicle_access(uuid,text,text,jsonb),public.revoke_vehicle_access(uuid,uuid),public.list_my_vehicles() from public,anon,authenticated;
grant execute on function public.is_vehicle_member(uuid),public.is_vehicle_owner(uuid),public.has_vehicle_permission(uuid,text),public.list_my_vehicles(),public.save_vehicle(jsonb,uuid,uuid,timestamptz),public.archive_vehicle(uuid,boolean),public.resolve_my_access_grants(),public.grant_vehicle_access(uuid,text,text,jsonb),public.set_vehicle_membership(uuid,uuid,text,text,jsonb),public.revoke_vehicle_access(uuid,uuid) to authenticated;
create function public.latest_meter_readings(p_vehicle uuid) returns setof public.meter_readings language sql stable security invoker set search_path='' as $$
 select distinct on (reading_type) * from public.meter_readings where vehicle_id=p_vehicle order by reading_type,observed_at desc,entered_at desc; $$;
revoke all on function public.latest_meter_readings(uuid) from public,anon;
grant execute on function public.latest_meter_readings(uuid) to authenticated;
