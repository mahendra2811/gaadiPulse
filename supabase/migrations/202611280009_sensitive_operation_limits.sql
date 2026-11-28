-- Backstop high-impact audit events at the database boundary. The advisory
-- lock serializes concurrent requests for the same user/vehicle/action window.
create index if not exists audit_actor_action_vehicle_time
  on public.audit_events(actor_id, action, vehicle_id, created_at desc);

create function public.enforce_sensitive_audit_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  threshold integer;
  rate_window interval := interval '1 hour';
begin
  if new.actor_id is null then
    return new;
  end if;

  threshold := case new.action
    when 'ACCESS_GRANTED' then 30
    when 'ACCESS_REVOKED' then 30
    when 'MEMBERSHIP_CHANGED' then 30
    when 'METER_CORRECTED' then 30
    when 'VEHICLE_DELETED' then 10
    when 'VEHICLE_CREATED' then 20
    when 'VEHICLE_UPDATED' then 60
    when 'ARCHIVED' then 30
    when 'RECOVERED' then 30
    when 'DEFAULT_PERMISSIONS_CHANGED' then 30
    when 'FUEL_SAVED' then 100
    when 'EXPENSES_SAVED' then 100
    when 'METERS_SAVED' then 100
    when 'DOCUMENTS_SAVED' then 50
    when 'REMINDERS_SAVED' then 50
    when 'PROGRESS_REVIEWED' then 100
    when 'FORM_PUBLISHED' then 30
    else null
  end;

  if threshold is null then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.actor_id::text || ':' || coalesce(new.vehicle_id::text, '') || ':' || new.action,
      0
    )
  );

  if (
    select count(*)
    from public.audit_events existing
    where existing.actor_id = new.actor_id
      and existing.action = new.action
      and existing.vehicle_id is not distinct from new.vehicle_id
      and existing.created_at >= pg_catalog.clock_timestamp() - rate_window
  ) >= threshold then
    raise exception 'RATE_LIMIT' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_sensitive_audit_rate_limit() from public, anon, authenticated;
create trigger enforce_sensitive_audit_rate_limit
  before insert on public.audit_events
  for each row execute function public.enforce_sensitive_audit_rate_limit();

comment on function public.enforce_sensitive_audit_rate_limit() is
  'Serializes and rate-limits sensitive audited writes by authenticated actor, vehicle, action and rolling one-hour window.';
