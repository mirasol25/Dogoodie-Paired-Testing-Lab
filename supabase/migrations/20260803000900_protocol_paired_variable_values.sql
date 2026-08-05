alter table public.protocols
  add column if not exists tester_a_value text,
  add column if not exists tester_b_value text;

drop function if exists public.create_initial_protocol_draft(uuid, text, text);

create function public.create_initial_protocol_draft(
  p_study_id uuid,
  p_title text,
  p_tester_a_value text,
  p_tester_b_value text,
  p_description text default null
)
returns public.protocols
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_study public.studies;
  created_protocol public.protocols;
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_title, ''))) < 3 then
    raise exception 'Enter a protocol title' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_tester_a_value, ''))) < 2
    or length(trim(coalesce(p_tester_b_value, ''))) < 2 then
    raise exception 'Enter an isolated-variable value for both testers' using errcode = '22023';
  end if;
  if lower(trim(p_tester_a_value)) = lower(trim(p_tester_b_value)) then
    raise exception 'Tester A and Tester B must have different isolated-variable values' using errcode = '22023';
  end if;

  select * into selected_study
  from public.studies
  where id = p_study_id
  for update;

  if selected_study.id is null then
    raise exception 'Study not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.protocols where study_id = p_study_id) then
    raise exception 'The initial protocol already exists' using errcode = '23505';
  end if;
  if length(trim(coalesce(selected_study.study_question, ''))) < 10
    or length(trim(coalesce(selected_study.isolated_variable, ''))) < 2 then
    raise exception 'The study requires a research question and isolated variable' using errcode = '22023';
  end if;

  insert into public.protocols (
    study_id, protocol_code, version, status, title, description,
    study_question, isolated_variable, tester_a_value, tester_b_value, created_by
  ) values (
    selected_study.id, selected_study.study_code || '-P001', 'v1.0', 'draft',
    trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
    selected_study.study_question, selected_study.isolated_variable,
    trim(p_tester_a_value), trim(p_tester_b_value), caller_id
  ) returning * into created_protocol;

  insert into public.activity_logs (
    study_id, actor_id, action, category, target_type, target_id, details
  ) values (
    selected_study.id, caller_id, 'protocol.draft_created', 'protocol', 'protocol', created_protocol.id,
    jsonb_build_object(
      'protocol_code', created_protocol.protocol_code,
      'version', created_protocol.version,
      'status', created_protocol.status,
      'isolated_variable', created_protocol.isolated_variable,
      'tester_a_value', created_protocol.tester_a_value,
      'tester_b_value', created_protocol.tester_b_value
    )
  );

  return created_protocol;
end;
$$;

revoke all on function public.create_initial_protocol_draft(uuid, text, text, text, text) from public;
grant execute on function public.create_initial_protocol_draft(uuid, text, text, text, text) to authenticated;

create or replace function private.validate_protocol_paired_variable_values()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and old.status = 'draft' then
    if length(trim(coalesce(new.tester_a_value, ''))) < 2
      or length(trim(coalesce(new.tester_b_value, ''))) < 2 then
      raise exception 'Paired isolated-variable values are incomplete' using errcode = '22023';
    end if;
    if lower(trim(new.tester_a_value)) = lower(trim(new.tester_b_value)) then
      raise exception 'Tester A and Tester B must have different isolated-variable values' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_protocol_paired_variable_values on public.protocols;
create trigger validate_protocol_paired_variable_values
before update on public.protocols
for each row execute function private.validate_protocol_paired_variable_values();

comment on column public.protocols.tester_a_value is
  'The isolated-variable condition assigned to Tester A for this protocol version.';
comment on column public.protocols.tester_b_value is
  'The isolated-variable condition assigned to Tester B for this protocol version.';
