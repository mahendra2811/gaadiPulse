-- Manual meter entries must not decrease relative to the last earlier observation.
-- Existing readings and timestamped correction history are preserved.
create function public.guard_manual_meter_reading() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous_value numeric;
begin
  if new.source <> 'MANUAL' or new.linked_entity_type is distinct from 'MANUAL' then
    return new;
  end if;
  perform 1 from public.vehicles where id = new.vehicle_id for update;
  if new.is_reset then
    raise exception 'METER_RESET_NOT_ALLOWED';
  end if;
  select value into previous_value from public.meter_readings
    where vehicle_id = new.vehicle_id and reading_type = new.reading_type
      and status = 'ACTIVE' and observed_at < new.observed_at
    order by observed_at desc, id desc limit 1;
  if previous_value is not null and new.value < previous_value then
    raise exception 'METER_BELOW_PREVIOUS';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_manual_meter_reading() from public, anon, authenticated;
create trigger guard_manual_meter_reading before insert on public.meter_readings
for each row execute function public.guard_manual_meter_reading();
