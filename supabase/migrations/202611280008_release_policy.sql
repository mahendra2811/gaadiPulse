-- Public, non-sensitive release settings only. Never place credentials or user data here.
create table public.app_release_policy (
  policy_id text primary key default 'global' check (policy_id = 'global'),
  minimum_supported_version text,
  minimum_version_critical boolean not null default false,
  minimum_version_message text,
  feature_flags jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  check (
    minimum_supported_version is null or
    minimum_supported_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  check (not minimum_version_critical or minimum_supported_version is not null),
  check (minimum_version_message is null or length(minimum_version_message) <= 240),
  check (jsonb_typeof(feature_flags) = 'object')
);

insert into public.app_release_policy(policy_id) values ('global');
alter table public.app_release_policy enable row level security;
revoke all on public.app_release_policy from public, anon, authenticated;
grant select on public.app_release_policy to anon, authenticated;
create policy app_release_policy_public_read on public.app_release_policy
  for select to anon, authenticated using (true);

comment on table public.app_release_policy is
  'Public non-sensitive release policy; feature flags are presentation rollout only and never authorization.';
