-- Keep ledger history, restrict deletion to verified owners, and forbid recovery.
create function public.guard_ledger_deletion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and old.status = 'ARCHIVED' then
    raise exception 'RECORD_DELETED' using errcode = '42501';
  end if;
  if new.status = 'ARCHIVED' then
    perform public.require_verified();
    if not public.is_vehicle_owner(new.vehicle_id) then
      raise exception 'OWNER_REQUIRED' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_ledger_deletion() from public, anon, authenticated;
create trigger guard_fuel_deletion before insert or update on public.fuel_logs
for each row execute function public.guard_ledger_deletion();
create trigger guard_expense_deletion before insert or update on public.expenses
for each row execute function public.guard_ledger_deletion();
