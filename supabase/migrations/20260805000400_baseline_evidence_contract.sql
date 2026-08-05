update public.protocols
set evidence_requirements = jsonb_build_array(
  jsonb_build_object('code', 'screenshot', 'label', 'Quote screenshot', 'required', true),
  jsonb_build_object('code', 'screen_recording', 'label', 'Screen recording', 'required', true)
);

create or replace function private.apply_baseline_evidence_validation(p_pair_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair_row public.matched_pairs;
  a public.submissions;
  b public.submissions;
  a_screenshot boolean;
  b_screenshot boolean;
  a_recording boolean;
  b_recording boolean;
  a_metadata boolean;
  b_metadata boolean;
  required_missing boolean;
  integrity_flagged boolean;
begin
  select * into pair_row from public.matched_pairs where id = p_pair_id for update;
  if pair_row.id is null then return; end if;
  select * into a from public.submissions where id = pair_row.submission_a_id;
  select * into b from public.submissions where id = pair_row.submission_b_id;

  select
    exists(select 1 from public.evidence_files where submission_id = a.id and evidence_type = 'screenshot'),
    exists(select 1 from public.evidence_files where submission_id = b.id and evidence_type = 'screenshot'),
    exists(select 1 from public.evidence_files where submission_id = a.id and evidence_type = 'screen_recording'),
    exists(select 1 from public.evidence_files where submission_id = b.id and evidence_type = 'screen_recording')
  into a_screenshot, b_screenshot, a_recording, b_recording;

  select
    not exists (
      select 1 from public.evidence_files ef
      where ef.submission_id = a.id and ef.evidence_type in ('screenshot', 'screen_recording')
        and (ef.original_filename = '' or ef.mime_type = '' or ef.size_bytes <= 0 or ef.sha256 is null
          or ef.captured_at is null or ef.uploaded_at is null or ef.uploaded_by is null or ef.storage_path = '')
    ) and (select count(*) from public.evidence_files where submission_id = a.id and evidence_type in ('screenshot', 'screen_recording')) = 2,
    not exists (
      select 1 from public.evidence_files ef
      where ef.submission_id = b.id and ef.evidence_type in ('screenshot', 'screen_recording')
        and (ef.original_filename = '' or ef.mime_type = '' or ef.size_bytes <= 0 or ef.sha256 is null
          or ef.captured_at is null or ef.uploaded_at is null or ef.uploaded_by is null or ef.storage_path = '')
    ) and (select count(*) from public.evidence_files where submission_id = b.id and evidence_type in ('screenshot', 'screen_recording')) = 2
  into a_metadata, b_metadata;

  insert into public.validation_results (
    matched_pair_id, rule_code, label, status, requirement_level, tester_a_value,
    tester_b_value, observed_difference, explanation, threshold_configuration, affects_overall_status
  ) values (
    p_pair_id, 'evidence_system_metadata', 'System-generated evidence metadata',
    case when a_metadata and b_metadata then 'pass'::public.rule_status else 'fail'::public.rule_status end,
    'required', to_jsonb(a_metadata), to_jsonb(b_metadata),
    case when a_metadata and b_metadata then 'Complete for both testers' else 'Required metadata fields are incomplete' end,
    'Checks automatically captured filename, MIME type, size, SHA-256 hash, capture/upload times, uploader, and storage linkage.',
    jsonb_build_object('source', 'system_generated'), not (a_metadata and b_metadata)
  ) on conflict (matched_pair_id, rule_code) do update set
    status = excluded.status, tester_a_value = excluded.tester_a_value, tester_b_value = excluded.tester_b_value,
    observed_difference = excluded.observed_difference, explanation = excluded.explanation,
    threshold_configuration = excluded.threshold_configuration, affects_overall_status = excluded.affects_overall_status;

  required_missing := not (a_screenshot and b_screenshot and a_recording and b_recording and a_metadata and b_metadata);
  integrity_flagged := exists (
    select 1 from public.evidence_files
    where submission_id in (a.id, b.id) and integrity_status in ('flagged', 'rejected')
  );

  update public.matched_pairs set
    evidence_status = case
      when integrity_flagged then 'flagged'::public.evidence_integrity_status
      when required_missing then 'pending'::public.evidence_integrity_status
      else 'complete'::public.evidence_integrity_status
    end,
    technical_status = case
      when required_missing then 'incomplete'::public.pair_validation_status
      else technical_status
    end
  where id = p_pair_id;
end;
$$;

create or replace function private.apply_evidence_after_validation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.action = 'validation.completed' and new.target_type = 'pair' and new.target_id is not null then
    perform private.apply_baseline_evidence_validation(new.target_id);
  end if;
  return new;
end;
$$;

drop trigger if exists activity_logs_verify_baseline_evidence on public.activity_logs;
create trigger activity_logs_verify_baseline_evidence
after insert on public.activity_logs
for each row execute function private.apply_evidence_after_validation();

do $$ declare pair_record record; begin
  for pair_record in select id from public.matched_pairs loop
    perform private.apply_baseline_evidence_validation(pair_record.id);
  end loop;
end $$;

revoke all on function private.apply_baseline_evidence_validation(uuid) from public;
revoke all on function private.apply_evidence_after_validation() from public;

comment on function private.apply_baseline_evidence_validation(uuid) is
  'Requires screenshot, screen recording, and complete system-generated metadata for both paired submissions.';
