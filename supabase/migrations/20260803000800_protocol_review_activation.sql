create or replace function private.protect_protocol_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.study_id is distinct from old.study_id
    or new.protocol_code is distinct from old.protocol_code
    or new.version is distinct from old.version
    or new.created_at is distinct from old.created_at then
    raise exception 'Protocol identity fields are immutable' using errcode = '42501';
  end if;
  if old.status <> 'draft' and current_setting('dogoodie.protocol_transition', true) is distinct from 'allowed' then
    raise exception 'Activated protocol versions are read-only' using errcode = '42501';
  end if;
  if new.status is distinct from old.status
    and current_setting('dogoodie.protocol_transition', true) is distinct from 'allowed' then
    raise exception 'Protocol status changes require the controlled workflow' using errcode = '42501';
  end if;
  if (new.approved_by is distinct from old.approved_by or new.effective_at is distinct from old.effective_at)
    and current_setting('dogoodie.protocol_transition', true) is distinct from 'allowed' then
    raise exception 'Protocol approval fields require the controlled workflow' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_protocol_version on public.protocols;
create trigger protect_protocol_version
before update on public.protocols
for each row execute function private.protect_protocol_version();

create or replace function public.activate_protocol(
  p_study_id uuid,
  p_protocol_id uuid
)
returns public.protocols
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_protocol public.protocols;
  activated_protocol public.protocols;
  control_count integer;
  observation_count integer;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;

  select * into selected_protocol
  from public.protocols
  where id = p_protocol_id and study_id = p_study_id
  for update;

  if selected_protocol.id is null or selected_protocol.status <> 'draft' then
    raise exception 'Only a draft protocol can be activated' using errcode = '22023';
  end if;
  if length(trim(selected_protocol.title)) < 3
    or length(trim(selected_protocol.study_question)) < 10
    or length(trim(coalesce(selected_protocol.isolated_variable, ''))) < 2 then
    raise exception 'Protocol details are incomplete' using errcode = '22023';
  end if;

  select count(*) into control_count
  from jsonb_array_elements(selected_protocol.fixed_controls) element
  where element ->> 'code' in ('provider', 'ride_tier', 'pickup_location', 'destination_location', 'currency');
  if control_count <> 5 then
    raise exception 'Required matching controls are incomplete' using errcode = '22023';
  end if;
  if not (selected_protocol.validation_configuration ? 'request_time_gap')
    or not (selected_protocol.validation_configuration ? 'location_gap') then
    raise exception 'Validation thresholds are incomplete' using errcode = '22023';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(selected_protocol.evidence_requirements) element
    where element ->> 'code' = 'screenshot' and coalesce((element ->> 'required')::boolean, false)
  ) then
    raise exception 'Required evidence is incomplete' using errcode = '22023';
  end if;
  select count(*) into observation_count
  from jsonb_array_elements(coalesce(selected_protocol.validation_configuration -> 'observation_fields', '[]'::jsonb)) element
  where coalesce((element ->> 'required')::boolean, false);
  if observation_count < 9 then
    raise exception 'Required observation fields are incomplete' using errcode = '22023';
  end if;
  if jsonb_array_length(selected_protocol.exclusion_conditions) = 0 then
    raise exception 'Exclusion conditions are incomplete' using errcode = '22023';
  end if;

  perform set_config('dogoodie.protocol_transition', 'allowed', true);
  update public.protocols
  set status = 'superseded'
  where study_id = p_study_id and status = 'active' and id <> p_protocol_id;

  update public.protocols
  set status = 'active', approved_by = caller_id, effective_at = now()
  where id = p_protocol_id
  returning * into activated_protocol;

  insert into public.activity_logs (
    study_id, actor_id, action, category, target_type, target_id, details
  ) values (
    p_study_id, caller_id, 'protocol.activated', 'protocol', 'protocol', activated_protocol.id,
    jsonb_build_object(
      'protocol_code', activated_protocol.protocol_code,
      'version', activated_protocol.version,
      'effective_at', activated_protocol.effective_at
    )
  );

  return activated_protocol;
end;
$$;

revoke all on function public.activate_protocol(uuid, uuid) from public;
grant execute on function public.activate_protocol(uuid, uuid) to authenticated;

comment on function public.activate_protocol(uuid, uuid) is
  'Validates protocol completeness, supersedes any prior active version, activates the draft, and locks it from editing.';
