create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'active'
  );
$$;

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select ur.role
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.user_id = (select auth.uid())
    and p.account_status = 'active';
$$;

create or replace function private.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_role() = required_role;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('admin');
$$;

create or replace function private.is_study_member(required_study_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1
    from public.study_members sm
    join public.profiles p on p.id = sm.user_id
    where sm.study_id = required_study_id
      and sm.user_id = (select auth.uid())
      and sm.membership_status = 'active'
      and p.account_status = 'active'
  );
$$;

create or replace function private.has_study_role(
  required_study_id uuid,
  required_role public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1
    from public.study_members sm
    join public.profiles p on p.id = sm.user_id
    join public.user_roles ur on ur.user_id = sm.user_id
    where sm.study_id = required_study_id
      and sm.user_id = (select auth.uid())
      and sm.study_role = required_role
      and ur.role = required_role
      and sm.membership_status = 'active'
      and p.account_status = 'active'
  );
$$;

create or replace function private.can_manage_study(required_study_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or private.has_study_role(required_study_id, 'test_coordinator');
$$;

create or replace function private.can_review_study(required_study_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or private.has_study_role(required_study_id, 'expert_reviewer');
$$;

create or replace function private.can_read_study_workflow(required_study_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or private.has_study_role(required_study_id, 'test_coordinator')
    or private.has_study_role(required_study_id, 'expert_reviewer')
    or private.has_study_role(required_study_id, 'law_firm_viewer');
$$;

create or replace function private.is_assignment_tester(required_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1
    from public.assignment_testers at
    join public.assignments a on a.id = at.assignment_id
    join public.study_members sm on sm.study_id = a.study_id and sm.user_id = at.user_id
    join public.user_roles ur on ur.user_id = at.user_id
    where at.assignment_id = required_assignment_id
      and at.user_id = (select auth.uid())
      and at.status <> 'removed'
      and sm.study_role = 'tester'
      and sm.membership_status = 'active'
      and ur.role = 'tester'
  );
$$;

create or replace function private.is_submission_owner(required_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1
    from public.submissions s
    where s.id = required_submission_id
      and s.user_id = (select auth.uid())
  );
$$;

create or replace function private.protect_profile_authorization_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.id and not private.is_admin() then
    if new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.account_status is distinct from old.account_status
      or new.created_at is distinct from old.created_at then
      raise exception 'Only administrators may change protected profile fields'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_authorization_fields
before update on public.profiles
for each row execute function private.protect_profile_authorization_fields();

create or replace function private.protect_attribution_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    if tg_table_name = 'study_members' then
      if new.added_by is distinct from old.added_by then
        raise exception 'Only administrators may change membership attribution' using errcode = '42501';
      end if;
    elsif tg_table_name in ('protocols', 'assignments') then
      if new.created_by is distinct from old.created_by then
        raise exception 'Only administrators may change creator attribution' using errcode = '42501';
      end if;
    elsif tg_table_name = 'assignment_testers' then
      if new.assigned_by is distinct from old.assigned_by then
        raise exception 'Only administrators may change assignment attribution' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger study_members_protect_attribution
before update on public.study_members
for each row execute function private.protect_attribution_fields();
create trigger protocols_protect_attribution
before update on public.protocols
for each row execute function private.protect_attribution_fields();
create trigger assignments_protect_attribution
before update on public.assignments
for each row execute function private.protect_attribution_fields();
create trigger assignment_testers_protect_attribution
before update on public.assignment_testers
for each row execute function private.protect_attribution_fields();

revoke all on function private.is_active_user() from public;
revoke all on function private.current_user_role() from public;
revoke all on function private.has_role(public.app_role) from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_study_member(uuid) from public;
revoke all on function private.has_study_role(uuid, public.app_role) from public;
revoke all on function private.can_manage_study(uuid) from public;
revoke all on function private.can_review_study(uuid) from public;
revoke all on function private.can_read_study_workflow(uuid) from public;
revoke all on function private.is_assignment_tester(uuid) from public;
revoke all on function private.is_submission_owner(uuid) from public;

grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_study_member(uuid) to authenticated;
grant execute on function private.has_study_role(uuid, public.app_role) to authenticated;
grant execute on function private.can_manage_study(uuid) to authenticated;
grant execute on function private.can_review_study(uuid) to authenticated;
grant execute on function private.can_read_study_workflow(uuid) to authenticated;
grant execute on function private.is_assignment_tester(uuid) to authenticated;
grant execute on function private.is_submission_owner(uuid) to authenticated;

comment on function private.current_user_role() is
  'Returns the dedicated database role only for an active profile; never reads editable auth metadata.';
comment on function private.has_study_role(uuid, public.app_role) is
  'Security-definer RLS helper with an empty search_path to avoid policy recursion and object shadowing.';
