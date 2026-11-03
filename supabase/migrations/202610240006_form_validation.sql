-- Additive validation and linked reminder records. Notification delivery is unchanged.
create function public.form_calendar_date(p_value text) returns boolean language plpgsql immutable set search_path='' as $$
 begin
 if p_value is null or p_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false;end if;
 return to_char(p_value::date,'YYYY-MM-DD')=p_value;
 exception when others then return false;
 end; $$;
create function public.form_timestamp(p_value text) returns boolean language plpgsql immutable set search_path='' as $$
 begin
 if p_value is null or p_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' then return false;end if;
 perform p_value::timestamptz;return true;
 exception when others then return false;
 end; $$;
create function public.form_deadline(p_value text,p_zone text) returns timestamptz language plpgsql stable set search_path='' as $$
 begin
 if nullif(p_value,'') is null then return null;end if;
 if public.form_calendar_date(p_value) then return (p_value::date+time '09:00') at time zone p_zone;end if;
 if not public.form_timestamp(p_value) then raise exception 'INVALID_DUE_DATE';end if;
 return p_value::timestamptz;
 end; $$;
create function public.validate_entry_fields() returns trigger language plpgsql set search_path='' as $$
 declare p jsonb:=new.payload;m jsonb:=coalesce(p->'metadata','{}');k text;raw text;has_reading boolean;thresholds boolean;due text;mode text;
 begin
 if new.status='ARCHIVED' then return new;end if;
 select meter_mode into mode from public.vehicles where id=new.vehicle_id;
 foreach k in array array['km','hours'] loop
 raw:=p->>k;
 if raw is not null and (raw !~ '^[0-9]+(\.[0-9]{1,3})?$' or raw::numeric>999999999999.999) then raise exception 'INVALID_READING';end if;
 if raw is not null and ((k='km' and mode='HOURS') or(k='hours' and mode='KM')) then
   if TG_OP='INSERT' then raise exception 'INVALID_METER_MODE';end if;
   if old.payload->>k is distinct from raw or old.payload->>'reading_at' is distinct from p->>'reading_at' then raise exception 'INVALID_LEGACY_OBSERVATION';end if;
 end if;
 end loop;
 has_reading:=p->>'km' is not null or p->>'hours' is not null;
 if has_reading and (not public.form_timestamp(p->>'reading_at') or (p->>'reading_at')::timestamptz>now()) then raise exception 'INVALID_OBSERVATION_TIME';end if;
 if TG_TABLE_NAME='meter_events' and not has_reading then raise exception 'READING_REQUIRED';end if;
 foreach k in array array['vendor','station_name','reference'] loop if length(coalesce(p->>k,''))>160 then raise exception 'INVALID_TEXT_LENGTH';end if;end loop;
 if TG_TABLE_NAME in ('fuel_logs','expenses') then
   if not public.form_timestamp(p->>'event_at') or (p->>'event_at')::timestamptz>now() then raise exception 'INVALID_EVENT_TIME';end if;
   if coalesce(p->>'payment_method','') not in ('CASH','UPI','CARD','BANK','OTHER') then raise exception 'INVALID_PAYMENT_METHOD';end if;
 end if;
 if TG_TABLE_NAME in ('documents','reminders') then
   if length(trim(coalesce(p->>'title','')))=0 then raise exception 'TITLE_REQUIRED';end if;
   due:=nullif(p->>'due_at','');
   if due is not null and not public.form_timestamp(due) then raise exception 'INVALID_DUE_DATE';end if;
 end if;
 if TG_TABLE_NAME='reminders' then
   thresholds:=nullif(p->>'threshold_km','') is not null or nullif(p->>'threshold_hours','') is not null;
   foreach k in array array['threshold_km','threshold_hours'] loop raw:=nullif(p->>k,'');
   if raw is not null and (raw !~ '^[0-9]+(\.[0-9]{1,3})?$' or raw::numeric<=0 or raw::numeric>999999999999.999) then raise exception 'INVALID_THRESHOLD';end if;end loop;
   if due is null and not thresholds then raise exception 'REMINDER_CRITERION_REQUIRED';end if;
   if coalesce(p->>'recurrence','NONE') not in ('NONE','MONTHLY','YEARLY') or (coalesce(p->>'recurrence','NONE')<>'NONE' and (due is null or thresholds)) then raise exception 'INVALID_RECURRENCE';end if;
 end if;
 if TG_TABLE_NAME='expenses' then
   if length(trim(coalesce(p->>'category','')))=0 or length(p->>'category')>60 then raise exception 'INVALID_CATEGORY';end if;
   foreach k in array array['start_date','expiry_date','next_date'] loop raw:=nullif(m->>k,'');
   if raw is not null and not public.form_calendar_date(raw) and not public.form_timestamp(raw) then raise exception 'INVALID_CALENDAR_DATE';end if;end loop;
   if nullif(m->>'start_date','') is not null and nullif(m->>'expiry_date','') is not null and left(m->>'expiry_date',10)<left(m->>'start_date',10) then raise exception 'INVALID_DATE_ORDER';end if;
   foreach k in array array['next_km','next_hours'] loop raw:=nullif(m->>k,'');
   if raw is not null and (raw !~ '^[0-9]+(\.[0-9]{1,3})?$' or raw::numeric<=0 or raw::numeric>999999999999.999) then raise exception 'INVALID_THRESHOLD';end if;end loop;
   if jsonb_array_length(coalesce(p->'items','[]'))>100 then raise exception 'INVALID_LINE_ITEMS';end if;
 end if;
 if TG_TABLE_NAME in ('documents','expenses') and m ? 'create_reminder' and jsonb_typeof(m->'create_reminder')<>'boolean' then raise exception 'INVALID_REMINDER_FLAG';end if;
 if coalesce((m->>'create_reminder')::boolean,false) then
   if TG_TABLE_NAME='documents' and due is null then raise exception 'REMINDER_DUE_REQUIRED';end if;
   if TG_TABLE_NAME='expenses' and (p->>'category'<>'EMI' or not public.form_timestamp(m->>'reminder_due_at') or coalesce(m->>'reminder_recurrence','MONTHLY') not in ('NONE','MONTHLY','YEARLY')) then raise exception 'REMINDER_DUE_REQUIRED';end if;
 end if;
 if TG_TABLE_NAME='daily_progress' and new.status in ('REJECTED','CORRECTION_REQUESTED') then
   if length(trim(coalesce(p->>'review_note','')))=0 or length(p->>'review_note')>3000 then raise exception 'REVIEW_REASON_REQUIRED';end if;
 end if;
 return new;
 end; $$;
DO $$ declare tbl text;begin foreach tbl in array array['fuel_logs','expenses','meter_events','documents','reminders','daily_progress'] loop execute format('create trigger validate_entry_fields before insert or update on public.%I for each row execute function public.validate_entry_fields()',tbl);end loop;end $$;

-- Keep source-linked reminders transactional and idempotent; optional links start Owner-only.
create function public.sync_source_reminder(p_vehicle uuid,p_source uuid,p_origin text,p_title text,p_due timestamptz,p_km text,p_hours text,p_recurrence text,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
 declare target public.reminders;key text:=case when p_origin='DOCUMENT' then 'document_id' else 'expense_id' end;next_payload jsonb;
 begin
 select * into target from public.reminders where vehicle_id=p_vehicle and payload->>'origin'=p_origin and payload->'metadata'->>key=p_source::text order by created_at limit 1 for update;
 if not p_enabled then
   if target.id is not null and target.status<>'ARCHIVED' then update public.reminders set status='ARCHIVED',revision=revision+1,updated_at=clock_timestamp() where id=target.id;
   insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,auth.uid(),'LINKED_REMINDER_ARCHIVED',jsonb_build_object('id',target.id,'source',p_source));end if;
   return;
 end if;
 next_payload:=coalesce(target.payload,'{}')||jsonb_build_object('title',p_title,'origin',p_origin,'due_at',p_due,'threshold_km',nullif(p_km,''),'threshold_hours',nullif(p_hours,''),'recurrence',p_recurrence,'pilot_visible',coalesce((target.payload->>'pilot_visible')::boolean,false),'metadata',jsonb_build_object(key,p_source));
 if target.id is not null and next_payload=target.payload and target.status<>'ARCHIVED' then return;end if;
 if not public.has_vehicle_permission(p_vehicle,'reminders.create') then raise exception 'PERMISSION_DENIED';end if;
 if target.id is null then
   insert into public.reminders(id,vehicle_id,created_by,client_operation_id,payload) values(gen_random_uuid(),p_vehicle,auth.uid(),gen_random_uuid(),next_payload) returning * into target;
 else update public.reminders set payload=next_payload,status='ACTIVE',revision=revision+1,updated_at=clock_timestamp() where id=target.id;end if;
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,auth.uid(),'LINKED_REMINDER_SAVED',jsonb_build_object('id',target.id,'source',p_source));
 end; $$;
create or replace function public.link_maintenance_reminder() returns trigger language plpgsql security definer set search_path='' as $$
 declare m jsonb:=coalesce(new.payload->'metadata','{}');zone text;schedule boolean;
 begin
 select timezone into zone from public.vehicles where id=new.vehicle_id;
 schedule:=new.status<>'ARCHIVED' and (nullif(m->>'next_date','') is not null or nullif(m->>'next_km','') is not null or nullif(m->>'next_hours','') is not null);
 perform public.sync_source_reminder(new.vehicle_id,new.id,'MAINTENANCE',new.payload->>'title',case when schedule then public.form_deadline(m->>'next_date',zone) else null end,m->>'next_km',m->>'next_hours','NONE',schedule);
 return new;end; $$;
create function public.link_document_emi_reminder() returns trigger language plpgsql security definer set search_path='' as $$
 declare m jsonb:=coalesce(new.payload->'metadata','{}');enabled boolean:=new.status<>'ARCHIVED' and coalesce((m->>'create_reminder')::boolean,false);zone text;
 begin
 select timezone into zone from public.vehicles where id=new.vehicle_id;
 if TG_TABLE_NAME='documents' then
 perform public.sync_source_reminder(new.vehicle_id,new.id,'DOCUMENT',new.payload->>'title',case when enabled then public.form_deadline(new.payload->>'due_at',zone) else null end,null,null,'NONE',enabled);
 else
 enabled:=enabled and new.payload->>'category'='EMI';
 perform public.sync_source_reminder(new.vehicle_id,new.id,'EMI',new.payload->>'title',case when enabled then public.form_deadline(m->>'reminder_due_at',zone) else null end,null,null,coalesce(m->>'reminder_recurrence','MONTHLY'),enabled);
 end if;return new;end; $$;
create trigger linked_document_reminder after insert or update on public.documents for each row execute function public.link_document_emi_reminder();
create trigger linked_emi_reminder after insert or update on public.expenses for each row execute function public.link_document_emi_reminder();

-- New published definitions get stricter checks; existing immutable versions remain untouched.
create function public.validate_form_choices() returns trigger language plpgsql set search_path='' as $$
 declare f jsonb;
 begin
 for f in select * from jsonb_array_elements(new.definition->'fields') loop
 if exists(select 1 from jsonb_array_elements_text(f->'options') choice where length(trim(choice))=0) or (select count(*) from jsonb_array_elements_text(f->'options'))<>(select count(distinct trim(choice)) from jsonb_array_elements_text(f->'options') choice) then raise exception 'INVALID_DUPLICATE_OPTIONS';end if;
 if coalesce((f->>'reportable')::boolean,false) and f->>'type' not in ('integer','decimal','currency','trip_count') then raise exception 'INVALID_REPORTABLE_FIELD';end if;
 end loop;return new;end; $$;
create trigger validate_form_choices before insert on public.progress_form_versions for each row execute function public.validate_form_choices();
revoke all on function public.form_calendar_date(text),public.form_timestamp(text),public.form_deadline(text,text),public.validate_entry_fields(),public.sync_source_reminder(uuid,uuid,text,text,timestamptz,text,text,text,boolean),public.link_document_emi_reminder(),public.validate_form_choices() from public,anon,authenticated;
