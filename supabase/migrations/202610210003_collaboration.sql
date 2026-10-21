create table public.progress_form_versions(id uuid primary key default gen_random_uuid(),vehicle_id uuid not null references public.vehicles(id),version integer not null,definition jsonb not null,published boolean not null default true,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(vehicle_id,version));
create unique index one_current_form on public.progress_form_versions(vehicle_id) where published;
alter table public.progress_form_versions enable row level security;revoke all on public.progress_form_versions from public,anon,authenticated;grant select on public.progress_form_versions to authenticated;
create policy forms_member on public.progress_form_versions for select to authenticated using(public.is_vehicle_member(vehicle_id));
create table public.progress_attachments(id uuid primary key default gen_random_uuid(),progress_id uuid not null references public.daily_progress(id),vehicle_id uuid not null references public.vehicles(id),file_path text,check(file_path is null));
alter table public.progress_attachments enable row level security;revoke all on public.progress_attachments from public,anon,authenticated;
-- Capture/upload is deferred: no client insert or read grants on attachment metadata.
create function public.validate_form(p_definition jsonb) returns void language plpgsql immutable set search_path='' as $$
 declare f jsonb;ids text[]:='{}';typ text;
 begin
 if jsonb_typeof(p_definition->'fields') is distinct from 'array' or jsonb_array_length(p_definition->'fields')>40 then raise exception 'INVALID_FIELDS';end if;
 if (p_definition->>'past_days')::integer not between 0 and 365 then raise exception 'INVALID_DATE_POLICY';end if;
 if p_definition->>'past_days' is null then raise exception 'INVALID_DATE_POLICY';end if;
 if coalesce((p_definition->>'photo_required')::boolean,false) then raise exception 'PHOTO_NOT_IMPLEMENTED';end if;
 for f in select * from jsonb_array_elements(p_definition->'fields') loop
 if f->>'id' is null or f->>'type' is null or f->>'visibility' is null or f->>'aggregation' is null then raise exception 'INVALID_FIELD';end if;perform (f->>'id')::uuid;
 if jsonb_typeof(f->'required') is distinct from 'boolean' or jsonb_typeof(f->'reportable') is distinct from 'boolean' then raise exception 'INVALID_FIELD_FLAGS';end if;
 if f->>'id'=any(ids) then raise exception 'DUPLICATE_FIELD';end if;ids:=array_append(ids,f->>'id');
 typ:=f->>'type';if typ not in ('text','paragraph','integer','decimal','currency','boolean','checkbox','select','multiselect','date','time','location_text','start_location','destination','route','trip_count') then raise exception 'INVALID_FIELD_TYPE';end if;
 if length(trim(coalesce(f->>'label','')))=0 or length(f->>'label')>120 then raise exception 'INVALID_LABEL';end if;
 if f->>'visibility' not in ('ALL','OWNER') or f->>'aggregation' not in ('SUM','AVG','LAST') then raise exception 'INVALID_FIELD_OPTIONS';end if;
 if f->>'min' is not null and f->>'max' is not null and (f->>'min')::numeric>(f->>'max')::numeric then raise exception 'INVALID_FIELD_RANGE';end if;
 if typ in ('select','multiselect') and (jsonb_typeof(f->'options')<>'array' or jsonb_array_length(f->'options') not between 1 and 50) then raise exception 'INVALID_OPTIONS';end if;
 end loop;end; $$;
create function public.publish_progress_form(p_vehicle uuid,p_definition jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare actor uuid:=public.require_verified();v integer;target uuid;
 begin perform 1 from public.vehicles where id=p_vehicle for update;if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 perform public.validate_form(p_definition);
 select coalesce(max(version),0)+1 into v from public.progress_form_versions where vehicle_id=p_vehicle;
 update public.progress_form_versions set published=false where vehicle_id=p_vehicle and published;
 insert into public.progress_form_versions(vehicle_id,version,definition,created_by) values(p_vehicle,v,p_definition,actor) returning id into target;
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,actor,'FORM_PUBLISHED',jsonb_build_object('version',v,'form',target));return target;end; $$;
create function public.default_progress_form() returns trigger language plpgsql security definer set search_path='' as $$
 begin insert into public.progress_form_versions(vehicle_id,version,definition,created_by) values(new.id,1,'{"fields":[],"past_days":1,"review_required":true,"km_required":false,"hours_required":false,"notes_required":false}',new.created_by);return new;end; $$;
create trigger initial_progress_form after insert on public.vehicles for each row execute function public.default_progress_form();
insert into public.progress_form_versions(vehicle_id,version,definition,created_by) select id,1,'{"fields":[],"past_days":1,"review_required":true,"km_required":false,"hours_required":false,"notes_required":false}',created_by from public.vehicles;
create function public.validate_progress_answers(p_definition jsonb,p_answers jsonb,p_owner boolean) returns void language plpgsql immutable set search_path='' as $$
 declare f jsonb;answer jsonb;typ text;n numeric;choice jsonb;
 begin if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'INVALID_ANSWERS';end if;
 for f in select * from jsonb_array_elements(p_definition->'fields') loop
 answer:=p_answers->(f->>'id');typ:=f->>'type';
 if f->>'visibility'='OWNER' and not p_owner then if answer is not null then raise exception 'PRIVATE_FIELD';end if;continue;end if;
 if answer is null or answer='null'::jsonb or answer='""'::jsonb or answer='[]'::jsonb then if coalesce((f->>'required')::boolean,false) then raise exception 'REQUIRED_FIELD: %',f->>'label';end if;continue;end if;
 if typ in ('integer','decimal','currency','trip_count') then
 if jsonb_typeof(answer)<>'number' then raise exception 'INVALID_NUMBER';end if;n:=(answer#>>'{}')::numeric;
 if typ in ('integer','trip_count') and n<>trunc(n) or typ='trip_count' and n<0 then raise exception 'INVALID_INTEGER';end if;
 if f->>'min' is not null and n<(f->>'min')::numeric or f->>'max' is not null and n>(f->>'max')::numeric then raise exception 'FIELD_RANGE';end if;
 elsif typ in ('boolean','checkbox') then if jsonb_typeof(answer)<>'boolean' then raise exception 'INVALID_BOOLEAN';end if;
 elsif typ='select' then if not (f->'options' @> jsonb_build_array(answer)) then raise exception 'INVALID_CHOICE';end if;
 elsif typ='multiselect' then if jsonb_typeof(answer)<>'array' then raise exception 'INVALID_CHOICES';end if;for choice in select * from jsonb_array_elements(answer) loop if not (f->'options' @> jsonb_build_array(choice)) then raise exception 'INVALID_CHOICE';end if;end loop;
 else if jsonb_typeof(answer)<>'string' or length(answer#>>'{}')>3000 then raise exception 'INVALID_TEXT';end if;
 if typ='date' then perform (answer#>>'{}')::date;end if;if typ='time' and (answer#>>'{}')!~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'INVALID_TIME';end if;
 if f->>'min' is not null and length(answer#>>'{}')<(f->>'min')::numeric or f->>'max' is not null and length(answer#>>'{}')>(f->>'max')::numeric then raise exception 'FIELD_RANGE';end if;
 end if;end loop;
 if exists(select 1 from jsonb_object_keys(p_answers) a where not exists(select 1 from jsonb_array_elements(p_definition->'fields') f where f->>'id'=a)) then raise exception 'UNKNOWN_FIELD';end if;
 end; $$;
create function public.submit_progress(p_vehicle uuid,p_payload jsonb,p_operation uuid,p_id uuid default null,p_expected integer default null) returns uuid language plpgsql security definer set search_path='' as $$
 declare actor uuid:=public.require_verified();form public.progress_form_versions;old public.daily_progress;target uuid:=coalesce(p_id,p_operation);today date;day date;state text;receipt public.record_operation_receipts;request_hash text:=md5(p_payload::text||coalesce(p_id::text,'')||coalesce(p_expected::text,''));
 begin perform 1 from public.vehicles where id=p_vehicle and archived_at is null for update;if not found or not public.has_vehicle_permission(p_vehicle,'progress.submit') then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operation::text,0));select * into receipt from public.record_operation_receipts where operation_id=p_operation and user_id=actor;if found then if receipt.vehicle_id<>p_vehicle or receipt.kind<>'progress' or receipt.payload_hash<>request_hash then raise exception 'INVALID_OPERATION';end if;return receipt.entity_id;end if;
 if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>65536 or length(coalesce(p_payload->>'notes',''))>3000 then raise exception 'INVALID_PAYLOAD';end if;
 select * into form from public.progress_form_versions where id=(p_payload->>'form_version_id')::uuid and vehicle_id=p_vehicle;
 if form.id is null then raise exception 'FORM_VERSION_CONFLICT';end if;
 if p_id is null and not form.published then raise exception 'FORM_VERSION_CONFLICT';end if;
 if p_id is not null then select * into old from public.daily_progress where id=p_id and vehicle_id=p_vehicle for update;if old.id is null then raise exception 'PERMISSION_DENIED';end if;
 if p_expected is null or old.revision<>p_expected then raise exception 'CONFLICT';end if;
 if not public.is_vehicle_owner(p_vehicle) and (old.created_by<>actor or not public.has_vehicle_permission(p_vehicle,'progress.edit_own') or old.status='APPROVED') then raise exception 'PERMISSION_DENIED';end if;
 if old.payload->>'form_version_id'<>p_payload->>'form_version_id' then raise exception 'FORM_VERSION_CONFLICT';end if;end if;
 select (now() at time zone timezone)::date into today from public.vehicles where id=p_vehicle;day:=(p_payload->>'progress_date')::date;
 if day is null or day>today or (day<today-(form.definition->>'past_days')::integer and not (p_id is not null and public.is_vehicle_owner(p_vehicle) and day=(old.payload->>'progress_date')::date)) then raise exception 'DATE_WINDOW_VIOLATION';end if;
 perform public.validate_progress_answers(form.definition,p_payload->'answers',public.is_vehicle_owner(p_vehicle));
 if coalesce((form.definition->>'notes_required')::boolean,false) and length(trim(coalesce(p_payload->>'notes','')))=0 then raise exception 'NOTES_REQUIRED';end if;
 if coalesce((form.definition->>'km_required')::boolean,false) and p_payload->>'km' is null or coalesce((form.definition->>'hours_required')::boolean,false) and p_payload->>'hours' is null then raise exception 'READING_REQUIRED';end if;
 if p_payload->>'km' is not null and (p_payload->>'km')::numeric<0 or p_payload->>'hours' is not null and (p_payload->>'hours')::numeric<0 then raise exception 'INVALID_READING';end if;
 state:=case when coalesce((form.definition->>'review_required')::boolean,true) then 'PENDING_REVIEW' else 'APPROVED' end;
 if p_id is null then insert into public.daily_progress(id,vehicle_id,created_by,payload,client_operation_id,status) values(target,p_vehicle,actor,p_payload,p_operation,state);else update public.daily_progress set payload=p_payload,status=state,revision=revision+1,updated_at=clock_timestamp() where id=target;end if;
 if state='APPROVED' then perform public.add_observations(p_vehicle,p_payload,'PROGRESS',target);end if;
 insert into public.record_operation_receipts(operation_id,user_id,vehicle_id,kind,entity_id,payload_hash) values(p_operation,actor,p_vehicle,'progress',target,request_hash);
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,actor,'PROGRESS_SUBMITTED',jsonb_build_object('id',target,'revision',coalesce(old.revision,0)+1,'before',old.payload,'after',p_payload));return target;end; $$;
create function public.review_progress(p_vehicle uuid,p_id uuid,p_expected integer,p_decision text,p_note text) returns void language plpgsql security definer set search_path='' as $$
 declare entry public.daily_progress;
 begin perform public.require_verified();perform 1 from public.vehicles where id=p_vehicle for update;if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 if p_decision not in ('APPROVED','REJECTED','CORRECTION_REQUESTED') then raise exception 'INVALID_DECISION';end if;
 select * into entry from public.daily_progress where id=p_id and vehicle_id=p_vehicle for update;
 if p_expected is null or entry.revision is null or entry.revision<>p_expected then raise exception 'CONFLICT';end if;
 if entry.status not in ('PENDING_REVIEW','SUBMITTED','CORRECTION_REQUESTED') then raise exception 'INVALID_TRANSITION';end if;
 if p_decision='APPROVED' then perform public.add_observations(p_vehicle,entry.payload,'PROGRESS',entry.id);end if;
 update public.daily_progress set status=p_decision,revision=revision+1,updated_at=clock_timestamp(),payload=payload||jsonb_build_object('review_note',left(p_note,3000),'reviewed_by',auth.uid(),'reviewed_at',now()) where id=p_id;
 insert into public.audit_events(vehicle_id,actor_id,action,context) values(p_vehicle,auth.uid(),'PROGRESS_REVIEWED',jsonb_build_object('id',p_id,'decision',p_decision,'note',left(p_note,3000)));end; $$;
create function public.update_vehicle_defaults(p_vehicle uuid,p_permissions jsonb) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.require_verified();perform 1 from public.vehicles where id=p_vehicle for update;if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED';end if;
 if jsonb_typeof(p_permissions)<>'object' or exists(select 1 from jsonb_each(p_permissions) where jsonb_typeof(value)<>'boolean') then raise exception 'INVALID_PERMISSIONS';end if;
 update public.vehicle_settings set pilot_permissions=p_permissions where vehicle_id=p_vehicle;
 insert into public.audit_events(vehicle_id,actor_id,action) values(p_vehicle,auth.uid(),'DEFAULT_PERMISSIONS_CHANGED');end; $$;
create function public.add_expense_category(p_vehicle uuid,p_label text) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.require_verified();if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED';end if;insert into public.expense_categories(vehicle_id,label) values(p_vehicle,trim(p_label)) on conflict do nothing;end; $$;
-- Self deletion keeps operational attribution. Primary admins must archive their vehicles first.
create table public.account_deletion_requests(user_id uuid primary key references auth.users(id),requested_at timestamptz not null default now());
alter table public.account_deletion_requests enable row level security;revoke all on public.account_deletion_requests from public,anon,authenticated;grant select on public.account_deletion_requests to authenticated;
create policy deletion_self on public.account_deletion_requests for select to authenticated using(user_id=auth.uid());
create function public.request_account_deletion() returns void language plpgsql security definer set search_path='' as $$
 declare actor uuid:=public.require_verified();
 begin if exists(select 1 from public.vehicle_members m join public.vehicles v on v.id=m.vehicle_id where m.user_id=actor and m.is_primary_admin and v.archived_at is null) then raise exception 'ARCHIVE_ADMINISTERED_VEHICLES_FIRST';end if;
 insert into public.account_deletion_requests(user_id) values(actor) on conflict do nothing;
 update public.vehicle_members set status='REVOKED',is_primary_admin=false where user_id=actor;
 update public.vehicle_access_grants set status='REVOKED',revoked_at=now() where resolved_user_id=actor;
 update public.profiles set display_name='Deletion requested' where id=actor;
 end; $$;
-- Account deletion is a tracked operator workflow; actual auth deletion/anonymization requires service-role execution and retention review.
revoke all on function public.validate_form(jsonb),public.validate_progress_answers(jsonb,jsonb,boolean),public.publish_progress_form(uuid,jsonb),public.default_progress_form(),public.submit_progress(uuid,jsonb,uuid,uuid,integer),public.review_progress(uuid,uuid,integer,text,text),public.update_vehicle_defaults(uuid,jsonb),public.add_expense_category(uuid,text),public.request_account_deletion() from public,anon,authenticated;
grant execute on function public.publish_progress_form(uuid,jsonb),public.submit_progress(uuid,jsonb,uuid,uuid,integer),public.review_progress(uuid,uuid,integer,text,text),public.update_vehicle_defaults(uuid,jsonb),public.add_expense_category(uuid,text),public.request_account_deletion() to authenticated;
create function public.vehicle_member_details(p_vehicle uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin if not public.is_vehicle_owner(p_vehicle) then raise exception 'PERMISSION_DENIED';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'is_primary_admin',m.is_primary_admin,'status',m.status,'permission_overrides',m.permission_overrides,'joined_at',m.joined_at,'display_name',p.display_name) order by m.joined_at) from public.vehicle_members m join public.profiles p on p.id=m.user_id where m.vehicle_id=p_vehicle),'[]');end; $$;
revoke all on function public.vehicle_member_details(uuid) from public,anon;grant execute on function public.vehicle_member_details(uuid) to authenticated;
DO $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='vehicle_members') then alter publication supabase_realtime add table public.vehicle_members;end if;end $$;
-- JSON fields need column-aware redaction: row policies alone cannot hide Owner-only answers.
revoke select on public.daily_progress,public.progress_form_versions from authenticated;
create function public.read_form_versions(p_vehicle uuid) returns table(id uuid,vehicle_id uuid,version integer,definition jsonb,published boolean,created_at timestamptz) language sql stable security definer set search_path='' as $$
 select f.id,f.vehicle_id,f.version,
 case when public.is_vehicle_owner(p_vehicle) then f.definition else jsonb_set(f.definition,'{fields}',coalesce((select jsonb_agg(field) from jsonb_array_elements(f.definition->'fields') field where field->>'visibility'<>'OWNER'),'[]')) end,
 f.published,f.created_at from public.progress_form_versions f where f.vehicle_id=p_vehicle and public.is_vehicle_member(p_vehicle) order by f.version desc; $$;
create function public.read_progress_records(p_vehicle uuid,p_offset integer default 0,p_limit integer default 250) returns table(id uuid,vehicle_id uuid,created_by uuid,revision integer,status text,payload jsonb,created_at timestamptz,updated_at timestamptz) language sql stable security definer set search_path='' as $$
 select e.id,e.vehicle_id,e.created_by,e.revision,e.status,
 case when public.is_vehicle_owner(p_vehicle) then e.payload else jsonb_set(e.payload,'{answers}',coalesce((select jsonb_object_agg(a.key,a.value) from jsonb_each(e.payload->'answers') a where exists(select 1 from jsonb_array_elements(f.definition->'fields') field where field->>'id'=a.key and field->>'visibility'<>'OWNER')),'{}')) end,
 e.created_at,e.updated_at from public.daily_progress e join public.progress_form_versions f on f.id=(e.payload->>'form_version_id')::uuid
 where e.vehicle_id=p_vehicle and public.has_vehicle_permission(p_vehicle,'progress.view') and (public.is_vehicle_owner(p_vehicle) or e.created_by=auth.uid()) order by e.created_at desc,e.id desc limit least(greatest(p_limit,0),250) offset greatest(p_offset,0); $$;
revoke all on function public.read_form_versions(uuid),public.read_progress_records(uuid,integer,integer) from public,anon;
grant execute on function public.read_form_versions(uuid),public.read_progress_records(uuid,integer,integer) to authenticated;
drop policy reminders_read on public.reminders;
create policy reminders_read on public.reminders for select to authenticated using(public.has_vehicle_permission(vehicle_id,'reminders.read') and (public.is_vehicle_owner(vehicle_id) or coalesce((payload->>'pilot_visible')::boolean,true)));
create function public.adapt_progress_meter_requirements() returns trigger language plpgsql security definer set search_path='' as $$
 declare current_form public.progress_form_versions;definition jsonb;
 begin if new.meter_mode=old.meter_mode then return new;end if;select * into current_form from public.progress_form_versions where vehicle_id=new.id and published for update;if current_form.id is null then return new;end if;
 definition:=current_form.definition;
 if new.meter_mode='HOURS' then definition:=jsonb_set(definition,'{km_required}','false');elsif new.meter_mode='KM' then definition:=jsonb_set(definition,'{hours_required}','false');end if;
 if definition<>current_form.definition then update public.progress_form_versions set published=false where id=current_form.id;insert into public.progress_form_versions(vehicle_id,version,definition,created_by) values(new.id,current_form.version+1,definition,auth.uid());insert into public.audit_events(vehicle_id,actor_id,action) values(new.id,auth.uid(),'FORM_ADAPTED_TO_METER_MODE');end if;return new;end; $$;
create trigger adapt_progress_meter after update of meter_mode on public.vehicles for each row execute function public.adapt_progress_meter_requirements();
revoke all on function public.adapt_progress_meter_requirements() from public,anon,authenticated;
-- Keep the server-owned email snapshot synchronized through the nested Auth trigger.
create or replace function public.profile_guard() returns trigger language plpgsql set search_path='' as $$
 begin if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'INVALID_TIMEZONE';end if;if pg_trigger_depth()<=1 then new.email:=old.email;end if;new.created_at:=old.created_at;new.updated_at:=clock_timestamp();return new;end; $$;
alter table public.account_deletion_requests add column completed_at timestamptz;
create or replace function public.require_verified() returns uuid language plpgsql stable security definer set search_path='' as $$
 begin if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_VERIFIED' using errcode='42501';end if;
 if exists(select 1 from public.account_deletion_requests where user_id=auth.uid()) then raise exception 'ACCOUNT_DELETION_PENDING' using errcode='42501';end if;return auth.uid();end; $$;
create function public.protect_deleting_membership() returns trigger language plpgsql security definer set search_path='' as $$
 begin if new.status='ACTIVE' and exists(select 1 from public.account_deletion_requests where user_id=new.user_id) then raise exception 'ACCOUNT_DELETION_PENDING';end if;return new;end; $$;
create trigger deleting_membership before insert or update on public.vehicle_members for each row execute function public.protect_deleting_membership();
revoke all on function public.protect_deleting_membership() from public,anon,authenticated;
create function public.link_maintenance_reminder() returns trigger language plpgsql security definer set search_path='' as $$
 declare meta jsonb:=coalesce(new.payload->'metadata','{}');target uuid;has_schedule boolean;
 begin
 has_schedule:=coalesce(meta->>'next_date','')<>'' or coalesce(meta->>'next_km','')<>'' or coalesce(meta->>'next_hours','')<>'';
 select id into target from public.reminders where vehicle_id=new.vehicle_id and payload->>'origin'='MAINTENANCE' and payload->'metadata'->>'expense_id'=new.id::text for update;
 if not has_schedule or new.status='ARCHIVED' then if target is not null then update public.reminders set status='ARCHIVED',revision=revision+1,updated_at=clock_timestamp() where id=target;end if;return new;end if;
 if not public.has_vehicle_permission(new.vehicle_id,'reminders.create') then raise exception 'PERMISSION_DENIED';end if;
 if nullif(meta->>'next_date','') is not null then perform (meta->>'next_date')::timestamptz;end if;
 if nullif(meta->>'next_km','') is not null and (meta->>'next_km')::numeric<0 or nullif(meta->>'next_hours','') is not null and (meta->>'next_hours')::numeric<0 then raise exception 'INVALID_THRESHOLD';end if;
 if target is null then insert into public.reminders(id,vehicle_id,created_by,client_operation_id,payload) values(gen_random_uuid(),new.vehicle_id,auth.uid(),gen_random_uuid(),jsonb_build_object('origin','MAINTENANCE','title',new.payload->>'title','due_at',meta->>'next_date','threshold_km',meta->>'next_km','threshold_hours',meta->>'next_hours','recurrence','NONE','pilot_visible',true,'metadata',jsonb_build_object('expense_id',new.id)));
 else update public.reminders set status='ACTIVE',revision=revision+1,updated_at=clock_timestamp(),payload=payload||jsonb_build_object('title',new.payload->>'title,'due_at',meta->>'next_date','threshold_km',meta->>'next_km','threshold_hours',meta->>'next_hours') where id=target;end if;
 return new;end; $$;
create trigger maintenance_reminder after insert or update on public.expenses for each row execute function public.link_maintenance_reminder();
revoke all on function public.link_maintenance_reminder() from public,anon,authenticated;
