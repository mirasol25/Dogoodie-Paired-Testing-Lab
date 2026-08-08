-- Make operating-system controls opt-in. Uncontrolled studies record submitted
-- OS metadata but do not restrict study membership, assignment sides, or pairs.
create or replace function private.validate_study_operating_system_configuration()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  design text := new.configuration ->> 'device_comparison_design';
  os_a text := new.configuration ->> 'tester_a_operating_system';
  os_b text := new.configuration ->> 'tester_b_operating_system';
begin
  if design is null and os_a is null and os_b is null then return new; end if;
  if design = 'uncontrolled' then return new; end if;
  if design not in ('same_operating_system', 'different_operating_system') then
    raise exception 'Select a valid operating-system comparison design' using errcode = '22023';
  end if;
  if os_a not in ('iOS', 'Android') or os_b not in ('iOS', 'Android') then
    raise exception 'Tester operating systems must be iOS or Android' using errcode = '22023';
  end if;
  if design = 'same_operating_system' and os_a <> os_b then
    raise exception 'Same-OS studies require matching tester operating systems' using errcode = '22023';
  end if;
  if design = 'different_operating_system' and os_a = os_b then
    raise exception 'OS-comparison studies require different tester operating systems' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_assignment_tester_operating_system()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  study_configuration jsonb;
  comparison_design text;
  expected_os text;
  actual_os text;
begin
  select study.configuration into study_configuration
  from public.assignments assignment
  join public.studies study on study.id = assignment.study_id
  where assignment.id = new.assignment_id;

  comparison_design := study_configuration ->> 'device_comparison_design';
  if comparison_design is null or comparison_design = 'uncontrolled' then return new; end if;

  expected_os := case new.slot
    when 'tester_a' then study_configuration ->> 'tester_a_operating_system'
    else study_configuration ->> 'tester_b_operating_system'
  end;
  select operating_system into actual_os from public.profiles where id = new.user_id;
  if actual_os is null or lower(actual_os) <> lower(expected_os) then
    raise exception '% requires a tester whose device profile uses %',
      case new.slot when 'tester_a' then 'Tester A' else 'Tester B' end,
      expected_os using errcode = '22023';
  end if;

  new.account_configuration := coalesce(new.account_configuration, '{}'::jsonb)
    || jsonb_build_object('expected_operating_system', expected_os);
  return new;
end;
$$;

do $migration$
declare
  function_definition text;
  updated_definition text;
  old_clause text := 'when ''operating_system_family'' then case when study_row.configuration ? ''tester_a_operating_system'' and study_row.configuration ? ''tester_b_operating_system'' then case when lower(a.operating_system) = lower(study_row.configuration ->> ''tester_a_operating_system'') and lower(b.operating_system) = lower(study_row.configuration ->> ''tester_b_operating_system'') then ''pass'' else ''fail'' end else case when lower(a.operating_system) = lower(b.operating_system) then ''pass'' else ''fail'' end end';
  new_clause text := 'when ''operating_system_family'' then case when study_row.configuration ->> ''device_comparison_design'' in (''same_operating_system'', ''different_operating_system'') and study_row.configuration ? ''tester_a_operating_system'' and study_row.configuration ? ''tester_b_operating_system'' then case when lower(a.operating_system) = lower(study_row.configuration ->> ''tester_a_operating_system'') and lower(b.operating_system) = lower(study_row.configuration ->> ''tester_b_operating_system'') then ''pass'' else ''fail'' end else case when lower(a.operating_system) = lower(b.operating_system) then ''pass'' else ''fail'' end end';
begin
  function_definition := pg_get_functiondef('private.validate_matched_pair(uuid,uuid)'::regprocedure);
  updated_definition := replace(function_definition, old_clause, new_clause);
  if updated_definition = function_definition then
    raise exception 'Could not make matched-pair OS validation optional';
  end if;
  execute updated_definition;
end;
$migration$;
