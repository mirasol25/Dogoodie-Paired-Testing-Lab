create or replace function public.list_eligible_study_accounts(p_study_id uuid)
returns table (user_id uuid, email text, display_name text, role public.app_role)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  return query
  select p.id, p.email, p.display_name, ur.role
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  left join public.study_members sm on sm.study_id = p_study_id and sm.user_id = p.id
  where p.account_status = 'active'
    and ur.role in ('test_coordinator', 'tester', 'expert_reviewer', 'law_firm_viewer')
    and (private.is_admin() or ur.role <> 'test_coordinator')
    and (sm.user_id is null or sm.membership_status = 'removed')
  order by ur.role, coalesce(p.display_name, p.email);
end;
$$;

create or replace function public.add_study_member(p_study_id uuid, p_user_id uuid)
returns public.study_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_role public.app_role;
  target_status public.account_status;
  saved_member public.study_members;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  select ur.role, p.account_status into target_role, target_status
  from public.user_roles ur join public.profiles p on p.id = ur.user_id
  where ur.user_id = p_user_id;
  if target_role is null then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if target_status <> 'active' then raise exception 'Only active accounts can join a study' using errcode = '22023'; end if;
  if target_role = 'admin' then raise exception 'Administrators do not require study membership' using errcode = '22023'; end if;
  if target_role = 'test_coordinator' and not private.is_admin() then
    raise exception 'Only administrators can manage study coordinators' using errcode = '42501';
  end if;

  insert into public.study_members (study_id, user_id, study_role, membership_status, added_by)
  values (p_study_id, p_user_id, target_role, 'active', caller_id)
  on conflict (study_id, user_id) do update
    set study_role = excluded.study_role, membership_status = 'active'
  returning * into saved_member;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'study.member_added', 'study', 'profile', p_user_id,
    jsonb_build_object('user_id', p_user_id, 'study_role', target_role));
  return saved_member;
end;
$$;

create or replace function public.set_study_membership_status(
  p_study_id uuid,
  p_user_id uuid,
  p_membership_status public.membership_status
)
returns public.study_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_member public.study_members;
  saved_member public.study_members;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  if p_membership_status not in ('active', 'removed') then
    raise exception 'Membership status must be active or removed' using errcode = '22023';
  end if;
  select * into selected_member from public.study_members
  where study_id = p_study_id and user_id = p_user_id for update;
  if selected_member.user_id is null then raise exception 'Study member not found' using errcode = 'P0002'; end if;
  if selected_member.study_role = 'test_coordinator' and not private.is_admin() then
    raise exception 'Only administrators can manage study coordinators' using errcode = '42501';
  end if;

  update public.study_members set membership_status = p_membership_status
  where study_id = p_study_id and user_id = p_user_id returning * into saved_member;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'study.membership_status_changed', 'study', 'profile', p_user_id,
    jsonb_build_object('user_id', p_user_id, 'study_role', saved_member.study_role, 'membership_status', p_membership_status));
  return saved_member;
end;
$$;

comment on function public.add_study_member(uuid, uuid) is
  'Adds or restores a study member using their global role; study coordinator membership is administrator-managed.';
comment on function public.set_study_membership_status(uuid, uuid, public.membership_status) is
  'Changes operational membership status while reserving coordinator membership changes for administrators.';

drop policy if exists study_members_coordinator_insert on public.study_members;
drop policy if exists study_members_coordinator_update on public.study_members;
drop policy if exists study_members_coordinator_delete on public.study_members;

create policy study_members_manager_insert on public.study_members
for insert to authenticated with check (
  private.can_manage_study(study_id)
  and (added_by = (select auth.uid()) or private.is_admin())
  and (private.is_admin() or study_role <> 'test_coordinator')
  and exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = study_members.user_id
      and ur.role = study_members.study_role
      and p.account_status = 'active'
  )
);

create policy study_members_manager_update on public.study_members
for update to authenticated
using (
  private.can_manage_study(study_id)
  and (private.is_admin() or study_role <> 'test_coordinator')
)
with check (
  private.can_manage_study(study_id)
  and (private.is_admin() or study_role <> 'test_coordinator')
  and exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = study_members.user_id
      and ur.role = study_members.study_role
      and p.account_status = 'active'
  )
);

create policy study_members_manager_delete on public.study_members
for delete to authenticated using (
  private.can_manage_study(study_id)
  and (private.is_admin() or study_role <> 'test_coordinator')
);
