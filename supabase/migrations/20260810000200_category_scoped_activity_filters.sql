-- Activity filter facets should reflect the selected category instead of
-- offering actors, objects, and actions that cannot produce any results.
drop function if exists public.list_activity_log_filter_options(uuid);

create function public.list_activity_log_filter_options(
  p_study_id uuid,
  p_category text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  with visible as (
    select al.*
    from public.activity_logs al
    where al.study_id = p_study_id
      and private.can_view_activity_log_event(al)
      and (p_category is null or p_category = '' or al.category = p_category)
  )
  select jsonb_build_object(
    'actors', coalesce((
      select jsonb_agg(item order by item ->> 'label')
      from (
        select distinct jsonb_build_object(
          'id', v.actor_id,
          'label', coalesce(v.actor_name_snapshot, 'System')
        ) item
        from visible v
        where v.actor_id is not null
      ) actors
    ), '[]'::jsonb),
    'actions', coalesce((
      select jsonb_agg(action order by action)
      from (select distinct action from visible) actions
    ), '[]'::jsonb),
    'target_types', coalesce((
      select jsonb_agg(target_type order by target_type)
      from (
        select distinct target_type
        from visible
        where target_type is not null
      ) targets
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.list_activity_log_filter_options(uuid,text) from public;
grant execute on function public.list_activity_log_filter_options(uuid,text) to authenticated;

comment on function public.list_activity_log_filter_options(uuid,text) is
  'Returns authorized activity filter facets scoped to an optional event category.';
