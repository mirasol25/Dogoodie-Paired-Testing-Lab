-- Coordinators may manage a study without having broad access to every
-- account profile. Expose only the device fields needed to build assignment
-- tester options, scoped to active Tester members of that study.
create or replace function public.list_assignment_tester_options(p_study_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  device_type text,
  operating_system text,
  operating_system_version text
)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;

  return query
  select
    profile.id,
    profile.email,
    profile.display_name,
    profile.device_type,
    profile.operating_system,
    profile.operating_system_version
  from public.study_members member
  join public.profiles profile on profile.id = member.user_id
  join public.user_roles user_role on user_role.user_id = profile.id
  where member.study_id = p_study_id
    and member.study_role = 'tester'
    and member.membership_status = 'active'
    and user_role.role = 'tester'
    and profile.account_status = 'active'
  order by coalesce(profile.display_name, profile.email), profile.id;
end;
$$;

revoke all on function public.list_assignment_tester_options(uuid) from public;
grant execute on function public.list_assignment_tester_options(uuid) to authenticated;

comment on function public.list_assignment_tester_options(uuid) is
  'Returns the minimal device-profile fields needed to assign active study testers after verifying study-management access.';

