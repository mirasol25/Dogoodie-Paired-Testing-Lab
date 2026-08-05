drop function if exists public.list_activity_log_feed(uuid, text, text, integer, integer);

create function public.list_activity_log_feed(
  p_study_id uuid, p_search text default null, p_category text default null,
  p_actor_id uuid default null, p_target_type text default null, p_action text default null,
  p_date_from timestamptz default null, p_date_to timestamptz default null,
  p_limit integer default 25, p_offset integer default 0
)
returns table (
  id uuid, actor_id uuid, actor_name text, actor_email text, actor_role public.app_role,
  action text, category text, target_type text, target_id uuid, details jsonb,
  created_at timestamptz, total_count bigint
)
language plpgsql security definer set search_path = ''
as $$
declare caller_id uuid := auth.uid(); caller_role public.app_role := private.current_user_role(); normalized_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if not private.is_admin() and not private.can_read_study_workflow(p_study_id) and not private.has_study_role(p_study_id, 'tester') then
    raise exception 'You are not authorized to read this study activity' using errcode = '42501';
  end if;
  return query
  select al.id, al.actor_id, coalesce(p.display_name, p.email, 'System'),
    case when caller_role = 'law_firm_viewer' then null else p.email end, ur.role,
    al.action, al.category, al.target_type, al.target_id,
    case when caller_role = 'law_firm_viewer' then al.details - array['email','latitude','longitude','coordinates','account_data','device_data'] else al.details end,
    al.created_at, count(*) over()
  from public.activity_logs al
  left join public.profiles p on p.id = al.actor_id
  left join public.user_roles ur on ur.user_id = al.actor_id
  where al.study_id = p_study_id
    and (caller_role <> 'tester' or al.actor_id = caller_id)
    and (p_category is null or p_category = '' or al.category = p_category)
    and (p_actor_id is null or al.actor_id = p_actor_id)
    and (p_target_type is null or p_target_type = '' or al.target_type = p_target_type)
    and (p_action is null or p_action = '' or al.action = p_action)
    and (p_date_from is null or al.created_at >= p_date_from)
    and (p_date_to is null or al.created_at < p_date_to)
    and (normalized_search is null or concat_ws(' ', al.id::text, p.display_name, p.email, al.action, al.category, al.target_type, al.target_id::text, al.details::text) ilike '%' || normalized_search || '%')
  order by al.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end;
$$;

create or replace function public.list_activity_log_filter_options(p_study_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare caller_id uuid := auth.uid(); caller_role public.app_role := private.current_user_role(); result jsonb;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if not private.is_admin() and not private.can_read_study_workflow(p_study_id) and not private.has_study_role(p_study_id, 'tester') then
    raise exception 'You are not authorized to read this study activity' using errcode = '42501';
  end if;
  with visible as (
    select al.* from public.activity_logs al where al.study_id = p_study_id and (caller_role <> 'tester' or al.actor_id = caller_id)
  )
  select jsonb_build_object(
    'actors', coalesce((select jsonb_agg(item order by item ->> 'label') from (select distinct jsonb_build_object('id', v.actor_id, 'label', coalesce(p.display_name, p.email, 'System')) item from visible v left join public.profiles p on p.id = v.actor_id where v.actor_id is not null) a), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(action order by action) from (select distinct action from visible) a), '[]'::jsonb),
    'target_types', coalesce((select jsonb_agg(target_type order by target_type) from (select distinct target_type from visible where target_type is not null) t), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.list_activity_log_feed(uuid, text, text, uuid, text, text, timestamptz, timestamptz, integer, integer) from public;
revoke all on function public.list_activity_log_filter_options(uuid) from public;
grant execute on function public.list_activity_log_feed(uuid, text, text, uuid, text, text, timestamptz, timestamptz, integer, integer) to authenticated;
grant execute on function public.list_activity_log_filter_options(uuid) to authenticated;
