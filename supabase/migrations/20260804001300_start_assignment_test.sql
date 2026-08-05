create or replace function public.start_assignment_test(p_assignment_id uuid)
returns public.assignment_testers
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_slot public.assignment_testers;
  selected_assignment public.assignments;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;

  select * into selected_assignment from public.assignments where id = p_assignment_id for update;
  if selected_assignment.id is null then raise exception 'Assignment not found' using errcode = 'P0002'; end if;
  if selected_assignment.status not in ('not_started', 'in_progress') then
    raise exception 'This assignment cannot be started' using errcode = '22023';
  end if;
  if selected_assignment.scheduled_start is null or selected_assignment.scheduled_end is null
    or now() < selected_assignment.scheduled_start or now() > selected_assignment.scheduled_end then
    raise exception 'The test can start only inside the assignment testing window' using errcode = '22023';
  end if;

  select * into selected_slot from public.assignment_testers
  where assignment_id = p_assignment_id and user_id = caller_id for update;
  if selected_slot.id is null then raise exception 'You are not assigned to this test' using errcode = '42501'; end if;
  if selected_slot.status = 'in_progress' then raise exception 'You have already started this test' using errcode = '22023'; end if;
  if selected_slot.status <> 'ready' then raise exception 'Confirm readiness before starting' using errcode = '22023'; end if;

  if (select count(*) from public.assignment_testers
      where assignment_id = p_assignment_id and status in ('ready', 'in_progress')) <> 2 then
    raise exception 'Both testers must confirm readiness before starting' using errcode = '22023';
  end if;

  update public.assignment_testers set status = 'in_progress' where id = selected_slot.id returning * into selected_slot;
  update public.assignments set status = 'in_progress' where id = p_assignment_id and status = 'not_started';

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected_assignment.study_id, caller_id, 'assignment.test_started', 'assignment', 'assignment', selected_assignment.id,
    jsonb_build_object('assignment_code', selected_assignment.assignment_code, 'slot', selected_slot.slot, 'started_at', now()));

  return selected_slot;
end;
$$;

revoke all on function public.start_assignment_test(uuid) from public;
grant execute on function public.start_assignment_test(uuid) to authenticated;

comment on function public.start_assignment_test(uuid) is
  'Starts only the caller assignment slot after both testers are ready and while the controlled testing window is open.';
