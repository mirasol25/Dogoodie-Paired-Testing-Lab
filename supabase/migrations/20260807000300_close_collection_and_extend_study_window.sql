create or replace function public.enforce_future_study_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.testing_starts_at is not null
    and ((tg_op = 'INSERT') or new.testing_starts_at is distinct from old.testing_starts_at)
    and new.testing_starts_at < now() then
    raise exception 'Testing cannot start in the past' using errcode = '22023';
  end if;
  if new.testing_starts_at is not null and new.testing_ends_at is not null
    and new.testing_ends_at <= new.testing_starts_at then
    raise exception 'Testing must end after it starts' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function private.require_active_study_collection()
returns trigger language plpgsql security definer set search_path = '' as $$
declare selected_study_id uuid; selected_assignment_id uuid; collection_ends_at timestamptz;
begin
  selected_study_id := nullif(to_jsonb(new) ->> 'study_id', '')::uuid;
  selected_assignment_id := nullif(to_jsonb(new) ->> 'assignment_id', '')::uuid;
  if tg_table_name = 'assignments' and tg_op = 'UPDATE'
    and to_jsonb(new) ->> 'status' in ('cancelled', 'expired')
    and to_jsonb(old) ->> 'status' not in ('completed', 'cancelled', 'expired')
    and exists (select 1 from public.studies where id = selected_study_id and status in ('active', 'paused')) then
    return new;
  end if;
  select testing_ends_at into collection_ends_at from public.studies where id = selected_study_id and status = 'active';
  if collection_ends_at is null and not exists (select 1 from public.studies where id = selected_study_id and status = 'active') then
    raise exception 'Collection changes require an active study' using errcode = '55000';
  end if;
  if collection_ends_at is not null and now() >= collection_ends_at then
    raise exception 'Collection is closed because the study testing period has ended' using errcode = '55000';
  end if;
  if selected_assignment_id is not null and exists (
    select 1 from public.assignments where id = selected_assignment_id and status in ('completed', 'cancelled', 'expired')
  ) then
    raise exception 'Terminal assignments do not accept submissions or evidence' using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function public.extend_study_testing_period(p_study_id uuid, p_testing_ends_at timestamptz)
returns public.studies language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); selected public.studies; saved public.studies;
begin
  select * into selected from public.studies where id = p_study_id for update;
  if selected.id is null then raise exception 'Study not found' using errcode = 'P0002'; end if;
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to extend this study' using errcode = '42501';
  end if;
  if selected.status not in ('active', 'paused') then
    raise exception 'Only active or paused studies can have their testing period extended' using errcode = '55000';
  end if;
  if p_testing_ends_at <= now() then raise exception 'The new study end must be in the future' using errcode = '22023'; end if;
  if selected.testing_ends_at is not null and p_testing_ends_at <= selected.testing_ends_at then
    raise exception 'The new study end must be later than the current end' using errcode = '22023';
  end if;
  update public.studies set testing_ends_at = p_testing_ends_at where id = p_study_id returning * into saved;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'study.testing_period_extended', 'study', 'study', p_study_id,
    jsonb_build_object('previous_ends_at', selected.testing_ends_at, 'new_ends_at', p_testing_ends_at));
  return saved;
end;
$$;

revoke all on function public.extend_study_testing_period(uuid, timestamptz) from public;
grant execute on function public.extend_study_testing_period(uuid, timestamptz) to authenticated;
