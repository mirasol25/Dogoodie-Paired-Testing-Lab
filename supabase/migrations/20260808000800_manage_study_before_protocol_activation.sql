create or replace function public.update_study_before_protocol_activation(
  p_study_id uuid,
  p_name text,
  p_study_question text,
  p_isolated_variable text,
  p_target_pair_count integer,
  p_testing_starts_at timestamptz,
  p_testing_ends_at timestamptz
)
returns public.studies
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected public.studies;
  saved public.studies;
begin
  select * into selected from public.studies where id = p_study_id for update;
  if selected.id is null then raise exception 'Study not found' using errcode = 'P0002'; end if;
  if auth.uid() is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to edit this study' using errcode = '42501';
  end if;
  if selected.status <> 'draft' or exists (
    select 1 from public.protocols where study_id = p_study_id and status = 'active'
  ) then
    raise exception 'Only draft studies without an active protocol can be edited' using errcode = '55000';
  end if;
  if nullif(trim(p_name), '') is null or char_length(trim(p_name)) < 3 then
    raise exception 'Enter a study name' using errcode = '22023';
  end if;
  if nullif(trim(p_study_question), '') is null or char_length(trim(p_study_question)) < 10 then
    raise exception 'Enter a clear research question' using errcode = '22023';
  end if;
  if nullif(trim(p_isolated_variable), '') is null then
    raise exception 'Enter the isolated variable' using errcode = '22023';
  end if;
  if p_target_pair_count is null or p_target_pair_count <= 0 then
    raise exception 'Enter a positive target pair count' using errcode = '22023';
  end if;
  if p_testing_starts_at is null or p_testing_ends_at is null or p_testing_ends_at <= p_testing_starts_at then
    raise exception 'Enter a valid testing start and end' using errcode = '22023';
  end if;

  update public.studies set
    name = trim(p_name),
    study_question = trim(p_study_question),
    isolated_variable = trim(p_isolated_variable),
    target_pair_count = p_target_pair_count,
    testing_starts_at = p_testing_starts_at,
    testing_ends_at = p_testing_ends_at
  where id = p_study_id
  returning * into saved;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (p_study_id, auth.uid(), 'study.details_updated', 'study', 'study', p_study_id,
    jsonb_build_object('study_code', saved.study_code));
  return saved;
end;
$$;

create or replace function public.delete_study_before_protocol_activation(p_study_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare selected public.studies;
begin
  select * into selected from public.studies where id = p_study_id for update;
  if selected.id is null then raise exception 'Study not found' using errcode = 'P0002'; end if;
  if auth.uid() is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to delete this study' using errcode = '42501';
  end if;
  if selected.status <> 'draft' or exists (
    select 1 from public.protocols where study_id = p_study_id and status = 'active'
  ) then
    raise exception 'Only draft studies without an active protocol can be deleted' using errcode = '55000';
  end if;
  delete from public.studies where id = p_study_id;
end;
$$;

revoke all on function public.update_study_before_protocol_activation(uuid, text, text, text, integer, timestamptz, timestamptz) from public;
revoke all on function public.delete_study_before_protocol_activation(uuid) from public;
grant execute on function public.update_study_before_protocol_activation(uuid, text, text, text, integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.delete_study_before_protocol_activation(uuid) to authenticated;

