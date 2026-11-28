-- Home needs only a small recent expense feed; totals stay in the paginated
-- period RPC. SECURITY INVOKER preserves expense RLS and Pilot date limits.
create function public.recent_expense_activity(
  p_vehicle uuid,
  p_limit integer default 10
)
returns table (
  id uuid, vehicle_id uuid, created_by uuid, revision integer, status text,
  payload jsonb, created_at timestamptz, updated_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select e.id, e.vehicle_id, e.created_by, e.revision, e.status,
         e.payload, e.created_at, e.updated_at
  from public.expenses e
  where e.vehicle_id = p_vehicle and e.status <> 'ARCHIVED'
  order by coalesce(nullif(e.payload->>'event_at', '')::timestamptz, e.created_at) desc,
           e.id desc
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;
revoke all on function public.recent_expense_activity(uuid, integer) from public, anon;
grant execute on function public.recent_expense_activity(uuid, integer) to authenticated;
