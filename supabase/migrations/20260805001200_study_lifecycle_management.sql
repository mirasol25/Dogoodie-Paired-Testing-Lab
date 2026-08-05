create or replace function public.transition_study_status(p_study_id uuid, p_new_status public.study_status)
returns public.studies language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.app_role := private.current_user_role();
  selected_study public.studies;
  updated_study public.studies;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  select * into selected_study from public.studies where id = p_study_id for update;
  if selected_study.id is null then raise exception 'Study not found' using errcode = 'P0002'; end if;
  if selected_study.status = p_new_status then return selected_study; end if;

  if not (
    (selected_study.status = 'draft' and p_new_status = 'active') or
    (selected_study.status = 'active' and p_new_status in ('paused', 'completed')) or
    (selected_study.status = 'paused' and p_new_status in ('active', 'completed')) or
    (selected_study.status = 'completed' and p_new_status = 'archived')
  ) then
    raise exception 'Invalid study status transition from % to %', selected_study.status, p_new_status using errcode = '22023';
  end if;

  if p_new_status = 'active' then
    if not exists (select 1 from public.protocols where study_id = p_study_id and status = 'active') then
      raise exception 'Activate a protocol before activating the study' using errcode = '22023';
    end if;
    if not exists (select 1 from public.study_routes where study_id = p_study_id and is_active) then
      raise exception 'Configure an active route before activating the study' using errcode = '22023';
    end if;
  end if;

  if p_new_status = 'completed' and exists (
    select 1 from public.assignments where study_id = p_study_id and status::text not in ('completed', 'cancelled', 'expired')
  ) then
    raise exception 'Complete or cancel every assignment before completing the study' using errcode = '22023';
  end if;

  if p_new_status = 'archived' and caller_role <> 'admin' then
    raise exception 'Only an administrator may archive a study' using errcode = '42501';
  end if;

  update public.studies set status = p_new_status where id = p_study_id returning * into updated_study;
  return updated_study;
end;
$$;

revoke all on function public.transition_study_status(uuid, public.study_status) from public;
grant execute on function public.transition_study_status(uuid, public.study_status) to authenticated;

create or replace function private.require_active_study_collection()
returns trigger language plpgsql security definer set search_path = '' as $$
declare selected_study_id uuid;
begin
  selected_study_id := case tg_table_name
    when 'assignments' then new.study_id
    when 'submissions' then new.study_id
    when 'evidence_files' then new.study_id
  end;
  if not exists (select 1 from public.studies where id = selected_study_id and status = 'active') then
    raise exception 'Collection changes require an active study' using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists assignments_require_active_study on public.assignments;
create trigger assignments_require_active_study before insert or update on public.assignments
for each row execute function private.require_active_study_collection();

drop trigger if exists submissions_require_active_study on public.submissions;
create trigger submissions_require_active_study before insert or update on public.submissions
for each row execute function private.require_active_study_collection();

drop trigger if exists evidence_files_require_active_study on public.evidence_files;
create trigger evidence_files_require_active_study before insert or update on public.evidence_files
for each row execute function private.require_active_study_collection();

revoke all on function private.require_active_study_collection() from public;

comment on function public.transition_study_status(uuid, public.study_status) is
  'Applies the controlled study lifecycle with activation prerequisites, completion checks, and admin-only archival.';

-- Existing assignment creation is also protected by assignments_require_active_study. The trigger keeps
-- this invariant effective for RPCs, direct writes, and future assignment entry points.
