create or replace function public.submit_tester_observation(p_assignment_id uuid)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_assignment public.assignments;
  selected_slot public.assignment_testers;
  selected_submission public.submissions;
  selected_protocol public.protocols;
  missing_evidence text[];
  submitted_count integer;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_assignment from public.assignments where id = p_assignment_id for update;
  select * into selected_slot from public.assignment_testers where assignment_id = p_assignment_id and user_id = caller_id for update;
  select * into selected_submission from public.submissions where assignment_id = p_assignment_id and user_id = caller_id for update;
  if selected_assignment.id is null or selected_slot.id is null or selected_submission.id is null then
    raise exception 'An owned assignment submission draft is required' using errcode = '42501';
  end if;
  if selected_assignment.status not in ('in_progress', 'awaiting_partner') or selected_slot.status <> 'in_progress' or selected_submission.status <> 'draft' then
    raise exception 'This observation cannot be submitted' using errcode = '22023';
  end if;
  if selected_submission.displayed_fare is null or selected_submission.currency is null
    or selected_submission.quote_timestamp is null or selected_submission.latitude is null or selected_submission.longitude is null
    or selected_submission.network_type is null or selected_submission.device_type is null
    or selected_submission.operating_system is null or selected_submission.operating_system_version is null
    or selected_submission.app_version is null then
    raise exception 'Complete the observation before submitting' using errcode = '22023';
  end if;
  if selected_submission.quote_timestamp < selected_assignment.scheduled_start or selected_submission.quote_timestamp > selected_assignment.scheduled_end then
    raise exception 'Quote timestamp is outside the assignment testing window' using errcode = '22023';
  end if;

  select * into selected_protocol from public.protocols where id = selected_assignment.protocol_id;
  select coalesce(array_agg(requirement ->> 'label'), '{}'::text[]) into missing_evidence
  from jsonb_array_elements(selected_protocol.evidence_requirements) requirement
  where coalesce((requirement ->> 'required')::boolean, false)
    and not exists (
      select 1 from public.evidence_files ef
      where ef.submission_id = selected_submission.id and ef.evidence_type = requirement ->> 'code'
    );
  if cardinality(missing_evidence) > 0 then
    raise exception 'Missing required evidence: %', array_to_string(missing_evidence, ', ') using errcode = '22023';
  end if;

  update public.submissions set status = 'submitted', submitted_at = now()
  where id = selected_submission.id returning * into selected_submission;
  update public.assignment_testers set status = 'submitted' where id = selected_slot.id;

  select count(*) into submitted_count from public.assignment_testers
  where assignment_id = p_assignment_id and status = 'submitted';
  update public.assignments
  set status = case when submitted_count = 2 then 'ready_for_validation'::public.assignment_status else 'awaiting_partner'::public.assignment_status end
  where id = p_assignment_id;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected_assignment.study_id, caller_id, 'submission.submitted', 'submission', 'submission', selected_submission.id,
    jsonb_build_object('submission_code', selected_submission.submission_code, 'assignment_id', p_assignment_id,
      'slot', selected_slot.slot, 'submitted_at', selected_submission.submitted_at,
      'assignment_status', case when submitted_count = 2 then 'ready_for_validation' else 'awaiting_partner' end));
  return selected_submission;
end;
$$;

revoke all on function public.submit_tester_observation(uuid) from public;
grant execute on function public.submit_tester_observation(uuid) to authenticated;

comment on function public.submit_tester_observation(uuid) is
  'Finalizes the caller observation after required evidence and advances the paired assignment lifecycle.';
