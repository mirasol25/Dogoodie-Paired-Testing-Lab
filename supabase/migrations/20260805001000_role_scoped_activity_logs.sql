create or replace function private.can_view_activity_log_event(p_event public.activity_logs)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.app_role := private.current_user_role();
begin
  if caller_id is null then return false; end if;
  if private.is_admin() then return true; end if;
  if p_event.study_id is null or not private.has_study_role(p_event.study_id, caller_role) then return false; end if;

  if caller_role = 'test_coordinator' then return true; end if;
  if caller_role = 'expert_reviewer' then
    return p_event.category in ('validation', 'evidence', 'review');
  end if;
  if caller_role = 'law_firm_viewer' then
    return p_event.action in (
      'protocol.activated', 'pair.created', 'validation.completed',
      'review.accepted', 'review.flagged', 'review.rejected', 'report.generated', 'report.exported'
    ) or (p_event.action = 'pair.evidence_status_changed' and p_event.details ->> 'new_status' in ('complete', 'flagged', 'rejected'))
      or (p_event.action = 'study.status_changed' and p_event.details ->> 'new_status' in ('completed', 'archived'));
  end if;
  if caller_role = 'tester' then
    if p_event.actor_id = caller_id and p_event.category in ('assignment', 'submission', 'evidence') then return true; end if;
    if p_event.target_type = 'assignment' then
      return exists (
        select 1 from public.assignment_testers at
        where at.assignment_id = p_event.target_id and at.user_id = caller_id and at.status <> 'removed'
      );
    end if;
    if p_event.target_type = 'submission' then
      return exists (
        select 1 from public.submissions s
        where s.id = p_event.target_id and s.user_id = caller_id
      );
    end if;
    if p_event.target_type = 'evidence' then
      return exists (
        select 1 from public.evidence_files ef
        where ef.id = p_event.target_id and ef.uploaded_by = caller_id
      );
    end if;
  end if;
  return false;
end;
$$;

drop policy if exists activity_logs_authorized_select on public.activity_logs;
drop policy if exists activity_logs_role_scoped_select on public.activity_logs;
create policy activity_logs_role_scoped_select on public.activity_logs
for select to authenticated
using (private.can_view_activity_log_event(activity_logs));

create or replace function public.list_activity_log_feed(
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
declare
  caller_id uuid := auth.uid();
  caller_role public.app_role := private.current_user_role();
  normalized_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  return query
  select al.id, al.actor_id, coalesce(al.actor_name_snapshot, p.display_name, p.email, 'System'),
    case when caller_role = 'law_firm_viewer' then null else coalesce(al.actor_email_snapshot, p.email) end,
    coalesce(al.actor_role_snapshot, ur.role), al.action, al.category, al.target_type, al.target_id,
    case when caller_role = 'law_firm_viewer' then al.details - array['email','latitude','longitude','coordinates','account_data','device_data','note','original_filename','storage_path','sha256','submission_id'] else al.details end,
    al.created_at, count(*) over()
  from public.activity_logs al
  left join public.profiles p on p.id = al.actor_id
  left join public.user_roles ur on ur.user_id = al.actor_id
  where al.study_id = p_study_id
    and private.can_view_activity_log_event(al)
    and (p_category is null or p_category = '' or al.category = p_category)
    and (p_actor_id is null or al.actor_id = p_actor_id)
    and (p_target_type is null or p_target_type = '' or al.target_type = p_target_type)
    and (p_action is null or p_action = '' or al.action = p_action)
    and (p_date_from is null or al.created_at >= p_date_from)
    and (p_date_to is null or al.created_at < p_date_to)
    and (normalized_search is null or concat_ws(' ', al.id::text, al.actor_name_snapshot, al.actor_email_snapshot, al.action, al.category, al.target_type, al.target_id::text, al.details::text) ilike '%' || normalized_search || '%')
  order by al.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end;
$$;

create or replace function public.list_activity_log_filter_options(p_study_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  with visible as (
    select al.* from public.activity_logs al
    where al.study_id = p_study_id and private.can_view_activity_log_event(al)
  )
  select jsonb_build_object(
    'actors', coalesce((select jsonb_agg(item order by item ->> 'label') from (select distinct jsonb_build_object('id', v.actor_id, 'label', coalesce(v.actor_name_snapshot, 'System')) item from visible v where v.actor_id is not null) a), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(action order by action) from (select distinct action from visible) a), '[]'::jsonb),
    'target_types', coalesce((select jsonb_agg(target_type order by target_type) from (select distinct target_type from visible where target_type is not null) t), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.list_activity_log_categories(p_study_id uuid)
returns table (category text)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  return query
  select distinct al.category from public.activity_logs al
  where al.study_id = p_study_id and private.can_view_activity_log_event(al)
  order by al.category;
end;
$$;

comment on function private.can_view_activity_log_event(public.activity_logs) is
  'Central event-level authorization for activity history, shared by RLS and activity feed RPCs.';
