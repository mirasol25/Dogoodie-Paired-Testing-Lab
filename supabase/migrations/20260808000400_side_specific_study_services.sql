-- Persist one locked service for each tester side. Existing single-service
-- studies remain same-tier comparisons by assigning that service to both sides.
create or replace function public.enforce_study_ride_tier_selection()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  service_ids uuid[];
  service_a public.platform_services;
  service_b public.platform_services;
  configured_a uuid;
  configured_b uuid;
  comparison_design text;
begin
  if not (new.configuration ? 'platform_service_ids') then return new; end if;

  select coalesce(array_agg(value::uuid order by ordinal), '{}'::uuid[])
  into service_ids
  from jsonb_array_elements_text(new.configuration -> 'platform_service_ids') with ordinality entries(value, ordinal);

  configured_a := coalesce(nullif(new.configuration ->> 'tester_a_service_id', '')::uuid, service_ids[1]);
  configured_b := coalesce(nullif(new.configuration ->> 'tester_b_service_id', '')::uuid, service_ids[2], service_ids[1]);
  if configured_a is null or configured_b is null then
    raise exception 'Select a provider and ride tier for both tester sides' using errcode = '22023';
  end if;

  select * into service_a from public.platform_services where id = configured_a;
  select * into service_b from public.platform_services where id = configured_b;
  if service_a.id is null or service_b.id is null then
    raise exception 'Both tester services must be valid catalogue entries' using errcode = '22023';
  end if;

  if new.study_type = 'within_platform_pair' then
    if service_a.platform_id <> service_b.platform_id then
      raise exception 'Within-platform studies require both tester services to use the same provider' using errcode = '22023';
    end if;
    comparison_design := case when configured_a = configured_b then 'same_tier' else 'different_tier' end;
  elsif new.study_type = 'cross_platform_comparison' then
    if service_a.platform_id = service_b.platform_id
      or service_a.normalized_service_category <> service_b.normalized_service_category then
      raise exception 'Cross-platform studies require different providers with the same ride category' using errcode = '22023';
    end if;
    comparison_design := 'cross_platform';
  end if;

  new.configuration := new.configuration || jsonb_build_object(
    'platform_service_ids', jsonb_build_array(configured_a, configured_b),
    'tester_a_service_id', configured_a,
    'tester_b_service_id', configured_b,
    'comparison_design', comparison_design
  );
  return new;
end;
$$;

update public.studies
set configuration = configuration || jsonb_build_object(
  'tester_a_service_id', configuration -> 'platform_service_ids' -> 0,
  'tester_b_service_id', coalesce(configuration -> 'platform_service_ids' -> 1, configuration -> 'platform_service_ids' -> 0)
)
where jsonb_typeof(configuration -> 'platform_service_ids') = 'array'
  and jsonb_array_length(configuration -> 'platform_service_ids') > 0
  and (not configuration ? 'tester_a_service_id' or not configuration ? 'tester_b_service_id');

create or replace function public.create_paired_assignment(
  p_study_id uuid,
  p_protocol_id uuid,
  p_route_id uuid,
  p_tester_a_id uuid,
  p_tester_b_id uuid,
  p_tester_a_service_id uuid,
  p_tester_b_service_id uuid,
  p_testing_date date,
  p_start_time time,
  p_end_time time,
  p_timezone text,
  p_instructions text default null
)
returns public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_study public.studies;
  selected_protocol public.protocols;
  selected_route public.study_routes;
  pickup public.study_locations;
  destination public.study_locations;
  service_a public.platform_services;
  service_b public.platform_services;
  configured_a uuid;
  configured_b uuid;
  starts_at timestamptz;
  ends_at timestamptz;
  next_number integer;
  created_assignment public.assignments;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to create assignments for this study' using errcode = '42501';
  end if;
  if p_tester_a_id = p_tester_b_id then raise exception 'Tester A and Tester B must be different people' using errcode = '22023'; end if;
  if p_end_time <= p_start_time then raise exception 'The testing window must end after it starts on the same date' using errcode = '22023'; end if;

  select * into selected_study from public.studies where id = p_study_id for update;
  select * into selected_protocol from public.protocols where id = p_protocol_id and study_id = p_study_id and status = 'active';
  select * into selected_route from public.study_routes where id = p_route_id and study_id = p_study_id and is_active;
  if selected_study.id is null or selected_protocol.id is null or selected_route.id is null then
    raise exception 'The study requires an active protocol and route' using errcode = '22023';
  end if;

  select * into pickup from public.study_locations where id = selected_route.pickup_location_id and study_id = p_study_id;
  select * into destination from public.study_locations where id = selected_route.destination_location_id and study_id = p_study_id;
  if pickup.timezone <> p_timezone then raise exception 'The assignment timezone must match the route pickup timezone' using errcode = '22023'; end if;

  starts_at := (p_testing_date + p_start_time) at time zone p_timezone;
  ends_at := (p_testing_date + p_end_time) at time zone p_timezone;
  if starts_at <= now() then raise exception 'The testing window must be in the future' using errcode = '22023'; end if;
  if selected_study.testing_starts_at is not null and starts_at < selected_study.testing_starts_at then raise exception 'The assignment starts before the study testing period' using errcode = '22023'; end if;
  if selected_study.testing_ends_at is not null and ends_at > selected_study.testing_ends_at then raise exception 'The assignment ends after the study testing period' using errcode = '22023'; end if;

  if (select count(*) from public.study_members sm join public.profiles p on p.id = sm.user_id
      where sm.study_id = p_study_id and sm.user_id in (p_tester_a_id, p_tester_b_id)
        and sm.study_role = 'tester' and sm.membership_status = 'active' and p.account_status = 'active') <> 2 then
    raise exception 'Both accounts must be active Tester members of this study' using errcode = '22023';
  end if;

  configured_a := coalesce(nullif(selected_study.configuration ->> 'tester_a_service_id', '')::uuid,
    nullif(selected_study.configuration -> 'platform_service_ids' ->> 0, '')::uuid);
  configured_b := coalesce(nullif(selected_study.configuration ->> 'tester_b_service_id', '')::uuid,
    nullif(selected_study.configuration -> 'platform_service_ids' ->> 1, '')::uuid, configured_a);
  if p_tester_a_service_id <> configured_a or p_tester_b_service_id <> configured_b then
    raise exception 'Assignment services must match the locked Tester A and Tester B study configuration' using errcode = '22023';
  end if;

  select * into service_a from public.platform_services where id = configured_a;
  select * into service_b from public.platform_services where id = configured_b;
  if service_a.id is null or service_b.id is null then raise exception 'The configured study service is unavailable' using errcode = '22023'; end if;
  if selected_study.study_type = 'within_platform_pair' and service_a.platform_id <> service_b.platform_id then
    raise exception 'Within-platform assignments require services from the same provider' using errcode = '22023';
  end if;
  if selected_study.study_type = 'cross_platform_comparison'
    and (service_a.platform_id = service_b.platform_id or service_a.normalized_service_category <> service_b.normalized_service_category) then
    raise exception 'Cross-platform assignments require different providers with the same ride category' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_study_id::text || ':assignment-code', 0));
  select coalesce(max(substring(assignment_code from '-A([0-9]+)$')::integer), 0) + 1 into next_number
  from public.assignments where study_id = p_study_id;

  insert into public.assignments (
    assignment_code, study_id, protocol_id, status, scheduled_start, scheduled_end,
    pickup_location, destination_location, isolated_variable, instructions, created_by
  ) values (
    selected_study.study_code || '-A' || lpad(next_number::text, 3, '0'), p_study_id, p_protocol_id,
    'not_started', starts_at, ends_at, pickup.label, destination.label, selected_protocol.isolated_variable,
    jsonb_build_object('route_id', p_route_id, 'timezone', p_timezone, 'operational_instructions', nullif(trim(coalesce(p_instructions, '')), '')),
    caller_id
  ) returning * into created_assignment;

  insert into public.assignment_testers (assignment_id, user_id, slot, platform_service_id, status, account_configuration, assigned_by)
  values
    (created_assignment.id, p_tester_a_id, 'tester_a', configured_a, 'assigned', jsonb_build_object('protocol_value', selected_protocol.tester_a_value), caller_id),
    (created_assignment.id, p_tester_b_id, 'tester_b', configured_b, 'assigned', jsonb_build_object('protocol_value', selected_protocol.tester_b_value), caller_id);

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'assignment.created', 'assignment', 'assignment', created_assignment.id,
    jsonb_build_object('assignment_code', created_assignment.assignment_code, 'protocol_id', p_protocol_id, 'route_id', p_route_id,
      'tester_a_id', p_tester_a_id, 'tester_b_id', p_tester_b_id, 'tester_a_service_id', configured_a,
      'tester_b_service_id', configured_b, 'scheduled_start', starts_at, 'scheduled_end', ends_at, 'timezone', p_timezone));

  return created_assignment;
end;
$$;

comment on function public.enforce_study_ride_tier_selection() is
  'Persists and validates the locked provider and ride tier for each tester side.';
comment on function public.create_paired_assignment(uuid, uuid, uuid, uuid, uuid, uuid, uuid, date, time, time, text, text) is
  'Creates a paired assignment using the study-locked Tester A and Tester B services.';
