create unique index if not exists protocols_one_draft_per_study_idx
  on public.protocols (study_id)
  where status = 'draft';

create or replace function public.save_protocol_details(
  p_study_id uuid,
  p_protocol_id uuid,
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
  updated_protocol public.protocols;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
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

  update public.protocols
  set title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''),
      tester_a_value = trim(p_tester_a_value),
      tester_b_value = trim(p_tester_b_value)
  where id = p_protocol_id and study_id = p_study_id and status = 'draft'
  returning * into updated_protocol;

  if updated_protocol.id is null then
    raise exception 'Only a draft protocol can be edited' using errcode = '22023';
  end if;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'protocol.details_saved', 'protocol', 'protocol', updated_protocol.id,
    jsonb_build_object('version', updated_protocol.version));
  return updated_protocol;
end;
$$;

revoke all on function public.save_protocol_details(uuid, uuid, text, text, text, text) from public;
grant execute on function public.save_protocol_details(uuid, uuid, text, text, text, text) to authenticated;

create or replace function public.create_protocol_version(
  p_study_id uuid,
  p_source_protocol_id uuid,
  p_change_summary text
)
returns public.protocols
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_study public.studies;
  source_protocol public.protocols;
  created_protocol public.protocols;
  next_minor integer;
  next_code_number integer;
  next_version text;
  next_code text;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_change_summary, ''))) < 3 then
    raise exception 'Describe why a new version is needed' using errcode = '22023';
  end if;

  select * into selected_study from public.studies where id = p_study_id for update;
  if selected_study.id is null then
    raise exception 'Study not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.protocols where study_id = p_study_id and status = 'draft') then
    raise exception 'A draft protocol version already exists' using errcode = '23505';
  end if;

  select * into source_protocol
  from public.protocols
  where id = p_source_protocol_id and study_id = p_study_id and status = 'active';
  if source_protocol.id is null then
    raise exception 'Only the active protocol can start a new version' using errcode = '22023';
  end if;

  next_minor := split_part(source_protocol.version, '.', 2)::integer + 1;
  next_version := split_part(source_protocol.version, '.', 1) || '.' || next_minor::text;
  select coalesce(max((substring(protocol_code from '-P([0-9]+)$'))::integer), 0) + 1
    into next_code_number from public.protocols where study_id = p_study_id;
  next_code := selected_study.study_code || '-P' || lpad(next_code_number::text, 3, '0');

  insert into public.protocols (
    study_id, protocol_code, version, status, title, description, study_question,
    isolated_variable, tester_a_value, tester_b_value, fixed_controls,
    evidence_requirements, validation_configuration, exclusion_conditions,
    change_summary, created_by
  ) values (
    p_study_id, next_code, next_version, 'draft', source_protocol.title,
    source_protocol.description, source_protocol.study_question, source_protocol.isolated_variable,
    source_protocol.tester_a_value, source_protocol.tester_b_value, source_protocol.fixed_controls,
    source_protocol.evidence_requirements, source_protocol.validation_configuration,
    source_protocol.exclusion_conditions, trim(p_change_summary), caller_id
  ) returning * into created_protocol;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, caller_id, 'protocol.version_created', 'protocol', 'protocol', created_protocol.id,
    jsonb_build_object('source_protocol_id', source_protocol.id, 'source_version', source_protocol.version,
      'version', created_protocol.version, 'change_summary', created_protocol.change_summary));
  return created_protocol;
end;
$$;

revoke all on function public.create_protocol_version(uuid, uuid, text) from public;
grant execute on function public.create_protocol_version(uuid, uuid, text) to authenticated;
