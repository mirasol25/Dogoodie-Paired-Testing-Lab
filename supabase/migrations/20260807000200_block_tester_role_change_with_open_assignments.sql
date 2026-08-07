create or replace function private.sync_study_member_roles_from_account_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- A tester must retain the Tester role until every assigned session reaches a terminal state.
  if old.role = 'tester' and new.role <> 'tester' and exists (
    select 1
    from public.assignment_testers assignment_tester
    join public.assignments assignment on assignment.id = assignment_tester.assignment_id
    where assignment_tester.user_id = old.user_id
      and assignment.status not in ('completed', 'cancelled', 'expired')
  ) then
    raise exception 'This Tester has an active assignment. Complete, cancel, or expire it before changing the account role'
      using errcode = '22023';
  end if;

  -- A global coordinator role is required for every active study coordinator.
  if old.role = 'test_coordinator' and new.role <> 'test_coordinator' and exists (
    select 1
    from public.study_members member
    where member.user_id = old.user_id
      and member.study_role = 'test_coordinator'
      and member.membership_status = 'active'
      and not exists (
        select 1
        from public.study_members other_member
        where other_member.study_id = member.study_id
          and other_member.user_id <> old.user_id
          and other_member.study_role = 'test_coordinator'
          and other_member.membership_status = 'active'
      )
  ) then
    raise exception 'Assign another active coordinator before changing this account role'
      using errcode = '22023';
  end if;

  if new.role = 'admin' then
    delete from public.study_members where user_id = old.user_id;
  else
    update public.study_members set study_role = new.role where user_id = old.user_id;
  end if;

  return new;
end;
$$;

comment on function private.sync_study_member_roles_from_account_role() is
  'Synchronizes study roles, preserves a coordinator per study, and blocks tester role changes until active assignments are terminal.';
