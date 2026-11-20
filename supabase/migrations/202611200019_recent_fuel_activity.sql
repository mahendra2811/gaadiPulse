-- Home needs event-time order, independent of the entry-time order used by history.
-- SECURITY INVOKER keeps the existing fuel_logs RLS and Pilot history limits.
create function public.recent_fuel_activity(p_vehicle uuid, p_limit integer default 10)
returns table (
  id uuid, vehicle_id uuid, created_by uuid, revision integer, status text,
  payload jsonb, created_at timestamptz, updated_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select f.id, f.vehicle_id, f.created_by, f.revision, f.status,
         f.payload, f.created_at, f.updated_at
  from public.fuel_logs f
  where f.vehicle_id = p_vehicle and f.status <> 'ARCHIVED'
  order by (f.payload->>'event_at')::timestamptz desc, f.id desc
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;
revoke all on function public.recent_fuel_activity(uuid, integer) from public, anon;
grant execute on function public.recent_fuel_activity(uuid, integer) to authenticated;
