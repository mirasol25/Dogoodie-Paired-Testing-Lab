alter table public.matched_pairs
  add column if not exists directional_fare_difference numeric(12,2);

alter table public.matched_pairs
  drop constraint if exists matched_pairs_percentage_fare_difference_check;

comment on column public.matched_pairs.directional_fare_difference is
  'Side B displayed fare minus Side A displayed fare, in the study currency.';

comment on column public.matched_pairs.absolute_fare_difference is
  'Absolute value of the directional fare difference.';

comment on column public.matched_pairs.percentage_fare_difference is
  'Directional fare difference divided by Side A displayed fare, multiplied by 100. Null when Side A is zero or either fare is missing.';

create or replace function private.apply_brief_fare_calculations(p_pair_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  side_a_fare numeric;
  side_b_fare numeric;
  directional_difference numeric;
begin
  select a.displayed_fare, b.displayed_fare
  into side_a_fare, side_b_fare
  from public.matched_pairs mp
  join public.submissions a on a.id = mp.submission_a_id
  join public.submissions b on b.id = mp.submission_b_id
  where mp.id = p_pair_id;

  directional_difference := case
    when side_a_fare is null or side_b_fare is null then null
    else side_b_fare - side_a_fare
  end;

  update public.matched_pairs
  set directional_fare_difference = directional_difference,
      absolute_fare_difference = abs(directional_difference),
      percentage_fare_difference = case
        when side_a_fare is null or side_b_fare is null or side_a_fare = 0 then null
        else (directional_difference / side_a_fare) * 100
      end,
      higher_priced_slot = case
        when side_a_fare > side_b_fare then 'tester_a'::public.tester_slot
        when side_b_fare > side_a_fare then 'tester_b'::public.tester_slot
        else null::public.tester_slot
      end
  where id = p_pair_id;
end;
$$;

create or replace function private.apply_brief_calculations_after_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.action = 'validation.completed' and new.target_type = 'pair' and new.target_id is not null then
    perform private.apply_brief_fare_calculations(new.target_id);
  end if;
  return new;
end;
$$;

drop trigger if exists activity_logs_apply_brief_calculations on public.activity_logs;
create trigger activity_logs_apply_brief_calculations
after insert on public.activity_logs
for each row execute function private.apply_brief_calculations_after_validation();

create or replace function private.apply_baseline_evidence_validation(p_pair_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair_row public.matched_pairs;
  protocol_requirements jsonb;
  requirement jsonb;
  side_a_present boolean;
  side_b_present boolean;
  side_a_metadata_complete boolean;
  side_b_metadata_complete boolean;
  required_missing boolean := false;
  required_metadata_missing boolean := false;
  integrity_flagged boolean := false;
begin
  select * into pair_row
  from public.matched_pairs
  where id = p_pair_id
  for update;
  if pair_row.id is null then return; end if;

  select p.evidence_requirements into protocol_requirements
  from public.assignments assn
  join public.protocols p on p.id = assn.protocol_id
  where assn.id = pair_row.assignment_id;

  for requirement in
    select value from jsonb_array_elements(coalesce(protocol_requirements, '[]'::jsonb))
  loop
    select exists (
      select 1 from public.evidence_files
      where submission_id = pair_row.submission_a_id
        and evidence_type = requirement ->> 'code'
    ), exists (
      select 1 from public.evidence_files
      where submission_id = pair_row.submission_b_id
        and evidence_type = requirement ->> 'code'
    ) into side_a_present, side_b_present;

    if coalesce((requirement ->> 'required')::boolean, false)
      and not (side_a_present and side_b_present) then
      required_missing := true;
    end if;
  end loop;

  select not exists (
    select 1 from public.evidence_files ef
    where ef.submission_id = pair_row.submission_a_id
      and (ef.original_filename = '' or ef.mime_type = '' or ef.size_bytes <= 0
        or ef.sha256 is null or ef.captured_at is null or ef.uploaded_at is null
        or ef.uploaded_by is null or ef.storage_path = '')
  ) and exists (
    select 1 from public.evidence_files ef
    where ef.submission_id = pair_row.submission_a_id
  ), not exists (
    select 1 from public.evidence_files ef
    where ef.submission_id = pair_row.submission_b_id
      and (ef.original_filename = '' or ef.mime_type = '' or ef.size_bytes <= 0
        or ef.sha256 is null or ef.captured_at is null or ef.uploaded_at is null
        or ef.uploaded_by is null or ef.storage_path = '')
  ) and exists (
    select 1 from public.evidence_files ef
    where ef.submission_id = pair_row.submission_b_id
  ) into side_a_metadata_complete, side_b_metadata_complete;

  required_metadata_missing := not (side_a_metadata_complete and side_b_metadata_complete);

  insert into public.validation_results (
    matched_pair_id, rule_code, label, status, requirement_level, tester_a_value,
    tester_b_value, observed_difference, explanation, threshold_configuration,
    affects_overall_status
  ) values (
    p_pair_id, 'evidence_system_metadata', 'System-generated evidence metadata',
    case when not required_metadata_missing then 'pass'::public.rule_status else 'fail'::public.rule_status end,
    'required'::public.requirement_level, to_jsonb(side_a_metadata_complete),
    to_jsonb(side_b_metadata_complete),
    case when not required_metadata_missing then 'Complete for both testers' else 'Required metadata fields are incomplete' end,
    'Checks filename, MIME type, size, SHA-256 hash, capture/upload times, uploader, and storage linkage for uploaded evidence.',
    jsonb_build_object('source', 'system_generated'), required_metadata_missing
  ) on conflict (matched_pair_id, rule_code) do update set
    status = excluded.status,
    requirement_level = excluded.requirement_level,
    tester_a_value = excluded.tester_a_value,
    tester_b_value = excluded.tester_b_value,
    observed_difference = excluded.observed_difference,
    explanation = excluded.explanation,
    threshold_configuration = excluded.threshold_configuration,
    affects_overall_status = excluded.affects_overall_status;

  integrity_flagged := exists (
    select 1 from public.evidence_files
    where submission_id in (pair_row.submission_a_id, pair_row.submission_b_id)
      and integrity_status in ('flagged', 'rejected')
  );

  update public.matched_pairs
  set evidence_status = case
        when integrity_flagged then 'flagged'::public.evidence_integrity_status
        when required_missing or required_metadata_missing then 'pending'::public.evidence_integrity_status
        else 'complete'::public.evidence_integrity_status
      end,
      technical_status = case
        when required_missing or required_metadata_missing then 'incomplete'::public.pair_validation_status
        when technical_status = 'incomplete' then
          case
            when exists (
              select 1 from public.validation_results vr
              where vr.matched_pair_id = p_pair_id
                and vr.requirement_level = 'required'
                and vr.status = 'fail'
                and vr.rule_code not like 'evidence_%'
            ) then 'invalid'::public.pair_validation_status
            when exists (
              select 1 from public.validation_results vr
              where vr.matched_pair_id = p_pair_id
                and (vr.status = 'warning' or (vr.requirement_level = 'advisory' and vr.status = 'fail'))
            ) then 'warning'::public.pair_validation_status
            else 'valid'::public.pair_validation_status
          end
        else technical_status
      end
  where id = p_pair_id;
end;
$$;

do $$
declare
  pair_record record;
begin
  for pair_record in select id from public.matched_pairs loop
    perform private.apply_brief_fare_calculations(pair_record.id);
    perform private.apply_baseline_evidence_validation(pair_record.id);
  end loop;
end;
$$;

revoke all on function private.apply_brief_fare_calculations(uuid) from public;
revoke all on function private.apply_brief_calculations_after_validation() from public;
revoke all on function private.apply_baseline_evidence_validation(uuid) from public;

comment on function private.apply_baseline_evidence_validation(uuid) is
  'Evaluates evidence completeness from the active protocol and requires complete system-generated metadata for uploaded evidence.';
