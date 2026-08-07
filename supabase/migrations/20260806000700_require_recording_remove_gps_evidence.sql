create or replace function public.save_protocol_evidence_observation_requirements(
  p_study_id uuid,
  p_protocol_id uuid,
  p_optional_evidence text[] default '{}'::text[],
  p_optional_observation_fields text[] default '{}'::text[]
)
returns public.protocols
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  current_protocol public.protocols;
  updated_protocol public.protocols;
  allowed_observations constant text[] := array['estimated_arrival_time', 'availability', 'price_breakdown', 'tester_notes', 'app_version', 'device_model', 'operating_system_family', 'network_category', 'account_age_membership'];
  evidence jsonb;
  observations jsonb;
  control_codes text[];
  item text;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then raise exception 'You are not authorized to manage this study' using errcode = '42501'; end if;
  if cardinality(coalesce(p_optional_evidence, '{}'::text[])) > 0 then raise exception 'Screenshot and screen recording are fixed required evidence. GPS coordinates are captured in the tester observation.' using errcode = '22023'; end if;
  if exists (select 1 from unnest(coalesce(p_optional_observation_fields, '{}'::text[])) value where not (value = any(allowed_observations))) then raise exception 'An observation requirement is not supported' using errcode = '22023'; end if;

  select * into current_protocol from public.protocols where id = p_protocol_id and study_id = p_study_id and status = 'draft' for update;
  if current_protocol.id is null then raise exception 'Only a draft protocol can be edited' using errcode = '22023'; end if;
  select coalesce(array_agg(element ->> 'code'), '{}'::text[]) into control_codes from jsonb_array_elements(current_protocol.fixed_controls) element;

  evidence := jsonb_build_array(
    jsonb_build_object('code', 'screenshot', 'label', 'Quote screenshot', 'required', true),
    jsonb_build_object('code', 'screen_recording', 'label', 'Screen recording', 'required', true)
  );
  observations := jsonb_build_array(
    jsonb_build_object('code', 'provider', 'label', 'Provider', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'normalized_service_category', 'label', 'Normalized service category', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'displayed_price', 'label', 'Displayed price', 'required', true, 'source', 'tester'),
    jsonb_build_object('code', 'currency', 'label', 'Currency', 'required', true, 'source', 'study'),
    jsonb_build_object('code', 'pickup_destination', 'label', 'Pickup and destination', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'request_timestamp', 'label', 'Request timestamp', 'required', true, 'source', 'tester'),
    jsonb_build_object('code', 'tester_side', 'label', 'Tester side', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'controlled_attribute', 'label', 'Controlled attribute', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'submission_timestamp', 'label', 'Submission timestamp', 'required', true, 'source', 'system')
  );
  foreach item in array allowed_observations loop
    if item = any(coalesce(p_optional_observation_fields, '{}'::text[])) or item = any(control_codes) then
      observations := observations || jsonb_build_array(jsonb_build_object('code', item, 'label', case item when 'estimated_arrival_time' then 'Estimated arrival time' when 'availability' then 'Ride availability' when 'price_breakdown' then 'Price breakdown' when 'tester_notes' then 'Tester notes' when 'app_version' then 'App version' when 'device_model' then 'Device model' when 'operating_system_family' then 'Operating-system family' when 'network_category' then 'Network category' else 'Account age or membership status' end, 'required', item = any(control_codes), 'source', 'tester'));
    end if;
  end loop;

  update public.protocols set evidence_requirements = evidence, validation_configuration = validation_configuration || jsonb_build_object('observation_fields', observations) where id = current_protocol.id returning * into updated_protocol;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details) values (p_study_id, caller_id, 'protocol.requirements_saved', 'protocol', 'protocol', updated_protocol.id, jsonb_build_object('version', updated_protocol.version, 'required_evidence', jsonb_build_array('screenshot', 'screen_recording'), 'optional_observation_fields', to_jsonb(coalesce(p_optional_observation_fields, '{}'::text[]))));
  return updated_protocol;
end;
$$;

update public.protocols
set evidence_requirements = jsonb_build_array(
  jsonb_build_object('code', 'screenshot', 'label', 'Quote screenshot', 'required', true),
  jsonb_build_object('code', 'screen_recording', 'label', 'Screen recording', 'required', true)
)
where status in ('draft', 'active', 'superseded');
