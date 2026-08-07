alter table public.profiles
  add column if not exists tester_country_code text
  check (tester_country_code is null or tester_country_code in ('PH', 'US'));

create or replace function public.list_eligible_study_accounts(p_study_id uuid)
returns table (user_id uuid, email text, display_name text, role public.app_role)
language plpgsql security definer set search_path = '' as $$
declare study_country text;
begin
  if auth.uid() is null or not private.can_manage_study(p_study_id) then raise exception 'You are not authorized to manage this study' using errcode = '42501'; end if;
  select upper(location.country_code) into study_country from public.study_routes route join public.study_locations location on location.id = route.pickup_location_id where route.study_id = p_study_id and route.is_active order by route.created_at limit 1;
  if study_country not in ('PH', 'US') then raise exception 'The study location is not configured' using errcode = '22023'; end if;
  return query select p.id, p.email, p.display_name, ur.role from public.profiles p join public.user_roles ur on ur.user_id = p.id left join public.study_members sm on sm.study_id = p_study_id and sm.user_id = p.id where p.account_status = 'active' and ur.role in ('test_coordinator', 'tester', 'expert_reviewer', 'law_firm_viewer') and (private.is_admin() or ur.role <> 'test_coordinator') and (sm.user_id is null or sm.membership_status = 'removed') and (ur.role <> 'tester' or p.tester_country_code = study_country) order by ur.role, coalesce(p.display_name, p.email);
end;
$$;

create or replace function public.add_study_member(p_study_id uuid, p_user_id uuid)
returns public.study_members
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); target_role public.app_role; target_status public.account_status; target_country text; study_country text; saved_member public.study_members;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then raise exception 'You are not authorized to manage this study' using errcode = '42501'; end if;
  select ur.role, p.account_status, p.tester_country_code into target_role, target_status, target_country from public.user_roles ur join public.profiles p on p.id = ur.user_id where ur.user_id = p_user_id;
  if target_role is null then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if target_status <> 'active' then raise exception 'Only active accounts can join a study' using errcode = '22023'; end if;
  if target_role = 'admin' then raise exception 'Administrators do not require study membership' using errcode = '22023'; end if;
  if target_role = 'test_coordinator' and not private.is_admin() then raise exception 'Only administrators can manage study coordinators' using errcode = '42501'; end if;
  select upper(location.country_code) into study_country from public.study_routes route join public.study_locations location on location.id = route.pickup_location_id where route.study_id = p_study_id and route.is_active order by route.created_at limit 1;
  if target_role = 'tester' and (target_country is null or target_country <> study_country) then raise exception 'Testers must have the same location as the study' using errcode = '22023'; end if;
  insert into public.study_members (study_id, user_id, study_role, membership_status, added_by) values (p_study_id, p_user_id, target_role, 'active', caller_id) on conflict (study_id, user_id) do update set study_role = excluded.study_role, membership_status = 'active' returning * into saved_member;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details) values (p_study_id, caller_id, 'study.member_added', 'study', 'profile', p_user_id, jsonb_build_object('user_id', p_user_id, 'study_role', target_role, 'tester_country_code', target_country));
  return saved_member;
end;
$$;
