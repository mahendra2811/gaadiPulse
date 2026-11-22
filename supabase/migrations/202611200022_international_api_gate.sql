-- Versioned preferences and vehicle reads/writes. Legacy clients remain safe:
-- they only see INR defaults and cannot opt into non-INR ledgers accidentally.

create table public.international_feature_flags(
  key text primary key,
  enabled boolean not null default false,
  catalog_version text not null default '2026-11',
  updated_at timestamptz not null default now()
);
insert into public.international_feature_flags(key,enabled)
values ('international_ledger', true)
on conflict(key) do nothing;
alter table public.international_feature_flags enable row level security;
revoke all on public.international_feature_flags from public,anon,authenticated;
grant select on public.international_feature_flags to authenticated;
create policy international_feature_flags_read on public.international_feature_flags
  for select to authenticated using(key = 'international_ledger');

grant update(
  display_name,locale,theme,timezone,country_code,preferred_currency_code,
  onboarding_version,onboarding_completed_at
) on public.profiles to authenticated;

create function public.save_vehicle_v2(
  p_data jsonb,
  p_operation uuid,
  p_id uuid default null,
  p_expected timestamptz default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid := public.require_verified();
  result uuid;
  selected_currency text := coalesce(p_data->>'default_currency_code','INR');
  currency_active boolean;
  ledger_enabled boolean;
begin
  select active into currency_active
  from public.supported_currencies
  where code=selected_currency;
  if coalesce(currency_active,false) = false then raise exception 'CURRENCY_NOT_SUPPORTED'; end if;
  select enabled into ledger_enabled
  from public.international_feature_flags
  where key='international_ledger';
  if selected_currency <> 'INR' and coalesce(ledger_enabled,false) = false then
    raise exception 'CURRENCY_NOT_ENABLED';
  end if;
  -- The legacy vehicle RPC still owns membership, meter and operation receipt
  -- invariants. This wrapper adds only the new default-currency preference.
  result := public.save_vehicle_legacy_inr(p_data,p_operation,p_id,p_expected);
  update public.vehicles
    set default_currency_code=selected_currency,
        currency_catalog_version='2026-11'
  where id=result and (created_by=actor or public.is_vehicle_owner(result));
  return result;
end; $$;
revoke all on function public.save_vehicle_v2(jsonb,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.save_vehicle_v2(jsonb,uuid,uuid,timestamptz) to authenticated;

create function public.list_my_vehicles_v2()
returns table(
  id uuid,nickname text,registration_number text,category text,subtype text,
  brand text,model text,energy_type text,meter_mode text,timezone text,
  default_currency_code text,currency_catalog_version text,
  archived_at timestamptz,updated_at timestamptz,role text
) language sql stable security invoker set search_path='' as $$
  select v.id,v.nickname,v.registration_number,v.category,v.subtype,v.brand,
    v.model,v.energy_type,v.meter_mode,v.timezone,v.default_currency_code,
    v.currency_catalog_version,v.archived_at,v.updated_at,m.role
  from public.vehicles v
  join public.vehicle_members m on m.vehicle_id=v.id
  where m.user_id=auth.uid() and m.status='ACTIVE'
  order by v.created_at;
$$;
revoke all on function public.list_my_vehicles_v2() from public,anon;
grant execute on function public.list_my_vehicles_v2() to authenticated;

-- Legacy direct reads stay INR-only. The versioned API is the only path that
-- can return the multi-currency ledger, which prevents old clients from
-- rendering USD/JPY/etc. as INR.
drop policy if exists fuel_read on public.fuel_logs;
create policy fuel_read on public.fuel_logs for select to authenticated using(
  currency_code='INR' and public.has_vehicle_permission(vehicle_id,'fuel.read') and
  (public.is_vehicle_owner(vehicle_id) or public.pilot_history_visible(vehicle_id,(payload->>'event_at')::timestamptz))
);
drop policy if exists expense_read on public.expenses;
create policy expense_read on public.expenses for select to authenticated using(
  currency_code='INR' and public.has_vehicle_permission(vehicle_id,'expenses.read') and
  (public.is_vehicle_owner(vehicle_id) or public.pilot_history_visible(vehicle_id,(payload->>'event_at')::timestamptz))
);

create function public.read_financial_records_v2(
  p_kind text,
  p_vehicle uuid,
  p_offset integer default 0,
  p_limit integer default 250
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  rows jsonb;
  total_count integer;
begin
  perform public.require_verified();
  if p_kind='fuel' then
    if not public.has_vehicle_permission(p_vehicle,'fuel.read') then raise exception 'PERMISSION_DENIED'; end if;
    select coalesce(jsonb_agg(to_jsonb(page_row) order by page_row.created_at desc,page_row.id desc),'[]'::jsonb)
      into rows
      from (select * from public.fuel_logs where vehicle_id=p_vehicle and (public.is_vehicle_owner(p_vehicle) or public.pilot_history_visible(p_vehicle,(payload->>'event_at')::timestamptz)) order by created_at desc,id desc offset greatest(p_offset,0) limit least(greatest(p_limit,1),500)) page_row;
    select count(*)::integer into total_count from public.fuel_logs where vehicle_id=p_vehicle and (public.is_vehicle_owner(p_vehicle) or public.pilot_history_visible(p_vehicle,(payload->>'event_at')::timestamptz));
  elsif p_kind='expenses' then
    if not public.has_vehicle_permission(p_vehicle,'expenses.read') then raise exception 'PERMISSION_DENIED'; end if;
    select coalesce(jsonb_agg(to_jsonb(page_row) order by page_row.created_at desc,page_row.id desc),'[]'::jsonb)
      into rows
      from (select * from public.expenses where vehicle_id=p_vehicle and (public.is_vehicle_owner(p_vehicle) or public.pilot_history_visible(p_vehicle,(payload->>'event_at')::timestamptz)) order by created_at desc,id desc offset greatest(p_offset,0) limit least(greatest(p_limit,1),500)) page_row;
    select count(*)::integer into total_count from public.expenses where vehicle_id=p_vehicle and (public.is_vehicle_owner(p_vehicle) or public.pilot_history_visible(p_vehicle,(payload->>'event_at')::timestamptz));
  else
    raise exception 'INVALID_KIND';
  end if;
  return jsonb_build_object('rows',rows,'count',total_count);
end; $$;
revoke all on function public.read_financial_records_v2(text,uuid,integer,integer) from public,anon;
grant execute on function public.read_financial_records_v2(text,uuid,integer,integer) to authenticated;

create function public.save_record_v2(
  p_kind text,
  p_vehicle uuid,
  p_payload jsonb,
  p_operation uuid,
  p_id uuid default null,
  p_expected integer default null,
  p_status text default 'ACTIVE'
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  selected_currency text := coalesce(p_payload->>'currency_code','INR');
  exponent smallint;
  ledger_enabled boolean;
  normalized jsonb := p_payload;
  normalized_items jsonb;
  result uuid;
begin
  select minor_units into exponent from public.supported_currencies
    where code=selected_currency and active;
  if exponent is null then raise exception 'CURRENCY_NOT_SUPPORTED'; end if;
  select enabled into ledger_enabled from public.international_feature_flags
    where key='international_ledger';
  if selected_currency <> 'INR' and coalesce(ledger_enabled,false) = false then
    raise exception 'CURRENCY_NOT_ENABLED';
  end if;
  if p_kind not in ('fuel','expenses') then raise exception 'USE_LEGACY_RECORD_PATH'; end if;
  normalized := normalized || jsonb_build_object(
    'currency_code',selected_currency,
    'currency_exponent',exponent,
    'amount_paise',coalesce(p_payload->'amount_minor',p_payload->'amount_paise'),
    'unit_price_paise',coalesce(p_payload->'unit_price_minor',p_payload->'unit_price_paise'),
    'principal_paise',coalesce(p_payload->'principal_minor',p_payload->'principal_paise'),
    'interest_paise',coalesce(p_payload->'interest_minor',p_payload->'interest_paise')
  );
  if p_kind='expenses' then
    select coalesce(jsonb_agg(item || jsonb_build_object(
      'amount_paise',coalesce(item->'amount_minor',item->'amount_paise')
    )),'[]'::jsonb) into normalized_items
    from jsonb_array_elements(coalesce(p_payload->'items','[]'::jsonb)) item;
    normalized := jsonb_set(normalized,'{items}',normalized_items,true);
  end if;
  result := public.save_record(p_kind,p_vehicle,normalized,p_operation,p_id,p_expected,p_status);
  if p_kind='fuel' then
    update public.fuel_logs set currency_code=selected_currency,currency_exponent=exponent where id=result;
  else
    update public.expenses set currency_code=selected_currency,currency_exponent=exponent where id=result;
    update public.expense_items set currency_code=selected_currency,currency_exponent=exponent where expense_id=result;
  end if;
  return result;
end; $$;
revoke all on function public.save_record_v2(text,uuid,jsonb,uuid,uuid,integer,text) from public,anon;
grant execute on function public.save_record_v2(text,uuid,jsonb,uuid,uuid,integer,text) to authenticated;

comment on table public.international_feature_flags is
  'Operator-controlled rollout gate. Keep disabled until all v2 financial reads and writes are deployed.';
