-- Evidence-bound OCR results intentionally live separately from pair validation
-- because they are produced before a pair exists and belong to one exact upload.
create table public.screenshot_ocr_validations (
  id uuid primary key default gen_random_uuid(),
  evidence_file_id uuid not null unique references public.evidence_files(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  expected_platform_service_id uuid not null references public.platform_services(id) on delete restrict,
  detected_platform_service_id uuid references public.platform_services(id) on delete restrict,
  service_validation text not null check (service_validation in ('matched', 'mismatched', 'unverified')),
  raw_ride_label text,
  detected_fare_min numeric(12,2) check (detected_fare_min is null or detected_fare_min >= 0),
  detected_fare_max numeric(12,2) check (detected_fare_max is null or detected_fare_max >= 0),
  detected_status_bar_time text,
  resolved_quote_timestamp timestamptz,
  quote_time_resolution jsonb not null default '{}'::jsonb,
  detected_battery_percentage smallint check (detected_battery_percentage is null or detected_battery_percentage between 0 and 100),
  raw_ocr_output jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (detected_fare_max is null or detected_fare_min is null or detected_fare_max >= detected_fare_min)
);

create unique index screenshot_ocr_validations_active_submission_idx
  on public.screenshot_ocr_validations(submission_id) where is_active;
create index screenshot_ocr_validations_assignment_idx on public.screenshot_ocr_validations(assignment_id, service_validation);

-- Retain replaced screenshots for audit while making only the newest OCR record
-- active. The prior schema allowed one evidence row per type, which prevented
-- the required replacement workflow.
drop index if exists public.evidence_files_submission_type_unique;
alter table public.evidence_files drop constraint if exists evidence_files_evidence_code_key;

grant select on public.screenshot_ocr_validations to authenticated;
alter table public.screenshot_ocr_validations enable row level security;
create policy screenshot_ocr_validations_authorized_select on public.screenshot_ocr_validations
for select to authenticated using (
  exists (
    select 1 from public.evidence_files ef
    where ef.id = evidence_file_id and (
      ef.uploaded_by = (select auth.uid())
      or private.can_manage_study(ef.study_id)
      or private.can_review_study(ef.study_id)
    )
  )
);

-- Creates a valid, empty draft at the first-upload boundary. Tester-confirmed
-- values remain nullable until the normal draft save occurs.
create or replace function public.ensure_submission_draft(p_assignment_id uuid)
returns public.submissions
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  selected_assignment public.assignments;
  selected_slot public.assignment_testers;
  selected_study public.studies;
  saved_submission public.submissions;
  code_suffix text;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_assignment from public.assignments where id = p_assignment_id;
  select * into selected_slot from public.assignment_testers where assignment_id = p_assignment_id and user_id = caller_id;
  if selected_assignment.id is null or selected_slot.id is null then raise exception 'You are not assigned to this test' using errcode = '42501'; end if;
  if selected_assignment.status <> 'in_progress' or selected_slot.status <> 'in_progress' then raise exception 'Start this assignment before uploading evidence' using errcode = '22023'; end if;
  select * into saved_submission from public.submissions where assignment_tester_id = selected_slot.id;
  if saved_submission.id is not null then return saved_submission; end if;
  select * into selected_study from public.studies where id = selected_assignment.study_id;
  code_suffix := case when selected_slot.slot = 'tester_a' then 'SA' else 'SB' end;
  insert into public.submissions (submission_code, study_id, assignment_id, assignment_tester_id, user_id, platform_service_id, status, currency, account_profile, pickup_location, destination_location)
  values (selected_assignment.assignment_code || '-' || code_suffix, selected_assignment.study_id, selected_assignment.id, selected_slot.id, caller_id, selected_slot.platform_service_id, 'draft', selected_study.default_currency, selected_slot.account_configuration, selected_assignment.pickup_location, selected_assignment.destination_location)
  returning * into saved_submission;
  return saved_submission;
end;
$$;
revoke all on function public.ensure_submission_draft(uuid) from public;
grant execute on function public.ensure_submission_draft(uuid) to authenticated;

-- The client may persist parser output, but it cannot choose the expected
-- service: the required service is reloaded from the authenticated assignment.
create or replace function public.record_screenshot_ocr_validation(
  p_evidence_file_id uuid, p_detected_platform_service_id uuid, p_service_validation text,
  p_raw_ride_label text, p_detected_fare_min numeric, p_detected_fare_max numeric,
  p_detected_status_bar_time text, p_resolved_quote_timestamp timestamptz,
  p_quote_time_resolution jsonb, p_detected_battery_percentage integer,
  p_raw_ocr_output jsonb, p_warnings jsonb
) returns public.screenshot_ocr_validations
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  selected_evidence public.evidence_files;
  selected_submission public.submissions;
  selected_slot public.assignment_testers;
  saved_validation public.screenshot_ocr_validations;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_evidence from public.evidence_files where id = p_evidence_file_id and uploaded_by = caller_id and evidence_type = 'screenshot';
  if selected_evidence.id is null then raise exception 'The quote screenshot is not available' using errcode = '42501'; end if;
  select * into selected_submission from public.submissions where id = selected_evidence.submission_id and user_id = caller_id and status = 'draft';
  select * into selected_slot from public.assignment_testers where id = selected_submission.assignment_tester_id;
  if selected_submission.id is null or selected_slot.platform_service_id is null then raise exception 'The assignment service is not available' using errcode = '22023'; end if;
  if p_service_validation not in ('matched', 'mismatched', 'unverified') then raise exception 'Invalid screenshot validation status' using errcode = '22023'; end if;
  if p_detected_platform_service_id is null and p_service_validation <> 'unverified' then raise exception 'An unresolved service must be unverified' using errcode = '22023'; end if;
  if p_detected_platform_service_id is not null then
    if p_detected_platform_service_id = selected_slot.platform_service_id
      and p_service_validation <> 'matched' then
      raise exception 'Screenshot validation does not match the assignment service' using errcode = '22023';
    end if;
    if p_detected_platform_service_id <> selected_slot.platform_service_id
      and p_service_validation <> 'mismatched' then
      raise exception 'Screenshot validation does not match the assignment service' using errcode = '22023';
    end if;
  end if;
  update public.screenshot_ocr_validations set is_active = false where submission_id = selected_submission.id and is_active;
  insert into public.screenshot_ocr_validations (evidence_file_id, assignment_id, submission_id, expected_platform_service_id, detected_platform_service_id, service_validation, raw_ride_label, detected_fare_min, detected_fare_max, detected_status_bar_time, resolved_quote_timestamp, quote_time_resolution, detected_battery_percentage, raw_ocr_output, warnings)
  values (selected_evidence.id, selected_evidence.assignment_id, selected_submission.id, selected_slot.platform_service_id, p_detected_platform_service_id, p_service_validation, nullif(trim(p_raw_ride_label), ''), p_detected_fare_min, p_detected_fare_max, nullif(trim(p_detected_status_bar_time), ''), p_resolved_quote_timestamp, coalesce(p_quote_time_resolution, '{}'::jsonb), p_detected_battery_percentage, coalesce(p_raw_ocr_output, '{}'::jsonb), coalesce(p_warnings, '[]'::jsonb))
  returning * into saved_validation;
  return saved_validation;
end;
$$;
revoke all on function public.record_screenshot_ocr_validation(uuid, uuid, text, text, numeric, numeric, text, timestamptz, jsonb, integer, jsonb, jsonb) from public;

-- Final validation is deliberately repeated in the database, tied to the
-- latest active OCR record and the exact evidence file it references.
create or replace function public.assert_screenshot_service_ready(p_submission_id uuid, p_required_service_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  active_validation public.screenshot_ocr_validations;
  latest_evidence_id uuid;
begin
  select * into active_validation from public.screenshot_ocr_validations where submission_id = p_submission_id and is_active;
  if active_validation.id is null then raise exception 'A processed quote screenshot is required' using errcode = '22023'; end if;
  select id into latest_evidence_id from public.evidence_files where submission_id = p_submission_id and evidence_type = 'screenshot' order by uploaded_at desc, created_at desc limit 1;
  if latest_evidence_id is null or active_validation.evidence_file_id <> latest_evidence_id then raise exception 'The current quote screenshot must finish processing before submission' using errcode = '22023'; end if;
  if active_validation.expected_platform_service_id <> p_required_service_id then raise exception 'Screenshot validation is not bound to this assignment service' using errcode = '22023'; end if;
  if active_validation.service_validation = 'mismatched' then raise exception 'The selected screenshot service does not match the assignment' using errcode = '22023'; end if;
end;
$$;
revoke all on function public.assert_screenshot_service_ready(uuid, uuid) from public;

create or replace function public.submit_tester_observation(p_assignment_id uuid)
returns public.submissions
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  selected_assignment public.assignments;
  selected_slot public.assignment_testers;
  selected_submission public.submissions;
  selected_protocol public.protocols;
  missing_evidence text[];
  submitted_count integer;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_assignment from public.assignments where id = p_assignment_id for update;
  select * into selected_slot from public.assignment_testers where assignment_id = p_assignment_id and user_id = caller_id for update;
  select * into selected_submission from public.submissions where assignment_id = p_assignment_id and user_id = caller_id for update;
  if selected_assignment.id is null or selected_slot.id is null or selected_submission.id is null or selected_slot.platform_service_id is null then raise exception 'An owned assignment submission draft is required' using errcode = '42501'; end if;
  if selected_assignment.status not in ('in_progress', 'awaiting_partner') or selected_slot.status <> 'in_progress' or selected_submission.status <> 'draft' then raise exception 'This observation cannot be submitted' using errcode = '22023'; end if;
  if selected_submission.displayed_fare is null or selected_submission.currency is null or selected_submission.quote_timestamp is null or selected_submission.latitude is null or selected_submission.longitude is null or selected_submission.network_type is null or selected_submission.device_type is null or selected_submission.operating_system is null or selected_submission.operating_system_version is null or selected_submission.app_version is null or selected_submission.battery_percentage is null then raise exception 'Complete the observation before submitting' using errcode = '22023'; end if;
  if selected_submission.quote_timestamp < selected_assignment.scheduled_start or selected_submission.quote_timestamp > selected_assignment.scheduled_end then raise exception 'Quote timestamp is outside the assignment testing window' using errcode = '22023'; end if;
  perform public.assert_screenshot_service_ready(selected_submission.id, selected_slot.platform_service_id);
  select * into selected_protocol from public.protocols where id = selected_assignment.protocol_id;
  select coalesce(array_agg(requirement ->> 'label'), '{}'::text[]) into missing_evidence from jsonb_array_elements(selected_protocol.evidence_requirements) requirement where coalesce((requirement ->> 'required')::boolean, false) and not exists (select 1 from public.evidence_files ef where ef.submission_id = selected_submission.id and ef.evidence_type = requirement ->> 'code');
  if cardinality(missing_evidence) > 0 then raise exception 'Missing required evidence: %', array_to_string(missing_evidence, ', ') using errcode = '22023'; end if;
  update public.submissions set status = 'submitted', submitted_at = now() where id = selected_submission.id returning * into selected_submission;
  update public.assignment_testers set status = 'submitted' where id = selected_slot.id;
  select count(*) into submitted_count from public.assignment_testers where assignment_id = p_assignment_id and status = 'submitted';
  update public.assignments set status = case when submitted_count = 2 then 'ready_for_validation'::public.assignment_status else 'awaiting_partner'::public.assignment_status end where id = p_assignment_id;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details) values (selected_assignment.study_id, caller_id, 'submission.submitted', 'submission', 'submission', selected_submission.id, jsonb_build_object('submission_code', selected_submission.submission_code, 'assignment_id', p_assignment_id, 'slot', selected_slot.slot, 'submitted_at', selected_submission.submitted_at, 'assignment_status', case when submitted_count = 2 then 'ready_for_validation' else 'awaiting_partner' end));
  return selected_submission;
end;
$$;
