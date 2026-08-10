-- A tester observation must be captured at the locked route pickup, not merely
-- near the paired tester. Enforce the active protocol boundary before a draft
-- can be saved and expose the same calculation for immediate UI feedback.
create or replace function private.assignment_pickup_proximity(
  p_assignment_id uuid,
  p_latitude numeric,
  p_longitude numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_row public.assignments;
  route_row public.study_routes;
  pickup public.study_locations;
  protocol_row public.protocols;
  preferred_distance numeric;
  maximum_distance numeric;
  distance_feet numeric;
begin
  select * into assignment_row from public.assignments where id = p_assignment_id;
  if assignment_row.id is null then raise exception 'Assignment not found' using errcode = '22023'; end if;
  select * into route_row from public.study_routes
    where id = nullif(assignment_row.instructions ->> 'route_id', '')::uuid
      and study_id = assignment_row.study_id;
  select * into pickup from public.study_locations where id = route_row.pickup_location_id;
  select * into protocol_row from public.protocols where id = assignment_row.protocol_id;
  if pickup.id is null then raise exception 'The assignment pickup pin is unavailable' using errcode = '22023'; end if;

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
  distance_feet := 20902260.9584 * 2 * asin(sqrt(
    power(sin(radians((p_latitude - pickup.latitude)::double precision) / 2), 2) +
    cos(radians(pickup.latitude::double precision)) * cos(radians(p_latitude::double precision)) *
    power(sin(radians((p_longitude - pickup.longitude)::double precision) / 2), 2)
  ));

  return jsonb_build_object(
    'distance_feet', round(distance_feet, 1),
    'preferred_max_feet', preferred_distance,
    'maximum_feet', maximum_distance,
    'status', case when distance_feet <= preferred_distance then 'pass' when distance_feet <= maximum_distance then 'warning' else 'fail' end,
    'pickup_label', pickup.label
  );
end;
$$;

revoke all on function private.assignment_pickup_proximity(uuid,numeric,numeric) from public;

create or replace function public.validate_assignment_pickup_location(
  p_assignment_id uuid,
  p_latitude numeric,
  p_longitude numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.assignment_testers
    where assignment_id = p_assignment_id and user_id = auth.uid() and status <> 'removed'
  ) then raise exception 'You are not assigned to this testing session' using errcode = '42501'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Current location coordinates are invalid' using errcode = '22023';
  end if;
  return private.assignment_pickup_proximity(p_assignment_id, p_latitude, p_longitude);
end;
$$;

revoke all on function public.validate_assignment_pickup_location(uuid,numeric,numeric) from public;
grant execute on function public.validate_assignment_pickup_location(uuid,numeric,numeric) to authenticated;

create or replace function private.enforce_submission_pickup_proximity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if new.latitude is null or new.longitude is null then return new; end if;
  result := private.assignment_pickup_proximity(new.assignment_id, new.latitude, new.longitude);
  if result ->> 'status' = 'fail' then
    raise exception 'Current location is % feet from %. You must be within % feet of the assigned pickup pin',
      result ->> 'distance_feet', result ->> 'pickup_label', result ->> 'maximum_feet'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_submission_pickup_proximity() from public;

drop trigger if exists submissions_enforce_pickup_proximity on public.submissions;
create trigger submissions_enforce_pickup_proximity
before insert or update of latitude, longitude on public.submissions
for each row execute function private.enforce_submission_pickup_proximity();

comment on function public.validate_assignment_pickup_location(uuid,numeric,numeric) is
  'Returns the current tester distance from the locked assignment pickup using active protocol thresholds.';
