-- Store the model year independently from the vehicle's full model name.
create or replace function public.save_vehicle_v2(
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
  from public.supported_currencies where code=selected_currency;
  if coalesce(currency_active,false) = false then raise exception 'CURRENCY_NOT_SUPPORTED'; end if;
  select enabled into ledger_enabled
  from public.international_feature_flags where key='international_ledger';
  if selected_currency <> 'INR' and coalesce(ledger_enabled,false) = false then
    raise exception 'CURRENCY_NOT_ENABLED';
  end if;
  result := public.save_vehicle_legacy_inr(p_data,p_operation,p_id,p_expected);
  update public.vehicles
    set default_currency_code=selected_currency,
        currency_catalog_version='2026-11',
        model_year=nullif(p_data->>'model_year','')::smallint
  where id=result and (created_by=actor or public.is_vehicle_owner(result));
  if not found then raise exception 'VEHICLE_UPDATE_NOT_CONFIRMED'; end if;
  return result;
end; $$;
revoke all on function public.save_vehicle_v2(jsonb,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.save_vehicle_v2(jsonb,uuid,uuid,timestamptz) to authenticated;

drop function public.list_my_vehicles_v2();
create function public.list_my_vehicles_v2()
returns table(
  id uuid,nickname text,registration_number text,category text,subtype text,
  brand text,model text,model_year smallint,energy_type text,meter_mode text,timezone text,
  default_currency_code text,currency_catalog_version text,
  archived_at timestamptz,updated_at timestamptz,role text
) language sql stable security invoker set search_path='' as $$
  select v.id,v.nickname,v.registration_number,v.category,v.subtype,v.brand,
    v.model,v.model_year,v.energy_type,v.meter_mode,v.timezone,v.default_currency_code,
    v.currency_catalog_version,v.archived_at,v.updated_at,m.role
  from public.vehicles v
  join public.vehicle_members m on m.vehicle_id=v.id
  where m.user_id=auth.uid() and m.status='ACTIVE'
  order by v.created_at;
$$;
revoke all on function public.list_my_vehicles_v2() from public,anon;
grant execute on function public.list_my_vehicles_v2() to authenticated;
