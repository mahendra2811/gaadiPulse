-- International foundation. Additive only: existing INR paise values remain
-- authoritative until the v2 write/read gate is enabled.

create table public.supported_locales(
  code text primary key check(code ~ '^[a-z]{2,3}(-[A-Z]{2}|-[0-9]{3})?$'),
  language_code text not null,
  region_code text,
  direction text not null default 'ltr' check(direction in ('ltr','rtl')),
  active boolean not null default true,
  catalog_version text not null default '2026-11'
);
insert into public.supported_locales(code,language_code,region_code,direction,active)
values ('en-IN','en','IN','ltr',true),('hi-IN','hi','IN','ltr',false)
on conflict(code) do update set active=excluded.active,catalog_version=excluded.catalog_version;
alter table public.supported_locales enable row level security;
revoke all on public.supported_locales from public,anon,authenticated;
grant select on public.supported_locales to authenticated;
create policy supported_locales_read on public.supported_locales for select to authenticated using(active);

create table public.supported_currencies(
  code text primary key check(code ~ '^[A-Z]{3}$'),
  display_name text not null,
  symbol text not null,
  minor_units smallint not null check(minor_units between 0 and 4),
  active boolean not null default true,
  catalog_version text not null default '2026-11'
);
insert into public.supported_currencies(code,display_name,symbol,minor_units)
values
 ('AED','United Arab Emirates dirham','د.إ',2),
 ('AUD','Australian dollar','A$',2),
 ('BHD','Bahraini dinar','د.ب',3),
 ('CAD','Canadian dollar','CA$',2),
 ('CHF','Swiss franc','CHF',2),
 ('CNY','Chinese yuan','CN¥',2),
 ('EUR','Euro','€',2),
 ('GBP','Pound sterling','£',2),
 ('IDR','Indonesian rupiah','Rp',2),
 ('INR','Indian rupee','₹',2),
 ('JPY','Japanese yen','¥',0),
 ('KRW','South Korean won','₩',0),
 ('KWD','Kuwaiti dinar','د.ك',3),
 ('MYR','Malaysian ringgit','RM',2),
 ('NZD','New Zealand dollar','NZ$',2),
 ('OMR','Omani rial','ر.ع.',3),
 ('SAR','Saudi riyal','ر.س',2),
 ('SGD','Singapore dollar','S$',2),
 ('THB','Thai baht','฿',2),
 ('USD','US dollar','$',2),
 ('ZAR','South African rand','R',2)
on conflict(code) do update set display_name=excluded.display_name,symbol=excluded.symbol,minor_units=excluded.minor_units,active=true,catalog_version=excluded.catalog_version;
alter table public.supported_currencies enable row level security;
revoke all on public.supported_currencies from public,anon,authenticated;
grant select on public.supported_currencies to authenticated;
create policy supported_currencies_read on public.supported_currencies for select to authenticated using(active);

create table public.country_currency_options(
  country_code text not null,
  currency_code text not null references public.supported_currencies(code),
  is_default boolean not null default false,
  primary key(country_code,currency_code)
);
insert into public.country_currency_options(country_code,currency_code,is_default)
values
 ('AE','AED',true),('AU','AUD',true),('CA','CAD',true),('CH','CHF',true),
 ('CN','CNY',true),('DE','EUR',true),('ES','EUR',true),('FR','EUR',true),
 ('GB','GBP',true),('ID','IDR',true),('IN','INR',true),('JP','JPY',true),
 ('KR','KRW',true),('KW','KWD',true),('MY','MYR',true),('NZ','NZD',true),
 ('OM','OMR',true),('SA','SAR',true),('SG','SGD',true),('TH','THB',true),
 ('US','USD',true),('ZA','ZAR',true)
on conflict(country_code,currency_code) do update set is_default=excluded.is_default;
alter table public.country_currency_options enable row level security;
revoke all on public.country_currency_options from public,anon,authenticated;
grant select on public.country_currency_options to authenticated;
create policy country_currency_options_read on public.country_currency_options for select to authenticated using(true);

alter table public.profiles drop constraint if exists profiles_locale_check;
update public.profiles set locale='en-IN' where locale='en';
alter table public.profiles alter column locale set default 'en-IN';
alter table public.profiles add constraint profiles_locale_supported foreign key(locale) references public.supported_locales(code);
alter table public.profiles add column preferred_currency_code text not null default 'INR' references public.supported_currencies(code);
alter table public.profiles add column onboarding_version integer not null default 1 check(onboarding_version>=1);
alter table public.profiles add column onboarding_completed_at timestamptz;

alter table public.vehicles add column default_currency_code text not null default 'INR' references public.supported_currencies(code);
alter table public.vehicles add column currency_catalog_version text not null default '2026-11';

alter table public.fuel_logs add column currency_code text not null default 'INR' references public.supported_currencies(code);
alter table public.fuel_logs add column currency_exponent smallint not null default 2 check(currency_exponent between 0 and 4);
alter table public.fuel_logs add column amount_minor bigint generated always as (coalesce((payload->>'amount_minor')::bigint,(payload->>'amount_paise')::bigint)) stored;
alter table public.fuel_logs add column unit_price_minor bigint generated always as (coalesce((payload->>'unit_price_minor')::bigint,(payload->>'unit_price_paise')::bigint)) stored;

alter table public.expenses add column currency_code text not null default 'INR' references public.supported_currencies(code);
alter table public.expenses add column currency_exponent smallint not null default 2 check(currency_exponent between 0 and 4);
alter table public.expenses add column amount_minor bigint generated always as (coalesce((payload->>'amount_minor')::bigint,(payload->>'amount_paise')::bigint)) stored;

alter table public.expense_items add column currency_code text not null default 'INR' references public.supported_currencies(code);
alter table public.expense_items add column currency_exponent smallint not null default 2 check(currency_exponent between 0 and 4);
alter table public.expense_items add column amount_minor bigint generated always as (amount_paise) stored;

create index fuel_currency_lookup on public.fuel_logs(vehicle_id,currency_code,created_at desc);
create index expense_currency_lookup on public.expenses(vehicle_id,currency_code,created_at desc);
create index expense_item_currency_lookup on public.expense_items(expense_id,currency_code);

comment on column public.profiles.preferred_currency_code is 'Default for future vehicles only; never relabels history.';
comment on column public.vehicles.default_currency_code is 'Default for future financial records; each record stores its own currency.';
comment on column public.fuel_logs.currency_exponent is 'Precision snapshot for amount_minor; legacy INR rows use 2.';
comment on column public.expenses.currency_exponent is 'Precision snapshot for amount_minor; legacy INR rows use 2.';
