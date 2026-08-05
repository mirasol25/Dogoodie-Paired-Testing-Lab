create or replace function public.save_protocol_validation_thresholds(
  p_study_id uuid,
  p_protocol_id uuid,
  p_preferred_time_gap_seconds integer,
  p_maximum_time_gap_seconds integer,
  p_preferred_location_gap_feet integer,
  p_maximum_location_gap_feet integer
)
returns public.protocols
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  updated_protocol public.protocols;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  if p_preferred_time_gap_seconds < 1
    or p_maximum_time_gap_seconds <= p_preferred_time_gap_seconds
    or p_maximum_time_gap_seconds > 3600 then
    raise exception 'Request-time thresholds are invalid' using errcode = '22023';
  end if;
  if p_preferred_location_gap_feet < 1
    or p_maximum_location_gap_feet <= p_preferred_location_gap_feet
    or p_maximum_location_gap_feet > 5280 then
    raise exception 'Location-distance thresholds are invalid' using errcode = '22023';
  end if;

  update public.protocols
  set validation_configuration = validation_configuration || jsonb_build_object(
    'request_time_gap', jsonb_build_object(
      'preferred_max_seconds', p_preferred_time_gap_seconds,
      'maximum_seconds', p_maximum_time_gap_seconds
    ),
    'location_gap', jsonb_build_object(
      'preferred_max_feet', p_preferred_location_gap_feet,
      'maximum_feet', p_maximum_location_gap_feet
    )
  )
  where id = p_protocol_id and study_id = p_study_id and status = 'draft'
  returning * into updated_protocol;

  if updated_protocol.id is null then
    raise exception 'Only a draft protocol can be edited' using errcode = '22023';
  end if;

  insert into public.activity_logs (
    study_id, actor_id, action, category, target_type, target_id, details
  ) values (
    p_study_id,
    caller_id,
    'protocol.validation_thresholds_saved',
    'protocol',
    'protocol',
    updated_protocol.id,
    jsonb_build_object(
      'version', updated_protocol.version,
      'preferred_time_gap_seconds', p_preferred_time_gap_seconds,
      'maximum_time_gap_seconds', p_maximum_time_gap_seconds,
      'preferred_location_gap_feet', p_preferred_location_gap_feet,
      'maximum_location_gap_feet', p_maximum_location_gap_feet
    )
  );

  return updated_protocol;
end;
$$;

revoke all on function public.save_protocol_validation_thresholds(uuid, uuid, integer, integer, integer, integer) from public;
grant execute on function public.save_protocol_validation_thresholds(uuid, uuid, integer, integer, integer, integer) to authenticated;

comment on function public.save_protocol_validation_thresholds(uuid, uuid, integer, integer, integer, integer) is
  'Stores configurable pass, warning, and failure boundaries for request synchronization and location proximity.';
