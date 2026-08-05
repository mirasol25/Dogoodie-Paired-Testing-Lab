create or replace function private.require_active_study_collection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_study_id uuid;
  selected_assignment_id uuid;
begin
  selected_study_id := nullif(to_jsonb(new) ->> 'study_id', '')::uuid;
  selected_assignment_id := nullif(to_jsonb(new) ->> 'assignment_id', '')::uuid;

  if selected_study_id is null then
    raise exception 'Collection record does not identify a study' using errcode = '22023';
  end if;

  if tg_table_name = 'assignments' and tg_op = 'UPDATE'
    and to_jsonb(new) ->> 'status' in ('cancelled', 'expired')
    and to_jsonb(old) ->> 'status' not in ('completed', 'cancelled', 'expired')
    and exists (
      select 1 from public.studies
      where id = selected_study_id and status in ('active', 'paused')
    ) then
    return new;
  end if;

  if not exists (
    select 1 from public.studies
    where id = selected_study_id and status = 'active'
  ) then
    raise exception 'Collection changes require an active study' using errcode = '55000';
  end if;

  if selected_assignment_id is not null and exists (
    select 1 from public.assignments
    where id = selected_assignment_id and status in ('completed', 'cancelled', 'expired')
  ) then
    raise exception 'Terminal assignments do not accept submissions or evidence' using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function private.require_active_study_collection() from public;

comment on function private.require_active_study_collection() is
  'Safely enforces active-study collection across assignment, submission, and evidence row shapes.';
