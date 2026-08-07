create or replace function public.create_paired_assignment_batch(
  p_study_id uuid,
  p_protocol_id uuid,
  p_route_id uuid,
  p_tester_pairs jsonb,
  p_tester_a_service_id uuid,
  p_tester_b_service_id uuid,
  p_testing_date date,
  p_start_time time,
  p_end_time time,
  p_timezone text,
  p_instructions text default null
)
returns setof public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair jsonb;
  created_assignment public.assignments;
  tester_ids uuid[];
begin
  if jsonb_typeof(p_tester_pairs) <> 'array' or jsonb_array_length(p_tester_pairs) = 0 then
    raise exception 'Provide at least one tester pair' using errcode = '22023';
  end if;

  select array_agg((entry ->> 'tester_a_id')::uuid) || array_agg((entry ->> 'tester_b_id')::uuid)
    into tester_ids
  from jsonb_array_elements(p_tester_pairs) entry;

  if array_length(tester_ids, 1) <> (select count(distinct tester_id) from unnest(tester_ids) tester_id) then
    raise exception 'Each tester can be assigned only once in a batch' using errcode = '22023';
  end if;

  -- The called function validates membership, schedule, protocol, service and authorization.
  -- A failure rolls back this entire RPC call, so no partial batch is created.
  for pair in select value from jsonb_array_elements(p_tester_pairs)
  loop
    select * into created_assignment
    from public.create_paired_assignment(
      p_study_id, p_protocol_id, p_route_id,
      (pair ->> 'tester_a_id')::uuid, (pair ->> 'tester_b_id')::uuid,
      p_tester_a_service_id, p_tester_b_service_id,
      p_testing_date, p_start_time, p_end_time, p_timezone, p_instructions
    );
    return next created_assignment;
  end loop;
end;
$$;

revoke all on function public.create_paired_assignment_batch(uuid, uuid, uuid, jsonb, uuid, uuid, date, time, time, text, text) from public;
grant execute on function public.create_paired_assignment_batch(uuid, uuid, uuid, jsonb, uuid, uuid, date, time, time, text, text) to authenticated;

comment on function public.create_paired_assignment_batch(uuid, uuid, uuid, jsonb, uuid, uuid, date, time, time, text, text) is
  'Atomically creates multiple controlled assignments with distinct testers across the batch.';
