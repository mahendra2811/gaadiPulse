-- Ledger records use separate RLS scopes: create permission never implies financial read.
alter table public.meter_readings add column is_reset boolean not null default false;
alter table public.meter_readings add column status text not null default 'ACTIVE' check(status in ('ACTIVE','CORRECTED'));
alter table public.meter_readings add column notes text not null default '';
create unique index unique_active_meter_observation on public.meter_readings(vehicle_id,reading_type,observed_at) where status='ACTIVE';
DO $$ declare t text; begin foreach t in array array['fuel_logs','expenses','meter_events','reminders','documents','daily_progress'] loop
 execute format('create table public.%I (id uuid primary key, vehicle_id uuid not null references public.vehicles(id), created_by uuid not null references auth.users(id), revision integer not null default 1, status text not null default ''ACTIVE'', payload jsonb not null check(jsonb_typeof(payload)=''object''), client_operation_id uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(vehicle_id,client_operation_id))',t);
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create index on public.%I(vehicle_id,created_at desc)',t);
 end loop; end $$;
alter table public.fuel_logs add column amount_paise bigint generated always as ((payload->>'amount_paise')::bigint) stored;
alter table public.fuel_logs add column quantity numeric generated always as ((payload->>'quantity')::numeric) stored;
alter table public.fuel_logs add constraint fuel_money_positive check(amount_paise>0 and quantity>0);
alter table public.expenses add column amount_paise bigint generated always as ((payload->>'amount_paise')::bigint) stored;
alter table public.expenses add constraint expense_money_positive check(amount_paise>0);
create table public.expense_items(id uuid primary key default gen_random_uuid(),expense_id uuid not null references public.expenses(id),title text not null,amount_paise bigint not null check(amount_paise>0));
create table public.maintenance_records(id uuid primary key default gen_random_uuid(),vehicle_id uuid not null references public.vehicles(id),expense_id uuid not null unique references public.expenses(id),details jsonb not null default '{}');
create table public.expense_categories(id uuid primary key default gen_random_uuid(),vehicle_id uuid not null references public.vehicles(id),label text not null check(length(trim(label)) between 1 and 60),unique(vehicle_id,label));
alter table public.expense_items enable row level security;alter table public.maintenance_records enable row level security;alter table public.expense_categories enable row level security;
revoke all on public.expense_items,public.maintenance_records,public.expense_categories from public,anon,authenticated;
grant select on public.expense_items,public.maintenance_records,public.expense_categories to authenticated;
create policy fuel_read on public.fuel_logs for select to authenticated using(public.has_vehicle_permission(vehicle_id,'fuel.read'));
create policy expense_read on public.expenses for select to authenticated using(public.has_vehicle_permission(vehicle_id,'expenses.read'));
create policy meter_events_read on public.meter_events for select to authenticated using(public.has_vehicle_permission(vehicle_id,'meters.read'));
create policy reminders_read on public.reminders for select to authenticated using(public.has_vehicle_permission(vehicle_id,'reminders.read'));
create policy documents_read on public.documents for select to authenticated using(public.has_vehicle_permission(vehicle_id,'documents.read'));
create policy progress_read on public.daily_progress for select to authenticated using(public.has_vehicle_permission(vehicle_id,'progress.view') and (created_by=auth.uid() or public.is_vehicle_owner(vehicle_id)));
create policy items_read on public.expense_items for select to authenticated using(exists(select 1 from public.expenses e where e.id=expense_id));
create policy maintenance_read on public.maintenance_records for select to authenticated using(public.has_vehicle_permission(vehicle_id,'expenses.read'));
create policy categories_read on public.expense_categories for select to authenticated using(public.is_vehicle_member(vehicle_id));
create function public.vehicle_access(p_vehicle uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb:='{}'; key text;
 begin if not public.is_vehicle_member(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 foreach key in array array['fuel.read','fuel.create','fuel.edit_own','expenses.read','expenses.create','expenses.edit_own','meters.read','meters.create','documents.read','documents.create','reminders.read','reminders.create','progress.view','progress.submit','progress.edit_own','reports.read'] loop result:=result||jsonb_build_object(key,public.has_vehicle_permission(p_vehicle,key));end loop;
 return result||jsonb_build_object('owner',public.is_vehicle_owner(p_vehicle));end; $$;
create function public.add_observations(p_vehicle uuid,p_payload jsonb,p_source text,p_entity uuid) returns void language plpgsql security definer set search_path='' as $$
 declare kind text; raw text; stamp timestamptz; existing numeric; resetting boolean:=coalesce((p_payload->>'is_reset')::boolean,false);
 begin if resetting and not public.is_vehicle_owner(p_vehicle) then raise exception 'OWNER_REQUIRED';end if;
 foreach kind in array array['KM','HOURS'] loop raw:=p_payload->>case when kind='KM' then 'km' else 'hours' end;
 if raw is not null and raw<>'' then
 stamp:=(p_payload->>'reading_at')::timestamptz;if stamp is null or stamp>now() then raise exception 'INVALID_OBSERVATION_TIME';end if;
 select value into existing from public.meter_readings where vehicle_id=p_vehicle and reading_type=kind and observed_at=stamp and status='ACTIVE';
 if found then if existing<>raw::numeric then raise exception 'METER_READING_CONFLICT';end if;else
 insert into public.meter_readings(vehicle_id,reading_type,value,observed_at,source,created_by,linked_entity_type,linked_entity_id,is_reset,notes) values(p_vehicle,kind,raw::numeric,stamp,p_source,auth.uid(),p_source,p_entity,resetting,coalesce(p_payload->>'notes',''));
 end if;end if;end loop;end; $$;
create table public.record_operation_receipts(operation_id uuid primary key,user_id uuid not null references auth.users(id),vehicle_id uuid not null references public.vehicles(id),kind text not null,entity_id uuid not null,payload_hash text not null,created_at timestamptz not null default now());
alter table public.record_operation_receipts enable row level security;revoke all on public.record_operation_receipts from public,anon,authenticated;
create function public.save_record(p_kind text,p_vehicle uuid,p_payload jsonb,p_operation uuid,p_id uuid default null,p_expected integer default null,p_status text default 'ACTIVE') returns uuid language plpgsql security definer set search_path='' as $$
 declare actor uuid:=public.require_verified();target uuid:=coalesce(p_id,p_operation);tbl text;prefix text;old_actor uuid;rev integer;stored jsonb;item jsonb;total bigint:=0;amount bigint;receipt public.record_operation_receipts;request_hash text:=md5(p_payload::text||p_status||coalesce(p_id::text,'')||coalesce(p_expected::text,''));
 begin
 if p_kind not in ('fuel','expenses','meters','reminders','documents','progress') then raise exception 'INVALID_KIND';end if;
 tbl:=case p_kind when 'fuel' then 'fuel_logs' when 'meters' then 'meter_events' when 'progress' then 'daily_progress' else p_kind end;
 prefix:=case p_kind when 'progress' then 'progress' else p_kind end;
 perform 1 from public.vehicles where id=p_vehicle and archived_at is null for update;if not found then raise exception 'VEHICLE_NOT_FOUND_OR_FORBIDDEN';end if;
 if not public.is_vehicle_member(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operation::text,0));
 select * into receipt from public.record_operation_receipts where operation_id=p_operation and user_id=actor;
 if found then if receipt.vehicle_id<>p_vehicle or receipt.kind<>p_kind or receipt.payload_hash<>request_hash then raise exception 'INVALID_OPERATION';end if;return receipt.entity_id;end if;
 if p_status not in ('ACTIVE','ARCHIVED','COMPLETED','SNOOZED','SUBMITTED') then raise exception 'INVALID_STATUS';end if;
 if p_id is null then
 if not public.has_vehicle_permission(p_vehicle,case when p_kind='progress' then 'progress.submit' else prefix||'.create' end) then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 else
 execute format('select created_by,revision,payload from public.%I where id=$1 and vehicle_id=$2 for update',tbl) into old_actor,rev,stored using p_id,p_vehicle;
 if rev is null then raise exception 'RECORD_NOT_FOUND_OR_FORBIDDEN';end if;
 if p_expected is null or rev<>p_expected then raise exception 'CONFLICT';end if;
 if not public.is_vehicle_owner(p_vehicle) and (old_actor<>actor or not public.has_vehicle_permission(p_vehicle,prefix||'.edit_own') or p_kind not in ('fuel','expenses','progress')) then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 end if;
 if p_kind='progress' then raise exception 'USE_SUBMIT_PROGRESS';end if;
 if p_kind<>'reminders' and p_status not in ('ACTIVE','ARCHIVED') then raise exception 'INVALID_STATUS';end if;
 if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>65536 then raise exception 'INVALID_PAYLOAD';end if;
 if p_kind in ('fuel','expenses') then
 amount:=(p_payload->>'amount_paise')::bigint;if amount is null or amount<=0 or amount>9007199254740991 then raise exception 'AMOUNT_INVALID';end if;
 if p_payload->>'event_at' is null or (p_payload->>'event_at')::timestamptz>now() then raise exception 'FUTURE_TRANSACTION';end if;
 end if;
 if p_kind='fuel' then
 if p_payload->>'energy_type'='ELECTRIC' and p_payload->>'unit'<>'KWH' or p_payload->>'energy_type'='CNG' and p_payload->>'unit'<>'KG' or p_payload->>'energy_type' in ('PETROL','DIESEL','HYBRID') and p_payload->>'unit'<>'L' then raise exception 'FUEL_UNIT_INVALID';end if;
 if p_payload->>'quantity' is null or p_payload->>'unit_price_paise' is null or p_payload->>'unit' is null or (p_payload->>'quantity')::numeric<=0 or (p_payload->>'quantity')::numeric>1000000 or (p_payload->>'unit_price_paise')::bigint<=0 or p_payload->>'unit' not in ('L','KG','KWH') then raise exception 'FUEL_INVALID';end if;
 if abs(amount-round((p_payload->>'quantity')::numeric*(p_payload->>'unit_price_paise')::bigint))>greatest(1,ceil((p_payload->>'quantity')::numeric/2)) then raise exception 'FUEL_VALUES_INCONSISTENT';end if;
 end if;
 if p_kind='expenses' then
 if length(trim(coalesce(p_payload->>'title','')))=0 then raise exception 'TITLE_REQUIRED';end if;
 if coalesce(p_payload->>'category','') not in ('SERVICE','REPAIR','TYRES','BATTERY','INSURANCE','EMI','DOCUMENTS','TOLL','PARKING','WASH','ACCESSORIES','TAX_PERMIT','FINE','OTHER') and not exists(select 1 from public.expense_categories where vehicle_id=p_vehicle and label=p_payload->>'category') then raise exception 'INVALID_CATEGORY';end if;
 if coalesce((p_payload->>'principal_paise')::bigint,0)<0 or coalesce((p_payload->>'interest_paise')::bigint,0)<0 or coalesce((p_payload->>'principal_paise')::bigint,0)+coalesce((p_payload->>'interest_paise')::bigint,0)>amount then raise exception 'EMI_BREAKDOWN_INVALID';end if;
 if jsonb_typeof(coalesce(p_payload->'items','[]'))<>'array' then raise exception 'ITEMS_INVALID';end if;
 for item in select * from jsonb_array_elements(coalesce(p_payload->'items','[]')) loop total:=total+(item->>'amount_paise')::bigint;end loop;
 if jsonb_array_length(coalesce(p_payload->'items','[]'))>0 and total<>amount then raise exception 'LINE_ITEMS_MISMATCH';end if;
 end if;
 if p_kind in ('documents','reminders') and length(trim(coalesce(p_payload->>'title','')))=0 then raise exception 'TITLE_REQUIRED';end if;
 if p_kind in ('documents','reminders') then
 if nullif(p_payload->>'due_at','') is not null then perform (p_payload->>'due_at')::timestamptz;end if;
 if nullif(p_payload->>'threshold_km','') is not null and (p_payload->>'threshold_km')::numeric<0 or nullif(p_payload->>'threshold_hours','') is not null and (p_payload->>'threshold_hours')::numeric<0 then raise exception 'INVALID_THRESHOLD';end if;
 if p_kind='reminders' and coalesce(p_payload->>'recurrence','NONE') not in ('NONE','MONTHLY','YEARLY') then raise exception 'INVALID_RECURRENCE';end if;
 end if;
 if p_kind='meters' and p_payload->>'km' is null and p_payload->>'hours' is null then raise exception 'READING_REQUIRED';end if;
 if p_id is null then execute format('insert into public.%I(id,vehicle_id,created_by,payload,client_operation_id,status) values($1,$2,$3,$4,$5,$6)',tbl) using target,p_vehicle,actor,p_payload,p_operation,p_status;
 else execute format('update public.%I set payload=$1,status=$2,revision=revision+1,updated_at=clock_timestamp() where id=$3',tbl) using p_payload,p_status,target;end if;
 if p_kind in ('fuel','expenses','meters') and p_status<>'ARCHIVED' then
 if p_id is not null then update public.meter_readings set status='CORRECTED' where linked_entity_id=target and status='ACTIVE';end if;
 perform public.add_observations(p_vehicle,p_payload,case p_kind when 'fuel' then 'FUEL' when 'expenses' then 'EXPENSE' else 'MANUAL' end,target);
 end if;
 if p_kind='expenses' then
 delete from public.expense_items where expense_id=target;
 for item in select * from jsonb_array_elements(coalesce(p_payload->'items','[]')) loop insert into public.expense_items(expense_id,title,amount_paise) values(target,item->>'title',(item->>'amount_paise')::bigint);end loop;
 if p_payload->>'category' in ('SERVICE','REPAIR','TYRES','BATTERY') then insert into public.maintenance_records(vehicle_id,expense_id,details) values(p_vehicle,target,p_payload->'metadata') on conflict(expense_id) do update set details=excluded.details;end if;
 end if;
 insert into public.record_operation_receipts(operation_id,user_id,vehicle_id,kind,entity_id,payload_hash) values(p_operation,actor,p_vehicle,p_kind,target,request_hash);
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,actor,upper(p_kind)||'_SAVED',jsonb_build_object('id',target,'before',stored,'after',p_payload,'status',p_status));
 return target;end; $$;
revoke all on function public.vehicle_access(uuid),public.add_observations(uuid,jsonb,text,uuid),public.save_record(text,uuid,jsonb,uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.vehicle_access(uuid),public.save_record(text,uuid,jsonb,uuid,uuid,integer,text) to authenticated;
