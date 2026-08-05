create or replace function private.assess_evidence_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata_complete boolean;
  object_present boolean;
begin
  -- Preserve explicit integrity outcomes; only unresolved files are assessed automatically.
  if new.integrity_status <> 'pending' then return new; end if;

  metadata_complete := new.original_filename <> ''
    and new.mime_type <> ''
    and new.size_bytes > 0
    and new.sha256 ~ '^[a-f0-9]{64}$'
    and new.captured_at is not null
    and new.uploaded_at is not null
    and new.uploaded_by is not null
    and new.storage_bucket <> ''
    and new.storage_path <> '';

  if not metadata_complete then
    new.integrity_status := 'pending';
    return new;
  end if;

  select exists (
    select 1 from storage.objects object
    where object.bucket_id = new.storage_bucket and object.name = new.storage_path
  ) into object_present;

  new.integrity_status := case
    when object_present then 'complete'::public.evidence_integrity_status
    else 'flagged'::public.evidence_integrity_status
  end;
  return new;
end;
$$;

drop trigger if exists evidence_files_assess_integrity on public.evidence_files;
create trigger evidence_files_assess_integrity
before insert or update of original_filename, mime_type, size_bytes, sha256, captured_at,
  uploaded_at, uploaded_by, storage_bucket, storage_path, integrity_status
on public.evidence_files
for each row execute function private.assess_evidence_integrity();

-- Reassess unresolved records created before automatic integrity checks existed.
update public.evidence_files
set integrity_status = case
  when original_filename <> ''
    and mime_type <> ''
    and size_bytes > 0
    and sha256 ~ '^[a-f0-9]{64}$'
    and captured_at is not null
    and uploaded_at is not null
    and uploaded_by is not null
    and storage_bucket <> ''
    and storage_path <> ''
    and exists (
      select 1 from storage.objects object
      where object.bucket_id = evidence_files.storage_bucket and object.name = evidence_files.storage_path
    ) then 'complete'::public.evidence_integrity_status
  when original_filename <> ''
    and mime_type <> ''
    and size_bytes > 0
    and sha256 ~ '^[a-f0-9]{64}$'
    and captured_at is not null
    and uploaded_at is not null
    and uploaded_by is not null
    and storage_bucket <> ''
    and storage_path <> '' then 'flagged'::public.evidence_integrity_status
  else 'pending'::public.evidence_integrity_status
end
where integrity_status = 'pending';

update public.matched_pairs pair
set evidence_status = case
  when exists (
    select 1 from public.evidence_files evidence
    where evidence.submission_id in (pair.submission_a_id, pair.submission_b_id)
      and evidence.integrity_status in ('flagged', 'rejected')
  ) then 'flagged'::public.evidence_integrity_status
  when (
    select count(*) from public.evidence_files evidence
    where evidence.submission_id in (pair.submission_a_id, pair.submission_b_id)
      and evidence.evidence_type in ('screenshot', 'screen_recording')
      and evidence.integrity_status = 'complete'
  ) = 4 then 'complete'::public.evidence_integrity_status
  else 'pending'::public.evidence_integrity_status
end;

revoke all on function private.assess_evidence_integrity() from public;

comment on function private.assess_evidence_integrity() is
  'Marks structurally complete, stored evidence as complete and broken storage linkage as flagged; incomplete metadata remains pending.';
