-- Pilot access is scoped per vehicle and limited to today and yesterday in its timezone.
-- Existing owner rights and stored permission settings are retained.
create function public.pilot_access_policy_ready() returns boolean
language sql stable security invoker set search_path = '' as $$ select true $$;
revoke all on function public.pilot_access_policy_ready() from public, anon;
grant execute on function public.pilot_access_policy_ready() to authenticated;

create or replace function public.has_vehicle_permission(p_vehicle uuid, p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_vehicle_member(p_vehicle) and coalesce((
    select case when m.role = 'OWNER' then true
      else p_key in ('fuel.read','fuel.create','expenses.read','expenses.create','meters.read','meters.create')
        and coalesce((m.permission_overrides->>p_key)::boolean, (s.pilot_permissions->>p_key)::boolean, true)
    end
    from public.vehicle_members m
    join public.vehicle_settings s using (vehicle_id)
    where m.vehicle_id = p_vehicle and m.user_id = auth.uid() and m.status = 'ACTIVE'
  ), false);
$$;

create function public.pilot_history_visible(p_vehicle uuid, p_observed timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_vehicle_member(p_vehicle) and exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle and p_observed is not null
      and (p_observed at time zone v.timezone)::date between
        (now() at time zone v.timezone)::date - 1 and (now() at time zone v.timezone)::date
  );
$$;
revoke all on function public.pilot_history_visible(uuid, timestamptz) from public, anon;
grant execute on function public.pilot_history_visible(uuid, timestamptz) to authenticated;

-- RLS applies to direct table reads, exports and security-invoker RPCs, not just UI lists.
drop policy fuel_read on public.fuel_logs;
create policy fuel_read on public.fuel_logs for select to authenticated using (
  public.has_vehicle_permission(vehicle_id, 'fuel.read') and
  (public.is_vehicle_owner(vehicle_id) or public.pilot_history_visible(vehicle_id, (payload->>'event_at')::timestamptz))
);
drop policy expense_read on public.expenses;
create policy expense_read on public.expenses for select to authenticated using (
  public.has_vehicle_permission(vehicle_id, 'expenses.read') and
  (public.is_vehicle_owner(vehicle_id) or public.pilot_history_visible(vehicle_id, (payload->>'event_at')::timestamptz))
);
drop policy meter_events_read on public.meter_events;
create policy meter_events_read on public.meter_events for select to authenticated using (
  public.has_vehicle_permission(vehicle_id, 'meters.read') and
  (public.is_vehicle_owner(vehicle_id) or public.pilot_history_visible(vehicle_id, (payload->>'event_at')::timestamptz))
);
drop policy meters_permission on public.meter_readings;
create policy meters_permission on public.meter_readings for select to authenticated using (
  public.has_vehicle_permission(vehicle_id, 'meters.read') and
  (public.is_vehicle_owner(vehicle_id) or public.pilot_history_visible(vehicle_id, observed_at))
);
drop policy maintenance_read on public.maintenance_records;
create policy maintenance_read on public.maintenance_records for select to authenticated using (
  public.is_vehicle_owner(vehicle_id)
);

-- Also reject archival on insert and every update, even through privileged RPCs.
create function public.guard_pilot_ledger_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_vehicle_owner(new.vehicle_id) then
    if tg_op = 'UPDATE' or new.status <> 'ACTIVE' then
      raise exception 'OWNER_REQUIRED' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_pilot_ledger_write() from public, anon, authenticated;
create trigger guard_pilot_fuel_write before insert or update on public.fuel_logs
for each row execute function public.guard_pilot_ledger_write();
create trigger guard_pilot_expense_write before insert or update on public.expenses
for each row execute function public.guard_pilot_ledger_write();
create trigger guard_pilot_meter_event_write before insert or update on public.meter_events
for each row execute function public.guard_pilot_ledger_write();
