create or replace function private.lock_assignment_controls()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.study_id is distinct from old.study_id
    or new.protocol_id is distinct from old.protocol_id
    or new.assignment_code is distinct from old.assignment_code
    or new.scheduled_start is distinct from old.scheduled_start
    or new.scheduled_end is distinct from old.scheduled_end
    or new.pickup_location is distinct from old.pickup_location
    or new.destination_location is distinct from old.destination_location
    or new.isolated_variable is distinct from old.isolated_variable
    or new.instructions is distinct from old.instructions
    or new.created_by is distinct from old.created_by then
    raise exception 'Assignment controls are locked after creation' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger assignments_lock_controls
before update on public.assignments
for each row execute function private.lock_assignment_controls();

create or replace function private.lock_assignment_tester_controls()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignment_id is distinct from old.assignment_id
    or new.user_id is distinct from old.user_id
    or new.slot is distinct from old.slot
    or new.platform_service_id is distinct from old.platform_service_id
    or new.account_configuration is distinct from old.account_configuration
    or new.assigned_by is distinct from old.assigned_by then
    raise exception 'Assignment tester controls are locked after creation' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger assignment_testers_lock_controls
before update on public.assignment_testers
for each row execute function private.lock_assignment_tester_controls();

comment on function private.lock_assignment_controls() is
  'Keeps the protocol, route snapshot, schedule, timezone, instructions, and ownership immutable after assignment creation.';
comment on function private.lock_assignment_tester_controls() is
  'Keeps tester identity, side, provider/tier, and inherited protocol condition immutable while allowing workflow status changes.';
