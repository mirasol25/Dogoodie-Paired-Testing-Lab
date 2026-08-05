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
  if p_export_kind not in ('assignments', 'pairs', 'accepted', 'excluded', 'reviews', 'evidence', 'activity', 'manifest', 'package') then
    raise exception 'Unsupported report export type' using errcode = '22023';
  end if;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'report.exported', 'report', 'report', p_study_id,
    jsonb_build_object('export_kind', p_export_kind, 'source', 'report_workspace'));
end;
$$;

revoke all on function public.record_report_export(uuid, text) from public;
grant execute on function public.record_report_export(uuid, text) to authenticated;
