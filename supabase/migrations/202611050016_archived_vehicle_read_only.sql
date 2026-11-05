-- Keep archived vehicle history readable, but prevent new or changed ledger data.
-- Lock the vehicle row so a concurrent archive cannot race a record write.
create function public.guard_archived_vehicle_record() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.vehicles where id = new.vehicle_id and archived_at is null for update;
  if not found then raise exception 'VEHICLE_ARCHIVED' using errcode = '42501'; end if;
  return new;
end; $$;
revoke all on function public.guard_archived_vehicle_record() from public, anon, authenticated;
create trigger archived_fuel_guard before insert or update on public.fuel_logs for each row execute function public.guard_archived_vehicle_record();
create trigger archived_expense_guard before insert or update on public.expenses for each row execute function public.guard_archived_vehicle_record();
create trigger archived_meter_event_guard before insert or update on public.meter_events for each row execute function public.guard_archived_vehicle_record();
create trigger archived_meter_reading_guard before insert or update on public.meter_readings for each row execute function public.guard_archived_vehicle_record();
create trigger archived_document_guard before insert or update on public.documents for each row execute function public.guard_archived_vehicle_record();
create trigger archived_reminder_guard before insert or update on public.reminders for each row execute function public.guard_archived_vehicle_record();

create function public.guard_archived_vehicle_details() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.archived_at is not null then raise exception 'VEHICLE_ARCHIVED' using errcode = '42501'; end if;
  return new;
end; $$;
revoke all on function public.guard_archived_vehicle_details() from public, anon, authenticated;
create trigger archived_vehicle_details_guard before update of nickname, registration_number, category, subtype, brand, model, energy_type, meter_mode, timezone on public.vehicles for each row execute function public.guard_archived_vehicle_details();
