insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'paired-testing-evidence',
  'paired-testing-evidence',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/json'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Expected path:
-- {study_id}/{assignment_id}/{user_id}/{generated-file-id}-{sanitized-filename}

-- Testers cannot construct arbitrary study/assignment/user paths: every path
-- segment must agree with an active assignment belonging to auth.uid().
create policy evidence_objects_tester_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'paired-testing-evidence'
  and owner_id = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and exists (
    select 1
    from public.assignment_testers at
    join public.assignments a on a.id = at.assignment_id
    where at.user_id = (select auth.uid())
      and at.status <> 'removed'
      and a.id::text = (storage.foldername(name))[2]
      and a.study_id::text = (storage.foldername(name))[1]
      and private.is_assignment_tester(a.id)
  )
);

create policy evidence_objects_tester_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'paired-testing-evidence'
  and owner_id = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and exists (
    select 1
    from public.assignment_testers at
    join public.assignments a on a.id = at.assignment_id
    where at.user_id = (select auth.uid())
      and at.status <> 'removed'
      and a.id::text = (storage.foldername(name))[2]
      and a.study_id::text = (storage.foldername(name))[1]
      and private.is_assignment_tester(a.id)
  )
);

-- Private-object reads require active study authorization. Law-firm viewers
-- deliberately receive no raw-evidence policy.
create policy evidence_objects_coordinator_reviewer_select
on storage.objects for select to authenticated
using (
  bucket_id = 'paired-testing-evidence'
  and array_length(storage.foldername(name), 1) = 3
  and exists (
    select 1
    from public.studies s
    where s.id::text = (storage.foldername(name))[1]
      and (
        private.is_admin()
        or private.has_study_role(s.id, 'test_coordinator')
        or private.has_study_role(s.id, 'expert_reviewer')
      )
  )
);

create policy evidence_objects_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'paired-testing-evidence' and private.is_admin());

create policy evidence_objects_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'paired-testing-evidence' and private.is_admin())
with check (bucket_id = 'paired-testing-evidence' and private.is_admin());

create policy evidence_objects_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'paired-testing-evidence' and private.is_admin());
