-- Account-scoped notification inbox, push tokens and idempotent delivery queue.
-- Delivery is opt-in at the device/OS level; server credentials never enter the app.

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id uuid not null,
  expo_push_token text not null,
  platform text not null check (platform in ('android', 'ios')),
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, installation_id)
);
create unique index push_devices_active_token
  on public.push_devices(expo_push_token) where active;
create index push_devices_user_active on public.push_devices(user_id, active);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from public, anon, authenticated;

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  reminders_enabled boolean not null default true,
  account_updates_enabled boolean not null default true,
  language text not null default 'AUTO' check (language in ('AUTO', 'en-IN', 'hi-IN')),
  quiet_hours_enabled boolean not null default false,
  quiet_start time not null default time '22:00',
  quiet_end time not null default time '08:00',
  daily_push_limit smallint not null default 5 check (daily_push_limit between 1 and 20),
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select on public.notification_preferences to authenticated;
create policy notification_preferences_self on public.notification_preferences
  for select to authenticated using (user_id=(select auth.uid()));

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  category text not null check (category in ('REMINDER', 'ACCOUNT')),
  event_key text not null,
  title_en text not null,
  body_en text not null,
  title_hi text not null,
  body_hi text not null,
  route_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, event_key),
  check (jsonb_typeof(route_data) = 'object')
);
create index user_notifications_feed
  on public.user_notifications(user_id, created_at desc, id desc);
create index user_notifications_unread
  on public.user_notifications(user_id, created_at desc) where read_at is null;
alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from public, anon;
grant select, update(read_at) on public.user_notifications to authenticated;
create policy user_notifications_read on public.user_notifications
  for select to authenticated using (
    user_id = (select auth.uid()) and
    coalesce((select p.in_app_enabled from public.notification_preferences p
      where p.user_id=(select auth.uid())),true) and
    (vehicle_id is null or public.is_vehicle_member(vehicle_id))
  );
create policy user_notifications_mark_read on public.user_notifications
  for update to authenticated using (
    user_id = (select auth.uid()) and
    coalesce((select p.in_app_enabled from public.notification_preferences p
      where p.user_id=(select auth.uid())),true) and
    (vehicle_id is null or public.is_vehicle_member(vehicle_id))
  ) with check (
    user_id = (select auth.uid()) and
    coalesce((select p.in_app_enabled from public.notification_preferences p
      where p.user_id=(select auth.uid())),true) and
    (vehicle_id is null or public.is_vehicle_member(vehicle_id))
  );

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.user_notifications(id) on delete cascade,
  push_device_id uuid not null references public.push_devices(id) on delete cascade,
  status text not null default 'QUEUED'
    check (status in ('QUEUED', 'SENDING', 'RETRY', 'SENT', 'FAILED', 'INVALID_TOKEN')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  ticket_id text,
  receipt_after timestamptz,
  receipt_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, push_device_id)
);
create index notification_deliveries_ready
  on public.notification_deliveries(status, next_attempt_at, created_at)
  where status in ('QUEUED', 'RETRY');
create index notification_deliveries_receipts
  on public.notification_deliveries(receipt_after)
  where status = 'SENT' and receipt_checked_at is null and ticket_id is not null;
alter table public.notification_deliveries enable row level security;
revoke all on public.notification_deliveries from public, anon, authenticated;

create table public.notification_delivery_logs (
  id bigint generated always as identity primary key,
  delivery_id uuid not null references public.notification_deliveries(id) on delete cascade,
  attempt smallint not null,
  outcome text not null,
  provider_code text,
  detail text,
  created_at timestamptz not null default now(),
  unique (delivery_id, attempt, outcome)
);
alter table public.notification_delivery_logs enable row level security;
revoke all on public.notification_delivery_logs from public, anon, authenticated;

create function public.cancel_superseded_reminder_deliveries()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.notification_deliveries d set status='FAILED',last_error='REMINDER_SUPERSEDED',
    locked_at=null,updated_at=now()
  from public.user_notifications n
  where d.notification_id=n.id and n.vehicle_id=new.vehicle_id
    and n.route_data->>'record_id'=new.id::text
    and d.status in ('QUEUED','RETRY','SENDING');
  return new;
end;
$$;
create trigger cancel_superseded_reminder_deliveries
  after update on public.reminders for each row
  when (old.payload is distinct from new.payload or old.status is distinct from new.status)
  execute function public.cancel_superseded_reminder_deliveries();

create function public.cancel_revoked_member_deliveries()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status='REVOKED' or old.status='ACTIVE' and new.status<>'ACTIVE' then
    update public.notification_deliveries d set status='FAILED',last_error='VEHICLE_ACCESS_REVOKED',
      locked_at=null,updated_at=now()
    from public.user_notifications n
    where d.notification_id=n.id and n.user_id=new.user_id and n.vehicle_id=new.vehicle_id
      and d.status in ('QUEUED','RETRY','SENDING');
  end if;
  return new;
end;
$$;
create trigger cancel_revoked_member_deliveries
  after update of status on public.vehicle_members for each row
  execute function public.cancel_revoked_member_deliveries();

create function public.register_push_device(
  p_installation uuid, p_token text, p_platform text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := public.require_verified(); target uuid;
begin
  if p_installation is null or p_platform not in ('android', 'ios') or
     left(p_token, 14) <> 'ExpoPushToken[' and left(p_token, 18) <> 'ExponentPushToken[' or
     right(p_token, 1) <> ']' or length(p_token) > 256 or p_token ~ '[[:space:]]' then
    raise exception 'INVALID_PUSH_DEVICE';
  end if;
  -- A token belongs to one active account/device at a time, including after account switch.
  update public.push_devices set active = false, updated_at = now()
    where expo_push_token = p_token and active
      and (user_id <> actor or installation_id <> p_installation);
  insert into public.push_devices(user_id, installation_id, expo_push_token, platform, active, last_seen_at, updated_at)
    values(actor, p_installation, p_token, p_platform, true, now(), now())
  on conflict(user_id, installation_id) do update set
    expo_push_token = excluded.expo_push_token, platform = excluded.platform,
    active = true, last_seen_at = now(), updated_at = now()
  returning id into target;
  insert into public.notification_preferences(user_id) values(actor) on conflict(user_id) do nothing;
  return target;
end;
$$;

create function public.deactivate_push_device(p_installation uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_verified();
  update public.push_devices set active = false, updated_at = now()
    where installation_id = p_installation and user_id = auth.uid() and active;
end;
$$;

create function public.read_notification_preferences()
returns public.notification_preferences language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := public.require_verified(); result public.notification_preferences;
begin
  select * into result from public.notification_preferences where user_id = actor;
  if not found then
    result.user_id := actor;
    result.push_enabled := true;
    result.in_app_enabled := true;
    result.reminders_enabled := true;
    result.account_updates_enabled := true;
    result.language := 'AUTO';
    result.quiet_hours_enabled := false;
    result.quiet_start := time '22:00';
    result.quiet_end := time '08:00';
    result.daily_push_limit := 5;
  end if;
  return result;
end;
$$;

create function public.save_notification_preferences(
  p_push_enabled boolean, p_in_app_enabled boolean, p_reminders_enabled boolean,
  p_account_updates_enabled boolean, p_language text, p_quiet_hours_enabled boolean,
  p_quiet_start time, p_quiet_end time, p_daily_push_limit smallint
) returns public.notification_preferences language plpgsql security definer set search_path = '' as $$
declare actor uuid := public.require_verified(); result public.notification_preferences;
begin
  if p_language not in ('AUTO', 'en-IN', 'hi-IN') or
     p_daily_push_limit not between 1 and 20 or
     (p_quiet_hours_enabled and p_quiet_start = p_quiet_end) then
    raise exception 'INVALID_NOTIFICATION_PREFERENCES';
  end if;
  insert into public.notification_preferences(
    user_id, push_enabled, in_app_enabled, reminders_enabled, account_updates_enabled,
    language, quiet_hours_enabled, quiet_start, quiet_end, daily_push_limit, updated_at
  ) values (
    actor, p_push_enabled, p_in_app_enabled, p_reminders_enabled, p_account_updates_enabled,
    p_language, p_quiet_hours_enabled, p_quiet_start, p_quiet_end, p_daily_push_limit, now()
  ) on conflict(user_id) do update set
    push_enabled = excluded.push_enabled, in_app_enabled = excluded.in_app_enabled,
    reminders_enabled = excluded.reminders_enabled,
    account_updates_enabled = excluded.account_updates_enabled,
    language = excluded.language, quiet_hours_enabled = excluded.quiet_hours_enabled,
    quiet_start = excluded.quiet_start, quiet_end = excluded.quiet_end,
    daily_push_limit = excluded.daily_push_limit, updated_at = now()
  returning * into result;
  if not result.push_enabled then
    update public.notification_deliveries d set status = 'FAILED', last_error = 'PUSH_DISABLED', updated_at = now()
      from public.user_notifications n where d.notification_id = n.id and n.user_id = actor
        and d.status in ('QUEUED', 'RETRY', 'SENDING');
  end if;
  return result;
end;
$$;

create function public.enqueue_due_reminder_notifications(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path = '' as $$
declare
  reminder record; recipient record; day_offset integer; event_key text; notification_id uuid;
  due_raw text; due_instant timestamptz; due_date date; send_at timestamptz; inserted_count integer := 0;
begin
  for reminder in
    select r.id, r.vehicle_id, r.payload, r.status, v.timezone
    from public.reminders r join public.vehicles v on v.id = r.vehicle_id
    where r.status = 'ACTIVE' and v.archived_at is null
      and (nullif(r.payload->>'due_at', '') is not null or
           nullif(r.payload->>'threshold_km', '') is not null or
           nullif(r.payload->>'threshold_hours', '') is not null)
      and (coalesce((r.payload->>'pilot_visible')::boolean,true)
        or exists (select 1 from public.vehicle_members owner_member
          where owner_member.vehicle_id=r.vehicle_id and owner_member.role='OWNER'
            and owner_member.status='ACTIVE'))
    order by r.vehicle_id, r.created_at
  loop
    due_raw := nullif(reminder.payload->>'due_at', '');
    if due_raw is not null then
      begin
        if due_raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
          due_date := due_raw::date;
        else
          due_instant := due_raw::timestamptz;
          due_date := (due_instant at time zone reminder.timezone)::date;
        end if;
      exception when others then
        due_date := null;
      end;
      if due_date is not null and due_date >= (p_now at time zone reminder.timezone)::date then
        for day_offset in
          select distinct value::integer from jsonb_array_elements_text(
            case when jsonb_typeof(reminder.payload #> '{metadata,advance_days}')='array'
              then reminder.payload #> '{metadata,advance_days}'
              else '[30,15,7,1]'::jsonb end
          ) values_text(value)
          where value ~ '^[0-9]{1,3}$' and value::integer between 0 and 365
        loop
          send_at := ((due_date - day_offset)::timestamp + time '09:00') at time zone reminder.timezone;
          if send_at <= p_now and send_at > p_now - interval '32 days' then
            event_key := concat('reminder:', reminder.id, ':', due_date, ':', day_offset);
            for recipient in
              select m.user_id, m.role, coalesce((m.permission_overrides->>'reminders.read')::boolean,
                       (s.pilot_permissions->>'reminders.read')::boolean, false) as can_read,
                     coalesce((reminder.payload->>'pilot_visible')::boolean, true) as pilot_visible,
                     coalesce(p.in_app_enabled, true) as in_app_enabled,
                     coalesce(p.reminders_enabled, true) as reminders_enabled,
                     coalesce(p.push_enabled, true) as push_enabled,
                     coalesce(p.daily_push_limit, 5) as daily_push_limit,
                     coalesce(p.quiet_hours_enabled, false) as quiet_hours_enabled,
                     p.quiet_start, p.quiet_end, prof.timezone as user_timezone
              from public.vehicle_members m
              join auth.users u on u.id = m.user_id and u.email_confirmed_at is not null
              join public.vehicle_settings s on s.vehicle_id = m.vehicle_id
              join public.profiles prof on prof.id = m.user_id
              left join public.notification_preferences p on p.user_id = m.user_id
              where m.vehicle_id = reminder.vehicle_id and m.status = 'ACTIVE'
                and (m.role = 'OWNER' or
                     (m.role = 'PILOT' and coalesce((reminder.payload->>'pilot_visible')::boolean, true)
                       and coalesce((m.permission_overrides->>'reminders.read')::boolean,
                         (s.pilot_permissions->>'reminders.read')::boolean, false)))
                and (coalesce(p.in_app_enabled, true) or
                  (coalesce(p.push_enabled, true) and exists (
                    select 1 from public.push_devices active_device
                    where active_device.user_id=m.user_id and active_device.active
                  )))
                and coalesce(p.reminders_enabled, true)
            loop
              event_key := concat('reminder:', reminder.id, ':', due_date, ':', day_offset, ':', recipient.user_id);
              insert into public.user_notifications(
                user_id, vehicle_id, category, event_key, title_en, body_en, title_hi, body_hi, route_data
              ) values (
                recipient.user_id, reminder.vehicle_id, 'REMINDER', event_key,
                'Vehicle reminder',
                case when day_offset = 0 then 'A vehicle reminder is due today. Open GaadiPulse to review it.'
                     else concat('A vehicle reminder is due in ', day_offset, ' days. Open GaadiPulse to review it.') end,
                'गाड़ी की रिमाइंडर',
                case when day_offset = 0 then 'गाड़ी की एक रिमाइंडर आज है। देखने के लिए GaadiPulse खोलें।'
                     else concat('गाड़ी की एक रिमाइंडर ', day_offset, ' दिन में है। देखने के लिए GaadiPulse खोलें।') end,
                jsonb_build_object('kind', 'reminders', 'record_id', reminder.id, 'vehicle_id', reminder.vehicle_id)
              ) on conflict(user_id, event_key) do nothing returning id into notification_id;
              if notification_id is not null then
                inserted_count := inserted_count + 1;
                if recipient.push_enabled and send_at <= p_now and not (
                  recipient.quiet_hours_enabled and
                  case when recipient.quiet_start < recipient.quiet_end then
                    timezone(recipient.user_timezone,p_now)::time >= recipient.quiet_start and
                    timezone(recipient.user_timezone,p_now)::time < recipient.quiet_end
                  else timezone(recipient.user_timezone,p_now)::time >= recipient.quiet_start or
                       timezone(recipient.user_timezone,p_now)::time < recipient.quiet_end end
                ) and (select count(*) from public.notification_deliveries sent
                  join public.user_notifications sn on sn.id=sent.notification_id
                  where sn.user_id=recipient.user_id and sent.status='SENT'
                    and sent.updated_at >= (date_trunc('day',timezone(recipient.user_timezone,p_now))
                      at time zone recipient.user_timezone)) < recipient.daily_push_limit then
                  insert into public.notification_deliveries(notification_id, push_device_id)
                    select notification_id, d.id from public.push_devices d
                    where d.user_id = recipient.user_id and d.active
                    on conflict(notification_id, push_device_id) do nothing;
                end if;
              end if;
              notification_id := null;
            end loop;
          end if;
        end loop;
      end if;
    end if;

    -- Meter thresholds are checked against actual active readings, never inferred GPS.
    for recipient in
      select m.user_id from public.vehicle_members m
      join auth.users u on u.id = m.user_id and u.email_confirmed_at is not null
      join public.vehicle_settings s on s.vehicle_id = m.vehicle_id
      left join public.notification_preferences p on p.user_id = m.user_id
      where m.vehicle_id = reminder.vehicle_id and m.status = 'ACTIVE'
        and (coalesce(p.in_app_enabled, true) or
          (coalesce(p.push_enabled, true) and exists (
            select 1 from public.push_devices active_device
            where active_device.user_id=m.user_id and active_device.active
          )))
        and coalesce(p.reminders_enabled, true)
        and (m.role = 'OWNER' or (m.role = 'PILOT'
          and coalesce((reminder.payload->>'pilot_visible')::boolean, true)
          and coalesce((m.permission_overrides->>'reminders.read')::boolean,
            (s.pilot_permissions->>'reminders.read')::boolean, false)))
    loop
      if nullif(reminder.payload->>'threshold_km', '') is not null and exists (
        select 1 from public.meter_readings mr where mr.vehicle_id = reminder.vehicle_id
          and mr.reading_type = 'KM' and mr.status = 'ACTIVE'
          and mr.value >= (reminder.payload->>'threshold_km')::numeric
      ) then
        event_key := concat('threshold:KM:', reminder.id, ':', reminder.payload->>'threshold_km', ':', recipient.user_id);
        insert into public.user_notifications(user_id, vehicle_id, category, event_key, title_en, body_en, title_hi, body_hi, route_data)
        values(recipient.user_id, reminder.vehicle_id, 'REMINDER', event_key,
          'Service reminder', 'A recorded kilometre reading reached a reminder threshold. Open GaadiPulse to review it.',
          'सर्विस रिमाइंडर', 'दर्ज किया गया किलोमीटर एक रिमाइंडर सीमा तक पहुंच गया। देखने के लिए GaadiPulse खोलें।',
          jsonb_build_object('kind','reminders','record_id',reminder.id,'vehicle_id',reminder.vehicle_id))
        on conflict(user_id,event_key) do nothing returning id into notification_id;
      end if;
      if notification_id is null and nullif(reminder.payload->>'threshold_hours', '') is not null and exists (
        select 1 from public.meter_readings mr where mr.vehicle_id = reminder.vehicle_id
          and mr.reading_type = 'HOURS' and mr.status = 'ACTIVE'
          and mr.value >= (reminder.payload->>'threshold_hours')::numeric
      ) then
        event_key := concat('threshold:HOURS:', reminder.id, ':', reminder.payload->>'threshold_hours', ':', recipient.user_id);
        insert into public.user_notifications(user_id, vehicle_id, category, event_key, title_en, body_en, title_hi, body_hi, route_data)
        values(recipient.user_id, reminder.vehicle_id, 'REMINDER', event_key, 'Service reminder',
          'A recorded engine-hour reading reached a reminder threshold. Open GaadiPulse to review it.',
          'सर्विस रिमाइंडर', 'दर्ज किया गया इंजन-घंटा एक रिमाइंडर सीमा तक पहुंच गया। देखने के लिए GaadiPulse खोलें।',
          jsonb_build_object('kind','reminders','record_id',reminder.id,'vehicle_id',reminder.vehicle_id))
        on conflict(user_id,event_key) do nothing returning id into notification_id;
      end if;
      if notification_id is not null then
        inserted_count := inserted_count + 1;
        if coalesce((select push_enabled from public.notification_preferences where user_id=recipient.user_id), true) then
          insert into public.notification_deliveries(notification_id,push_device_id)
            select notification_id,d.id from public.push_devices d where d.user_id=recipient.user_id and d.active
              and (select count(*) from public.notification_deliveries sent
                join public.user_notifications sn on sn.id=sent.notification_id
                where sn.user_id=recipient.user_id and sent.status in ('SENT','SENDING')
                  and sent.updated_at >= (date_trunc('day',timezone(coalesce(
                    (select timezone from public.profiles where id=recipient.user_id),'Asia/Kolkata'),p_now))
                    at time zone coalesce((select timezone from public.profiles where id=recipient.user_id),'Asia/Kolkata'))
              ) < coalesce((select daily_push_limit from public.notification_preferences
                where user_id=recipient.user_id),5)
            on conflict(notification_id,push_device_id) do nothing;
        end if;
        notification_id := null;
      end if;
    end loop;
  end loop;
  return inserted_count;
end;
$$;

create function public.claim_notification_deliveries(p_limit integer default 100)
returns table(delivery_id uuid, notification_id uuid, device_id uuid, push_token text,
              locale text, title text, body text, route_data jsonb, attempt_count smallint)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501'; end if;
  return query
  with candidates as (
    select d.id from public.notification_deliveries d
    join public.user_notifications n on n.id = d.notification_id
    join public.push_devices pd on pd.id = d.push_device_id
    left join public.notification_preferences p on p.user_id = n.user_id
    left join public.profiles prof on prof.id = n.user_id
    where d.status in ('QUEUED','RETRY') and d.next_attempt_at <= now()
      and pd.active and coalesce(p.push_enabled,true) and coalesce(p.reminders_enabled,true)
      and (n.vehicle_id is null or exists (
        select 1 from public.vehicle_members m
        join auth.users u on u.id=m.user_id and u.email_confirmed_at is not null
        join public.vehicle_settings vs on vs.vehicle_id=m.vehicle_id
        join public.reminders live on live.id=(n.route_data->>'record_id')::uuid
          and live.vehicle_id=n.vehicle_id and live.status='ACTIVE'
        where m.vehicle_id=n.vehicle_id and m.user_id=n.user_id and m.status='ACTIVE'
          and (m.role='OWNER' or (m.role='PILOT'
            and coalesce((live.payload->>'pilot_visible')::boolean,true)
            and coalesce((m.permission_overrides->>'reminders.read')::boolean,
              (vs.pilot_permissions->>'reminders.read')::boolean,false)))
      ))
      and (not coalesce(p.quiet_hours_enabled,false) or not (
        case when p.quiet_start < p.quiet_end then
          timezone(coalesce(prof.timezone,'Asia/Kolkata'),now())::time >= p.quiet_start and
          timezone(coalesce(prof.timezone,'Asia/Kolkata'),now())::time < p.quiet_end
        else timezone(coalesce(prof.timezone,'Asia/Kolkata'),now())::time >= p.quiet_start or
             timezone(coalesce(prof.timezone,'Asia/Kolkata'),now())::time < p.quiet_end end
      ))
      and (select count(*) from public.notification_deliveries sent
        join public.user_notifications sn on sn.id=sent.notification_id
        where sn.user_id=n.user_id and sent.status='SENT'
          and sent.updated_at >= (date_trunc('day',timezone(coalesce(prof.timezone,'Asia/Kolkata'),now()))
                                  at time zone coalesce(prof.timezone,'Asia/Kolkata'))
      ) + (select count(*) from public.notification_deliveries pending
        join public.user_notifications pn on pn.id=pending.notification_id
        where pn.user_id=n.user_id and pending.status='SENDING'
          and pending.locked_at >= (date_trunc('day',timezone(coalesce(prof.timezone,'Asia/Kolkata'),now()))
                                    at time zone coalesce(prof.timezone,'Asia/Kolkata'))
      ) <= coalesce(p.daily_push_limit,5)
    order by d.next_attempt_at,d.created_at
    for update of d skip locked
    limit least(greatest(coalesce(p_limit,100),1),100)
  ), claimed as (
    update public.notification_deliveries d set status='SENDING',attempt_count=d.attempt_count+1,
      locked_at=now(),updated_at=now()
    from candidates c where d.id=c.id
    returning d.id,d.notification_id,d.push_device_id,d.attempt_count
  )
  select c.id,c.notification_id,pd.id,pd.expo_push_token,
    case when coalesce(p.language,'AUTO')='hi-IN' or
      (coalesce(p.language,'AUTO')='AUTO' and prof.locale like 'hi%') then 'hi' else 'en' end,
    case when coalesce(p.language,'AUTO')='hi-IN' or
      (coalesce(p.language,'AUTO')='AUTO' and prof.locale like 'hi%') then n.title_hi else n.title_en end,
    case when coalesce(p.language,'AUTO')='hi-IN' or
      (coalesce(p.language,'AUTO')='AUTO' and prof.locale like 'hi%') then n.body_hi else n.body_en end,
    jsonb_build_object('type','gaadipulse.notification','recipient_id',n.user_id,
      'notification_id',n.id,'route_data',n.route_data),c.attempt_count
  from claimed c join public.user_notifications n on n.id=c.notification_id
    join public.push_devices pd on pd.id=c.push_device_id
    left join public.notification_preferences p on p.user_id=n.user_id
    left join public.profiles prof on prof.id=n.user_id
  where n.category <> 'REMINDER' or exists (
    select 1 from public.vehicle_members active_member
    join auth.users verified_user on verified_user.id=active_member.user_id
      and verified_user.email_confirmed_at is not null
    join public.vehicle_settings current_settings on current_settings.vehicle_id=active_member.vehicle_id
    join public.reminders live on live.id=(n.route_data->>'record_id')::uuid
      and live.vehicle_id=n.vehicle_id and live.status='ACTIVE'
    where active_member.vehicle_id=n.vehicle_id and active_member.user_id=n.user_id
      and active_member.status='ACTIVE'
      and (active_member.role='OWNER' or (active_member.role='PILOT'
        and coalesce((live.payload->>'pilot_visible')::boolean,true)
        and coalesce((active_member.permission_overrides->>'reminders.read')::boolean,
          (current_settings.pilot_permissions->>'reminders.read')::boolean,false)))
  );
end;
$$;

create function public.record_notification_delivery(
  p_delivery uuid, p_outcome text, p_provider_code text default null,
  p_ticket_id text default null, p_error text default null, p_retry_seconds integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare attempt_no smallint; device uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501'; end if;
  select attempt_count,push_device_id into attempt_no,device
    from public.notification_deliveries where id=p_delivery for update;
  if not found then raise exception 'DELIVERY_NOT_FOUND'; end if;
  if p_outcome='SENT' then
    update public.notification_deliveries set status='SENT',ticket_id=p_ticket_id,
      receipt_after=now()+interval '15 minutes',locked_at=null,last_error=null,updated_at=now()
      where id=p_delivery;
  elsif p_outcome='INVALID_TOKEN' then
    update public.push_devices set active=false,updated_at=now() where id=device;
    update public.notification_deliveries set status='INVALID_TOKEN',locked_at=null,
      last_error=left(coalesce(p_error,p_provider_code,'DeviceNotRegistered'),240),updated_at=now()
      where id=p_delivery;
  elsif p_outcome='RETRY' and attempt_no < 5 then
    update public.notification_deliveries set status='RETRY',locked_at=null,
      next_attempt_at=now()+make_interval(secs=>least(greatest(coalesce(p_retry_seconds,60),1),3600)),
      last_error=left(coalesce(p_error,p_provider_code,'Transient delivery error'),240),updated_at=now()
      where id=p_delivery;
  else
    update public.notification_deliveries set status='FAILED',locked_at=null,
      last_error=left(coalesce(p_error,p_provider_code,'Delivery failed'),240),updated_at=now()
      where id=p_delivery;
  end if;
  insert into public.notification_delivery_logs(delivery_id,attempt,outcome,provider_code,detail)
    values(p_delivery,attempt_no,p_outcome,left(p_provider_code,100),left(p_error,500))
    on conflict(delivery_id,attempt,outcome) do update set
      provider_code=excluded.provider_code,detail=excluded.detail,created_at=now();
end;
$$;

create function public.claim_notification_receipts(p_limit integer default 100)
returns table(delivery_id uuid,ticket_id text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501'; end if;
  return query
  with candidates as (
    select d.id from public.notification_deliveries d
    where d.status='SENT' and d.ticket_id is not null and d.receipt_checked_at is null
      and d.receipt_after <= now()
    order by d.receipt_after for update skip locked
    limit least(greatest(coalesce(p_limit,100),1),100)
  ), claimed as (
    update public.notification_deliveries d set receipt_after=now()+interval '15 minutes',updated_at=now()
    from candidates c where d.id=c.id returning d.id,d.ticket_id
  ) select * from claimed;
end;
$$;

create function public.record_notification_receipt(
  p_delivery uuid,p_outcome text,p_provider_code text default null,p_error text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare device uuid;attempt_no smallint;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501'; end if;
  select push_device_id,attempt_count into device,attempt_no from public.notification_deliveries where id=p_delivery for update;
  if not found then raise exception 'DELIVERY_NOT_FOUND'; end if;
  if p_outcome='PENDING' then
    update public.notification_deliveries set receipt_after=now()+interval '15 minutes',updated_at=now() where id=p_delivery;
    return;
  end if;
  update public.notification_deliveries set receipt_checked_at=now(),updated_at=now() where id=p_delivery;
  if p_outcome='INVALID_TOKEN' then
    update public.push_devices set active=false,updated_at=now() where id=device;
    update public.notification_deliveries set status='INVALID_TOKEN',last_error=left(coalesce(p_error,p_provider_code,'DeviceNotRegistered'),240) where id=p_delivery;
  elsif p_outcome='FAILED' then
    update public.notification_deliveries set status='FAILED',last_error=left(coalesce(p_error,p_provider_code,'Receipt failed'),240) where id=p_delivery;
  end if;
  insert into public.notification_delivery_logs(delivery_id,attempt,outcome,provider_code,detail)
    values(p_delivery,attempt_no,concat('RECEIPT_',p_outcome),left(p_provider_code,100),left(p_error,500))
    on conflict(delivery_id,attempt,outcome) do nothing;
end;
$$;

-- Enqueue metadata-linked documents, EMI, service schedules and custom reminders.
-- Existing source links are updated/archived atomically by sync_source_reminder;
-- this replacement preserves their origin key and adds the requested lead-day plan.
create or replace function public.sync_source_reminder(
  p_vehicle uuid,p_source uuid,p_origin text,p_title text,p_due timestamptz,
  p_km text,p_hours text,p_recurrence text,p_enabled boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare target public.reminders; key text := case when p_origin='DOCUMENT' then 'document_id' else 'expense_id' end;
  next_payload jsonb; source_meta jsonb := '{}'; alerts jsonb;
begin
  if p_origin='DOCUMENT' then
    select coalesce(payload->'metadata','{}') into source_meta from public.documents where id=p_source;
    alerts := source_meta->'reminder_advance_days';
  else
    select coalesce(payload->'metadata','{}') into source_meta from public.expenses where id=p_source;
    alerts := source_meta->'reminder_advance_days';
  end if;
  select * into target from public.reminders where vehicle_id=p_vehicle and payload->>'origin'=p_origin
    and payload->'metadata'->>key=p_source::text order by created_at limit 1 for update;
  if not p_enabled then
    if target.id is not null and target.status<>'ARCHIVED' then
      update public.reminders set status='ARCHIVED',revision=revision+1,updated_at=clock_timestamp() where id=target.id;
      insert into public.audit_events(vehicle_id,actor_id,action,context)
        values(p_vehicle,auth.uid(),'LINKED_REMINDER_ARCHIVED',jsonb_build_object('id',target.id,'source',p_source));
    end if;
    return;
  end if;
  next_payload := coalesce(target.payload,'{}') || jsonb_build_object(
    'title',p_title,'origin',p_origin,'due_at',p_due,'threshold_km',nullif(p_km,''),
    'threshold_hours',nullif(p_hours,''),'recurrence',p_recurrence,
    'pilot_visible',coalesce((source_meta->>'reminder_pilot_visible')::boolean,
      (target.payload->>'pilot_visible')::boolean,false),
    'metadata',jsonb_build_object(key,p_source,'advance_days',
      case when jsonb_typeof(alerts)='array' then alerts else '[30,15,7,1]'::jsonb end)
  );
  if target.id is not null and next_payload=target.payload and target.status<>'ARCHIVED' then return; end if;
  if not public.has_vehicle_permission(p_vehicle,'reminders.create') then raise exception 'PERMISSION_DENIED'; end if;
  if target.id is null then
    insert into public.reminders(id,vehicle_id,created_by,client_operation_id,payload)
      values(gen_random_uuid(),p_vehicle,auth.uid(),gen_random_uuid(),next_payload);
  else
    update public.reminders set payload=next_payload,status='ACTIVE',revision=revision+1,updated_at=clock_timestamp() where id=target.id;
  end if;
  insert into public.audit_events(vehicle_id,actor_id,action,context)
    values(p_vehicle,auth.uid(),'LINKED_REMINDER_SAVED',jsonb_build_object('id',target.id,'source',p_source));
end;
$$;

revoke all on function public.register_push_device(uuid,text,text),
  public.deactivate_push_device(uuid),public.read_notification_preferences(),
  public.save_notification_preferences(boolean,boolean,boolean,boolean,text,boolean,time,time,smallint),
  public.enqueue_due_reminder_notifications(timestamptz),public.claim_notification_deliveries(integer),
  public.record_notification_delivery(uuid,text,text,text,text,integer),
  public.claim_notification_receipts(integer),public.record_notification_receipt(uuid,text,text,text),
  public.sync_source_reminder(uuid,uuid,text,text,timestamptz,text,text,text,boolean),
  public.cancel_superseded_reminder_deliveries(),public.cancel_revoked_member_deliveries()
  from public,anon,authenticated;
grant execute on function public.register_push_device(uuid,text,text),
  public.deactivate_push_device(uuid),public.read_notification_preferences(),
  public.save_notification_preferences(boolean,boolean,boolean,boolean,text,boolean,time,time,smallint)
  to authenticated;
grant execute on function public.enqueue_due_reminder_notifications(timestamptz),
  public.claim_notification_deliveries(integer),public.record_notification_delivery(uuid,text,text,text,text,integer),
  public.claim_notification_receipts(integer),public.record_notification_receipt(uuid,text,text,text)
  to service_role;
grant execute on function public.sync_source_reminder(uuid,uuid,text,text,timestamptz,text,text,text,boolean)
  to authenticated;

comment on table public.push_devices is 'Authenticated per-installation Expo Push tokens; client cannot read this table.';
comment on table public.user_notifications is 'RLS-scoped in-app inbox; one user/event key prevents duplicate reminder notices.';
comment on table public.notification_delivery_logs is 'Server-only append-oriented delivery attempt and provider receipt history.';
