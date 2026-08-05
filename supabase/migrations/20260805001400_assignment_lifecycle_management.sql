create or replace function private.require_active_study_collection()
returns trigger language plpgsql security definer set search_path = '' as $$
declare selected_study_id uuid; selected_assignment_id uuid;
begin
  selected_study_id := nullif(to_jsonb(new) ->> 'study_id', '')::uuid;
  selected_assignment_id := nullif(to_jsonb(new) ->> 'assignment_id', '')::uuid;
  if tg_table_name = 'assignments' and tg_op = 'UPDATE'
    and to_jsonb(new) ->> 'status' in ('cancelled', 'expired')
    and to_jsonb(old) ->> 'status' not in ('completed', 'cancelled', 'expired')
    and exists (select 1 from public.studies where id = selected_study_id and status in ('active', 'paused')) then
    return new;
  end if;
  if not exists (select 1 from public.studies where id = selected_study_id and status = 'active') then
    raise exception 'Collection changes require an active study' using errcode = '55000';
  end if;
  if selected_assignment_id is not null and exists (
    select 1 from public.assignments where id = selected_assignment_id and status in ('completed', 'cancelled', 'expired')
  ) then
    raise exception 'Terminal assignments do not accept submissions or evidence' using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function private.protect_terminal_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status in ('completed', 'cancelled', 'expired')
    and new.status is distinct from old.status then
    raise exception 'Terminal assignments are read-only' using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists assignments_protect_terminal on public.assignments;
create trigger assignments_protect_terminal before update on public.assignments
for each row execute function private.protect_terminal_assignment();

create or replace function public.cancel_assignment(p_assignment_id uuid, p_reason text)
returns public.assignments language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); selected public.assignments; cancelled public.assignments;
begin
  select * into selected from public.assignments where id = p_assignment_id for update;
  if selected.id is null then raise exception 'Assignment not found' using errcode = 'P0002'; end if;
  if caller_id is null or not private.can_manage_study(selected.study_id) then
    raise exception 'You are not authorized to cancel this assignment' using errcode = '42501';
  end if;
  if selected.status in ('completed', 'cancelled', 'expired') then
    raise exception 'A terminal assignment cannot be cancelled' using errcode = '55000';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'A cancellation reason of at least 10 characters is required' using errcode = '22023';
  end if;
  update public.assignments set status = 'cancelled' where id = p_assignment_id returning * into cancelled;
  update public.assignment_testers set status = 'removed'
    where assignment_id = p_assignment_id and status <> 'submitted';
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected.study_id, caller_id, 'assignment.cancelled', 'assignment', 'assignment', selected.id,
    jsonb_build_object('assignment_code', selected.assignment_code, 'previous_status', selected.status,
      'new_status', 'cancelled', 'reason', trim(p_reason), 'source', 'coordinator_action'));
  return cancelled;
end;
$$;

create or replace function public.expire_overdue_assignments(p_study_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); expired_count integer;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to process this study' using errcode = '42501';
  end if;
  with expired as (
    update public.assignments set status = 'expired'
    where study_id = p_study_id and scheduled_end < now()
      and status not in ('completed', 'cancelled', 'expired')
    returning id, study_id, assignment_code
  ), slots as (
    update public.assignment_testers at set status = 'removed'
    where at.assignment_id in (select id from expired) and at.status <> 'submitted'
  ), events as (
    insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
    select study_id, null, 'assignment.expired', 'assignment', 'assignment', id,
      jsonb_build_object('assignment_code', assignment_code, 'new_status', 'expired',
        'reason', 'Testing window ended before collection completed', 'source', 'system_expiration')
    from expired returning 1
  ) select count(*) into expired_count from events;
  return expired_count;
end;
$$;

revoke all on function private.protect_terminal_assignment() from public;
revoke all on function public.cancel_assignment(uuid, text) from public;
revoke all on function public.expire_overdue_assignments(uuid) from public;
grant execute on function public.cancel_assignment(uuid, text) to authenticated;
grant execute on function public.expire_overdue_assignments(uuid) to authenticated;
