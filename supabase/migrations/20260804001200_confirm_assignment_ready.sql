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
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;

  select at.* into selected_slot
  from public.assignment_testers at
  where at.assignment_id = p_assignment_id and at.user_id = caller_id
  for update;
  if selected_slot.id is null then
    raise exception 'You are not assigned to this test' using errcode = '42501';
  end if;
  if selected_slot.status = 'ready' then
    raise exception 'You have already confirmed readiness' using errcode = '22023';
  end if;
  if selected_slot.status <> 'assigned' then
    raise exception 'This tester slot cannot confirm readiness' using errcode = '22023';
  end if;

  select * into selected_assignment from public.assignments where id = p_assignment_id for update;
  if selected_assignment.status <> 'not_started' then
    raise exception 'This assignment is not accepting readiness confirmations' using errcode = '22023';
  end if;

  update public.assignment_testers
  set status = 'ready'
  where id = selected_slot.id
  returning * into selected_slot;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected_assignment.study_id, caller_id, 'assignment.tester_ready', 'assignment', 'assignment', selected_assignment.id,
    jsonb_build_object('assignment_code', selected_assignment.assignment_code, 'slot', selected_slot.slot, 'confirmed_at', now()));

  return selected_slot;
end;
$$;

revoke all on function public.confirm_assignment_ready(uuid) from public;
grant execute on function public.confirm_assignment_ready(uuid) to authenticated;

comment on function public.confirm_assignment_ready(uuid) is
  'Allows an assigned tester to move only their own not-started assignment slot from assigned to ready.';
