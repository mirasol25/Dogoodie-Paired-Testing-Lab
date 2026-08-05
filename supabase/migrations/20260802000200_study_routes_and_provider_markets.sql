alter table public.platform_services
add column if not exists normalized_service_category text not null default 'unclassified';

create table public.provider_markets (
  platform_id uuid not null references public.platforms(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region_code text not null default '*',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (platform_id, country_code, region_code)
);

create table public.study_locations (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete cascade,
  label text not null,
  formatted_address text not null,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region_name text,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  timezone text not null,
  geocoding_provider text not null,
  external_place_id text,
  is_public_location boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_routes (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete cascade,
  route_name text not null,
  pickup_location_id uuid not null references public.study_locations(id) on delete restrict,
  destination_location_id uuid not null references public.study_locations(id) on delete restrict,
  pickup_instructions text,
  destination_instructions text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (study_id, route_name),
  check (pickup_location_id <> destination_location_id)
);

create trigger study_locations_set_updated_at before update on public.study_locations
for each row execute function private.set_updated_at();
create trigger study_routes_set_updated_at before update on public.study_routes
for each row execute function private.set_updated_at();

create index study_locations_study_idx on public.study_locations(study_id);
create index study_routes_study_idx on public.study_routes(study_id, is_active);
create index provider_markets_country_idx on public.provider_markets(country_code, region_code, is_active);

grant select on public.provider_markets to authenticated;
grant select, insert, update, delete on public.study_locations to authenticated;
grant select, insert, update, delete on public.study_routes to authenticated;

alter table public.provider_markets enable row level security;
alter table public.study_locations enable row level security;
alter table public.study_routes enable row level security;

create policy provider_markets_active_user_select on public.provider_markets
for select to authenticated using (private.is_active_user());
create policy provider_markets_admin_insert on public.provider_markets
for insert to authenticated with check (private.is_admin());
create policy provider_markets_admin_update on public.provider_markets
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy provider_markets_admin_delete on public.provider_markets
for delete to authenticated using (private.is_admin());

create policy study_locations_member_select on public.study_locations
for select to authenticated using (private.is_study_member(study_id));
create policy study_locations_coordinator_insert on public.study_locations
for insert to authenticated with check (
  private.can_manage_study(study_id)
  and (created_by = (select auth.uid()) or private.is_admin())
);
create policy study_locations_coordinator_update on public.study_locations
for update to authenticated using (private.can_manage_study(study_id))
with check (private.can_manage_study(study_id));
create policy study_locations_coordinator_delete on public.study_locations
for delete to authenticated using (private.can_manage_study(study_id));

create policy study_routes_member_select on public.study_routes
for select to authenticated using (private.is_study_member(study_id));
create policy study_routes_coordinator_insert on public.study_routes
for insert to authenticated with check (
  private.can_manage_study(study_id)
  and (created_by = (select auth.uid()) or private.is_admin())
);
create policy study_routes_coordinator_update on public.study_routes
for update to authenticated using (private.can_manage_study(study_id))
with check (private.can_manage_study(study_id));
create policy study_routes_coordinator_delete on public.study_routes
for delete to authenticated using (private.can_manage_study(study_id));

insert into public.platforms (slug, name, provider_category, is_active)
values
  ('uber', 'Uber', 'transportation', true),
  ('lyft', 'Lyft', 'transportation', true),
  ('grab', 'Grab', 'transportation', true),
  ('joyride', 'JoyRide', 'transportation', true),
  ('angkas', 'Angkas', 'transportation', true),
  ('move-it', 'Move It', 'transportation', true),
  ('indrive', 'inDrive', 'transportation', true)
on conflict (slug) do update set name = excluded.name, is_active = excluded.is_active;

insert into public.provider_markets (platform_id, country_code)
select id, 'US' from public.platforms where slug in ('uber', 'lyft')
on conflict do nothing;
insert into public.provider_markets (platform_id, country_code)
select id, 'PH' from public.platforms where slug in ('grab', 'joyride', 'angkas', 'move-it', 'indrive')
on conflict do nothing;

insert into public.platform_services (platform_id, service_code, name, normalized_service_category)
select id, 'standard-car', name || ' Standard Car', 'standard_car'
from public.platforms where slug in ('uber', 'lyft', 'grab', 'joyride', 'indrive')
on conflict (platform_id, service_code) do update
set name = excluded.name, normalized_service_category = excluded.normalized_service_category;

insert into public.platform_services (platform_id, service_code, name, normalized_service_category)
select id, 'motorcycle-taxi', name || ' Motorcycle', 'motorcycle_taxi'
from public.platforms where slug in ('joyride', 'angkas', 'move-it')
on conflict (platform_id, service_code) do update
set name = excluded.name, normalized_service_category = excluded.normalized_service_category;

create or replace function public.create_study_with_initial_route(
  p_study_code text,
  p_name text,
  p_study_type public.study_type,
  p_search_country_code text,
  p_route_name text,
  p_pickup jsonb,
  p_destination jsonb,
  p_description text default null,
  p_study_question text default null,
  p_isolated_variable text default null,
  p_target_pair_count integer default null,
  p_testing_starts_at timestamptz default null,
  p_testing_ends_at timestamptz default null,
  p_pickup_instructions text default null,
  p_destination_instructions text default null,
  p_route_notes text default null,
  p_platform_service_ids uuid[] default '{}'::uuid[]
)
returns public.studies
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  created_study public.studies;
  pickup_id uuid;
  destination_id uuid;
begin
  if p_pickup ->> 'country_code' is distinct from p_destination ->> 'country_code' then
    raise exception 'Pickup and destination must be in the same country' using errcode = '22023';
  end if;
  if p_pickup ->> 'currency_code' is distinct from p_destination ->> 'currency_code' then
    raise exception 'Pickup and destination must use the same currency' using errcode = '22023';
  end if;
  if coalesce((p_pickup ->> 'is_public_location')::boolean, false) is not true
    or coalesce((p_destination ->> 'is_public_location')::boolean, false) is not true then
    raise exception 'Both route points must be confirmed public locations' using errcode = '22023';
  end if;

  select * into created_study from public.create_study(
    p_study_code,
    p_name,
    p_study_type,
    p_pickup ->> 'currency_code',
    p_pickup ->> 'timezone',
    p_description,
    p_study_question,
    p_isolated_variable,
    p_target_pair_count,
    p_testing_starts_at,
    p_testing_ends_at,
    jsonb_build_object('search_country_code', upper(p_search_country_code))
  );

  insert into public.study_locations (
    study_id, label, formatted_address, latitude, longitude, country_code,
    region_name, currency_code, timezone, geocoding_provider, external_place_id,
    is_public_location, created_by
  ) values (
    created_study.id, p_pickup ->> 'label', p_pickup ->> 'formatted_address',
    (p_pickup ->> 'latitude')::numeric, (p_pickup ->> 'longitude')::numeric,
    upper(p_pickup ->> 'country_code'), p_pickup ->> 'region_name',
    upper(p_pickup ->> 'currency_code'), p_pickup ->> 'timezone',
    p_pickup ->> 'geocoding_provider', p_pickup ->> 'external_place_id', true, caller_id
  ) returning id into pickup_id;

  insert into public.study_locations (
    study_id, label, formatted_address, latitude, longitude, country_code,
    region_name, currency_code, timezone, geocoding_provider, external_place_id,
    is_public_location, created_by
  ) values (
    created_study.id, p_destination ->> 'label', p_destination ->> 'formatted_address',
    (p_destination ->> 'latitude')::numeric, (p_destination ->> 'longitude')::numeric,
    upper(p_destination ->> 'country_code'), p_destination ->> 'region_name',
    upper(p_destination ->> 'currency_code'), p_destination ->> 'timezone',
    p_destination ->> 'geocoding_provider', p_destination ->> 'external_place_id', true, caller_id
  ) returning id into destination_id;

  insert into public.study_routes (
    study_id, route_name, pickup_location_id, destination_location_id,
    pickup_instructions, destination_instructions, notes, created_by
  ) values (
    created_study.id, trim(p_route_name), pickup_id, destination_id,
    nullif(trim(p_pickup_instructions), ''), nullif(trim(p_destination_instructions), ''),
    nullif(trim(p_route_notes), ''), caller_id
  );

  if cardinality(p_platform_service_ids) = 0 then
    raise exception 'Select at least one provider service' using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(p_platform_service_ids) requested_service_id
    left join public.platform_services ps on ps.id = requested_service_id and ps.is_active
    left join public.provider_markets pm on pm.platform_id = ps.platform_id
      and pm.country_code = upper(p_pickup ->> 'country_code') and pm.is_active
    where ps.id is null or pm.platform_id is null
  ) then
    raise exception 'A selected provider service is not configured for the pickup market' using errcode = '22023';
  end if;

  insert into public.study_platforms (study_id, platform_id)
  select distinct created_study.id, ps.platform_id
  from public.platform_services ps
  where ps.id = any(p_platform_service_ids)
  on conflict do nothing;

  update public.studies
  set configuration = configuration || jsonb_build_object('platform_service_ids', to_jsonb(p_platform_service_ids))
  where id = created_study.id
  returning * into created_study;

  insert into public.activity_logs (
    study_id, actor_id, action, category, target_type, target_id, details
  ) values (
    created_study.id, caller_id, 'study.initial_route_created', 'route',
    'study', created_study.id,
    jsonb_build_object('route_name', trim(p_route_name), 'pickup_location_id', pickup_id, 'destination_location_id', destination_id)
  );

  return created_study;
end;
$$;

revoke all on function public.create_study_with_initial_route(
  text, text, public.study_type, text, text, jsonb, jsonb, text, text, text,
  integer, timestamptz, timestamptz, text, text, text, uuid[]
) from public;
grant execute on function public.create_study_with_initial_route(
  text, text, public.study_type, text, text, jsonb, jsonb, text, text, text,
  integer, timestamptz, timestamptz, text, text, text, uuid[]
) to authenticated;
