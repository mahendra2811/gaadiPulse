-- Owners configure how far each Pilot may backdate new fuel and expense records.
-- Values are local calendar days before today in the vehicle timezone; -1 means unlimited.
alter table public.vehicle_members
  add column backdate_days integer null check (backdate_days is null or backdate_days in (0,1,2,10,30,60,-1));
alter table public.vehicle_access_grants
  add column backdate_days integer null check (backdate_days is null or backdate_days in (0,1,2,10,30,60,-1));
alter table public.vehicle_settings
  add column pilot_backdate_days integer not null default 1 check (pilot_backdate_days in (0,1,2,10,30,60,-1));

-- Preserve existing grants as yesterday + today (one calendar day back).
update public.vehicle_members set backdate_days = 1 where role = 'PILOT';
update public.vehicle_access_grants set backdate_days = 1 where desired_role = 'PILOT';

create or replace function public.grant_vehicle_access(p_vehicle uuid,p_email text,p_role text,p_permissions jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.grant_vehicle_access_with_backdate(p_vehicle,p_email,p_role,p_permissions,null);
end; $$;

create or replace function public.set_vehicle_membership(p_vehicle uuid,p_user uuid,p_role text,p_status text default 'ACTIVE',p_permissions jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.set_vehicle_membership_with_backdate(p_vehicle,p_user,p_role,p_status,p_permissions,null);
end; $$;

create or replace function public.update_vehicle_defaults(p_vehicle uuid,p_permissions jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare current_days integer;
begin
 select pilot_backdate_days into current_days from public.vehicle_settings where vehicle_id=p_vehicle;
 perform public.update_vehicle_defaults_with_backdate(p_vehicle,p_permissions,coalesce(current_days,1));
end; $$;

create or replace function public.grant_vehicle_access_with_backdate(
  p_vehicle uuid, p_email text, p_role text, p_permissions jsonb default '{}', p_backdate_days integer default null
) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_verified(); address text:=lower(trim(p_email)); target uuid; grant_id uuid;
begin
 perform 1 from public.vehicles where id=p_vehicle and archived_at is null for update;
 if not found then raise exception 'VEHICLE_NOT_FOUND_OR_FORBIDDEN'; end if;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if p_role not in ('OWNER','PILOT') or jsonb_typeof(p_permissions)<>'object' then raise exception 'INVALID_GRANT'; end if;
 if p_role='PILOT' and p_backdate_days is not null and p_backdate_days not in (0,1,2,10,30,60,-1) then raise exception 'INVALID_BACKDATE_WINDOW'; end if;
 if p_role='OWNER' then p_backdate_days:=null; end if;
 if address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
 insert into public.vehicle_access_grants(vehicle_id,normalized_email,desired_role,permission_overrides,backdate_days,granted_by)
 values(p_vehicle,address,p_role,p_permissions,p_backdate_days,actor)
 on conflict(vehicle_id,normalized_email) where status<>'REVOKED'
 do update set desired_role=excluded.desired_role,permission_overrides=excluded.permission_overrides,backdate_days=excluded.backdate_days,status='UNRESOLVED',resolved_user_id=null returning id into grant_id;
 select id into target from auth.users where lower(trim(email))=address and email_confirmed_at is not null;
 if target is not null then
   if exists(select 1 from public.vehicle_members where vehicle_id=p_vehicle and user_id=target and is_primary_admin) then
     update public.vehicle_access_grants set status='RESOLVED',resolved_user_id=target where id=grant_id;
     return;
   end if;
   insert into public.vehicle_members(vehicle_id,user_id,role,permission_overrides,backdate_days,created_by)
   values(p_vehicle,target,p_role,p_permissions,p_backdate_days,actor)
   on conflict(vehicle_id,user_id) do update set role=excluded.role,status='ACTIVE',permission_overrides=excluded.permission_overrides,backdate_days=excluded.backdate_days;
   update public.vehicle_access_grants set status='RESOLVED',resolved_user_id=target where id=grant_id;
 else update public.vehicle_access_grants set status='UNRESOLVED',resolved_user_id=null where id=grant_id;
 end if;
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,actor,'ACCESS_GRANTED',jsonb_build_object('role',p_role,'backdate_days',p_backdate_days));
end; $$;

create or replace function public.resolve_my_access_grants() returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_verified(); address text; g public.vehicle_access_grants;
begin
 select lower(trim(email)) into address from auth.users where id=actor;
 perform set_config('row_security','off',true);
 for g in select * from public.vehicle_access_grants where normalized_email=address and status='UNRESOLVED' order by vehicle_id loop
   perform 1 from public.vehicles where id=g.vehicle_id and archived_at is null for update;
   if not found then continue; end if;
   perform 1 from public.vehicle_access_grants where id=g.id and status='UNRESOLVED' for update;
   if not found then continue; end if;
   if exists(select 1 from public.vehicle_members where vehicle_id=g.vehicle_id and user_id=actor and is_primary_admin) then
     update public.vehicle_access_grants set status='RESOLVED',resolved_user_id=actor where id=g.id;
     continue;
   end if;
   insert into public.vehicle_members(vehicle_id,user_id,role,permission_overrides,backdate_days,created_by)
   values(g.vehicle_id,actor,g.desired_role,g.permission_overrides,g.backdate_days,g.granted_by)
   on conflict(vehicle_id,user_id) do update set role=excluded.role,status='ACTIVE',permission_overrides=excluded.permission_overrides,backdate_days=excluded.backdate_days;
   update public.vehicle_access_grants set status='RESOLVED',resolved_user_id=actor where id=g.id;
   insert into public.audit_events(vehicle_id,actor_id,action,context) values(g.vehicle_id,actor,'GRANT_RESOLVED',jsonb_build_object('backdate_days',g.backdate_days));
 end loop;
end; $$;

create or replace function public.set_vehicle_membership_with_backdate(
 p_vehicle uuid,p_user uuid,p_role text,p_status text default 'ACTIVE',p_permissions jsonb default '{}',p_backdate_days integer default null
) returns void language plpgsql security definer set search_path='' as $$
declare target public.vehicle_members;
begin
 perform public.require_verified(); perform 1 from public.vehicles where id=p_vehicle for update;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 perform set_config('row_security','off',true);
 perform set_config('row_security','off',true);
 if p_role not in ('OWNER','PILOT') or p_status not in ('ACTIVE','REVOKED') or jsonb_typeof(p_permissions)<>'object' then raise exception 'INVALID_MEMBERSHIP'; end if;
 if p_role='PILOT' and p_backdate_days is not null and p_backdate_days not in (0,1,2,10,30,60,-1) then raise exception 'INVALID_BACKDATE_WINDOW'; end if;
 if p_role='OWNER' then p_backdate_days:=null; end if;
 select * into target from public.vehicle_members where vehicle_id=p_vehicle and user_id=p_user;
 if p_status='ACTIVE' and not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_VERIFIED'; end if;
 if target.is_primary_admin and (p_role<>'OWNER' or p_status<>'ACTIVE') then raise exception 'PRIMARY_ADMIN_PROTECTED'; end if;
 if target.role='OWNER' and target.status='ACTIVE' and (p_role<>'OWNER' or p_status<>'ACTIVE') and (select count(*) from public.vehicle_members where vehicle_id=p_vehicle and role='OWNER' and status='ACTIVE')<=1 then raise exception 'LAST_OWNER_PROTECTED'; end if;
 insert into public.vehicle_members(vehicle_id,user_id,role,status,permission_overrides,backdate_days,created_by)
 values(p_vehicle,p_user,p_role,p_status,p_permissions,p_backdate_days,auth.uid())
 on conflict(vehicle_id,user_id) do update set role=excluded.role,status=excluded.status,permission_overrides=excluded.permission_overrides,backdate_days=excluded.backdate_days;
 if p_status='REVOKED' then update public.vehicle_access_grants set status='REVOKED',revoked_at=now() where vehicle_id=p_vehicle and resolved_user_id=p_user and status<>'REVOKED'; end if;
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,auth.uid(),'MEMBERSHIP_CHANGED',jsonb_build_object('user',p_user,'role',p_role,'status',p_status,'backdate_days',p_backdate_days));
end; $$;

create or replace function public.update_vehicle_defaults_with_backdate(p_vehicle uuid,p_permissions jsonb,p_backdate_days integer default 1) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_verified(); perform 1 from public.vehicles where id=p_vehicle for update;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if jsonb_typeof(p_permissions)<>'object' or exists(select 1 from jsonb_each(p_permissions) where jsonb_typeof(value)<>'boolean') then raise exception 'INVALID_PERMISSIONS'; end if;
 if p_backdate_days not in (0,1,2,10,30,60,-1) then raise exception 'INVALID_BACKDATE_WINDOW'; end if;
 update public.vehicle_settings set pilot_permissions=p_permissions,pilot_backdate_days=p_backdate_days where vehicle_id=p_vehicle;
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,auth.uid(),'DEFAULT_PERMISSIONS_CHANGED',jsonb_build_object('backdate_days',p_backdate_days));
end; $$;

create or replace function public.vehicle_access(p_vehicle uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb:='{}'; key text; window_days integer;
begin
 if not public.is_vehicle_member(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 foreach key in array array['fuel.read','fuel.create','fuel.edit_own','expenses.read','expenses.create','expenses.edit_own','meters.read','meters.create','documents.read','documents.create','reminders.read','reminders.create','progress.view','progress.submit','progress.edit_own','reports.read'] loop result:=result||jsonb_build_object(key,public.has_vehicle_permission(p_vehicle,key)); end loop;
 select case when m.role='OWNER' then -1 else coalesce(m.backdate_days,s.pilot_backdate_days,1) end into window_days from public.vehicle_members m join public.vehicle_settings s using(vehicle_id) where m.vehicle_id=p_vehicle and m.user_id=auth.uid() and m.status='ACTIVE';
 return result||jsonb_build_object('owner',public.is_vehicle_owner(p_vehicle),'records.backdate_days',window_days);
end; $$;

create or replace function public.guard_pilot_ledger_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare entry_date date; today_date date; allowed_days integer;
begin
 if auth.uid() is not null and not public.is_vehicle_owner(new.vehicle_id) then
   if tg_op = 'UPDATE' or new.status <> 'ACTIVE' then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;
   if tg_table_name in ('fuel_logs','expenses') then
     entry_date := ((new.payload->>'event_at')::timestamptz at time zone (select timezone from public.vehicles where id=new.vehicle_id))::date;
     select case when m.backdate_days is null then s.pilot_backdate_days else m.backdate_days end into allowed_days
       from public.vehicle_members m join public.vehicle_settings s using(vehicle_id)
       where m.vehicle_id=new.vehicle_id and m.user_id=auth.uid() and m.role='PILOT' and m.status='ACTIVE';
     select (now() at time zone timezone)::date into today_date from public.vehicles where id=new.vehicle_id;
     if entry_date < today_date - allowed_days and allowed_days <> -1 then
       raise exception 'BACKDATE_WINDOW_EXCEEDED' using errcode='42501';
     end if;
   end if;
 end if;
 return new;
end;
$$;

create or replace function public.pilot_access_policy_ready() returns boolean
language sql stable security invoker set search_path = '' as $$ select true $$;
revoke all on function public.pilot_access_policy_ready() from public,anon;
grant execute on function public.pilot_access_policy_ready() to authenticated;
revoke all on function public.grant_vehicle_access_with_backdate(uuid,text,text,jsonb,integer),public.set_vehicle_membership_with_backdate(uuid,uuid,text,text,jsonb,integer),public.update_vehicle_defaults_with_backdate(uuid,jsonb,integer),public.vehicle_access(uuid) from public,anon,authenticated;
grant execute on function public.grant_vehicle_access_with_backdate(uuid,text,text,jsonb,integer),public.set_vehicle_membership_with_backdate(uuid,uuid,text,text,jsonb,integer),public.update_vehicle_defaults_with_backdate(uuid,jsonb,integer),public.vehicle_access(uuid) to authenticated;
revoke all on function public.grant_vehicle_access(uuid,text,text,jsonb),public.set_vehicle_membership(uuid,uuid,text,text,jsonb),public.update_vehicle_defaults(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.grant_vehicle_access(uuid,text,text,jsonb),public.set_vehicle_membership(uuid,uuid,text,text,jsonb),public.update_vehicle_defaults(uuid,jsonb) to authenticated;

create or replace function public.vehicle_member_details(p_vehicle uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'is_primary_admin',m.is_primary_admin,'status',m.status,'permission_overrides',m.permission_overrides,'backdate_days',m.backdate_days,'joined_at',m.joined_at,'display_name',p.display_name) order by m.joined_at) from public.vehicle_members m join public.profiles p on p.id=m.user_id where m.vehicle_id=p_vehicle),'[]');
end; $$;
revoke all on function public.vehicle_member_details(uuid) from public,anon,authenticated;
grant execute on function public.vehicle_member_details(uuid) to authenticated;

create or replace function public.vehicle_access_grants_for_owner(p_vehicle uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
begin
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 perform set_config('row_security','off',true);
 return jsonb_build_object(
   'grants',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'normalized_email',g.normalized_email,'desired_role',g.desired_role,'status',g.status,'resolved_user_id',g.resolved_user_id,'created_at',g.created_at,'permission_overrides',g.permission_overrides,'backdate_days',g.backdate_days) order by g.created_at desc) from public.vehicle_access_grants g where g.vehicle_id=p_vehicle),'[]'::jsonb),
   'pilot_permissions',(select s.pilot_permissions from public.vehicle_settings s where s.vehicle_id=p_vehicle),
   'pilot_backdate_days',(select s.pilot_backdate_days from public.vehicle_settings s where s.vehicle_id=p_vehicle)
 );
end; $$;
revoke all on function public.vehicle_access_grants_for_owner(uuid) from public,anon,authenticated;
grant execute on function public.vehicle_access_grants_for_owner(uuid) to authenticated;
