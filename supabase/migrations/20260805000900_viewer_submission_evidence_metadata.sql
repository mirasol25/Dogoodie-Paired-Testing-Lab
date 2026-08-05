drop policy if exists submissions_authorized_select on public.submissions;
create policy submissions_authorized_select on public.submissions
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.can_read_study_workflow(study_id)
);

drop policy if exists evidence_authorized_select on public.evidence_files;
create policy evidence_authorized_select on public.evidence_files
for select to authenticated
using (
  uploaded_by = (select auth.uid())
  or private.can_read_study_workflow(study_id)
);

comment on policy submissions_authorized_select on public.submissions is
  'Allows submission owners and authorized study-workflow readers, including active read-only viewers.';

comment on policy evidence_authorized_select on public.evidence_files is
  'Allows evidence owners and authorized workflow readers to inspect metadata. Storage-object policies separately control private file access.';
