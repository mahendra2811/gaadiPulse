-- Add powertrain configurations without rewriting any historical fuel transaction.
alter table public.vehicles drop constraint if exists vehicles_energy_type_check;
alter table public.vehicles add constraint vehicles_energy_type_check check (
 energy_type in ('DIESEL','PETROL','PETROL_CNG','PETROL_LPG','ELECTRIC','HYBRID','PLUGIN_HYBRID','DIESEL_HYBRID','CNG','LPG','HYDROGEN','OTHER')
);

-- Preserve existing normalization and expense validation while extending physical fuels.
create or replace function public.validate_ledger_shape() returns trigger language plpgsql set search_path='' as $$
 declare field text;normalized_items jsonb;
 begin
 if TG_TABLE_NAME='fuel_logs' then
 new.payload:=new.payload||jsonb_build_object('amount_paise',(new.payload->>'amount_paise')::bigint,'quantity',(new.payload->>'quantity')::numeric,'unit_price_paise',(new.payload->>'unit_price_paise')::bigint);
 if jsonb_typeof(new.payload->'is_full_tank') is distinct from 'boolean' or coalesce(new.payload->>'energy_type','') not in ('PETROL','DIESEL','ELECTRIC','CNG','LPG','HYDROGEN','HYBRID','OTHER') then raise exception 'INVALID_FUEL_SHAPE';end if;
 end if;
 if TG_TABLE_NAME='expenses' then
 new.payload:=new.payload||jsonb_build_object('amount_paise',(new.payload->>'amount_paise')::bigint,'principal_paise',(new.payload->>'principal_paise')::bigint,'interest_paise',(new.payload->>'interest_paise')::bigint);
 if exists(select 1 from jsonb_array_elements(new.payload->'items') item where nullif(trim(item->>'title'),'') is null) then raise exception 'INVALID_LINE_ITEM';end if;
 select coalesce(jsonb_agg(jsonb_build_object('title',trim(item->>'title'),'amount_paise',(item->>'amount_paise')::bigint)),'[]') into normalized_items from jsonb_array_elements(new.payload->'items') item;new.payload:=jsonb_set(new.payload,'{items}',normalized_items);
 end if;
 foreach field in array array['km','hours'] loop
 if new.payload->>field is not null and (jsonb_typeof(new.payload->field)<>'number' or (new.payload->>field)::numeric<0) then raise exception 'INVALID_READING';end if;end loop;
 return new;end; $$;

create function public.enforce_vehicle_fuel_profile() returns trigger language plpgsql security definer set search_path='' as $$
 declare profile text; fuel text:=new.payload->>'energy_type'; units text:=new.payload->>'unit'; allowed text[];
 begin
 select energy_type into profile from public.vehicles where id=new.vehicle_id for share;
 if not found then raise exception 'INVALID_VEHICLE';end if;
 if units is distinct from case when fuel='ELECTRIC' then 'KWH' when fuel in ('CNG','HYDROGEN') then 'KG' else 'L' end then raise exception 'FUEL_UNIT_INVALID';end if;
 -- Existing transactions may retain their original physical fuel after a vehicle edit.
 -- Changing that type must comply with the current configuration.
 if TG_OP='UPDATE' then
   if old.vehicle_id=new.vehicle_id and old.payload->>'energy_type'=fuel and old.payload->>'unit'=units then return new;end if;
 end if;
 allowed:=case profile
   when 'PETROL_CNG' then array['PETROL','CNG']
   when 'PETROL_LPG' then array['PETROL','LPG']
   when 'HYBRID' then array['PETROL']
   when 'DIESEL_HYBRID' then array['DIESEL']
   when 'PLUGIN_HYBRID' then array['PETROL','ELECTRIC']
   else array[profile] end;
 if fuel is null or not(fuel=any(allowed)) then raise exception 'VEHICLE_FUEL_MISMATCH';end if;
 return new;
 end; $$;
create trigger enforce_vehicle_fuel_profile before insert or update on public.fuel_logs for each row execute function public.enforce_vehicle_fuel_profile();
revoke all on function public.enforce_vehicle_fuel_profile() from public,anon,authenticated;
revoke all on function public.validate_ledger_shape() from public,anon,authenticated;
