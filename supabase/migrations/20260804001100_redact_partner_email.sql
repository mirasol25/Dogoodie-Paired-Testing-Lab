create or replace function public.list_assignment_pair_roster(p_study_id uuid)
returns table (
  assignment_id uuid,
  user_id uuid,
  slot public.tester_slot,
  slot_status public.assignment_tester_status,
  display_name text,
  email text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.app_role := private.current_user_role();
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if not private.is_admin()
    and not private.can_read_study_workflow(p_study_id)
    and not private.has_study_role(p_study_id, 'tester') then
    raise exception 'You are not authorized to read the assignment roster' using errcode = '42501';
  end if;

  return query
  select at.assignment_id, at.user_id, at.slot, at.status, p.display_name,
    case
      when caller_role = 'law_firm_viewer' then null::text
      when caller_role = 'tester' and at.user_id <> caller_id then null::text
      else p.email
    end
  from public.assignment_testers at
  join public.assignments a on a.id = at.assignment_id and a.study_id = p_study_id
  join public.profiles p on p.id = at.user_id
  where caller_role <> 'tester'
     or exists (
       select 1 from public.assignment_testers own_slot
       where own_slot.assignment_id = at.assignment_id and own_slot.user_id = caller_id
         and own_slot.status <> 'removed'
     );
end;
$$;

comment on function public.list_assignment_pair_roster(uuid) is
  'Provides the authorized A/B roster while hiding partner contact and controlled configuration from assigned testers.';
