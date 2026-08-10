-- Run this script in the Supabase SQL Editor as a project owner.
-- Edit only the CONFIGURATION block before running it.
--
-- The script uses the application's controlled RPCs and runs atomically. If a
-- lookup or validation fails, no partial study or assignments are retained.
-- Re-running a successful seed is safe because seed_key prevents duplicates.

do $seed$
declare
  -- CONFIGURATION -----------------------------------------------------------
  seed_key constant text := 'grab-standard-vs-saver-parqal-v1';
  coordinator_email constant text := 'josephmirasol25@gmail.com';
  reviewer_email constant text := 'ic.josephedrick.mirasol@cvsu.edu.ph';
  viewer_email constant text := 'mirasol.jicta@gmail.com';
  tester_a_emails constant text[] := array[
    'mirasoljastine@gmail.com',
    'tindaymavil@gmail.com'
  ];
  tester_b_emails constant text[] := array[
    'jessiemirasol0729@gmail.com',
    'mirasolbeth0620@gmail.com'
  ];

  study_name constant text := 'GrabCar Standard vs GrabCar Saver Fare Comparison: St. Dominic College to Parqal';
  study_question constant text := 'Does GrabCar Saver provide a lower displayed fare than GrabCar Standard for the same route, and by how much?';
  isolated_variable constant text := 'Selected Grab ride tier';
  tester_a_value constant text := 'Grab Standard - 4 Seater';
  tester_b_value constant text := 'Grab Saver Car - 4 Seater';

  provider_name constant text := 'Grab';
  tester_a_service_name constant text := 'Standard - 4 Seater';
  tester_b_service_name constant text := 'Saver Car - 4 Seater';

  testing_date constant date := current_date;
  start_time constant time := time '12:50';
  end_time constant time := time '15:00';
  study_timezone constant text := 'Asia/Manila';
  study_currency constant text := 'PHP';
  synchronization constant text := 'synchronized';

  pickup constant jsonb := jsonb_build_object(
    'label', 'St. Dominic College',
    'formatted_address', 'St. Dominic College of Asia, Bacoor, Cavite, Philippines',
    'latitude', 14.4508,
    'longitude', 120.9520,
    'country_code', 'PH',
    'region_name', 'Cavite',
    'currency_code', 'PHP',
    'timezone', 'Asia/Manila',
    'geocoding_provider', 'manual_seed',
    'external_place_id', 'seed-st-dominic-college-bacoor',
    'is_public_location', true
  );
  destination constant jsonb := jsonb_build_object(
    'label', 'Parqal',
    'formatted_address', 'Parqal, Aseana City, Paranaque, Metro Manila, Philippines',
    'latitude', 14.5275,
    'longitude', 120.9905,
    'country_code', 'PH',
    'region_name', 'Metro Manila',
    'currency_code', 'PHP',
    'timezone', 'Asia/Manila',
    'geocoding_provider', 'manual_seed',
    'external_place_id', 'seed-parqal-aseana-city',
    'is_public_location', true
  );
  -- END CONFIGURATION -------------------------------------------------------

  coordinator_id uuid;
  reviewer_id uuid;
  viewer_id uuid;
  tester_a_ids uuid[] := '{}'::uuid[];
  tester_b_ids uuid[] := '{}'::uuid[];
  tester_id uuid;
  tester_email text;
  service_a_id uuid;
  service_b_id uuid;
  route_id uuid;
  pair_index integer;
  tester_pairs jsonb := '[]'::jsonb;
  created_study public.studies;
  created_protocol public.protocols;
  created_count integer;
begin
  if synchronization not in ('synchronized', 'asynchronous') then
    raise exception 'synchronization must be synchronized or asynchronous';
  end if;
  if cardinality(tester_a_emails) = 0
    or cardinality(tester_a_emails) <> cardinality(tester_b_emails) then
    raise exception 'Tester A and Tester B email arrays must contain the same non-zero number of entries';
  end if;
  if synchronization = 'asynchronous' then
    raise exception 'This template uses one shared window. Set synchronization to synchronized or customize separate tester windows below.';
  end if;

  select profile.id into coordinator_id
  from public.profiles profile
  join public.user_roles user_role on user_role.user_id = profile.id
  where lower(profile.email) = lower(coordinator_email)
    and profile.account_status = 'active'
    and user_role.role in ('admin', 'test_coordinator');
  if coordinator_id is null then
    raise exception 'No active administrator or coordinator found for %', coordinator_email;
  end if;

  select profile.id into reviewer_id
  from public.profiles profile
  join public.user_roles user_role on user_role.user_id = profile.id
  where lower(profile.email) = lower(reviewer_email)
    and profile.account_status = 'active'
    and user_role.role = 'expert_reviewer';
  if reviewer_id is null then
    raise exception 'No active expert reviewer found for %', reviewer_email;
  end if;

  select profile.id into viewer_id
  from public.profiles profile
  join public.user_roles user_role on user_role.user_id = profile.id
  where lower(profile.email) = lower(viewer_email)
    and profile.account_status = 'active'
    and user_role.role = 'law_firm_viewer';
  if viewer_id is null then
    raise exception 'No active law-firm viewer found for %', viewer_email;
  end if;

  -- Make auth.uid() and the authorization helpers behave as the coordinator.
  perform set_config('request.jwt.claim.sub', coordinator_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  if exists (select 1 from public.studies where configuration ->> 'seed_key' = seed_key) then
    raise notice 'Seed % already exists; nothing was created.', seed_key;
    return;
  end if;

  select service.id into service_a_id
  from public.platform_services service
  join public.platforms platform on platform.id = service.platform_id
  where lower(platform.name) = lower(provider_name)
    and lower(service.name) = lower(tester_a_service_name)
    and platform.is_active and service.is_active;
  if service_a_id is null then
    raise exception 'Active service %.% was not found', provider_name, tester_a_service_name;
  end if;

  select service.id into service_b_id
  from public.platform_services service
  join public.platforms platform on platform.id = service.platform_id
  where lower(platform.name) = lower(provider_name)
    and lower(service.name) = lower(tester_b_service_name)
    and platform.is_active and service.is_active;
  if service_b_id is null then
    raise exception 'Active service %.% was not found', provider_name, tester_b_service_name;
  end if;
  if service_a_id = service_b_id then
    raise exception 'Tester A and Tester B must use different services for this study';
  end if;

  foreach tester_email in array tester_a_emails loop
    select profile.id into tester_id
    from public.profiles profile
    join public.user_roles user_role on user_role.user_id = profile.id
    where lower(profile.email) = lower(tester_email)
      and profile.account_status = 'active'
      and user_role.role = 'tester';
    if tester_id is null then raise exception 'Active Tester A account not found: %', tester_email; end if;
    tester_a_ids := array_append(tester_a_ids, tester_id);
  end loop;

  foreach tester_email in array tester_b_emails loop
    select profile.id into tester_id
    from public.profiles profile
    join public.user_roles user_role on user_role.user_id = profile.id
    where lower(profile.email) = lower(tester_email)
      and profile.account_status = 'active'
      and user_role.role = 'tester';
    if tester_id is null then raise exception 'Active Tester B account not found: %', tester_email; end if;
    tester_b_ids := array_append(tester_b_ids, tester_id);
  end loop;

  if cardinality(tester_a_ids || tester_b_ids) <>
    (select count(distinct value) from unnest(tester_a_ids || tester_b_ids) value) then
    raise exception 'Every tester must appear only once across the assignment batch';
  end if;

  select * into created_study
  from public.create_study_with_initial_route_v2(
    p_name => study_name,
    p_study_type => 'within_platform_pair',
    p_search_country_code => 'PH',
    p_route_name => 'St. Dominic College to Parqal',
    p_pickup => pickup,
    p_destination => destination,
    p_description => 'Controlled paired comparison of displayed fares for two Grab ride tiers.',
    p_study_question => study_question,
    p_isolated_variable => isolated_variable,
    p_target_pair_count => cardinality(tester_a_ids),
    p_testing_starts_at => (testing_date + start_time) at time zone study_timezone,
    p_testing_ends_at => ((testing_date + 14) + end_time) at time zone study_timezone,
    p_pickup_instructions => 'Pin the pickup at the main St. Dominic College entrance.',
    p_destination_instructions => 'Pin the destination at Parqal, Aseana City.',
    p_route_notes => 'Use the assigned ride tier and do not book the ride.',
    p_platform_service_ids => array[service_a_id, service_b_id]
  );

  update public.studies
  set configuration = configuration || jsonb_build_object(
    'seed_key', seed_key,
    'comparison_design', 'different_tier',
    'search_country_code', 'PH',
    'tester_a_service_id', service_a_id,
    'tester_b_service_id', service_b_id,
    'platform_service_ids', jsonb_build_array(service_a_id, service_b_id),
    'testing_synchronization', synchronization,
    'device_comparison_design', 'uncontrolled'
  ), default_currency = study_currency, display_timezone = study_timezone
  where id = created_study.id;

  select id into route_id
  from public.study_routes
  where study_id = created_study.id and is_active
  order by created_at
  limit 1;
  if route_id is null then raise exception 'The initial route was not created'; end if;

  for pair_index in 1..cardinality(tester_a_ids) loop
    perform public.add_study_member(created_study.id, tester_a_ids[pair_index]);
    perform public.add_study_member(created_study.id, tester_b_ids[pair_index]);
    tester_pairs := tester_pairs || jsonb_build_array(jsonb_build_object(
      'tester_a_id', tester_a_ids[pair_index],
      'tester_b_id', tester_b_ids[pair_index]
    ));
  end loop;
  perform public.add_study_member(created_study.id, reviewer_id);
  perform public.add_study_member(created_study.id, viewer_id);

  select * into created_protocol
  from public.create_initial_protocol_draft(
    created_study.id,
    'Grab ride-tier fare comparison protocol',
    tester_a_value,
    tester_b_value,
    'Compare displayed fares while holding provider, route, currency, and request conditions constant.'
  );
  perform public.save_protocol_matching_controls(created_study.id, created_protocol.id, '{}'::text[]);
  perform public.save_protocol_validation_thresholds(created_study.id, created_protocol.id, 30, 120, 100, 500);
  perform public.save_protocol_evidence_observation_requirements(
    created_study.id,
    created_protocol.id,
    '{}'::text[],
    array['estimated_arrival_time', 'availability', 'price_breakdown', 'tester_notes', 'app_version', 'operating_system_family', 'network_category']
  );
  perform public.save_protocol_exclusion_conditions(
    created_study.id,
    created_protocol.id,
    array['outside_assignment_window', 'declared_protocol_deviation', 'evidence_timestamp_mismatch', 'duplicate_evidence']
  );
  select * into created_protocol from public.activate_protocol(created_study.id, created_protocol.id);
  perform public.transition_study_status(created_study.id, 'active');

  select count(*) into created_count
  from public.create_paired_assignment_batch_v2(
    created_study.id,
    created_protocol.id,
    route_id,
    tester_pairs,
    service_a_id,
    service_b_id,
    testing_date,
    start_time,
    end_time,
    start_time,
    end_time,
    study_timezone,
    'Open Grab at the scheduled time, use the assigned tier and route, capture the displayed quote and required evidence, then submit without booking.'
  );

  raise notice 'Created study % (%) with % paired assignment(s).', created_study.study_code, created_study.id, created_count;
end;
$seed$;

-- Result summary. Replace the key below if you changed seed_key above.
select
  study.study_code,
  study.name,
  study.status,
  protocol.protocol_code,
  protocol.status as protocol_status,
  count(distinct assignment.id) as assignments,
  count(distinct assignment_tester.user_id) as testers
from public.studies study
left join public.protocols protocol on protocol.study_id = study.id and protocol.status = 'active'
left join public.assignments assignment on assignment.study_id = study.id
left join public.assignment_testers assignment_tester on assignment_tester.assignment_id = assignment.id
where study.configuration ->> 'seed_key' = 'grab-standard-vs-saver-parqal-v1'
group by study.study_code, study.name, study.status, protocol.protocol_code, protocol.status;
