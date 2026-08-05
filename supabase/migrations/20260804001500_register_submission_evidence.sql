create unique index evidence_files_submission_type_unique on public.evidence_files(submission_id, evidence_type);

create policy evidence_objects_tester_delete_draft
on storage.objects for delete to authenticated
using (
  bucket_id = 'paired-testing-evidence'
  and owner_id = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and exists (
    select 1 from public.assignment_testers at
    join public.assignments a on a.id = at.assignment_id
    left join public.submissions s on s.assignment_tester_id = at.id
    where at.user_id = (select auth.uid()) and at.status = 'in_progress'
      and a.id::text = (storage.foldername(name))[2]
      and a.study_id::text = (storage.foldername(name))[1]
      and (s.id is null or s.status = 'draft')
  )
);

create or replace function public.register_submission_evidence(
  p_submission_id uuid,
  p_evidence_type text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256 text,
  p_captured_at timestamptz default null
)
returns public.evidence_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_submission public.submissions;
  selected_assignment public.assignments;
  selected_protocol public.protocols;
  created_evidence public.evidence_files;
  expected_prefix text;
  allowed_types text[];
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_submission from public.submissions where id = p_submission_id and user_id = caller_id and status = 'draft';
  if selected_submission.id is null then raise exception 'An editable submission draft is required' using errcode = '42501'; end if;
  select * into selected_assignment from public.assignments where id = selected_submission.assignment_id;
  select * into selected_protocol from public.protocols where id = selected_assignment.protocol_id;
  expected_prefix := selected_submission.study_id::text || '/' || selected_submission.assignment_id::text || '/' || caller_id::text || '/';
  if left(p_storage_path, length(expected_prefix)) <> expected_prefix then raise exception 'Invalid evidence storage path' using errcode = '22023'; end if;

  select coalesce(array_agg(item ->> 'code'), '{}'::text[]) into allowed_types
  from jsonb_array_elements(selected_protocol.evidence_requirements) item;
  if not (p_evidence_type = any(allowed_types)) then raise exception 'This evidence type is not configured by the protocol' using errcode = '22023'; end if;
  if p_size_bytes <= 0 or p_size_bytes > 52428800 then raise exception 'Evidence file size is invalid' using errcode = '22023'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Evidence hash is invalid' using errcode = '22023'; end if;
  if (p_evidence_type = 'screenshot' and p_mime_type not in ('image/jpeg','image/png','image/webp'))
    or (p_evidence_type = 'screen_recording' and p_mime_type not in ('video/mp4','video/quicktime'))
    or (p_evidence_type = 'evidence_metadata' and p_mime_type <> 'application/json') then
    raise exception 'The file type does not match the evidence requirement' using errcode = '22023';
  end if;

  insert into public.evidence_files (
    evidence_code, study_id, assignment_id, submission_id, uploaded_by, evidence_type,
    storage_path, original_filename, mime_type, size_bytes, sha256, captured_at, integrity_status
  ) values (
    selected_submission.submission_code || '-E' || case p_evidence_type when 'screenshot' then 'SS' when 'screen_recording' then 'SR' else 'EM' end, selected_submission.study_id,
    selected_submission.assignment_id, selected_submission.id, caller_id, p_evidence_type,
    p_storage_path, left(p_original_filename, 255), p_mime_type, p_size_bytes, p_sha256, p_captured_at, 'pending'
  ) returning * into created_evidence;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected_submission.study_id, caller_id, 'evidence.uploaded', 'evidence', 'evidence', created_evidence.id,
    jsonb_build_object('evidence_code', created_evidence.evidence_code, 'submission_id', selected_submission.id,
      'evidence_type', p_evidence_type, 'mime_type', p_mime_type, 'size_bytes', p_size_bytes, 'sha256', p_sha256));
  return created_evidence;
end;
$$;

revoke all on function public.register_submission_evidence(uuid, text, text, text, text, bigint, text, timestamptz) from public;
grant execute on function public.register_submission_evidence(uuid, text, text, text, text, bigint, text, timestamptz) to authenticated;
