create or replace function public.list_activity_log_feed(
  p_study_id uuid,
  p_search text default null,
  p_category text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid, actor_id uuid, actor_name text, actor_email text, actor_role public.app_role,
  action text, category text, target_type text, target_id uuid, details jsonb,
  created_at timestamptz, total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.app_role := private.current_user_role();
  normalized_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if not private.is_admin()
    and not private.can_read_study_workflow(p_study_id)
    and not private.has_study_role(p_study_id, 'tester') then
    raise exception 'You are not authorized to read this study activity' using errcode = '42501';
  end if;
  return query
  select al.id, al.actor_id, coalesce(p.display_name, p.email, 'System'), p.email, ur.role,
    al.action, al.category, al.target_type, al.target_id,
    case when caller_role = 'law_firm_viewer' then al.details - array['email','latitude','longitude','coordinates','account_data','device_data'] else al.details end,
    al.created_at, count(*) over()
  from public.activity_logs al
  left join public.profiles p on p.id = al.actor_id
  left join public.user_roles ur on ur.user_id = al.actor_id
  where al.study_id = p_study_id
    and (caller_role <> 'tester' or al.actor_id = caller_id)
    and (p_category is null or p_category = '' or al.category = p_category)
    and (normalized_search is null or concat_ws(' ', al.id::text, p.display_name, p.email, al.action, al.category, al.target_type, al.target_id::text, al.details::text) ilike '%' || normalized_search || '%')
  order by al.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end;
$$;

create or replace function public.list_activity_log_categories(p_study_id uuid)
returns table (category text)
language plpgsql security definer set search_path = ''
as $$
declare caller_id uuid := auth.uid(); caller_role public.app_role := private.current_user_role();
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if not private.is_admin() and not private.can_read_study_workflow(p_study_id) and not private.has_study_role(p_study_id, 'tester') then
    raise exception 'You are not authorized to read this study activity' using errcode = '42501';
  end if;
  return query select distinct al.category from public.activity_logs al
    where al.study_id = p_study_id and (caller_role <> 'tester' or al.actor_id = caller_id)
    order by al.category;
end;
$$;

revoke all on function public.list_activity_log_feed(uuid, text, text, integer, integer) from public;
revoke all on function public.list_activity_log_categories(uuid) from public;
grant execute on function public.list_activity_log_feed(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.list_activity_log_categories(uuid) to authenticated;
