-- Page expense history without changing the RLS rules or truncating its total.
-- SECURITY INVOKER ensures page rows and aggregates see only rows authorized by
-- the caller's existing expense_read policy.
create function public.expense_history_page(
  p_vehicle uuid,
  p_start date default null,
  p_status text default null,
  p_search text default '',
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with filtered as materialized (
    select e.id, e.vehicle_id, e.created_by, e.revision, e.status,
           e.payload, e.created_at, e.updated_at, e.amount_paise
    from public.expenses e
    join public.vehicles v on v.id = e.vehicle_id
    where e.vehicle_id = p_vehicle
      and e.status <> 'ARCHIVED'
      and (p_status is null or p_status = 'ALL' or e.status = p_status)
      and (
        p_start is null or
        (coalesce(nullif(e.payload->>'event_at', '')::timestamptz, e.created_at)
          at time zone v.timezone)::date >= p_start
      )
      and (
        coalesce(p_search, '') = '' or
        strpos(
          lower(
            coalesce(e.payload->>'title', '') || ' ' ||
            coalesce(e.payload->>'notes', '') || ' ' ||
            coalesce(e.payload->>'category', '') || ' ' ||
            coalesce(e.payload->>'station_name', '')
          ),
          lower(coalesce(p_search, ''))
        ) > 0
      )
  ), page as (
    select id, vehicle_id, created_by, revision, status, payload, created_at, updated_at
    from filtered
    where
      (p_before_created_at is null and p_before_id is null) or
      (p_before_created_at is not null and p_before_id is not null and
        (created_at, id) < (p_before_created_at, p_before_id))
    order by created_at desc, id desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc, id desc) from page), '[]'::jsonb),
    'count', (select count(*) from filtered),
    'total_paise', (select coalesce(sum(amount_paise::numeric), 0)::text from filtered)
  );
$$;
revoke all on function public.expense_history_page(uuid,date,text,text,timestamptz,uuid,integer) from public, anon;
grant execute on function public.expense_history_page(uuid,date,text,text,timestamptz,uuid,integer) to authenticated;
