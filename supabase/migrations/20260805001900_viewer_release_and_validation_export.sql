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
    or (
      private.current_user_role() = 'law_firm_viewer'
      and private.is_study_member(required_study_id)
      and exists (
        select 1 from public.studies s
        where s.id = required_study_id and s.status in ('completed', 'archived')
      )
    );
$$;

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
  if caller_role = 'expert_reviewer' then return p_event.category in ('validation', 'evidence', 'review'); end if;
  if caller_role = 'law_firm_viewer' then
    if not private.can_read_study_workflow(p_event.study_id) then return false; end if;
    return p_event.action in (
      'protocol.activated', 'pair.created', 'validation.completed',
      'review.accepted', 'review.flagged', 'review.rejected', 'report.generated', 'report.exported'
    ) or (p_event.action = 'pair.evidence_status_changed' and p_event.details ->> 'new_status' in ('complete', 'flagged', 'rejected'))
      or (p_event.action = 'study.status_changed' and p_event.details ->> 'new_status' in ('completed', 'archived'));
  end if;
  if caller_role = 'tester' then
    if p_event.actor_id = caller_id and p_event.category in ('assignment', 'submission', 'evidence') then return true; end if;
    if p_event.target_type = 'assignment' then
      return exists (select 1 from public.assignment_testers at where at.assignment_id = p_event.target_id and at.user_id = caller_id and at.status <> 'removed');
    end if;
    if p_event.target_type = 'submission' then
      return exists (select 1 from public.submissions s where s.id = p_event.target_id and s.user_id = caller_id);
    end if;
    if p_event.target_type = 'evidence' then
      return exists (select 1 from public.evidence_files ef where ef.id = p_event.target_id and ef.uploaded_by = caller_id);
    end if;
  end if;
  return false;
end;
$$;

drop policy if exists evidence_authorized_select on public.evidence_files;
create policy evidence_authorized_select on public.evidence_files
for select to authenticated
using (
  uploaded_by = (select auth.uid())
  or private.can_manage_study(study_id)
  or private.can_review_study(study_id)
  or (
    private.current_user_role() = 'law_firm_viewer'
    and private.can_read_study_workflow(study_id)
  )
);

create or replace function public.record_report_export(p_study_id uuid, p_export_kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.app_role := private.current_user_role();
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if caller_role not in ('admin', 'test_coordinator', 'expert_reviewer') then
    raise exception 'Your role cannot export study reports' using errcode = '42501';
  end if;
  if not private.is_admin() and not private.has_study_role(p_study_id, caller_role) then
    raise exception 'You are not authorized for this study' using errcode = '42501';
  end if;
  if p_export_kind not in ('assignments', 'pairs', 'accepted', 'excluded', 'reviews', 'validation', 'evidence', 'activity', 'manifest', 'package') then
    raise exception 'Unsupported report export type' using errcode = '22023';
  end if;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'report.exported', 'report', 'report', p_study_id,
    jsonb_build_object('export_kind', p_export_kind, 'source', 'report_workspace'));
end;
$$;

revoke all on function private.can_read_study_workflow(uuid) from public;
grant execute on function private.can_read_study_workflow(uuid) to authenticated;
revoke all on function private.can_view_activity_log_event(public.activity_logs) from public;
revoke all on function public.record_report_export(uuid, text) from public;
grant execute on function public.record_report_export(uuid, text) to authenticated;

comment on function private.can_read_study_workflow(uuid) is
  'Allows managers and reviewers to read assigned workflows; viewers receive assigned outputs only after study completion or archive.';
