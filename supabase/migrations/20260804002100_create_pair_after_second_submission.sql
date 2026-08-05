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
  select * into selected_assignment
  from public.assignments
  where id = p_assignment_id
  for update;

  select s.* into submission_a
  from public.submissions s
  join public.assignment_testers at
    on at.assignment_id = s.assignment_id and at.user_id = s.user_id
  where s.assignment_id = p_assignment_id
    and at.slot = 'tester_a'
    and s.status = 'submitted';

  select s.* into submission_b
  from public.submissions s
  join public.assignment_testers at
    on at.assignment_id = s.assignment_id and at.user_id = s.user_id
  where s.assignment_id = p_assignment_id
    and at.slot = 'tester_b'
    and s.status = 'submitted';

  if selected_assignment.id is null or submission_a.id is null or submission_b.id is null then
    return null;
  end if;

  insert into public.matched_pairs (
    pair_code, study_id, assignment_id, submission_a_id, submission_b_id,
    technical_status, evidence_status, paired_at
  ) values (
    selected_assignment.assignment_code || '-PAIR', selected_assignment.study_id,
    selected_assignment.id, submission_a.id, submission_b.id,
    'pending', 'pending', now()
  )
  on conflict (assignment_id) do nothing
  returning * into created_pair;

  if created_pair.id is null then
    select * into created_pair
    from public.matched_pairs
    where assignment_id = p_assignment_id;
  else
    insert into public.activity_logs (
      study_id, actor_id, action, category, target_type, target_id, details
    ) values (
      created_pair.study_id, p_actor_id, 'pair.created', 'validation', 'pair', created_pair.id,
      jsonb_build_object(
        'pair_code', created_pair.pair_code,
        'assignment_id', created_pair.assignment_id,
        'submission_a_id', created_pair.submission_a_id,
        'submission_b_id', created_pair.submission_b_id
      )
    );
  end if;

  return created_pair;
end;
$$;

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
    or selected_submission.app_version is null or selected_submission.battery_percentage is null then
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

  if submitted_count = 2 then
    perform private.create_pending_pair(p_assignment_id, caller_id);
  end if;

  return selected_submission;
end;
$$;

revoke all on function private.create_pending_pair(uuid, uuid) from public;
revoke all on function public.submit_tester_observation(uuid) from public;
grant execute on function public.submit_tester_observation(uuid) to authenticated;

comment on function private.create_pending_pair(uuid, uuid) is
  'Creates exactly one pending matched pair after both assignment slots submit.';

do $$
declare
  pending_assignment record;
begin
  for pending_assignment in
    select a.id
    from public.assignments a
    where a.status = 'ready_for_validation'
      and not exists (
        select 1 from public.matched_pairs mp where mp.assignment_id = a.id
      )
  loop
    perform private.create_pending_pair(pending_assignment.id, null);
  end loop;
end;
$$;
