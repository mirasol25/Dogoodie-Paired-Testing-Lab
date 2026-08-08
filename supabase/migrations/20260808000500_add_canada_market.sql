-- Add Canada as a supported study and tester market without changing existing
-- Philippines or United States records.
alter table public.profiles
  drop constraint if exists profiles_tester_country_code_check;

alter table public.profiles
  add constraint profiles_tester_country_code_check
  check (tester_country_code is null or tester_country_code in ('PH', 'US', 'CA'));

insert into public.provider_markets (platform_id, country_code)
select id, 'CA' from public.platforms where slug in ('uber', 'lyft')
on conflict (platform_id, country_code, region_code)
do update set is_active = true;

-- Preserve the current function body and only extend its market allowlist. This
-- avoids duplicating the complete atomic study-creation implementation here.
do $migration$
declare
  function_definition text;
  updated_definition text;
begin
  function_definition := pg_get_functiondef(
    'public.create_study_with_initial_route_v2(text,public.study_type,text,text,jsonb,jsonb,text,text,text,integer,timestamp with time zone,timestamp with time zone,text,text,text,uuid[])'::regprocedure
  );
  updated_definition := replace(
    replace(function_definition, 'not in (''PH'', ''US'')', 'not in (''PH'', ''US'', ''CA'')'),
    'The location search filter must be PH or US',
    'The location search filter must be PH, US, or CA'
  );
  if updated_definition = function_definition then
    raise exception 'Could not update the study-country allowlist';
  end if;
  execute updated_definition;
end;
$migration$;

create or replace function public.list_eligible_study_accounts(p_study_id uuid)
returns table (user_id uuid, email text, display_name text, role public.app_role)
language plpgsql security definer set search_path = '' as $$
declare study_country text;
begin
  if auth.uid() is null or not private.can_manage_study(p_study_id) then raise exception 'You are not authorized to manage this study' using errcode = '42501'; end if;
  select upper(location.country_code) into study_country from public.study_routes route join public.study_locations location on location.id = route.pickup_location_id where route.study_id = p_study_id and route.is_active order by route.created_at limit 1;
  if study_country not in ('PH', 'US', 'CA') then raise exception 'The study location is not configured' using errcode = '22023'; end if;
  return query select p.id, p.email, p.display_name, ur.role from public.profiles p join public.user_roles ur on ur.user_id = p.id left join public.study_members sm on sm.study_id = p_study_id and sm.user_id = p.id where p.account_status = 'active' and ur.role in ('test_coordinator', 'tester', 'expert_reviewer', 'law_firm_viewer') and (private.is_admin() or ur.role <> 'test_coordinator') and (sm.user_id is null or sm.membership_status = 'removed') and (ur.role <> 'tester' or p.tester_country_code = study_country) order by ur.role, coalesce(p.display_name, p.email);
end;
$$;
