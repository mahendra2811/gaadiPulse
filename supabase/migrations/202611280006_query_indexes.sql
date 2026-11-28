-- Query indexes for vehicle-scoped records, membership, pagination and meter history.
-- Existing primary/unique operation/idempotency constraints remain authoritative.

create index if not exists fuel_vehicle_history_cursor
  on public.fuel_logs(vehicle_id, created_at desc, id desc);
create index if not exists expense_vehicle_history_cursor
  on public.expenses(vehicle_id, created_at desc, id desc);
create index if not exists fuel_vehicle_status_currency_history
  on public.fuel_logs(vehicle_id, status, currency_code, created_at desc, id desc);
create index if not exists expense_vehicle_status_currency_history
  on public.expenses(vehicle_id, status, currency_code, created_at desc, id desc);
create index if not exists meter_vehicle_type_status_observed
  on public.meter_readings(vehicle_id, reading_type, status, observed_at desc, id desc);
create index if not exists meter_linked_entity_lookup
  on public.meter_readings(linked_entity_id, status)
  where linked_entity_id is not null;
create index if not exists vehicle_members_user_active_vehicle
  on public.vehicle_members(user_id, status, vehicle_id);
create index if not exists grants_resolved_user_status
  on public.vehicle_access_grants(resolved_user_id, status, vehicle_id)
  where resolved_user_id is not null;
create index if not exists expense_items_expense_currency
  on public.expense_items(expense_id, currency_code);
create index if not exists maintenance_vehicle_expense
  on public.maintenance_records(vehicle_id, expense_id);
create index if not exists progress_vehicle_created_cursor
  on public.daily_progress(vehicle_id, created_at desc, id desc);

-- The previous implementation selected every fuel_logs column inside the CTE.
-- Keep the same function contract and RLS while projecting only returned columns.
create or replace function public.fuel_history_page(
  p_vehicle uuid, p_start date default null, p_end date default null,
  p_min bigint default null, p_max bigint default null, p_search text default '',
  p_offset integer default 0, p_limit integer default 30
) returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select f.id, f.vehicle_id, f.created_by, f.revision, f.status,
           f.payload, f.created_at, f.updated_at
    from public.fuel_logs f
    join public.vehicles v on v.id = f.vehicle_id
    where f.vehicle_id = p_vehicle and f.status <> 'ARCHIVED'
      and (p_start is null or ((f.payload->>'event_at')::timestamptz at time zone v.timezone)::date >= p_start)
      and (p_end is null or ((f.payload->>'event_at')::timestamptz at time zone v.timezone)::date <= p_end)
      and (p_min is null or (f.payload->>'amount_paise')::bigint >= p_min)
      and (p_max is null or (f.payload->>'amount_paise')::bigint <= p_max)
      and (coalesce(p_search, '') = '' or strpos(lower(concat_ws(' ', f.payload->>'title', f.payload->>'notes', f.payload->>'category', f.payload->>'station_name')), lower(p_search)) > 0)
  ), page as (
    select id, vehicle_id, created_by, revision, status, payload, created_at, updated_at
    from filtered
    order by created_at desc, id desc
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc, id desc) from page), '[]'::jsonb),
    'count', (select count(*) from filtered),
    'total_paise', (select coalesce(sum((payload->>'amount_paise')::bigint), 0) from filtered)
  );
$$;
revoke all on function public.fuel_history_page(uuid,date,date,bigint,bigint,text,integer,integer) from public, anon;
grant execute on function public.fuel_history_page(uuid,date,date,bigint,bigint,text,integer,integer) to authenticated;

analyze public.vehicle_members;
analyze public.vehicle_access_grants;
analyze public.meter_readings;
analyze public.fuel_logs;
analyze public.expenses;
analyze public.expense_items;
analyze public.maintenance_records;
analyze public.daily_progress;
