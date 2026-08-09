-- Keep synchronized testing as the default. Asynchronous studies use one
-- assignment date with a separately enforced time window for each tester side.
create or replace function public.create_paired_assignment_batch_v2(
  p_study_id uuid, p_protocol_id uuid, p_route_id uuid, p_tester_pairs jsonb,
  p_tester_a_service_id uuid, p_tester_b_service_id uuid, p_testing_date date,
  p_tester_a_start_time time, p_tester_a_end_time time,
  p_tester_b_start_time time, p_tester_b_end_time time,
  p_timezone text, p_instructions text default null
)
returns setof public.assignments language plpgsql security definer set search_path = '' as $$
declare created public.assignments; synchronization text; a_start timestamptz; a_end timestamptz; b_start timestamptz; b_end timestamptz;
begin
  select coalesce(configuration ->> 'testing_synchronization', 'synchronized') into synchronization from public.studies where id = p_study_id;
  if synchronization not in ('synchronized', 'asynchronous') then raise exception 'Invalid testing synchronization configuration' using errcode = '22023'; end if;
  if p_tester_a_end_time <= p_tester_a_start_time or p_tester_b_end_time <= p_tester_b_start_time then raise exception 'Each tester window must end after it starts' using errcode = '22023'; end if;
  if synchronization = 'synchronized' and (p_tester_a_start_time <> p_tester_b_start_time or p_tester_a_end_time <> p_tester_b_end_time) then raise exception 'Synchronized studies require one shared tester window' using errcode = '22023'; end if;
  if synchronization = 'asynchronous' and p_tester_b_start_time < p_tester_a_end_time then raise exception 'Tester B must start when or after Tester A''s testing window ends' using errcode = '22023'; end if;
  a_start := (p_testing_date + p_tester_a_start_time) at time zone p_timezone; a_end := (p_testing_date + p_tester_a_end_time) at time zone p_timezone;
  b_start := (p_testing_date + p_tester_b_start_time) at time zone p_timezone; b_end := (p_testing_date + p_tester_b_end_time) at time zone p_timezone;
  for created in select * from public.create_paired_assignment_batch(p_study_id, p_protocol_id, p_route_id, p_tester_pairs,
    p_tester_a_service_id, p_tester_b_service_id, p_testing_date,
    least(p_tester_a_start_time, p_tester_b_start_time), greatest(p_tester_a_end_time, p_tester_b_end_time), p_timezone, p_instructions)
  loop
    update public.assignment_testers set account_configuration = coalesce(account_configuration, '{}'::jsonb) || jsonb_build_object(
      'scheduled_start', case when slot = 'tester_a' then a_start else b_start end,
      'scheduled_end', case when slot = 'tester_a' then a_end else b_end end,
      'testing_synchronization', synchronization
    ) where assignment_id = created.id;
    return next created;
  end loop;
end;
$$;

create or replace function private.enforce_assignment_tester_window()
returns trigger language plpgsql security definer set search_path = '' as $$
declare starts_at timestamptz; ends_at timestamptz;
begin
  if new.status = 'in_progress' and old.status is distinct from new.status then
    starts_at := nullif(new.account_configuration ->> 'scheduled_start', '')::timestamptz;
    ends_at := nullif(new.account_configuration ->> 'scheduled_end', '')::timestamptz;
    if starts_at is not null and (now() < starts_at or now() > ends_at) then
      raise exception 'Your tester-side testing window is not currently open' using errcode = '55000';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists assignment_testers_enforce_side_window on public.assignment_testers;
create trigger assignment_testers_enforce_side_window before update of status on public.assignment_testers
for each row execute function private.enforce_assignment_tester_window();

create or replace function private.enforce_submission_tester_window()
returns trigger language plpgsql security definer set search_path = '' as $$
declare slot public.assignment_testers; starts_at timestamptz; ends_at timestamptz;
begin
  select * into slot from public.assignment_testers where id = new.assignment_tester_id;
  starts_at := nullif(slot.account_configuration ->> 'scheduled_start', '')::timestamptz;
  ends_at := nullif(slot.account_configuration ->> 'scheduled_end', '')::timestamptz;
  if starts_at is not null and new.quote_timestamp is not null and (new.quote_timestamp < starts_at or new.quote_timestamp > ends_at) then
    raise exception 'Quote timestamp is outside your tester-side testing window' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists submissions_enforce_side_window on public.submissions;
create trigger submissions_enforce_side_window before insert or update of quote_timestamp on public.submissions
for each row execute function private.enforce_submission_tester_window();

create or replace function private.mark_async_request_gap_not_applicable()
returns trigger language plpgsql security definer set search_path = '' as $$
declare synchronization text;
begin
  if new.rule_code <> 'request_time_gap' then return new; end if;
  select coalesce(study.configuration ->> 'testing_synchronization', 'synchronized') into synchronization
  from public.matched_pairs pair join public.studies study on study.id = pair.study_id where pair.id = new.matched_pair_id;
  if synchronization = 'asynchronous' then
    new.status := 'pass'; new.requirement_level := 'advisory'; new.tester_a_value := null; new.tester_b_value := null;
    new.observed_difference := 'Not applicable - asynchronous testing';
    new.explanation := 'Request-time synchronization is intentionally disabled by the study design.';
    new.affects_overall_status := false;
  end if;
  return new;
end;
$$;
drop trigger if exists validation_results_async_request_gap on public.validation_results;
create trigger validation_results_async_request_gap before insert or update on public.validation_results
for each row execute function private.mark_async_request_gap_not_applicable();

-- Make the engine's aggregate status agree with the rewritten validation row.
-- The slot configuration is available in every historical version of the validator.
do $migration$
declare definition text; updated text;
begin
  definition := pg_get_functiondef('private.validate_matched_pair(uuid,uuid)'::regprocedure);
  updated := replace(definition,
    'result_status := case when time_gap <= preferred_time then ''pass'' when time_gap <= maximum_time then ''warning'' else ''fail'' end;',
    'result_status := case when coalesce(slot_a.account_configuration ->> ''testing_synchronization'', ''synchronized'') = ''asynchronous'' then ''pass'' when time_gap <= preferred_time then ''pass'' when time_gap <= maximum_time then ''warning'' else ''fail'' end;');
  if updated = definition then raise exception 'Could not update request-time validation for asynchronous studies'; end if;
  execute updated;
end;
$migration$;

revoke all on function public.create_paired_assignment_batch_v2(uuid,uuid,uuid,jsonb,uuid,uuid,date,time,time,time,time,text,text) from public;
grant execute on function public.create_paired_assignment_batch_v2(uuid,uuid,uuid,jsonb,uuid,uuid,date,time,time,time,time,text,text) to authenticated;

create or replace function public.start_assignment_test(p_assignment_id uuid)
returns public.assignment_testers language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); selected_slot public.assignment_testers; selected_assignment public.assignments; synchronization text; starts_at timestamptz; ends_at timestamptz;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_assignment from public.assignments where id = p_assignment_id for update;
  if selected_assignment.id is null then raise exception 'Assignment not found' using errcode = 'P0002'; end if;
  if selected_assignment.status not in ('not_started', 'in_progress', 'awaiting_partner') then raise exception 'This assignment cannot be started' using errcode = '22023'; end if;
  select * into selected_slot from public.assignment_testers where assignment_id = p_assignment_id and user_id = caller_id for update;
  if selected_slot.id is null then raise exception 'You are not assigned to this test' using errcode = '42501'; end if;
  synchronization := coalesce(selected_slot.account_configuration ->> 'testing_synchronization', 'synchronized');
  starts_at := coalesce(nullif(selected_slot.account_configuration ->> 'scheduled_start', '')::timestamptz, selected_assignment.scheduled_start);
  ends_at := coalesce(nullif(selected_slot.account_configuration ->> 'scheduled_end', '')::timestamptz, selected_assignment.scheduled_end);
  if starts_at is null or ends_at is null or now() < starts_at or now() > ends_at then raise exception 'The test can start only inside your testing window' using errcode = '22023'; end if;
  if selected_slot.status = 'in_progress' then raise exception 'You have already started this test' using errcode = '22023'; end if;
  if selected_slot.status <> 'ready' then raise exception 'Confirm readiness before starting' using errcode = '22023'; end if;
  if synchronization = 'synchronized' and (select count(*) from public.assignment_testers where assignment_id = p_assignment_id and status in ('ready', 'in_progress', 'submitted')) <> 2 then
    raise exception 'Both testers must confirm readiness before starting' using errcode = '22023';
  end if;
  update public.assignment_testers set status = 'in_progress' where id = selected_slot.id returning * into selected_slot;
  update public.assignments set status = 'in_progress' where id = p_assignment_id and status = 'not_started';
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected_assignment.study_id, caller_id, 'assignment.test_started', 'assignment', 'assignment', selected_assignment.id,
    jsonb_build_object('assignment_code', selected_assignment.assignment_code, 'slot', selected_slot.slot, 'started_at', now(), 'testing_synchronization', synchronization));
  return selected_slot;
end;
$$;
