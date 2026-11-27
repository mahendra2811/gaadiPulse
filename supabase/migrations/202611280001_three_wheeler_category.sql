-- Add three-wheelers without rewriting or removing existing vehicle data.
alter table public.vehicles
  drop constraint if exists vehicles_category_check;

alter table public.vehicles
  add constraint vehicles_category_check
  check (category in (
    'two_wheeler',
    'three_wheeler',
    'four_wheeler',
    'commercial',
    'agricultural',
    'heavy_machinery'
  ));
