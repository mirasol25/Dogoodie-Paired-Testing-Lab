create or replace function public.list_eligible_study_accounts(p_study_id uuid)
returns table (user_id uuid, email text, display_name text, role public.app_role)
language plpgsql security definer set search_path = '' as $$
declare study_country text; study_configuration jsonb; device_design text; os_a text; os_b text;
begin
  if auth.uid() is null or not private.can_manage_study(p_study_id) then raise exception 'You are not authorized to manage this study' using errcode = '42501'; end if;
  select upper(location.country_code), study.configuration into study_country, study_configuration
  from public.studies study join public.study_routes route on route.study_id = study.id and route.is_active
  join public.study_locations location on location.id = route.pickup_location_id
  where study.id = p_study_id order by route.created_at limit 1;
  if study_country not in ('PH', 'US', 'CA') then raise exception 'The study location is not configured' using errcode = '22023'; end if;
  device_design := coalesce(study_configuration ->> 'device_comparison_design', 'uncontrolled');
  os_a := study_configuration ->> 'tester_a_operating_system'; os_b := study_configuration ->> 'tester_b_operating_system';
  return query select profile.id, profile.email, profile.display_name, user_role.role
  from public.profiles profile join public.user_roles user_role on user_role.user_id = profile.id
  left join public.study_members member on member.study_id = p_study_id and member.user_id = profile.id
  where profile.account_status = 'active'
    and user_role.role in ('test_coordinator', 'tester', 'expert_reviewer', 'law_firm_viewer')
    and (private.is_admin() or user_role.role <> 'test_coordinator')
    and (member.user_id is null or member.membership_status = 'removed')
    and (user_role.role <> 'tester' or (profile.tester_country_code = study_country and (
      device_design = 'uncontrolled'
      or (device_design = 'same_operating_system' and lower(profile.operating_system) = lower(os_a))
      or (device_design = 'different_operating_system' and lower(profile.operating_system) in (lower(os_a), lower(os_b)))
    ))) order by user_role.role, coalesce(profile.display_name, profile.email);
end;
$$;

create or replace function public.add_study_member(p_study_id uuid, p_user_id uuid)
returns public.study_members
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); target_role public.app_role; target_status public.account_status; target_country text; target_os text; study_country text; study_configuration jsonb; device_design text; os_a text; os_b text; saved_member public.study_members;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then raise exception 'You are not authorized to manage this study' using errcode = '42501'; end if;
  select user_role.role, profile.account_status, profile.tester_country_code, profile.operating_system into target_role, target_status, target_country, target_os
  from public.user_roles user_role join public.profiles profile on profile.id = user_role.user_id where user_role.user_id = p_user_id;
  if target_role is null then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if target_status <> 'active' then raise exception 'Only active accounts can join a study' using errcode = '22023'; end if;
  if target_role = 'admin' then raise exception 'Administrators do not require study membership' using errcode = '22023'; end if;
  if target_role = 'test_coordinator' and not private.is_admin() then raise exception 'Only administrators can manage study coordinators' using errcode = '42501'; end if;
  select upper(location.country_code), study.configuration into study_country, study_configuration
  from public.studies study join public.study_routes route on route.study_id = study.id and route.is_active
  join public.study_locations location on location.id = route.pickup_location_id
  where study.id = p_study_id order by route.created_at limit 1;
  if target_role = 'tester' and (target_country is null or target_country <> study_country) then raise exception 'Testers must have the same location as the study' using errcode = '22023'; end if;
  device_design := coalesce(study_configuration ->> 'device_comparison_design', 'uncontrolled');
  os_a := study_configuration ->> 'tester_a_operating_system'; os_b := study_configuration ->> 'tester_b_operating_system';
  if target_role = 'tester' and device_design = 'same_operating_system' and (target_os is null or lower(target_os) <> lower(os_a)) then raise exception 'This study requires testers whose device profile uses %', os_a using errcode = '22023'; end if;
  if target_role = 'tester' and device_design = 'different_operating_system' and (target_os is null or lower(target_os) not in (lower(os_a), lower(os_b))) then raise exception 'This study requires testers whose device profile uses % or %', os_a, os_b using errcode = '22023'; end if;
  insert into public.study_members (study_id, user_id, study_role, membership_status, added_by) values (p_study_id, p_user_id, target_role, 'active', caller_id)
  on conflict (study_id, user_id) do update set study_role = excluded.study_role, membership_status = 'active' returning * into saved_member;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'study.member_added', 'study', 'profile', p_user_id, jsonb_build_object('user_id', p_user_id, 'study_role', target_role, 'tester_country_code', target_country, 'operating_system', target_os));
  return saved_member;
end;
$$;

comment on function public.list_eligible_study_accounts(uuid) is 'Filters tester candidates by study country and optional operating-system restrictions.';
comment on function public.add_study_member(uuid, uuid) is 'Enforces study country and optional operating-system restrictions when adding testers.';
