revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.studies to authenticated;
grant select, insert, update, delete on public.study_members to authenticated;
grant select, insert, update, delete on public.platforms to authenticated;
grant select, insert, update, delete on public.platform_services to authenticated;
grant select, insert, update, delete on public.study_platforms to authenticated;
grant select, insert, update, delete on public.protocols to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.assignment_testers to authenticated;
grant select, insert, update, delete on public.submissions to authenticated;
grant select, insert, update, delete on public.evidence_files to authenticated;
grant select, insert, update, delete on public.matched_pairs to authenticated;
grant select, insert, update, delete on public.validation_results to authenticated;
grant select, insert, update, delete on public.expert_reviews to authenticated;
grant select on public.activity_logs to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.studies enable row level security;
alter table public.study_members enable row level security;
alter table public.platforms enable row level security;
alter table public.platform_services enable row level security;
alter table public.study_platforms enable row level security;
alter table public.protocols enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_testers enable row level security;
alter table public.submissions enable row level security;
alter table public.evidence_files enable row level security;
alter table public.matched_pairs enable row level security;
alter table public.validation_results enable row level security;
alter table public.expert_reviews enable row level security;
alter table public.activity_logs enable row level security;

create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (id = (select auth.uid()) or private.is_admin());
create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (id = (select auth.uid()) or private.is_admin())
with check (id = (select auth.uid()) or private.is_admin());

create policy user_roles_select_self_or_admin on public.user_roles
for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin());
create policy user_roles_admin_insert on public.user_roles
for insert to authenticated with check (private.is_admin());
create policy user_roles_admin_update on public.user_roles
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy user_roles_admin_delete on public.user_roles
for delete to authenticated using (private.is_admin());

create policy studies_member_select on public.studies
for select to authenticated using (private.is_study_member(id));
create policy studies_admin_insert on public.studies
for insert to authenticated with check (private.is_admin());
create policy studies_coordinator_update on public.studies
for update to authenticated using (private.can_manage_study(id)) with check (private.can_manage_study(id));
create policy studies_coordinator_delete on public.studies
for delete to authenticated using (private.can_manage_study(id));

create policy study_members_authorized_select on public.study_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.is_admin()
  or private.can_manage_study(study_id)
);
create policy study_members_coordinator_insert on public.study_members
for insert to authenticated with check (
  private.can_manage_study(study_id)
  and (added_by = (select auth.uid()) or private.is_admin())
);
create policy study_members_coordinator_update on public.study_members
for update to authenticated
using (private.can_manage_study(study_id))
with check (private.can_manage_study(study_id));
create policy study_members_coordinator_delete on public.study_members
for delete to authenticated using (private.can_manage_study(study_id));

create policy platforms_active_user_select on public.platforms
for select to authenticated using (private.is_active_user());
create policy platforms_admin_insert on public.platforms
for insert to authenticated with check (private.is_admin());
create policy platforms_admin_update on public.platforms
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy platforms_admin_delete on public.platforms
for delete to authenticated using (private.is_admin());

create policy platform_services_active_user_select on public.platform_services
for select to authenticated using (private.is_active_user());
create policy platform_services_admin_insert on public.platform_services
for insert to authenticated with check (private.is_admin());
create policy platform_services_admin_update on public.platform_services
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy platform_services_admin_delete on public.platform_services
for delete to authenticated using (private.is_admin());

create policy study_platforms_member_select on public.study_platforms
for select to authenticated using (private.is_study_member(study_id));
create policy study_platforms_coordinator_insert on public.study_platforms
for insert to authenticated with check (private.can_manage_study(study_id));
create policy study_platforms_coordinator_update on public.study_platforms
for update to authenticated using (private.can_manage_study(study_id)) with check (private.can_manage_study(study_id));
create policy study_platforms_coordinator_delete on public.study_platforms
for delete to authenticated using (private.can_manage_study(study_id));

create policy protocols_member_select on public.protocols
for select to authenticated using (private.is_study_member(study_id));
create policy protocols_coordinator_insert on public.protocols
for insert to authenticated with check (
  private.can_manage_study(study_id)
  and (created_by = (select auth.uid()) or private.is_admin())
);
create policy protocols_coordinator_update on public.protocols
for update to authenticated using (private.can_manage_study(study_id))
with check (private.can_manage_study(study_id));
create policy protocols_coordinator_delete on public.protocols
for delete to authenticated using (private.can_manage_study(study_id));

create policy assignments_authorized_select on public.assignments
for select to authenticated
using (
  private.can_read_study_workflow(study_id)
  or private.is_assignment_tester(id)
);
create policy assignments_coordinator_insert on public.assignments
for insert to authenticated with check (
  private.can_manage_study(study_id)
  and (created_by = (select auth.uid()) or private.is_admin())
);
create policy assignments_coordinator_update on public.assignments
for update to authenticated using (private.can_manage_study(study_id))
with check (private.can_manage_study(study_id));
create policy assignments_coordinator_delete on public.assignments
for delete to authenticated using (private.can_manage_study(study_id));

create policy assignment_testers_authorized_select on public.assignment_testers
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id and private.can_read_study_workflow(a.study_id)
  )
);
create policy assignment_testers_coordinator_insert on public.assignment_testers
for insert to authenticated with check (
  exists (
    select 1 from public.assignments a
    where a.id = assignment_id and private.can_manage_study(a.study_id)
  )
  and (assigned_by = (select auth.uid()) or private.is_admin())
);
create policy assignment_testers_coordinator_update on public.assignment_testers
for update to authenticated
using (exists (select 1 from public.assignments a where a.id = assignment_id and private.can_manage_study(a.study_id)))
with check (exists (select 1 from public.assignments a where a.id = assignment_id and private.can_manage_study(a.study_id)));
create policy assignment_testers_coordinator_delete on public.assignment_testers
for delete to authenticated
using (exists (select 1 from public.assignments a where a.id = assignment_id and private.can_manage_study(a.study_id)));

create policy submissions_authorized_select on public.submissions
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_study(study_id)
  or private.can_review_study(study_id)
);
create policy submissions_tester_insert on public.submissions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_active_user()
  and exists (
    select 1 from public.assignment_testers at
    where at.id = assignment_tester_id
      and at.assignment_id = assignment_id
      and at.user_id = (select auth.uid())
      and at.status <> 'removed'
  )
  and private.is_assignment_tester(assignment_id)
);
create policy submissions_admin_insert on public.submissions
for insert to authenticated with check (private.is_admin());
create policy submissions_tester_update_draft on public.submissions
for update to authenticated
using (user_id = (select auth.uid()) and status = 'draft')
with check (
  user_id = (select auth.uid())
  and status in ('draft', 'submitted')
  and private.is_assignment_tester(assignment_id)
);
create policy submissions_admin_update on public.submissions
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy submissions_admin_delete on public.submissions
for delete to authenticated using (private.is_admin());

create policy evidence_authorized_select on public.evidence_files
for select to authenticated
using (
  uploaded_by = (select auth.uid())
  or private.can_manage_study(study_id)
  or private.can_review_study(study_id)
);
create policy evidence_tester_insert on public.evidence_files
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and private.is_submission_owner(submission_id)
  and private.is_assignment_tester(assignment_id)
);
create policy evidence_admin_insert on public.evidence_files
for insert to authenticated with check (private.is_admin());
create policy evidence_tester_update_pending on public.evidence_files
for update to authenticated
using (uploaded_by = (select auth.uid()) and integrity_status = 'pending')
with check (
  uploaded_by = (select auth.uid())
  and integrity_status = 'pending'
  and private.is_submission_owner(submission_id)
);
create policy evidence_admin_update on public.evidence_files
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy evidence_admin_delete on public.evidence_files
for delete to authenticated using (private.is_admin());

create policy matched_pairs_authorized_select on public.matched_pairs
for select to authenticated using (private.can_read_study_workflow(study_id));
create policy matched_pairs_coordinator_insert on public.matched_pairs
for insert to authenticated with check (private.can_manage_study(study_id));
create policy matched_pairs_coordinator_update on public.matched_pairs
for update to authenticated using (private.can_manage_study(study_id)) with check (private.can_manage_study(study_id));
create policy matched_pairs_coordinator_delete on public.matched_pairs
for delete to authenticated using (private.can_manage_study(study_id));

create policy validation_results_authorized_select on public.validation_results
for select to authenticated
using (
  exists (
    select 1 from public.matched_pairs mp
    where mp.id = matched_pair_id and private.can_read_study_workflow(mp.study_id)
  )
);
create policy validation_results_coordinator_insert on public.validation_results
for insert to authenticated
with check (exists (select 1 from public.matched_pairs mp where mp.id = matched_pair_id and private.can_manage_study(mp.study_id)));
create policy validation_results_coordinator_update on public.validation_results
for update to authenticated
using (exists (select 1 from public.matched_pairs mp where mp.id = matched_pair_id and private.can_manage_study(mp.study_id)))
with check (exists (select 1 from public.matched_pairs mp where mp.id = matched_pair_id and private.can_manage_study(mp.study_id)));
create policy validation_results_coordinator_delete on public.validation_results
for delete to authenticated
using (exists (select 1 from public.matched_pairs mp where mp.id = matched_pair_id and private.can_manage_study(mp.study_id)));

create policy expert_reviews_authorized_select on public.expert_reviews
for select to authenticated
using (
  reviewer_id = (select auth.uid())
  or exists (
    select 1 from public.matched_pairs mp
    where mp.id = matched_pair_id and private.can_read_study_workflow(mp.study_id)
  )
);
create policy expert_reviews_reviewer_insert on public.expert_reviews
for insert to authenticated
with check (
  reviewer_id = (select auth.uid())
  and exists (
    select 1 from public.matched_pairs mp
    where mp.id = matched_pair_id and private.can_review_study(mp.study_id)
  )
);
create policy expert_reviews_admin_insert on public.expert_reviews
for insert to authenticated with check (private.is_admin());
create policy expert_reviews_reviewer_update on public.expert_reviews
for update to authenticated
using (
  reviewer_id = (select auth.uid())
  and exists (select 1 from public.matched_pairs mp where mp.id = matched_pair_id and private.can_review_study(mp.study_id))
)
with check (
  reviewer_id = (select auth.uid())
  and exists (select 1 from public.matched_pairs mp where mp.id = matched_pair_id and private.can_review_study(mp.study_id))
);
create policy expert_reviews_admin_update on public.expert_reviews
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy expert_reviews_admin_delete on public.expert_reviews
for delete to authenticated using (private.is_admin());

create policy activity_logs_authorized_select on public.activity_logs
for select to authenticated
using (
  private.is_admin()
  or (study_id is not null and private.can_read_study_workflow(study_id))
  or actor_id = (select auth.uid())
);

comment on policy submissions_tester_update_draft on public.submissions is
  'A tester may transition a draft to submitted, but a submitted row is no longer ordinarily editable.';
comment on policy activity_logs_authorized_select on public.activity_logs is
  'No INSERT, UPDATE, or DELETE grant is provided to ordinary authenticated clients.';
