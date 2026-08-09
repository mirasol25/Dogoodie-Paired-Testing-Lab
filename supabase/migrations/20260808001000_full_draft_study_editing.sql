create or replace function public.update_full_draft_study(p_study_id uuid, p_payload jsonb)
returns public.studies
language plpgsql security definer set search_path = '' as $$
declare
  selected public.studies; saved public.studies; route_row public.study_routes;
  pickup jsonb := p_payload -> 'pickup'; destination jsonb := p_payload -> 'destination';
  service_ids uuid[]; service_a uuid; service_b uuid; device_design text; updated_study_code text;
begin
  select * into selected from public.studies where id = p_study_id for update;
  if selected.id is null then raise exception 'Study not found' using errcode = 'P0002'; end if;
  if auth.uid() is null or not private.can_manage_study(p_study_id) then raise exception 'You are not authorized to edit this study' using errcode = '42501'; end if;
  if selected.status <> 'draft' or exists (select 1 from public.protocols where study_id = p_study_id and status = 'active') then
    raise exception 'Only draft studies without an active protocol can be edited' using errcode = '55000';
  end if;
  select * into route_row from public.study_routes where study_id = p_study_id and is_active order by created_at limit 1 for update;
  if route_row.id is null then raise exception 'The active study route was not found' using errcode = 'P0002'; end if;
  if char_length(trim(coalesce(p_payload ->> 'name', ''))) < 3 then raise exception 'Enter a study name' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_payload ->> 'study_question', ''))) < 10 then raise exception 'Enter a clear research question' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_payload ->> 'isolated_variable', ''))) < 2 then raise exception 'Enter the isolated variable' using errcode = '22023'; end if;
  if coalesce((p_payload ->> 'target_pair_count')::integer, 0) <= 0 then raise exception 'Enter a positive target pair count' using errcode = '22023'; end if;
  if (p_payload ->> 'testing_starts_at') is null or (p_payload ->> 'testing_ends_at') is null
    or (p_payload ->> 'testing_ends_at')::timestamptz <= (p_payload ->> 'testing_starts_at')::timestamptz then
    raise exception 'Enter a valid testing start and end' using errcode = '22023';
  end if;
  if upper(pickup ->> 'country_code') not in ('PH', 'US', 'CA')
    or upper(pickup ->> 'country_code') is distinct from upper(destination ->> 'country_code') then
    raise exception 'Route points must use the same supported country' using errcode = '22023';
  end if;
  if upper(pickup ->> 'currency_code') is distinct from upper(destination ->> 'currency_code')
    or (pickup ->> 'timezone') is distinct from (destination ->> 'timezone') then
    raise exception 'Route points must use the same currency and timezone' using errcode = '22023';
  end if;
  if coalesce((pickup ->> 'is_public_location')::boolean, false) is not true
    or coalesce((destination ->> 'is_public_location')::boolean, false) is not true then
    raise exception 'Both route points must be confirmed public locations' using errcode = '22023';
  end if;
  if abs((pickup ->> 'latitude')::double precision - (destination ->> 'latitude')::double precision) < 0.000001
    and abs((pickup ->> 'longitude')::double precision - (destination ->> 'longitude')::double precision) < 0.000001 then
    raise exception 'Pickup and destination must be different locations' using errcode = '22023';
  end if;
  select coalesce(array_agg(value::uuid order by ordinal), '{}'::uuid[]) into service_ids
  from jsonb_array_elements_text(p_payload -> 'platform_service_ids') with ordinality entries(value, ordinal);
  service_a := nullif(p_payload ->> 'tester_a_service_id', '')::uuid;
  service_b := nullif(p_payload ->> 'tester_b_service_id', '')::uuid;
  if service_a is null or service_b is null or not service_a = any(service_ids) or not service_b = any(service_ids) then
    raise exception 'Select a provider and ride tier for both tester sides' using errcode = '22023';
  end if;
  device_design := coalesce(p_payload ->> 'device_comparison_design', 'uncontrolled');
  updated_study_code := regexp_replace(selected.study_code, '^PTL-[A-Z]{2}-', 'PTL-' || upper(pickup ->> 'country_code') || '-');
  if updated_study_code <> selected.study_code and exists (select 1 from public.studies where study_code = updated_study_code and id <> p_study_id) then
    raise exception 'The updated study code is already in use' using errcode = '23505';
  end if;

  update public.study_locations set
    label = pickup ->> 'label', formatted_address = pickup ->> 'formatted_address',
    latitude = (pickup ->> 'latitude')::double precision, longitude = (pickup ->> 'longitude')::double precision,
    country_code = upper(pickup ->> 'country_code'), region_name = nullif(pickup ->> 'region_name', ''),
    currency_code = upper(pickup ->> 'currency_code'), timezone = pickup ->> 'timezone',
    geocoding_provider = pickup ->> 'geocoding_provider', external_place_id = nullif(pickup ->> 'external_place_id', ''),
    is_public_location = true where id = route_row.pickup_location_id;
  update public.study_locations set
    label = destination ->> 'label', formatted_address = destination ->> 'formatted_address',
    latitude = (destination ->> 'latitude')::double precision, longitude = (destination ->> 'longitude')::double precision,
    country_code = upper(destination ->> 'country_code'), region_name = nullif(destination ->> 'region_name', ''),
    currency_code = upper(destination ->> 'currency_code'), timezone = destination ->> 'timezone',
    geocoding_provider = destination ->> 'geocoding_provider', external_place_id = nullif(destination ->> 'external_place_id', ''),
    is_public_location = true where id = route_row.destination_location_id;
  update public.study_routes set route_name = trim(p_payload ->> 'route_name'),
    pickup_instructions = nullif(trim(coalesce(p_payload ->> 'pickup_instructions', '')), ''),
    destination_instructions = nullif(trim(coalesce(p_payload ->> 'destination_instructions', '')), ''),
    notes = nullif(trim(coalesce(p_payload ->> 'route_notes', '')), '') where id = route_row.id;

  delete from public.study_platforms where study_id = p_study_id;
  insert into public.study_platforms (study_id, platform_id)
  select distinct p_study_id, service.platform_id from public.platform_services service where service.id = any(service_ids);

  update public.studies set study_code = updated_study_code, name = trim(p_payload ->> 'name'), study_type = (p_payload ->> 'study_type')::public.study_type,
    study_question = trim(p_payload ->> 'study_question'), isolated_variable = trim(p_payload ->> 'isolated_variable'),
    target_pair_count = (p_payload ->> 'target_pair_count')::integer,
    default_currency = upper(pickup ->> 'currency_code'), display_timezone = pickup ->> 'timezone',
    testing_starts_at = (p_payload ->> 'testing_starts_at')::timestamptz,
    testing_ends_at = (p_payload ->> 'testing_ends_at')::timestamptz,
    configuration = configuration || jsonb_build_object(
      'platform_service_ids', to_jsonb(service_ids), 'tester_a_service_id', service_a, 'tester_b_service_id', service_b,
      'device_comparison_design', device_design,
      'testing_synchronization', coalesce(p_payload ->> 'testing_synchronization', 'synchronized'),
      'tester_a_operating_system', p_payload ->> 'tester_a_operating_system',
      'tester_b_operating_system', p_payload ->> 'tester_b_operating_system'
    ) where id = p_study_id returning * into saved;
  update public.protocols set protocol_code = updated_study_code || substring(protocol_code from char_length(selected.study_code) + 1),
    study_question = saved.study_question, isolated_variable = saved.isolated_variable
  where study_id = p_study_id and status = 'draft';
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, auth.uid(), 'study.configuration_updated', 'study', 'study', p_study_id, jsonb_build_object('study_code', saved.study_code));
  return saved;
end;
$$;

revoke all on function public.update_full_draft_study(uuid, jsonb) from public;
grant execute on function public.update_full_draft_study(uuid, jsonb) to authenticated;
comment on function public.update_full_draft_study(uuid, jsonb) is 'Atomically updates all create-study fields while the study is draft and has no active protocol.';
