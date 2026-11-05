-- Legacy ledgers are INR paise. Non-INR remains blocked until versioned,
-- permission-aware read/write paths prevent legacy clients from mislabelling it.
alter table public.vehicles add column currency_code text not null default 'INR';
alter table public.vehicles add constraint vehicles_currency_legacy_gate check (currency_code = 'INR');
alter table public.profiles add column last_vehicle_currency text not null default 'INR';
alter table public.profiles add constraint profiles_currency_legacy_gate check (last_vehicle_currency = 'INR');

create function public.guard_vehicle_currency_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.currency_code is distinct from old.currency_code then
    raise exception 'VEHICLE_CURRENCY_IMMUTABLE' using errcode = '23514';
  end if;
  return new;
end; $$;
revoke all on function public.guard_vehicle_currency_immutable() from public, anon, authenticated;
create trigger vehicle_currency_immutable before update of currency_code on public.vehicles
for each row execute function public.guard_vehicle_currency_immutable();

-- Existing clients omit currency_code. Reject an explicit unsupported value
-- rather than silently creating an INR vehicle for a client requesting USD.
alter function public.save_vehicle(jsonb,uuid,uuid,timestamptz) rename to save_vehicle_legacy_inr;
revoke all on function public.save_vehicle_legacy_inr(jsonb,uuid,uuid,timestamptz) from public, anon, authenticated;
create function public.save_vehicle(p_data jsonb, p_operation uuid, p_id uuid default null, p_expected timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if p_data ? 'currency_code' and p_data->>'currency_code' is distinct from 'INR' then
    raise exception 'CURRENCY_NOT_ENABLED' using errcode = '23514';
  end if;
  return public.save_vehicle_legacy_inr(p_data, p_operation, p_id, p_expected);
end; $$;
revoke all on function public.save_vehicle(jsonb,uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.save_vehicle(jsonb,uuid,uuid,timestamptz) to authenticated;
