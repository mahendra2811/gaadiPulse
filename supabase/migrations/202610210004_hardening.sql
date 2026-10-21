-- Additive grant reassignment, locked refresh and meter correction hardening.
create or replace function public.resolve_my_access_grants() returns void language plpgsql security definer set search_path='' as $$
 declare actor uuid:=public.require_verified(); address text; g public.vehicle_access_grants;
 begin select lower(trim(email)) into address from auth.users where id=actor;
 for g in select * from public.vehicle_access_grants where normalized_email=address and status='UNRESOLVED' order by vehicle_id loop
 perform 1 from public.vehicles where id=g.vehicle_id for update;
 select * into g from public.vehicle_access_grants where id=g.id and status='UNRESOLVED' for update;
 if not found then continue; end if;
 -- Primary admin cannot be downgraded by an email grant.
 if not exists(select 1 from public.vehicle_members where vehicle_id=g.vehicle_id and user_id=actor and is_primary_admin) then
 insert into public.vehicle_members(vehicle_id,user_id,role,permission_overrides,created_by) values(g.vehicle_id,actor,g.desired_role,g.permission_overrides,g.granted_by)
 on conflict(vehicle_id,user_id) do update set role=excluded.role,status='ACTIVE',permission_overrides=excluded.permission_overrides;
 end if;
 update public.vehicle_access_grants set status='RESOLVED',resolved_user_id=actor where id=g.id;
 insert into public.audit_events(vehicle_id,actor_id,action) values(g.vehicle_id,actor,'GRANT_RESOLVED');
 end loop; end; $$;
create or replace function public.grant_vehicle_access(p_vehicle uuid,p_email text,p_role text,p_permissions jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
 declare address text:=lower(trim(p_email)); target uuid; grant_id uuid; previous_target uuid;
 begin perform public.require_verified(); perform 1 from public.vehicles where id=p_vehicle for update;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
 if (select count(*) from public.audit_events where vehicle_id=p_vehicle and actor_id=auth.uid() and action='ACCESS_GRANTED' and created_at>now()-interval '1 hour')>=30 then raise exception 'RATE_LIMIT'; end if;
 select resolved_user_id into previous_target from public.vehicle_access_grants where vehicle_id=p_vehicle and normalized_email=address and status<>'REVOKED' for update;
 insert into public.vehicle_access_grants(vehicle_id,normalized_email,desired_role,permission_overrides,granted_by) values(p_vehicle,address,p_role,p_permissions,auth.uid())
 on conflict(vehicle_id,normalized_email) where status<>'REVOKED' do update set desired_role=excluded.desired_role,permission_overrides=excluded.permission_overrides,status='UNRESOLVED',resolved_user_id=null returning id into grant_id;
 select id into target from auth.users where lower(trim(email))=address and email_confirmed_at is not null;
 if previous_target is not null and previous_target is distinct from target then perform public.set_vehicle_membership(p_vehicle,previous_target,'PILOT','REVOKED');end if;
 if target is not null then
 perform public.set_vehicle_membership(p_vehicle,target,p_role,'ACTIVE',p_permissions);
 update public.vehicle_access_grants set status='RESOLVED',resolved_user_id=target where id=grant_id;
 end if;
 insert into public.audit_events(vehicle_id,actor_id,action) values(p_vehicle,auth.uid(),'ACCESS_GRANTED'); end; $$;
create or replace function public.latest_meter_readings(p_vehicle uuid) returns setof public.meter_readings language sql stable security invoker set search_path='' as $$
 select distinct on(reading_type) * from public.meter_readings where vehicle_id=p_vehicle and status='ACTIVE' order by reading_type,observed_at desc,entered_at desc; $$;
alter table public.meter_readings add column supersedes uuid references public.meter_readings(id);
create function public.correct_meter_observation(p_vehicle uuid,p_reading uuid,p_expected numeric,p_value numeric,p_reason text,p_operation uuid) returns uuid language plpgsql security definer set search_path='' as $$
 declare original public.meter_readings;target uuid;field text;tbl text;receipt public.record_operation_receipts;request_hash text:=md5(p_reading::text||p_expected::text||coalesce(p_value::text,'RETRACT')||p_reason);
 begin perform public.require_verified();perform 1 from public.vehicles where id=p_vehicle for update;
 if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operation::text,0));select * into receipt from public.record_operation_receipts where operation_id=p_operation and user_id=auth.uid();if found then if receipt.kind<>'meter_correction' or receipt.vehicle_id<>p_vehicle or receipt.payload_hash<>request_hash then raise exception 'INVALID_OPERATION';end if;return receipt.entity_id;end if;
 select * into original from public.meter_readings where id=p_reading and vehicle_id=p_vehicle for update;
 if p_expected is null or original.id is null or original.status<>'ACTIVE' or original.value<>p_expected then raise exception 'METER_READING_CONFLICT';end if;
 if p_value is not null and (p_value='NaN'::numeric or p_value<0 or p_value<>round(p_value,3)) then raise exception 'INVALID_READING';end if;
 if length(trim(coalesce(p_reason,''))) not between 1 and 3000 then raise exception 'REASON_REQUIRED';end if;
 update public.meter_readings set status='CORRECTED' where id=p_reading;
 if p_value is not null then
 insert into public.meter_readings(vehicle_id,reading_type,value,observed_at,source,created_by,is_reset,notes,supersedes) values(p_vehicle,original.reading_type,p_value,original.observed_at,'MANUAL',auth.uid(),original.is_reset,p_reason,p_reading) returning id into target;
 else target:=p_reading;end if;
 field:=case original.reading_type when 'KM' then 'km' else 'hours' end;
 foreach tbl in array array['fuel_logs','expenses','meter_events','daily_progress'] loop
 -- Compare instants: persisted ISO values may use either Z or +00:00.
 execute format('update public.%I set payload=jsonb_set(payload,ARRAY[$1],coalesce(to_jsonb($2::numeric),''null''::jsonb)),revision=revision+1,updated_at=clock_timestamp() where vehicle_id=$3 and nullif(payload->>''reading_at'','''')::timestamptz=$4 and (payload->>$1)::numeric=$5',tbl) using field,p_value,p_vehicle,original.observed_at,original.value;
 execute format('update public.%I set payload=jsonb_set(payload,''{reading_at}'',''null''::jsonb) where vehicle_id=$1 and payload->>''km'' is null and payload->>''hours'' is null and nullif(payload->>''reading_at'','''')::timestamptz=$2',tbl) using p_vehicle,original.observed_at;
 end loop;
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,auth.uid(),'METER_CORRECTED',jsonb_build_object('reading',p_reading,'replacement',target,'before',original.value,'after',p_value,'reason',p_reason));
 insert into public.record_operation_receipts(operation_id,user_id,vehicle_id,kind,entity_id,payload_hash) values(p_operation,auth.uid(),p_vehicle,'meter_correction',target,request_hash);return target;end; $$;
revoke all on function public.correct_meter_observation(uuid,uuid,numeric,numeric,text,uuid) from public,anon;grant execute on function public.correct_meter_observation(uuid,uuid,numeric,numeric,text,uuid) to authenticated;

alter table public.meter_readings add constraint meter_value_finite check(value<>'NaN'::numeric);
-- Standard metadata and provenance invariants apply even to direct RPC clients.
create function public.guard_record_payload() returns trigger language plpgsql set search_path='' as $$
 begin
 new.payload:='{"km":null,"hours":null,"reading_at":null,"metadata":{},"items":[],"principal_paise":null,"interest_paise":null}'::jsonb||new.payload;
 if length(coalesce(new.payload->>'notes',''))>3000 or length(coalesce(new.payload->>'title',''))>160 then raise exception 'INVALID_TEXT_LENGTH';end if;
 if new.payload->'metadata' is not null and jsonb_typeof(new.payload->'metadata')<>'object' then raise exception 'INVALID_METADATA';end if;
 if TG_TABLE_NAME='fuel_logs' and new.status<>'ARCHIVED' and new.payload->>'reading_at' is not null and (new.payload->>'reading_at')::timestamptz=(new.payload->>'event_at')::timestamptz and not coalesce((new.payload->>'confirmed_observation')::boolean,false) then raise exception 'OBSERVATION_CONFIRMATION_REQUIRED';end if;
 if TG_TABLE_NAME='documents' and coalesce(new.payload->>'category','OTHER') not in ('RC','INSURANCE','PUC','PERMIT','FITNESS','TAX','LOAN','OTHER') then raise exception 'INVALID_DOCUMENT_CATEGORY';end if;
 return new;end; $$;
DO $$ declare tbl text;begin foreach tbl in array array['fuel_logs','expenses','meter_events','reminders','documents','daily_progress'] loop execute format('create trigger guard_record_payload before insert or update on public.%I for each row execute function public.guard_record_payload()',tbl);end loop;end $$;
revoke all on function public.guard_record_payload() from public,anon,authenticated;
grant select,update on public.account_deletion_requests to service_role;
grant select,update on public.profiles to service_role;
create function public.validate_permission_map() returns trigger language plpgsql set search_path='' as $$
 declare permissions jsonb;item record;
 begin permissions:=to_jsonb(new)->case when TG_TABLE_NAME='vehicle_settings' then 'pilot_permissions' else 'permission_overrides' end;
 if jsonb_typeof(permissions) is distinct from 'object' then raise exception 'INVALID_PERMISSIONS';end if;
 for item in select * from jsonb_each(permissions) loop
 if jsonb_typeof(item.value)<>'boolean' or item.key not in ('fuel.read','fuel.create','fuel.edit_own','expenses.read','expenses.create','expenses.edit_own','meters.read','meters.create','documents.read','documents.create','reminders.read','reminders.create','progress.view','progress.submit','progress.edit_own','reports.read') then raise exception 'INVALID_PERMISSION';end if;end loop;return new;end; $$;
create trigger validate_member_permissions before insert or update on public.vehicle_members for each row execute function public.validate_permission_map();
create trigger validate_grant_permissions before insert or update on public.vehicle_access_grants for each row execute function public.validate_permission_map();
create trigger validate_default_permissions before insert or update on public.vehicle_settings for each row execute function public.validate_permission_map();
revoke all on function public.validate_permission_map() from public,anon,authenticated;

create or replace function public.add_observations(p_vehicle uuid,p_payload jsonb,p_source text,p_entity uuid) returns void language plpgsql security definer set search_path='' as $$
 declare kind text; raw text; stamp timestamptz; existing numeric; resetting boolean:=coalesce((p_payload->>'is_reset')::boolean,false);
 begin if resetting and not public.is_vehicle_owner(p_vehicle) then raise exception 'OWNER_REQUIRED';end if;
 foreach kind in array array['KM','HOURS'] loop raw:=p_payload->>case when kind='KM' then 'km' else 'hours' end;
 if raw is not null and raw<>'' then
 if raw !~ '^[0-9]+(\.[0-9]{1,3})?$' then raise exception 'INVALID_READING';end if;
 stamp:=(p_payload->>'reading_at')::timestamptz;if stamp is null or stamp>now() then raise exception 'INVALID_OBSERVATION_TIME';end if;
 select value into existing from public.meter_readings where vehicle_id=p_vehicle and reading_type=kind and observed_at=stamp and status='ACTIVE';
 if found then if existing<>raw::numeric then raise exception 'METER_READING_CONFLICT';end if;else
 insert into public.meter_readings(vehicle_id,reading_type,value,observed_at,source,created_by,linked_entity_type,linked_entity_id,is_reset,notes) values(p_vehicle,kind,raw::numeric,stamp,p_source,auth.uid(),p_source,p_entity,resetting,case when p_source='MANUAL' then coalesce(p_payload->>'notes','') else '' end);
 end if;end if;end loop;end; $$;
update public.meter_readings set notes='' where source in ('FUEL','EXPENSE','PROGRESS');
create function public.validate_ledger_shape() returns trigger language plpgsql set search_path='' as $$
 declare field text;normalized_items jsonb;
 begin
 if TG_TABLE_NAME='fuel_logs' then
 new.payload:=new.payload||jsonb_build_object('amount_paise',(new.payload->>'amount_paise')::bigint,'quantity',(new.payload->>'quantity')::numeric,'unit_price_paise',(new.payload->>'unit_price_paise')::bigint);
 if jsonb_typeof(new.payload->'is_full_tank') is distinct from 'boolean' or coalesce(new.payload->>'energy_type','') not in ('PETROL','DIESEL','ELECTRIC','CNG','HYBRID','OTHER') then raise exception 'INVALID_FUEL_SHAPE';end if;
 end if;
 if TG_TABLE_NAME='expenses' then
 new.payload:=new.payload||jsonb_build_object('amount_paise',(new.payload->>'amount_paise')::bigint,'principal_paise',(new.payload->>'principal_paise')::bigint,'interest_paise',(new.payload->>'interest_paise')::bigint);
 if exists(select 1 from jsonb_array_elements(new.payload->'items') item where nullif(trim(item->>'title'),'') is null) then raise exception 'INVALID_LINE_ITEM';end if;
 select coalesce(jsonb_agg(jsonb_build_object('title',trim(item->>'title'),'amount_paise',(item->>'amount_paise')::bigint)),'[]') into normalized_items from jsonb_array_elements(new.payload->'items') item;new.payload:=jsonb_set(new.payload,'{items}',normalized_items);
 end if;
 foreach field in array array['km','hours'] loop
 if new.payload->>field is not null and (jsonb_typeof(new.payload->field)<>'number' or (new.payload->>field)::numeric<0) then raise exception 'INVALID_READING';end if;end loop;
 return new;end; $$;
DO $$ declare tbl text;begin foreach tbl in array array['fuel_logs','expenses','meter_events','daily_progress'] loop execute format('create trigger validate_ledger_shape before insert or update on public.%I for each row execute function public.validate_ledger_shape()',tbl);end loop;end $$;
revoke all on function public.validate_ledger_shape() from public,anon,authenticated;
-- Notes visibility and default answers are validated with the same immutable field rules.
create function public.validate_published_form_defaults() returns trigger language plpgsql set search_path='' as $$
 declare field jsonb;
 begin
 if not coalesce((new.definition->>'notes_visible')::boolean,true) and coalesce((new.definition->>'notes_required')::boolean,false) then raise exception 'INVALID_NOTES_POLICY';end if;
 for field in select * from jsonb_array_elements(new.definition->'fields') loop if field->'default_value' is not null and field->'default_value'<>'null'::jsonb then perform public.validate_progress_answers(jsonb_build_object('fields',jsonb_build_array(field||'{"required":false}')),jsonb_build_object(field->>'id',field->'default_value'),true);end if;end loop;return new;end; $$;
create trigger validate_published_form_defaults before insert on public.progress_form_versions for each row execute function public.validate_published_form_defaults();
revoke all on function public.validate_published_form_defaults() from public,anon,authenticated;
alter table public.operation_receipts add column payload_hash text;

create or replace function public.save_vehicle(p_data jsonb,p_operation uuid,p_id uuid default null,p_expected timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
 declare actor uuid:=public.require_verified(); v uuid; old public.vehicles; mode text:=p_data->>'meter_mode'; kind text; raw text;stored_hash text;request_hash text:=md5(p_data::text||coalesce(p_id::text,'')||coalesce(p_expected::text,''));
 begin
 perform pg_advisory_xact_lock(hashtextextended(p_operation::text,0));
 select vehicle_id,payload_hash into v,stored_hash from public.operation_receipts where operation_id=p_operation and user_id=actor;
 if found then if stored_hash is null then raise exception 'LEGACY_OPERATION_REVIEW_REQUIRED';end if;if stored_hash<>request_hash then raise exception 'INVALID_OPERATION';end if;if not public.is_vehicle_member(v) then raise exception 'PERMISSION_DENIED'; end if; return v; end if;
 if not exists(select 1 from pg_timezone_names where name=p_data->>'timezone') then raise exception 'INVALID_TIMEZONE'; end if;
 if p_id is null then
 insert into public.vehicles(created_by,nickname,registration_number,category,subtype,brand,model,energy_type,meter_mode,default_meter_unit,timezone)
 values(actor,trim(p_data->>'nickname'),nullif(regexp_replace(upper(p_data->>'registration_number'),'[^A-Z0-9]','','g'),''),p_data->>'category',p_data->>'subtype',p_data->>'brand',p_data->>'model',p_data->>'energy_type',mode,case when mode='HOURS' then 'HOURS' else 'KM' end,p_data->>'timezone') returning id into v;
 insert into public.vehicle_members(vehicle_id,user_id,role,is_primary_admin,created_by) values(v,actor,'OWNER',true,actor);
 insert into public.vehicle_settings(vehicle_id) values(v);
 else
 select * into old from public.vehicles where id=p_id for update;
 if not public.is_vehicle_owner(p_id) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if old.updated_at is distinct from p_expected then raise exception 'CONFLICT'; end if;
 v:=p_id;
 update public.vehicles set nickname=trim(p_data->>'nickname'),registration_number=nullif(regexp_replace(upper(p_data->>'registration_number'),'[^A-Z0-9]','','g'),''), category=p_data->>'category',subtype=p_data->>'subtype',brand=p_data->>'brand',model=p_data->>'model',energy_type=p_data->>'energy_type',meter_mode=mode,timezone=p_data->>'timezone',updated_at=clock_timestamp() where id=v;
 end if;
 if p_id is null then
 foreach kind in array array['KM','HOURS'] loop
 raw:=p_data->>case when kind='KM' then 'km' else 'hours' end;
 if nullif(raw,'') is not null and (mode=kind or mode='BOTH') then if raw !~ '^[0-9]+(\.[0-9]{1,3})?$' then raise exception 'INVALID_READING';end if;
 insert into public.meter_readings(vehicle_id,reading_type,value,observed_at,source,created_by) values(v,kind,raw::numeric,(p_data->>'observed_at')::timestamptz,'MANUAL',actor);
 end if; end loop; end if;
 insert into public.operation_receipts(operation_id,user_id,vehicle_id,payload_hash) values(p_operation,actor,v,request_hash);
 insert into public.audit_events(vehicle_id,actor_id,action) values(v,actor,case when p_id is null then 'VEHICLE_CREATED' else 'VEHICLE_UPDATED' end);
 return v; end; $$;
create function public.complete_account_anonymization(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
 begin
 if auth.role()<>'service_role' then raise exception 'PERMISSION_DENIED';end if;
 perform 1 from public.account_deletion_requests where user_id=p_user for update;if not found then raise exception 'DELETION_REQUEST_REQUIRED';end if;
 delete from auth.refresh_tokens where user_id::text=p_user::text;
 delete from auth.sessions where user_id=p_user;
 delete from auth.identities where user_id=p_user;
 update auth.users set raw_user_meta_data='{}',raw_app_meta_data='{}',phone=null where id=p_user;
 update public.profiles set display_name='Deleted account' where id=p_user;
 update public.vehicle_access_grants set normalized_email='deleted+'||p_user::text||'@account.invalid' where resolved_user_id=p_user;
 update public.account_deletion_requests set completed_at=now() where user_id=p_user;
 end; $$;
revoke all on function public.complete_account_anonymization(uuid) from public,anon,authenticated;
grant execute on function public.complete_account_anonymization(uuid) to service_role;
