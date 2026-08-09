alter table public.screenshot_ocr_validations
  add column if not exists candidates jsonb not null default '[]'::jsonb,
  add column if not exists selected_candidates jsonb not null default '{}'::jsonb,
  add column if not exists selection_status text not null default 'pending',
  add column if not exists confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists confirmed_at timestamptz;

alter table public.screenshot_ocr_validations
  drop constraint if exists screenshot_ocr_validations_selection_status_check;
alter table public.screenshot_ocr_validations
  add constraint screenshot_ocr_validations_selection_status_check
  check (selection_status in ('pending', 'confirmed'));

-- A processed screenshot is not submission-ready until the tester has chosen
-- one server-generated candidate for every required screenshot value.
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
  if active_validation.selection_status <> 'confirmed' then raise exception 'Confirm the detected screenshot details before submission' using errcode = '22023'; end if;
  if active_validation.expected_platform_service_id <> p_required_service_id then raise exception 'Screenshot validation is not bound to this assignment service' using errcode = '22023'; end if;
  if active_validation.service_validation <> 'matched' then raise exception 'The selected screenshot service does not match the assignment' using errcode = '22023'; end if;
end;
$$;
revoke all on function public.assert_screenshot_service_ready(uuid, uuid) from public;

