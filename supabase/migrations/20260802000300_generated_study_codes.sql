create sequence if not exists public.study_code_sequence;
revoke all on sequence public.study_code_sequence from public, anon, authenticated;

create or replace function public.create_study_with_initial_route_v2(
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
  generated_code text;
  created_study public.studies;
  pickup_latitude double precision;
  pickup_longitude double precision;
  destination_latitude double precision;
  destination_longitude double precision;
begin
  if length(trim(coalesce(p_name, ''))) < 3 then
    raise exception 'Enter a study name' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_study_question, ''))) < 10 then
    raise exception 'Enter a clear research question' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_isolated_variable, ''))) < 2 then
    raise exception 'Enter the isolated variable' using errcode = '22023';
  end if;
  if upper(coalesce(p_search_country_code, '')) not in ('PH', 'US') then
    raise exception 'The location search filter must be PH or US' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_route_name, ''))) < 3 then
    raise exception 'Enter a route name' using errcode = '22023';
  end if;
  if p_target_pair_count is not null and p_target_pair_count <= 0 then
    raise exception 'Target pair count must be positive' using errcode = '22023';
  end if;
  if p_testing_starts_at is not null and p_testing_ends_at is not null
    and p_testing_ends_at <= p_testing_starts_at then
    raise exception 'Testing must end after it starts' using errcode = '22023';
  end if;
  if jsonb_typeof(p_pickup) is distinct from 'object'
    or jsonb_typeof(p_destination) is distinct from 'object' then
    raise exception 'Pickup and destination are required' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_pickup ->> 'label', ''))) < 2
    or length(trim(coalesce(p_destination ->> 'label', ''))) < 2
    or length(trim(coalesce(p_pickup ->> 'formatted_address', ''))) < 3
    or length(trim(coalesce(p_destination ->> 'formatted_address', ''))) < 3 then
    raise exception 'Route points require labels and public addresses' using errcode = '22023';
  end if;
  if coalesce(p_pickup ->> 'latitude', '') !~ '^-?[0-9]+(\.[0-9]+)?$'
    or coalesce(p_pickup ->> 'longitude', '') !~ '^-?[0-9]+(\.[0-9]+)?$'
    or coalesce(p_destination ->> 'latitude', '') !~ '^-?[0-9]+(\.[0-9]+)?$'
    or coalesce(p_destination ->> 'longitude', '') !~ '^-?[0-9]+(\.[0-9]+)?$' then
    raise exception 'Route coordinates are invalid' using errcode = '22023';
  end if;
  pickup_latitude := (p_pickup ->> 'latitude')::double precision;
  pickup_longitude := (p_pickup ->> 'longitude')::double precision;
  destination_latitude := (p_destination ->> 'latitude')::double precision;
  destination_longitude := (p_destination ->> 'longitude')::double precision;
  if pickup_latitude not between -90 and 90
    or destination_latitude not between -90 and 90
    or pickup_longitude not between -180 and 180
    or destination_longitude not between -180 and 180 then
    raise exception 'Route coordinates are outside valid bounds' using errcode = '22023';
  end if;
  if abs(pickup_latitude - destination_latitude) < 0.000001
    and abs(pickup_longitude - destination_longitude) < 0.000001 then
    raise exception 'Pickup and destination must be different locations' using errcode = '22023';
  end if;
  if upper(p_pickup ->> 'country_code') is distinct from upper(p_destination ->> 'country_code')
    or upper(p_pickup ->> 'country_code') is distinct from upper(p_search_country_code) then
    raise exception 'Route points must match the selected search country' using errcode = '22023';
  end if;
  if upper(coalesce(p_pickup ->> 'currency_code', '')) !~ '^[A-Z]{3}$'
    or upper(p_pickup ->> 'currency_code') is distinct from upper(p_destination ->> 'currency_code') then
    raise exception 'Route points must use the same valid currency' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_pickup ->> 'timezone', ''))) = 0
    or (p_pickup ->> 'timezone') is distinct from (p_destination ->> 'timezone') then
    raise exception 'Route points must use the same valid timezone' using errcode = '22023';
  end if;
  if coalesce((p_pickup ->> 'is_public_location')::boolean, false) is not true
    or coalesce((p_destination ->> 'is_public_location')::boolean, false) is not true then
    raise exception 'Both route points must be confirmed public locations' using errcode = '22023';
  end if;
  if cardinality(p_platform_service_ids) = 0 then
    raise exception 'Select at least one provider service' using errcode = '22023';
  end if;
  if p_study_type = 'within_platform_pair'
    and (select count(distinct ps.platform_id)
         from public.platform_services ps where ps.id = any(p_platform_service_ids)) <> 1 then
    raise exception 'Within-platform studies can use only one provider' using errcode = '22023';
  end if;
  if p_study_type = 'cross_platform_comparison'
    and (select count(distinct ps.normalized_service_category)
         from public.platform_services ps where ps.id = any(p_platform_service_ids)) <> 1 then
    raise exception 'Cross-platform services must use the same ride tier category' using errcode = '22023';
  end if;
  if p_study_type = 'cross_platform_comparison'
    and (select count(distinct ps.platform_id)
         from public.platform_services ps where ps.id = any(p_platform_service_ids)) < 2 then
    raise exception 'Cross-platform studies require at least two different providers' using errcode = '22023';
  end if;

  loop
    generated_code := format(
      'PTL-%s-%s-%s',
      upper(p_pickup ->> 'country_code'),
      extract(year from now())::integer,
      lpad(nextval('public.study_code_sequence')::text, 4, '0')
    );
    exit when not exists (select 1 from public.studies where study_code = generated_code);
  end loop;

  select * into created_study from public.create_study_with_initial_route(
    generated_code,
    p_name,
    p_study_type,
    p_search_country_code,
    p_route_name,
    p_pickup,
    p_destination,
    p_description,
    p_study_question,
    p_isolated_variable,
    p_target_pair_count,
    p_testing_starts_at,
    p_testing_ends_at,
    p_pickup_instructions,
    p_destination_instructions,
    p_route_notes,
    p_platform_service_ids
  );

  return created_study;
end;
$$;

revoke all on function public.create_study_with_initial_route_v2(
  text, public.study_type, text, text, jsonb, jsonb, text, text, text,
  integer, timestamptz, timestamptz, text, text, text, uuid[]
) from public;
grant execute on function public.create_study_with_initial_route_v2(
  text, public.study_type, text, text, jsonb, jsonb, text, text, text,
  integer, timestamptz, timestamptz, text, text, text, uuid[]
) to authenticated;

comment on function public.create_study_with_initial_route_v2(
  text, public.study_type, text, text, jsonb, jsonb, text, text, text,
  integer, timestamptz, timestamptz, text, text, text, uuid[]
) is 'Generates a concurrency-safe study code and atomically creates the study, initial route, provider scope, membership, and activity.';
