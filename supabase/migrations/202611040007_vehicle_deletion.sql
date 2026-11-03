-- Preserve financial/audit history while removing deleted vehicles from app access.
alter table public.vehicles add column deleted_at timestamptz;

create or replace function public.is_vehicle_member(p_vehicle uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vehicle_members m join auth.users u on u.id=m.user_id join public.vehicles v on v.id=m.vehicle_id where m.vehicle_id=p_vehicle and v.deleted_at is null and m.user_id=auth.uid() and m.status='ACTIVE' and u.email_confirmed_at is not null);
$$;
create or replace function public.is_vehicle_owner(p_vehicle uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vehicle_members m join auth.users u on u.id=m.user_id join public.vehicles v on v.id=m.vehicle_id where m.vehicle_id=p_vehicle and v.deleted_at is null and m.user_id=auth.uid() and m.status='ACTIVE' and m.role='OWNER' and u.email_confirmed_at is not null);
$$;

create function public.delete_vehicle(p_vehicle uuid,p_confirmation text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_verified(); target public.vehicles; expected text;
begin
 select * into target from public.vehicles where id=p_vehicle for update;
 -- Check membership directly to allow an unchanged explicit retry after deletion.
 if not found or not exists(select 1 from public.vehicle_members where vehicle_id=p_vehicle and user_id=actor and role='OWNER' and status='ACTIVE') then
   raise exception 'PERMISSION_DENIED' using errcode='42501';
 end if;
 expected:=coalesce(nullif(btrim(target.nickname),''),nullif(btrim(target.registration_number),''),nullif(btrim(target.model),''),target.subtype);
 if p_confirmation is null or p_confirmation<>expected then raise exception 'VEHICLE_NAME_MISMATCH' using errcode='22023'; end if;
 if target.deleted_at is not null then return p_vehicle; end if;
 update public.vehicles set deleted_at=clock_timestamp(),archived_at=coalesce(archived_at,clock_timestamp()),updated_at=clock_timestamp() where id=p_vehicle;
 update public.vehicle_access_grants set status='REVOKED',revoked_at=clock_timestamp() where vehicle_id=p_vehicle and status<>'REVOKED';
 insert into public.audit_events(vehicle_id,actor_id,action) values(p_vehicle,actor,'VEHICLE_DELETED');
 return p_vehicle;
end;
$$;
revoke all on function public.delete_vehicle(uuid,text) from public,anon,authenticated;
grant execute on function public.delete_vehicle(uuid,text) to authenticated;
