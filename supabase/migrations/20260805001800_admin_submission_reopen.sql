create table if not exists public.submission_revisions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  submission_id uuid not null references public.submissions(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  reopened_by uuid not null references public.profiles(id) on delete restrict,
  submission_snapshot jsonb not null,
  pair_snapshot jsonb,
  validation_snapshot jsonb not null default '[]'::jsonb,
  review_snapshot jsonb not null default '[]'::jsonb,
  reopened_at timestamptz not null default now(),
  unique (submission_id, revision_number)
);

alter table public.submission_revisions enable row level security;
grant select on public.submission_revisions to authenticated;

drop policy if exists submission_revisions_admin_select on public.submission_revisions;
create policy submission_revisions_admin_select on public.submission_revisions
for select to authenticated using (private.is_admin());

create or replace function public.admin_reopen_submission(p_submission_id uuid, p_reason text)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_submission public.submissions;
  selected_assignment public.assignments;
  selected_pair public.matched_pairs;
  next_revision integer;
  validation_snapshot jsonb := '[]'::jsonb;
  review_snapshot jsonb := '[]'::jsonb;
begin
  if caller_id is null or not private.is_admin() then
    raise exception 'Only an administrator may reopen a submitted observation' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 10 and 500 then
    raise exception 'A reopen reason between 10 and 500 characters is required' using errcode = '22023';
  end if;

  select * into selected_submission
  from public.submissions
  where id = p_submission_id
  for update;

  if selected_submission.id is null or selected_submission.status <> 'submitted' then
    raise exception 'Only a submitted observation may be reopened' using errcode = '22023';
  end if;

  select * into selected_assignment
  from public.assignments
  where id = selected_submission.assignment_id
  for update;

  if selected_assignment.status in ('cancelled', 'expired') then
    raise exception 'A submission in a cancelled or expired assignment cannot be reopened' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.studies s
    where s.id = selected_submission.study_id and s.status in ('active', 'paused')
  ) then
    raise exception 'Only a submission in an active or paused study may be reopened' using errcode = '22023';
  end if;

  select * into selected_pair
  from public.matched_pairs
  where assignment_id = selected_submission.assignment_id
  for update;

  if selected_pair.id is not null then
    select coalesce(jsonb_agg(to_jsonb(vr) order by vr.created_at), '[]'::jsonb)
    into validation_snapshot
    from public.validation_results vr
    where vr.matched_pair_id = selected_pair.id;

    select coalesce(jsonb_agg(to_jsonb(er) order by er.created_at), '[]'::jsonb)
    into review_snapshot
    from public.expert_reviews er
    where er.matched_pair_id = selected_pair.id;
  end if;

  select coalesce(max(revision_number), 0) + 1
  into next_revision
  from public.submission_revisions
  where submission_id = p_submission_id;

  insert into public.submission_revisions (
    study_id, assignment_id, submission_id, revision_number, reason, reopened_by,
    submission_snapshot, pair_snapshot, validation_snapshot, review_snapshot
  ) values (
    selected_submission.study_id, selected_submission.assignment_id, selected_submission.id,
    next_revision, trim(p_reason), caller_id, to_jsonb(selected_submission),
    case when selected_pair.id is null then null else to_jsonb(selected_pair) end,
    validation_snapshot, review_snapshot
  );

  if selected_pair.id is not null then
    delete from public.matched_pairs where id = selected_pair.id;
  end if;

  update public.submissions
  set status = 'draft', submitted_at = null
  where id = selected_submission.id
  returning * into selected_submission;

  update public.assignment_testers
  set status = 'in_progress'
  where id = selected_submission.assignment_tester_id;

  update public.assignments
  set status = case
    when exists (
      select 1 from public.assignment_testers
      where assignment_id = selected_submission.assignment_id and status = 'submitted'
    ) then 'awaiting_partner'::public.assignment_status
    else 'in_progress'::public.assignment_status
  end
  where id = selected_submission.assignment_id;

  insert into public.activity_logs (
    study_id, actor_id, action, category, target_type, target_id, details
  ) values (
    selected_submission.study_id, caller_id, 'submission.reopened', 'submission',
    'submission', selected_submission.id,
    jsonb_build_object(
      'submission_code', selected_submission.submission_code,
      'assignment_id', selected_submission.assignment_id,
      'revision_number', next_revision,
      'reason', trim(p_reason),
      'prior_pair_id', selected_pair.id
    )
  );

  return selected_submission;
end;
$$;

revoke all on function public.admin_reopen_submission(uuid, text) from public;
grant execute on function public.admin_reopen_submission(uuid, text) to authenticated;

comment on table public.submission_revisions is
  'Immutable snapshots retained whenever an administrator reopens a finalized tester observation.';

comment on function public.admin_reopen_submission(uuid, text) is
  'Admin-only controlled reopen that preserves prior submission, validation, and review state before resubmission.';
