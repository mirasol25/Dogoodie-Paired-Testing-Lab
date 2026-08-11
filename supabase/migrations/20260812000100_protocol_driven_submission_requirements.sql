-- The tester only enters protocol-selected supplemental observations. Core
-- assignment, study, OCR, and system values are already derived elsewhere.
create or replace function public.submit_tester_observation(p_assignment_id uuid)
returns public.submissions
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  selected_assignment public.assignments;
  selected_slot public.assignment_testers;
  selected_submission public.submissions;
  selected_protocol public.protocols;
  missing_evidence text[];
  missing_observations text[];
  submitted_count integer;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_assignment from public.assignments where id = p_assignment_id for update;
  select * into selected_slot from public.assignment_testers where assignment_id = p_assignment_id and user_id = caller_id for update;
  select * into selected_submission from public.submissions where assignment_id = p_assignment_id and user_id = caller_id for update;
  if selected_assignment.id is null or selected_slot.id is null or selected_submission.id is null or selected_slot.platform_service_id is null then raise exception 'An owned assignment submission draft is required' using errcode = '42501'; end if;
  if selected_assignment.status not in ('in_progress', 'awaiting_partner') or selected_slot.status <> 'in_progress' or selected_submission.status <> 'draft' then raise exception 'This observation cannot be submitted' using errcode = '22023'; end if;
  if selected_submission.displayed_fare is null or selected_submission.currency is null or selected_submission.quote_timestamp is null or selected_submission.latitude is null or selected_submission.longitude is null then
    raise exception 'Complete the confirmed screenshot and current location before submitting' using errcode = '22023';
  end if;
  if selected_submission.quote_timestamp < selected_assignment.scheduled_start or selected_submission.quote_timestamp > selected_assignment.scheduled_end then raise exception 'Quote timestamp is outside the assignment testing window' using errcode = '22023'; end if;
  select * into selected_protocol from public.protocols where id = selected_assignment.protocol_id;
  select coalesce(array_agg(field ->> 'label' order by field ->> 'label'), '{}'::text[]) into missing_observations
  from jsonb_array_elements(coalesce(selected_protocol.validation_configuration -> 'observation_fields', '[]'::jsonb)) field
  where field ->> 'source' = 'tester'
    and field ->> 'code' = any(array['estimated_arrival_time', 'availability', 'price_breakdown', 'tester_notes', 'app_version', 'battery_percentage', 'network_category', 'account_age_membership'])
    and coalesce((field ->> 'required')::boolean, false)
    and case field ->> 'code'
      when 'app_version' then nullif(trim(selected_submission.app_version), '') is not null
      when 'battery_percentage' then selected_submission.battery_percentage is not null
      when 'network_category' then nullif(trim(selected_submission.network_type), '') is not null
      when 'tester_notes' then nullif(trim(selected_submission.notes), '') is not null
      else nullif(trim(selected_submission.observation_data ->> (field ->> 'code')), '') is not null
    end = false;
  if cardinality(missing_observations) > 0 then raise exception 'Complete required protocol fields: %', array_to_string(missing_observations, ', ') using errcode = '22023'; end if;
  perform public.assert_screenshot_service_ready(selected_submission.id, selected_slot.platform_service_id);
  select coalesce(array_agg(requirement ->> 'label'), '{}'::text[]) into missing_evidence from jsonb_array_elements(selected_protocol.evidence_requirements) requirement where coalesce((requirement ->> 'required')::boolean, false) and not exists (select 1 from public.evidence_files ef where ef.submission_id = selected_submission.id and ef.evidence_type = requirement ->> 'code');
  if cardinality(missing_evidence) > 0 then raise exception 'Missing required evidence: %', array_to_string(missing_evidence, ', ') using errcode = '22023'; end if;
  update public.submissions set status = 'submitted', submitted_at = now() where id = selected_submission.id returning * into selected_submission;
  update public.assignment_testers set status = 'submitted' where id = selected_slot.id;
  select count(*) into submitted_count from public.assignment_testers where assignment_id = p_assignment_id and status = 'submitted';
  update public.assignments set status = case when submitted_count = 2 then 'ready_for_validation'::public.assignment_status else 'awaiting_partner'::public.assignment_status end where id = p_assignment_id;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details) values (selected_assignment.study_id, caller_id, 'submission.submitted', 'submission', 'submission', selected_submission.id, jsonb_build_object('submission_code', selected_submission.submission_code, 'assignment_id', p_assignment_id, 'slot', selected_slot.slot, 'submitted_at', selected_submission.submitted_at, 'assignment_status', case when submitted_count = 2 then 'ready_for_validation' else 'awaiting_partner' end));
  if submitted_count = 2 then perform private.create_pending_pair(p_assignment_id, caller_id); end if;
  return selected_submission;
end;
$$;

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
  allowed_observations constant text[] := array['estimated_arrival_time', 'availability', 'price_breakdown', 'tester_notes', 'app_version', 'battery_percentage', 'network_category', 'account_age_membership'];
  evidence jsonb;
  observations jsonb;
  item text;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then raise exception 'You are not authorized to manage this study' using errcode = '42501'; end if;
  if cardinality(coalesce(p_optional_evidence, '{}'::text[])) > 0 then raise exception 'Screenshot and screen recording are fixed required evidence' using errcode = '22023'; end if;
  if exists (select 1 from unnest(coalesce(p_optional_observation_fields, '{}'::text[])) value where not (value = any(allowed_observations))) then raise exception 'An observation requirement is not supported' using errcode = '22023'; end if;
  select * into current_protocol from public.protocols where id = p_protocol_id and study_id = p_study_id and status = 'draft' for update;
  if current_protocol.id is null then raise exception 'Only a draft protocol can be edited' using errcode = '22023'; end if;
  evidence := jsonb_build_array(
    jsonb_build_object('code', 'screenshot', 'label', 'Quote screenshot', 'required', true),
    jsonb_build_object('code', 'screen_recording', 'label', 'Screen recording', 'required', true)
  );
  observations := jsonb_build_array(
    jsonb_build_object('code', 'provider', 'label', 'Provider', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'normalized_service_category', 'label', 'Normalized service category', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'displayed_price', 'label', 'Displayed price', 'required', true, 'source', 'screenshot'),
    jsonb_build_object('code', 'currency', 'label', 'Currency', 'required', true, 'source', 'study'),
    jsonb_build_object('code', 'pickup_destination', 'label', 'Pickup and destination', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'request_timestamp', 'label', 'Request timestamp', 'required', true, 'source', 'screenshot'),
    jsonb_build_object('code', 'tester_side', 'label', 'Tester side', 'required', true, 'source', 'assignment'),
    jsonb_build_object('code', 'controlled_attribute', 'label', 'Controlled attribute', 'required', true, 'source', 'study'),
    jsonb_build_object('code', 'submission_timestamp', 'label', 'Submission timestamp', 'required', true, 'source', 'system')
  );
  foreach item in array allowed_observations loop
    if item = any(coalesce(p_optional_observation_fields, '{}'::text[])) then
      observations := observations || jsonb_build_array(jsonb_build_object(
        'code', item,
        'label', case item
          when 'estimated_arrival_time' then 'Estimated arrival time'
          when 'availability' then 'Ride availability'
          when 'price_breakdown' then 'Price breakdown'
          when 'tester_notes' then 'Tester notes'
          when 'app_version' then 'App version'
          when 'battery_percentage' then 'Battery percentage'
          when 'network_category' then 'Network category'
          else 'Account age or membership status'
        end,
        'required', true,
        'source', 'tester'
      ));
    end if;
  end loop;
  update public.protocols set evidence_requirements = evidence, validation_configuration = validation_configuration || jsonb_build_object('observation_fields', observations) where id = current_protocol.id returning * into updated_protocol;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details) values (p_study_id, caller_id, 'protocol.requirements_saved', 'protocol', 'protocol', updated_protocol.id, jsonb_build_object('version', updated_protocol.version, 'required_evidence', jsonb_build_array('screenshot', 'screen_recording'), 'observation_fields', to_jsonb(coalesce(p_optional_observation_fields, '{}'::text[]))));
  return updated_protocol;
end;
$$;

-- Existing protocol versions retain their fixed fields but normalize any
-- enabled supplemental fields so the tester form and database agree.
update public.protocols
set validation_configuration = validation_configuration || jsonb_build_object(
  'observation_fields', coalesce((
    select jsonb_agg(
      case
        when field ->> 'source' = 'tester'
          and field ->> 'code' = any(array['estimated_arrival_time', 'availability', 'price_breakdown', 'tester_notes', 'app_version', 'battery_percentage', 'network_category', 'account_age_membership'])
          then jsonb_set(field, '{required}', 'true'::jsonb)
        else field
      end
    )
    from jsonb_array_elements(coalesce(protocols.validation_configuration -> 'observation_fields', '[]'::jsonb)) field
    where field ->> 'code' not in ('device_model', 'operating_system_family')
  ), '[]'::jsonb)
)
where status = 'draft';
