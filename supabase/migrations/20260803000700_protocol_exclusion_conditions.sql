create or replace function public.save_protocol_exclusion_conditions(
  p_study_id uuid,
  p_protocol_id uuid,
  p_optional_exclusions text[] default '{}'::text[]
)
returns public.protocols
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  current_protocol public.protocols;
  updated_protocol public.protocols;
  allowed_optional constant text[] := array[
    'outside_assignment_window',
    'declared_protocol_deviation',
    'evidence_timestamp_mismatch',
    'duplicate_evidence'
  ];
  exclusions jsonb := '[]'::jsonb;
  element jsonb;
  item text;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_optional_exclusions, '{}'::text[])) value
    where not (value = any(allowed_optional))
  ) then
    raise exception 'An exclusion condition is not supported' using errcode = '22023';
  end if;

  select * into current_protocol
  from public.protocols
  where id = p_protocol_id and study_id = p_study_id and status = 'draft'
  for update;
  if current_protocol.id is null then
    raise exception 'Only a draft protocol can be edited' using errcode = '22023';
  end if;

  for element in select value from jsonb_array_elements(current_protocol.fixed_controls) loop
    exclusions := exclusions || jsonb_build_array(jsonb_build_object(
      'code', (element ->> 'code') || '_mismatch',
      'label', (element ->> 'label') || ' does not match',
      'severity', 'fail',
      'required', true
    ));
  end loop;

  exclusions := exclusions || jsonb_build_array(
    jsonb_build_object('code', 'maximum_request_time_gap_exceeded', 'label', 'Maximum request-time gap exceeded', 'severity', 'fail', 'required', true),
    jsonb_build_object('code', 'maximum_location_gap_exceeded', 'label', 'Maximum location-distance gap exceeded', 'severity', 'fail', 'required', true)
  );

  for element in select value from jsonb_array_elements(current_protocol.evidence_requirements) where coalesce((value ->> 'required')::boolean, false) loop
    exclusions := exclusions || jsonb_build_array(jsonb_build_object(
      'code', 'missing_' || (element ->> 'code'),
      'label', 'Missing ' || lower(element ->> 'label'),
      'severity', 'fail',
      'required', true
    ));
  end loop;

  for element in
    select value
    from jsonb_array_elements(coalesce(current_protocol.validation_configuration -> 'observation_fields', '[]'::jsonb))
    where coalesce((value ->> 'required')::boolean, false)
  loop
    exclusions := exclusions || jsonb_build_array(jsonb_build_object(
      'code', 'missing_' || (element ->> 'code'),
      'label', 'Missing ' || lower(element ->> 'label'),
      'severity', 'fail',
      'required', true
    ));
  end loop;

  foreach item in array coalesce(p_optional_exclusions, '{}'::text[]) loop
    exclusions := exclusions || jsonb_build_array(jsonb_build_object(
      'code', item,
      'label', case item
        when 'outside_assignment_window' then 'Observation outside assignment window'
        when 'declared_protocol_deviation' then 'Tester declared a protocol deviation'
        when 'evidence_timestamp_mismatch' then 'Evidence timestamp does not match observation'
        else 'Duplicate evidence submitted'
      end,
      'severity', 'fail',
      'required', false
    ));
  end loop;

  update public.protocols
  set exclusion_conditions = exclusions
  where id = current_protocol.id
  returning * into updated_protocol;

  insert into public.activity_logs (
    study_id, actor_id, action, category, target_type, target_id, details
  ) values (
    p_study_id, caller_id, 'protocol.exclusions_saved', 'protocol', 'protocol', updated_protocol.id,
    jsonb_build_object(
      'version', updated_protocol.version,
      'automatic_failure_count', jsonb_array_length(exclusions),
      'optional_exclusions', to_jsonb(coalesce(p_optional_exclusions, '{}'::text[]))
    )
  );

  return updated_protocol;
end;
$$;

revoke all on function public.save_protocol_exclusion_conditions(uuid, uuid, text[]) from public;
grant execute on function public.save_protocol_exclusion_conditions(uuid, uuid, text[]) to authenticated;

comment on function public.save_protocol_exclusion_conditions(uuid, uuid, text[]) is
  'Derives mandatory failure rules from the draft protocol and appends approved operational exclusions.';
