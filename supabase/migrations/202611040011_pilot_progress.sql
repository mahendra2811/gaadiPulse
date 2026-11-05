-- Restore optional pilot progress submission without widening historical access.
-- Existing explicit member and vehicle restrictions continue to take precedence.
create or replace function public.has_vehicle_permission(p_vehicle uuid, p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_vehicle_member(p_vehicle) and coalesce((
    select case when m.role = 'OWNER' then true
      when p_key in ('fuel.read','fuel.create','expenses.read','expenses.create','meters.read','meters.create')
        then coalesce((m.permission_overrides->>p_key)::boolean, (s.pilot_permissions->>p_key)::boolean, true)
      when p_key in ('progress.view','progress.submit')
        then coalesce((m.permission_overrides->>p_key)::boolean, (s.pilot_permissions->>p_key)::boolean, false)
      else false
    end
    from public.vehicle_members m join public.vehicle_settings s using (vehicle_id)
    where m.vehicle_id = p_vehicle and m.user_id = auth.uid() and m.status = 'ACTIVE'
  ), false);
$$;

create or replace function public.read_form_versions(p_vehicle uuid)
returns table(id uuid,vehicle_id uuid,version integer,definition jsonb,published boolean,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id,f.vehicle_id,f.version,
    case when public.is_vehicle_owner(p_vehicle) then f.definition
      else jsonb_set(f.definition,'{fields}',coalesce((select jsonb_agg(field)
        from jsonb_array_elements(f.definition->'fields') field where field->>'visibility'<>'OWNER'),'[]')) end,
    f.published,f.created_at
  from public.progress_form_versions f
  where f.vehicle_id=p_vehicle and public.is_vehicle_member(p_vehicle)
    and (public.has_vehicle_permission(p_vehicle,'progress.view') or public.has_vehicle_permission(p_vehicle,'progress.submit'))
  order by f.version desc;
$$;

create or replace function public.read_progress_records(p_vehicle uuid,p_offset integer default 0,p_limit integer default 250)
returns table(id uuid,vehicle_id uuid,created_by uuid,revision integer,status text,payload jsonb,created_at timestamptz,updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id,e.vehicle_id,e.created_by,e.revision,e.status,
    case when public.is_vehicle_owner(p_vehicle) then e.payload
      else jsonb_set(e.payload,'{answers}',coalesce((select jsonb_object_agg(a.key,a.value)
        from jsonb_each(e.payload->'answers') a
        where exists(select 1 from jsonb_array_elements(f.definition->'fields') field
          where field->>'id'=a.key and field->>'visibility'<>'OWNER')),'{}')) end,
    e.created_at,e.updated_at
  from public.daily_progress e
  join public.progress_form_versions f on f.id=(e.payload->>'form_version_id')::uuid
  join public.vehicles v on v.id=e.vehicle_id
  where e.vehicle_id=p_vehicle and public.has_vehicle_permission(p_vehicle,'progress.view')
    and (public.is_vehicle_owner(p_vehicle) or (
      e.created_by=auth.uid() and (e.payload->>'progress_date')::date between
      (now() at time zone v.timezone)::date - 1 and (now() at time zone v.timezone)::date
    ))
  order by e.created_at desc,e.id desc limit least(greatest(p_limit,0),250) offset greatest(p_offset,0);
$$;

-- Avoid the original PL/pgSQL variable/column ambiguity when validating answer keys.
create or replace function public.validate_progress_answers(p_definition jsonb,p_answers jsonb,p_owner boolean) returns void language plpgsql immutable set search_path='' as $$
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
 if exists(select 1 from jsonb_object_keys(p_answers) a where not exists(select 1 from jsonb_array_elements(p_definition->'fields') as fields(item) where fields.item->>'id'=a)) then raise exception 'UNKNOWN_FIELD';end if;
 end; $$;
