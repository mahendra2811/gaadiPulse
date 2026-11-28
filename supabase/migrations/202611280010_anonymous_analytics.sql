-- Opt-in, installation-scoped product telemetry. No account, vehicle, document,
-- registration, record payload or free-text values are stored.
create table public.app_analytics_events (
  event_id uuid primary key,
  installation_id uuid not null,
  event_name text not null check (event_name in (
    'first_open', 'onboarding_started', 'onboarding_completed',
    'vehicle_created', 'fuel_created', 'expense_created',
    'feature_opened', 'grant_resolved', 'app_foreground',
    'form_started', 'form_completed', 'startup_ready', 'api_health'
  )),
  occurred_at timestamptz not null default now(),
  app_version text not null check (length(app_version) between 1 and 40),
  platform text not null check (platform in ('android', 'ios', 'web')),
  locale text not null check (locale in ('en-IN', 'hi-IN', 'other')),
  role text check (role is null or role in ('OWNER', 'PILOT')),
  feature text check (feature is null or feature in (
    'home', 'garage', 'fuel', 'expenses', 'meters', 'insights', 'reports',
    'reminders', 'notifications', 'settings', 'maintenance', 'members'
  )),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 300000),
  request_count integer check (request_count is null or request_count between 1 and 100),
  failure_count integer check (failure_count is null or failure_count between 0 and 100),
  p95_duration_ms integer check (p95_duration_ms is null or p95_duration_ms between 0 and 120000),
  constraint app_analytics_api_summary_valid check (
    event_name <> 'api_health' or (
      request_count is not null and failure_count is not null and
      failure_count <= request_count and p95_duration_ms is not null
    )
  )
);

create index app_analytics_install_time_idx
  on public.app_analytics_events (installation_id, occurred_at desc);
create index app_analytics_time_event_idx
  on public.app_analytics_events (occurred_at desc, event_name);
create unique index app_analytics_foreground_daily_idx
  on public.app_analytics_events (
    installation_id, ((occurred_at at time zone 'UTC')::date)
  ) where event_name = 'app_foreground';

alter table public.app_analytics_events enable row level security;
revoke all on public.app_analytics_events from public, anon, authenticated;
grant all on public.app_analytics_events to service_role;

create function public.record_app_analytics(
  p_event_id uuid,
  p_installation_id uuid,
  p_event_name text,
  p_app_version text,
  p_platform text,
  p_locale text,
  p_role text default null,
  p_feature text default null,
  p_duration_ms integer default null,
  p_request_count integer default null,
  p_failure_count integer default null,
  p_p95_duration_ms integer default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  inserted_event uuid;
begin
  if p_event_id is null or p_installation_id is null then
    raise exception 'ANALYTICS_ID_REQUIRED' using errcode = '22023';
  end if;

  -- Keep accidental loops and abusive installation IDs from creating a large
  -- event stream. The public endpoint also validates a much smaller allowlist.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_installation_id::text, 7711)
  );
  if (
    select count(*) from public.app_analytics_events e
    where e.installation_id = p_installation_id
      and e.occurred_at >= pg_catalog.now() - interval '1 minute'
  ) >= 30 then
    return false;
  end if;

  insert into public.app_analytics_events (
    event_id, installation_id, event_name, app_version, platform, locale,
    role, feature, duration_ms, request_count, failure_count, p95_duration_ms
  ) values (
    p_event_id, p_installation_id, p_event_name, p_app_version, p_platform,
    p_locale, p_role, p_feature, p_duration_ms, p_request_count,
    p_failure_count, p_p95_duration_ms
  ) on conflict do nothing
  returning event_id into inserted_event;

  return inserted_event is not null;
end;
$$;
revoke all on function public.record_app_analytics(
  uuid, uuid, text, text, text, text, text, text, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.record_app_analytics(
  uuid, uuid, text, text, text, text, text, text, integer, integer, integer, integer
) to service_role;

create function public.delete_app_analytics_install(p_installation_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.app_analytics_events
  where installation_id = p_installation_id;
$$;
revoke all on function public.delete_app_analytics_install(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_app_analytics_install(uuid) to service_role;

create function public.prune_app_analytics()
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  removed bigint;
begin
  delete from public.app_analytics_events
  where occurred_at < pg_catalog.now() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.prune_app_analytics() from public, anon, authenticated;
grant execute on function public.prune_app_analytics() to service_role;

-- Supabase projects commonly enable pg_cron. Schedule retention when it exists;
-- otherwise the operator can run the documented cron.schedule statement.
do $$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron')
     and pg_catalog.to_regprocedure('cron.schedule(text,text,text)') is not null then
    execute 'select cron.schedule($1, $2, $3)'
      using 'gaadipulse-prune-analytics', '15 2 * * *',
            'select public.prune_app_analytics()';
  end if;
end;
$$;

-- Aggregate-only views are for operators and cannot be queried by app roles.
create view public.app_analytics_daily as
select
  (occurred_at at time zone 'UTC')::date as event_date,
  event_name,
  platform,
  app_version,
  locale,
  role,
  feature,
  count(*)::bigint as event_count,
  count(distinct installation_id)::bigint as installations,
  count(*) filter (where event_name = 'api_health')::bigint as api_batches,
  coalesce(sum(request_count) filter (where event_name = 'api_health'), 0)::bigint as api_requests,
  coalesce(sum(failure_count) filter (where event_name = 'api_health'), 0)::bigint as api_failures,
  percentile_disc(0.95) within group (order by p95_duration_ms)
    filter (where event_name = 'api_health') as api_p95_ms
from public.app_analytics_events
group by 1, 2, 3, 4, 5, 6, 7;
revoke all on public.app_analytics_daily from public, anon, authenticated;
grant select on public.app_analytics_daily to service_role;

create view public.app_analytics_retention as
with cohorts as (
  select installation_id,
         min((occurred_at at time zone 'UTC')::date) as cohort_date
  from public.app_analytics_events
  where event_name = 'first_open'
  group by installation_id
), active_days as (
  select distinct installation_id, (occurred_at at time zone 'UTC')::date as active_date
  from public.app_analytics_events
  where event_name = 'app_foreground'
)
select
  c.cohort_date,
  count(*)::bigint as cohort_size,
  count(*) filter (where a.active_date = c.cohort_date + 1)::bigint as day_1,
  count(*) filter (where a.active_date = c.cohort_date + 7)::bigint as day_7,
  count(*) filter (where a.active_date = c.cohort_date + 30)::bigint as day_30
from cohorts c
left join active_days a on a.installation_id = c.installation_id
group by c.cohort_date;
revoke all on public.app_analytics_retention from public, anon, authenticated;
grant select on public.app_analytics_retention to service_role;

create view public.app_analytics_monthly_active as
select date_trunc('month', occurred_at at time zone 'UTC')::date as month,
       count(distinct installation_id)::bigint as monthly_active_installations
from public.app_analytics_events
where event_name = 'app_foreground'
group by 1;
revoke all on public.app_analytics_monthly_active from public, anon, authenticated;
grant select on public.app_analytics_monthly_active to service_role;

create view public.app_analytics_funnels as
select
  s.event_name as start_event,
  s.feature,
  count(*)::bigint as starts,
  count(*) filter (where exists (
    select 1 from public.app_analytics_events done
    where done.installation_id = s.installation_id
      and done.feature is not distinct from s.feature
      and done.event_name = case s.event_name
        when 'onboarding_started' then 'onboarding_completed'
        else 'form_completed'
      end
      and done.occurred_at >= s.occurred_at
      and done.occurred_at < s.occurred_at + interval '24 hours'
  ))::bigint as completed_within_24h,
  count(*) filter (where s.occurred_at < now() - interval '24 hours'
    and not exists (
      select 1 from public.app_analytics_events done
      where done.installation_id = s.installation_id
        and done.feature is not distinct from s.feature
        and done.event_name = case s.event_name
          when 'onboarding_started' then 'onboarding_completed'
          else 'form_completed'
        end
        and done.occurred_at >= s.occurred_at
        and done.occurred_at < s.occurred_at + interval '24 hours'
    ))::bigint as abandoned_after_24h
from public.app_analytics_events s
where s.event_name in ('onboarding_started', 'form_started')
group by 1, 2;
revoke all on public.app_analytics_funnels from public, anon, authenticated;
grant select on public.app_analytics_funnels to service_role;
