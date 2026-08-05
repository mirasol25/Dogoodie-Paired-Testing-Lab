create or replace function private.log_study_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status then
    insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
    values (new.id, auth.uid(), 'study.status_changed', 'study', 'study', new.id,
      jsonb_build_object('study_code', new.study_code, 'previous_status', old.status, 'new_status', new.status,
        'source', 'database_trigger'));
  end if;
  return new;
end;
$$;

create or replace function private.log_assignment_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status then
    insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
    values (new.study_id, auth.uid(), 'assignment.status_changed', 'assignment', 'assignment', new.id,
      jsonb_build_object('assignment_code', new.assignment_code, 'previous_status', old.status,
        'new_status', new.status, 'source', 'database_trigger'));
  end if;
  return new;
end;
$$;

create or replace function private.log_evidence_integrity_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or old.integrity_status is distinct from new.integrity_status then
    insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
    values (new.study_id, coalesce(auth.uid(), new.uploaded_by), 'evidence.integrity_' || new.integrity_status::text,
      'evidence', 'evidence', new.id,
      jsonb_build_object('evidence_code', new.evidence_code, 'evidence_type', new.evidence_type,
        'previous_status', case when tg_op = 'UPDATE' then old.integrity_status else null end,
        'new_status', new.integrity_status, 'submission_id', new.submission_id,
        'source', 'database_trigger'));
  end if;
  return new;
end;
$$;

create or replace function private.log_pair_evidence_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.evidence_status is distinct from new.evidence_status then
    insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
    values (new.study_id, auth.uid(), 'pair.evidence_status_changed', 'evidence', 'pair', new.id,
      jsonb_build_object('pair_code', new.pair_code, 'previous_status', old.evidence_status,
        'new_status', new.evidence_status, 'source', 'database_trigger'));
  end if;
  return new;
end;
$$;

drop trigger if exists studies_log_status_change on public.studies;
create trigger studies_log_status_change after update of status on public.studies
for each row execute function private.log_study_status_change();

drop trigger if exists assignments_log_status_change on public.assignments;
create trigger assignments_log_status_change after update of status on public.assignments
for each row execute function private.log_assignment_status_change();

drop trigger if exists evidence_files_log_integrity_change on public.evidence_files;
create trigger evidence_files_log_integrity_change after insert or update of integrity_status on public.evidence_files
for each row execute function private.log_evidence_integrity_change();

drop trigger if exists matched_pairs_log_evidence_status_change on public.matched_pairs;
create trigger matched_pairs_log_evidence_status_change after update of evidence_status on public.matched_pairs
for each row execute function private.log_pair_evidence_status_change();

revoke all on function private.log_study_status_change() from public;
revoke all on function private.log_assignment_status_change() from public;
revoke all on function private.log_evidence_integrity_change() from public;
revoke all on function private.log_pair_evidence_status_change() from public;

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
