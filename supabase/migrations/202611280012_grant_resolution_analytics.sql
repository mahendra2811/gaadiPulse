-- Preserve the existing resolver contract while exposing only coarse roles for
-- a caller's own newly resolved grants. No account or vehicle identifiers leave
-- the RPC, and the call remains bound to the verified authenticated actor.
create function public.resolve_my_access_grants_with_roles()
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := public.require_verified();
  call_started timestamptz := transaction_timestamp();
  resolved_roles text[];
begin
  perform public.resolve_my_access_grants();
  select coalesce(array_agg(distinct vm.role order by vm.role), array[]::text[])
  into resolved_roles
  from public.audit_events ae
  join public.vehicle_members vm
    on vm.vehicle_id = ae.vehicle_id and vm.user_id = actor and vm.status = 'ACTIVE'
  where ae.actor_id = actor
    and ae.action = 'GRANT_RESOLVED'
    and ae.created_at >= call_started;
  return resolved_roles;
end;
$$;
revoke all on function public.resolve_my_access_grants_with_roles() from public, anon;
grant execute on function public.resolve_my_access_grants_with_roles() to authenticated;
