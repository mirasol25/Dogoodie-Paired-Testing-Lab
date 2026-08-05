create or replace function private.validate_pickup_pin_proximity(p_pair_id uuid)
returns public.matched_pairs
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair_row public.matched_pairs;
  assignment_row public.assignments;
  protocol_row public.protocols;
  route_row public.study_routes;
  pickup public.study_locations;
  a public.submissions;
  b public.submissions;
  distance_a numeric;
  distance_b numeric;
  preferred_distance numeric;
  maximum_distance numeric;
  status_a public.rule_status;
  status_b public.rule_status;
begin
  select * into pair_row from public.matched_pairs where id = p_pair_id for update;
  if pair_row.id is null then raise exception 'Matched pair not found' using errcode = '22023'; end if;
  select * into assignment_row from public.assignments where id = pair_row.assignment_id;
  select * into protocol_row from public.protocols where id = assignment_row.protocol_id;
  select * into route_row from public.study_routes
    where id = nullif(assignment_row.instructions ->> 'route_id', '')::uuid and study_id = pair_row.study_id;
  select * into pickup from public.study_locations where id = route_row.pickup_location_id;
  select * into a from public.submissions where id = pair_row.submission_a_id;
  select * into b from public.submissions where id = pair_row.submission_b_id;

  preferred_distance := coalesce(
    (protocol_row.validation_configuration #>> '{pickup_location_gap,preferred_max_feet}')::numeric,
    (protocol_row.validation_configuration #>> '{location_gap,preferred_max_feet}')::numeric,
    100
  );
  maximum_distance := coalesce(
    (protocol_row.validation_configuration #>> '{pickup_location_gap,maximum_feet}')::numeric,
    (protocol_row.validation_configuration #>> '{location_gap,maximum_feet}')::numeric,
    500
  );

  if pickup.id is null or a.latitude is null or a.longitude is null then status_a := 'fail';
  else
    distance_a := 20902260.9584 * 2 * asin(sqrt(
      power(sin(radians((a.latitude - pickup.latitude)::double precision) / 2), 2) +
      cos(radians(pickup.latitude::double precision)) * cos(radians(a.latitude::double precision)) *
      power(sin(radians((a.longitude - pickup.longitude)::double precision) / 2), 2)
    ));
    status_a := case when distance_a <= preferred_distance then 'pass' when distance_a <= maximum_distance then 'warning' else 'fail' end;
  end if;

  if pickup.id is null or b.latitude is null or b.longitude is null then status_b := 'fail';
  else
    distance_b := 20902260.9584 * 2 * asin(sqrt(
      power(sin(radians((b.latitude - pickup.latitude)::double precision) / 2), 2) +
      cos(radians(pickup.latitude::double precision)) * cos(radians(b.latitude::double precision)) *
      power(sin(radians((b.longitude - pickup.longitude)::double precision) / 2), 2)
    ));
    status_b := case when distance_b <= preferred_distance then 'pass' when distance_b <= maximum_distance then 'warning' else 'fail' end;
  end if;

  insert into public.validation_results (
    matched_pair_id, rule_code, label, status, requirement_level, tester_a_value,
    tester_b_value, observed_difference, explanation, threshold_configuration, affects_overall_status
  ) values (
    p_pair_id, 'tester_a_pickup_proximity', 'Tester A proximity to pickup pin', status_a, 'required',
    jsonb_build_object('latitude', a.latitude, 'longitude', a.longitude),
    jsonb_build_object('latitude', pickup.latitude, 'longitude', pickup.longitude),
    case when distance_a is null then 'Coordinates unavailable' else round(distance_a, 3) || ' feet from pickup' end,
    'Compares Tester A captured coordinates with the locked assignment pickup pin.',
    jsonb_build_object('preferred_max_feet', preferred_distance, 'maximum_feet', maximum_distance), status_a <> 'pass'
  ) on conflict (matched_pair_id, rule_code) do update set
    status = excluded.status, tester_a_value = excluded.tester_a_value, tester_b_value = excluded.tester_b_value,
    observed_difference = excluded.observed_difference, explanation = excluded.explanation,
    threshold_configuration = excluded.threshold_configuration, affects_overall_status = excluded.affects_overall_status;

  insert into public.validation_results (
    matched_pair_id, rule_code, label, status, requirement_level, tester_a_value,
    tester_b_value, observed_difference, explanation, threshold_configuration, affects_overall_status
  ) values (
    p_pair_id, 'tester_b_pickup_proximity', 'Tester B proximity to pickup pin', status_b, 'required',
    jsonb_build_object('latitude', b.latitude, 'longitude', b.longitude),
    jsonb_build_object('latitude', pickup.latitude, 'longitude', pickup.longitude),
    case when distance_b is null then 'Coordinates unavailable' else round(distance_b, 3) || ' feet from pickup' end,
    'Compares Tester B captured coordinates with the locked assignment pickup pin.',
    jsonb_build_object('preferred_max_feet', preferred_distance, 'maximum_feet', maximum_distance), status_b <> 'pass'
  ) on conflict (matched_pair_id, rule_code) do update set
    status = excluded.status, tester_a_value = excluded.tester_a_value, tester_b_value = excluded.tester_b_value,
    observed_difference = excluded.observed_difference, explanation = excluded.explanation,
    threshold_configuration = excluded.threshold_configuration, affects_overall_status = excluded.affects_overall_status;

  update public.matched_pairs set technical_status = case
    when pickup.id is null or a.latitude is null or a.longitude is null or b.latitude is null or b.longitude is null then 'incomplete'::public.pair_validation_status
    when status_a = 'fail' or status_b = 'fail' then 'invalid'::public.pair_validation_status
    when technical_status in ('invalid', 'incomplete') then technical_status
    when status_a = 'warning' or status_b = 'warning' then 'warning'::public.pair_validation_status
    else technical_status
  end where id = p_pair_id returning * into pair_row;
  return pair_row;
end;
$$;

create or replace function private.validate_pickup_after_technical_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.action = 'validation.completed' and new.target_type = 'pair' and new.target_id is not null then
    perform private.validate_pickup_pin_proximity(new.target_id);
  end if;
  return new;
end;
$$;

drop trigger if exists activity_logs_validate_pickup_proximity on public.activity_logs;
create trigger activity_logs_validate_pickup_proximity
after insert on public.activity_logs
for each row execute function private.validate_pickup_after_technical_completion();

do $$
declare pair_record record;
begin
  for pair_record in select id from public.matched_pairs loop
    perform private.validate_pickup_pin_proximity(pair_record.id);
  end loop;
end;
$$;

revoke all on function private.validate_pickup_pin_proximity(uuid) from public;
revoke all on function private.validate_pickup_after_technical_completion() from public;

comment on function private.validate_pickup_pin_proximity(uuid) is
  'Validates each tester location against the assignment pickup pin without rejecting the stored submission.';
