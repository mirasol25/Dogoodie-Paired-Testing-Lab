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

  -- A global coordinator role is required for every active study coordinator.
  -- Do not allow an account change that would leave a study without one.
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
    -- Administrators are authorized without study membership and cannot have a study_role of admin.
    delete from public.study_members where user_id = old.user_id;
  else
    update public.study_members
    set study_role = new.role
    where user_id = old.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists user_roles_sync_study_member_roles on public.user_roles;
create trigger user_roles_sync_study_member_roles
before update of role on public.user_roles
for each row execute function private.sync_study_member_roles_from_account_role();

-- Correct memberships created before this trigger existed.
delete from public.study_members member
using public.user_roles role
where role.user_id = member.user_id
  and role.role = 'admin';

update public.study_members member
set study_role = role.role
from public.user_roles role
where role.user_id = member.user_id
  and role.role <> 'admin'
  and member.study_role is distinct from role.role;

comment on function private.sync_study_member_roles_from_account_role() is
  'Keeps study membership roles synchronized with the account role and preserves at least one active coordinator per study.';
