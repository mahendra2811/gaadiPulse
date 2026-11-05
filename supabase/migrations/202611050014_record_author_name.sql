-- Return only the display name for a record the caller is authorized to read.
-- Do not expose profile email or support lookups by arbitrary user ID.
create function public.record_author_name(p_kind text, p_vehicle uuid, p_record uuid)
returns table(display_name text)
language sql stable security definer set search_path = '' as $$
  select nullif(trim(p.display_name), '')
  from (
    select e.created_by from public.expenses e
      where p_kind = 'expenses' and e.vehicle_id = p_vehicle and e.id = p_record
        and public.has_vehicle_permission(p_vehicle, 'expenses.read')
        and (public.is_vehicle_owner(p_vehicle) or public.pilot_history_visible(p_vehicle, (e.payload->>'event_at')::timestamptz))
    union all
    select m.created_by from public.meter_events m
      where p_kind = 'meters' and m.vehicle_id = p_vehicle and m.id = p_record
        and public.has_vehicle_permission(p_vehicle, 'meters.read')
        and (public.is_vehicle_owner(p_vehicle) or public.pilot_history_visible(p_vehicle, (m.payload->>'event_at')::timestamptz))
    union all
    select d.created_by from public.documents d
      where p_kind = 'documents' and d.vehicle_id = p_vehicle and d.id = p_record
        and public.has_vehicle_permission(p_vehicle, 'documents.read')
    union all
    select r.created_by from public.reminders r
      where p_kind = 'reminders' and r.vehicle_id = p_vehicle and r.id = p_record
        and public.has_vehicle_permission(p_vehicle, 'reminders.read')
  ) author
  join public.profiles p on p.id = author.created_by;
$$;
revoke all on function public.record_author_name(text, uuid, uuid) from public, anon;
grant execute on function public.record_author_name(text, uuid, uuid) to authenticated;
