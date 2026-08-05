create or replace function private.validate_matched_pair(p_pair_id uuid, p_actor_id uuid default null)
returns public.matched_pairs
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair_row public.matched_pairs;
  assignment_row public.assignments;
  protocol_row public.protocols;
  a public.submissions;
  b public.submissions;
  slot_a public.assignment_testers;
  slot_b public.assignment_testers;
  time_gap numeric;
  distance_feet numeric;
  fare_difference numeric;
  fare_percentage numeric;
  preferred_time numeric;
  maximum_time numeric;
  preferred_distance numeric;
  maximum_distance numeric;
  evidence_requirement jsonb;
  control jsonb;
  missing_required_evidence boolean := false;
  any_failure boolean := false;
  any_warning boolean := false;
  evidence_state public.evidence_integrity_status := 'complete';
  result_status public.rule_status;
begin
  select * into pair_row from public.matched_pairs where id = p_pair_id for update;
  if pair_row.id is null then raise exception 'Matched pair not found' using errcode = '22023'; end if;
  select * into assignment_row from public.assignments where id = pair_row.assignment_id;
  select * into protocol_row from public.protocols where id = assignment_row.protocol_id;
  select * into a from public.submissions where id = pair_row.submission_a_id and status = 'submitted';
  select * into b from public.submissions where id = pair_row.submission_b_id and status = 'submitted';
  select * into slot_a from public.assignment_testers where assignment_id = pair_row.assignment_id and slot = 'tester_a';
  select * into slot_b from public.assignment_testers where assignment_id = pair_row.assignment_id and slot = 'tester_b';
  if a.id is null or b.id is null or protocol_row.id is null then
    update public.matched_pairs set technical_status = 'incomplete' where id = p_pair_id returning * into pair_row;
    return pair_row;
  end if;

  delete from public.validation_results where matched_pair_id = p_pair_id;
  time_gap := abs(extract(epoch from (a.quote_timestamp - b.quote_timestamp)));
  distance_feet := 20902260.9584 * 2 * asin(sqrt(
    power(sin(radians((b.latitude - a.latitude)::double precision) / 2), 2) +
    cos(radians(a.latitude::double precision)) * cos(radians(b.latitude::double precision)) *
    power(sin(radians((b.longitude - a.longitude)::double precision) / 2), 2)
  ));
  fare_difference := abs(a.displayed_fare - b.displayed_fare);
  fare_percentage := case when least(a.displayed_fare, b.displayed_fare) > 0
    then fare_difference / least(a.displayed_fare, b.displayed_fare) * 100 else null end;
  preferred_time := coalesce((protocol_row.validation_configuration #>> '{request_time_gap,preferred_max_seconds}')::numeric, 60);
  maximum_time := coalesce((protocol_row.validation_configuration #>> '{request_time_gap,maximum_seconds}')::numeric, 300);
  preferred_distance := coalesce((protocol_row.validation_configuration #>> '{location_gap,preferred_max_feet}')::numeric, 100);
  maximum_distance := coalesce((protocol_row.validation_configuration #>> '{location_gap,maximum_feet}')::numeric, 500);

  result_status := case when a.platform_service_id = slot_a.platform_service_id and b.platform_service_id = slot_b.platform_service_id then 'pass' else 'fail' end;
  insert into public.validation_results values (gen_random_uuid(), p_pair_id, 'assigned_provider_tier', 'Assigned provider and ride tier', result_status, 'required', to_jsonb(a.platform_service_id), to_jsonb(b.platform_service_id), null, 'Each submission must retain its locked assignment service.', '{}'::jsonb, result_status = 'fail', now());
  any_failure := any_failure or result_status = 'fail';

  result_status := case when a.currency = b.currency then 'pass' else 'fail' end;
  insert into public.validation_results values (gen_random_uuid(), p_pair_id, 'currency', 'Currency', result_status, 'required', to_jsonb(a.currency), to_jsonb(b.currency), null, 'Both displayed fares must use the same study currency.', '{}'::jsonb, result_status = 'fail', now());
  any_failure := any_failure or result_status = 'fail';

  result_status := case when a.pickup_location = assignment_row.pickup_location and b.pickup_location = assignment_row.pickup_location then 'pass' else 'fail' end;
  insert into public.validation_results values (gen_random_uuid(), p_pair_id, 'pickup_location', 'Pickup location', result_status, 'required', to_jsonb(a.pickup_location), to_jsonb(b.pickup_location), null, 'Both submissions must use the locked assignment pickup.', '{}'::jsonb, result_status = 'fail', now());
  any_failure := any_failure or result_status = 'fail';

  result_status := case when a.destination_location = assignment_row.destination_location and b.destination_location = assignment_row.destination_location then 'pass' else 'fail' end;
  insert into public.validation_results values (gen_random_uuid(), p_pair_id, 'destination_location', 'Destination location', result_status, 'required', to_jsonb(a.destination_location), to_jsonb(b.destination_location), null, 'Both submissions must use the locked assignment destination.', '{}'::jsonb, result_status = 'fail', now());
  any_failure := any_failure or result_status = 'fail';

  result_status := case when time_gap <= preferred_time then 'pass' when time_gap <= maximum_time then 'warning' else 'fail' end;
  insert into public.validation_results values (gen_random_uuid(), p_pair_id, 'request_time_gap', 'Request-time gap', result_status, 'required', to_jsonb(a.quote_timestamp), to_jsonb(b.quote_timestamp), round(time_gap, 3) || ' seconds', 'Compares quote timestamps using the active protocol thresholds.', jsonb_build_object('preferred_max_seconds', preferred_time, 'maximum_seconds', maximum_time), result_status <> 'pass', now());
  any_failure := any_failure or result_status = 'fail'; any_warning := any_warning or result_status = 'warning';

  result_status := case when distance_feet <= preferred_distance then 'pass' when distance_feet <= maximum_distance then 'warning' else 'fail' end;
  insert into public.validation_results values (gen_random_uuid(), p_pair_id, 'location_gap', 'Location-distance gap', result_status, 'required', jsonb_build_object('latitude', a.latitude, 'longitude', a.longitude), jsonb_build_object('latitude', b.latitude, 'longitude', b.longitude), round(distance_feet, 3) || ' feet', 'Calculates the great-circle distance between captured coordinates.', jsonb_build_object('preferred_max_feet', preferred_distance, 'maximum_feet', maximum_distance), result_status <> 'pass', now());
  any_failure := any_failure or result_status = 'fail'; any_warning := any_warning or result_status = 'warning';

  for control in select value from jsonb_array_elements(protocol_row.fixed_controls)
    where value ->> 'code' in ('operating_system_family', 'app_version', 'device_model', 'network_category')
  loop
    result_status := case control ->> 'code'
      when 'operating_system_family' then case when lower(a.operating_system) = lower(b.operating_system) then 'pass' else 'fail' end
      when 'app_version' then case when a.app_version = b.app_version then 'pass' else 'fail' end
      when 'device_model' then case when a.device_type = b.device_type then 'pass' else 'fail' end
      else case when a.network_type = b.network_type then 'pass' else 'fail' end
    end;
    insert into public.validation_results values (gen_random_uuid(), p_pair_id, control ->> 'code', control ->> 'label', result_status,
      case when coalesce((control ->> 'required')::boolean, false)
        then 'required'::public.requirement_level
        else 'advisory'::public.requirement_level
      end,
      case control ->> 'code' when 'operating_system_family' then to_jsonb(a.operating_system) when 'app_version' then to_jsonb(a.app_version) when 'device_model' then to_jsonb(a.device_type) else to_jsonb(a.network_type) end,
      case control ->> 'code' when 'operating_system_family' then to_jsonb(b.operating_system) when 'app_version' then to_jsonb(b.app_version) when 'device_model' then to_jsonb(b.device_type) else to_jsonb(b.network_type) end,
      null, 'Exact comparison configured by the protocol.', control, result_status <> 'pass', now());
    if coalesce((control ->> 'required')::boolean, false) then any_failure := any_failure or result_status = 'fail';
    else any_warning := any_warning or result_status = 'fail'; end if;
  end loop;

  for evidence_requirement in select value from jsonb_array_elements(protocol_row.evidence_requirements)
  loop
    result_status := case when exists (select 1 from public.evidence_files where submission_id = a.id and evidence_type = evidence_requirement ->> 'code')
      and exists (select 1 from public.evidence_files where submission_id = b.id and evidence_type = evidence_requirement ->> 'code') then 'pass' else 'fail' end;
    insert into public.validation_results values (gen_random_uuid(), p_pair_id, 'evidence_' || (evidence_requirement ->> 'code'), evidence_requirement ->> 'label', result_status,
      case when coalesce((evidence_requirement ->> 'required')::boolean, false)
        then 'required'::public.requirement_level
        else 'advisory'::public.requirement_level
      end,
      to_jsonb((select count(*) from public.evidence_files where submission_id = a.id and evidence_type = evidence_requirement ->> 'code')),
      to_jsonb((select count(*) from public.evidence_files where submission_id = b.id and evidence_type = evidence_requirement ->> 'code')),
      null, 'Confirms that both submissions contain the configured evidence type.', evidence_requirement,
      coalesce((evidence_requirement ->> 'required')::boolean, false) and result_status = 'fail', now());
    if coalesce((evidence_requirement ->> 'required')::boolean, false) and result_status = 'fail' then missing_required_evidence := true; end if;
    if not coalesce((evidence_requirement ->> 'required')::boolean, false) and result_status = 'fail' then any_warning := true; end if;
  end loop;

  if exists (select 1 from public.evidence_files where submission_id in (a.id, b.id) and integrity_status in ('flagged', 'rejected')) then evidence_state := 'flagged';
  elsif exists (select 1 from public.evidence_files where submission_id in (a.id, b.id) and integrity_status = 'pending') then evidence_state := 'pending';
  elsif missing_required_evidence then evidence_state := 'pending'; end if;

  update public.matched_pairs set
    absolute_fare_difference = fare_difference,
    percentage_fare_difference = fare_percentage,
    higher_priced_slot = case
      when a.displayed_fare > b.displayed_fare then 'tester_a'::public.tester_slot
      when b.displayed_fare > a.displayed_fare then 'tester_b'::public.tester_slot
      else null::public.tester_slot
    end,
    timestamp_difference_seconds = time_gap,
    gps_distance_feet = distance_feet,
    technical_status = case
      when missing_required_evidence then 'incomplete'::public.pair_validation_status
      when any_failure then 'invalid'::public.pair_validation_status
      when any_warning then 'warning'::public.pair_validation_status
      else 'valid'::public.pair_validation_status
    end,
    evidence_status = evidence_state
  where id = p_pair_id returning * into pair_row;

  update public.assignments set status = 'completed' where id = pair_row.assignment_id;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (pair_row.study_id, p_actor_id, 'validation.completed', 'validation', 'pair', pair_row.id,
    jsonb_build_object('pair_code', pair_row.pair_code, 'technical_status', pair_row.technical_status, 'evidence_status', pair_row.evidence_status));
  return pair_row;
end;
$$;

drop trigger if exists matched_pairs_run_technical_validation on public.matched_pairs;

create or replace function private.create_pending_pair(p_assignment_id uuid, p_actor_id uuid)
returns public.matched_pairs
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_assignment public.assignments;
  submission_a public.submissions;
  submission_b public.submissions;
  created_pair public.matched_pairs;
begin
  select * into selected_assignment from public.assignments where id = p_assignment_id for update;
  select s.* into submission_a from public.submissions s join public.assignment_testers at on at.assignment_id = s.assignment_id and at.user_id = s.user_id
    where s.assignment_id = p_assignment_id and at.slot = 'tester_a' and s.status = 'submitted';
  select s.* into submission_b from public.submissions s join public.assignment_testers at on at.assignment_id = s.assignment_id and at.user_id = s.user_id
    where s.assignment_id = p_assignment_id and at.slot = 'tester_b' and s.status = 'submitted';
  if selected_assignment.id is null or submission_a.id is null or submission_b.id is null then return null; end if;

  insert into public.matched_pairs (pair_code, study_id, assignment_id, submission_a_id, submission_b_id, technical_status, evidence_status, paired_at)
  values (selected_assignment.assignment_code || '-PAIR', selected_assignment.study_id, selected_assignment.id, submission_a.id, submission_b.id, 'pending', 'pending', now())
  on conflict (assignment_id) do nothing returning * into created_pair;
  if created_pair.id is null then
    select * into created_pair from public.matched_pairs where assignment_id = p_assignment_id;
    return created_pair;
  end if;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (created_pair.study_id, p_actor_id, 'pair.created', 'validation', 'pair', created_pair.id,
    jsonb_build_object('pair_code', created_pair.pair_code, 'assignment_id', created_pair.assignment_id,
      'submission_a_id', created_pair.submission_a_id, 'submission_b_id', created_pair.submission_b_id));
  return private.validate_matched_pair(created_pair.id, p_actor_id);
end;
$$;

do $$ declare pair_record record; begin
  for pair_record in select id from public.matched_pairs where technical_status = 'pending' loop
    perform private.validate_matched_pair(pair_record.id, null);
  end loop;
end $$;

revoke all on function private.validate_matched_pair(uuid, uuid) from public;
revoke all on function private.create_pending_pair(uuid, uuid) from public;

comment on function private.validate_matched_pair(uuid, uuid) is
  'Runs deterministic protocol checks, stores rule-level results, and completes the assignment collection workflow.';
