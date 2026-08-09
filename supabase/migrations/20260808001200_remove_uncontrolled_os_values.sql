-- Uncontrolled studies must not retain side-specific OS values. This keeps the
-- stored configuration semantically aligned with the optional restriction UI.
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
  if design = 'uncontrolled' then
    new.configuration := new.configuration - 'tester_a_operating_system' - 'tester_b_operating_system';
    return new;
  end if;
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

update public.studies
set configuration = configuration - 'tester_a_operating_system' - 'tester_b_operating_system'
where configuration ->> 'device_comparison_design' = 'uncontrolled'
  and (configuration ? 'tester_a_operating_system' or configuration ? 'tester_b_operating_system');
