-- Validate new form observations against their temporal neighbors. Historic data
-- and explicit correction/reset workflows remain intact.
create function public.guard_record_meter_chronology() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous_value numeric; next_value numeric; next_is_reset boolean;
begin
  if new.source not in ('MANUAL', 'FUEL', 'EXPENSE')
     or new.linked_entity_type is distinct from new.source then
    return new;
  end if;
  perform 1 from public.vehicles where id = new.vehicle_id for update;
  select value into previous_value from public.meter_readings
    where vehicle_id = new.vehicle_id and reading_type = new.reading_type
      and status = 'ACTIVE' and observed_at < new.observed_at
    order by observed_at desc, id desc limit 1;
  if not new.is_reset and previous_value is not null and new.value < previous_value then
    raise exception 'METER_BELOW_PREVIOUS';
  end if;
  select value, is_reset into next_value, next_is_reset from public.meter_readings
    where vehicle_id = new.vehicle_id and reading_type = new.reading_type
      and status = 'ACTIVE' and observed_at > new.observed_at
    order by observed_at, id limit 1;
  if next_value is not null and not next_is_reset and new.value > next_value then
    raise exception 'METER_ABOVE_NEXT';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_record_meter_chronology() from public, anon, authenticated;
create trigger guard_record_meter_chronology before insert on public.meter_readings
for each row execute function public.guard_record_meter_chronology();

-- Reveal only the author of a fuel record the caller may read. Email is owner-only.
create function public.fuel_record_author(p_vehicle uuid, p_record uuid)
returns table(display_name text, email text)
language sql stable security definer set search_path = '' as $$
  select nullif(trim(p.display_name), ''),
    case when public.is_vehicle_owner(p_vehicle) then p.email else null end
  from public.fuel_logs f join public.profiles p on p.id = f.created_by
  where f.id = p_record and f.vehicle_id = p_vehicle
    and public.has_vehicle_permission(p_vehicle, 'fuel.read')
    and (public.is_vehicle_owner(p_vehicle) or public.pilot_history_visible(p_vehicle, (f.payload->>'event_at')::timestamptz));
$$;
revoke all on function public.fuel_record_author(uuid, uuid) from public, anon;
grant execute on function public.fuel_record_author(uuid, uuid) to authenticated;

-- Page only rows visible under the caller's existing fuel RLS policy.
create function public.fuel_history_page(
  p_vehicle uuid, p_start date default null, p_end date default null,
  p_min bigint default null, p_max bigint default null, p_search text default '',
  p_offset integer default 0, p_limit integer default 30
) returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select f.* from public.fuel_logs f join public.vehicles v on v.id = f.vehicle_id
    where f.vehicle_id = p_vehicle and f.status <> 'ARCHIVED'
      and (p_start is null or ((f.payload->>'event_at')::timestamptz at time zone v.timezone)::date >= p_start)
      and (p_end is null or ((f.payload->>'event_at')::timestamptz at time zone v.timezone)::date <= p_end)
      and (p_min is null or (f.payload->>'amount_paise')::bigint >= p_min)
      and (p_max is null or (f.payload->>'amount_paise')::bigint <= p_max)
      and (coalesce(p_search, '') = '' or strpos(lower(concat_ws(' ', f.payload->>'title', f.payload->>'notes', f.payload->>'category', f.payload->>'station_name')), lower(p_search)) > 0)
  ), page as (
    select id, vehicle_id, created_by, revision, status, payload, created_at, updated_at
    from filtered order by created_at desc, id desc
    offset greatest(coalesce(p_offset, 0), 0) limit least(greatest(coalesce(p_limit, 30), 1), 100)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc, id desc) from page), '[]'::jsonb),
    'count', (select count(*) from filtered),
    'total_paise', (select coalesce(sum((payload->>'amount_paise')::bigint), 0) from filtered)
  );
$$;
revoke all on function public.fuel_history_page(uuid, date, date, bigint, bigint, text, integer, integer) from public, anon;
grant execute on function public.fuel_history_page(uuid, date, date, bigint, bigint, text, integer, integer) to authenticated;
