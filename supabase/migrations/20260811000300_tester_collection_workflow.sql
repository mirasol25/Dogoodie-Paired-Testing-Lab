-- Persist the coordinated tester workflow so refreshes cannot skip readiness,
-- capture acknowledgement, or partner-evidence gates.
create or replace function public.confirm_assignment_ready(p_assignment_id uuid)
returns public.assignment_testers
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_slot public.assignment_testers;
  selected_assignment public.assignments;
  starts_at timestamptz;
  ends_at timestamptz;
  synchronization text;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;

  select * into selected_assignment from public.assignments where id = p_assignment_id for update;
  select * into selected_slot from public.assignment_testers
  where assignment_id = p_assignment_id and user_id = caller_id for update;
  if selected_slot.id is null then raise exception 'You are not assigned to this test' using errcode = '42501'; end if;
  if selected_assignment.status not in ('not_started', 'in_progress') or selected_slot.status <> 'assigned' then
    raise exception 'This tester slot cannot confirm readiness' using errcode = '22023';
  end if;

  starts_at := coalesce(nullif(selected_slot.account_configuration ->> 'scheduled_start', '')::timestamptz, selected_assignment.scheduled_start);
  ends_at := coalesce(nullif(selected_slot.account_configuration ->> 'scheduled_end', '')::timestamptz, selected_assignment.scheduled_end);
  if starts_at is null or ends_at is null or now() < starts_at or now() > ends_at then
    raise exception 'Mark yourself ready only inside your testing window' using errcode = '22023';
  end if;

  update public.assignment_testers
  set status = 'ready',
      account_configuration = account_configuration || jsonb_build_object('ready_at', now())
  where id = selected_slot.id
  returning * into selected_slot;

  synchronization := coalesce(selected_slot.account_configuration ->> 'testing_synchronization', 'synchronized');
  if synchronization = 'asynchronous' or not exists (
    select 1 from public.assignment_testers
    where assignment_id = p_assignment_id and status = 'assigned'
  ) then
    update public.assignment_testers
    set status = 'in_progress',
        account_configuration = account_configuration || jsonb_build_object('collection_opened_at', now())
    where assignment_id = p_assignment_id and status = 'ready';
    update public.assignments set status = 'in_progress'
    where id = p_assignment_id and status = 'not_started';
  end if;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected_assignment.study_id, caller_id, 'assignment.tester_ready', 'assignment', 'assignment', selected_assignment.id,
    jsonb_build_object('assignment_code', selected_assignment.assignment_code, 'slot', selected_slot.slot, 'confirmed_at', now()));
  return selected_slot;
end;
$$;

create or replace function public.complete_assignment_capture_checklist(p_assignment_id uuid)
returns public.assignment_testers
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := auth.uid(); selected_slot public.assignment_testers;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_slot from public.assignment_testers
  where assignment_id = p_assignment_id and user_id = caller_id for update;
  if selected_slot.id is null then raise exception 'You are not assigned to this test' using errcode = '42501'; end if;
  if selected_slot.status <> 'in_progress' then raise exception 'Both testers must be ready before capture begins' using errcode = '22023'; end if;
  update public.assignment_testers
  set account_configuration = account_configuration || jsonb_build_object('capture_checklist_completed_at', now())
  where id = selected_slot.id returning * into selected_slot;
  return selected_slot;
end;
$$;

create or replace function public.get_assignment_tester_workflow_state(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := auth.uid(); result jsonb;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if not exists (select 1 from public.assignment_testers where assignment_id = p_assignment_id and user_id = caller_id) then
    raise exception 'You are not assigned to this test' using errcode = '42501';
  end if;

  with slots as (
    select at.id, at.user_id, at.status,
      (at.account_configuration ? 'capture_checklist_completed_at') as capture_acknowledged,
      exists (
        select 1 from public.submissions s
        join public.screenshot_ocr_validations validation on validation.submission_id = s.id
          and validation.is_active and validation.selection_status = 'confirmed'
          and validation.service_validation = 'matched'
        where s.assignment_tester_id = at.id
          and exists (select 1 from public.evidence_files e where e.submission_id = s.id and e.evidence_type = 'screenshot' and e.integrity_status = 'complete')
          and exists (select 1 from public.evidence_files e where e.submission_id = s.id and e.evidence_type = 'screen_recording' and e.integrity_status = 'complete')
      ) as evidence_ready
    from public.assignment_testers at where at.assignment_id = p_assignment_id
  )
  select jsonb_build_object(
    'both_ready', count(*) = 2 and bool_and(status in ('in_progress', 'submitted')),
    'capture_acknowledged', coalesce(bool_or(capture_acknowledged) filter (where user_id = caller_id), false),
    'own_evidence_ready', coalesce(bool_or(evidence_ready) filter (where user_id = caller_id), false),
    'partner_evidence_ready', coalesce(bool_or(evidence_ready) filter (where user_id <> caller_id), false),
    'both_evidence_ready', count(*) = 2 and bool_and(evidence_ready)
  ) into result from slots;
  return result;
end;
$$;

revoke all on function public.complete_assignment_capture_checklist(uuid) from public;
revoke all on function public.get_assignment_tester_workflow_state(uuid) from public;
grant execute on function public.complete_assignment_capture_checklist(uuid) to authenticated;
grant execute on function public.get_assignment_tester_workflow_state(uuid) to authenticated;

comment on function public.get_assignment_tester_workflow_state(uuid) is
  'Returns only the coordinated workflow gates needed by an assigned tester; partner evidence contents remain private.';

-- Preserve progress for synchronized sessions where both testers confirmed
-- readiness before this workflow migration was applied.
update public.assignment_testers tester
set status = 'in_progress',
    account_configuration = account_configuration || jsonb_build_object('collection_opened_at', now())
where tester.status = 'ready'
  and (select count(*) from public.assignment_testers peer where peer.assignment_id = tester.assignment_id and peer.status = 'ready') = 2;

update public.assignments assignment
set status = 'in_progress'
where assignment.status = 'not_started'
  and (select count(*) from public.assignment_testers tester where tester.assignment_id = assignment.id and tester.status = 'in_progress') = 2;
