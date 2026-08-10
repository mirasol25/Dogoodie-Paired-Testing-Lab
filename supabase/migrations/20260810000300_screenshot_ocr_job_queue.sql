create table public.screenshot_ocr_jobs (
  id uuid primary key default gen_random_uuid(),
  evidence_file_id uuid not null unique references public.evidence_files(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  lock_token uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index screenshot_ocr_jobs_available_idx
  on public.screenshot_ocr_jobs(status, next_attempt_at, created_at);

alter table public.screenshot_ocr_jobs enable row level security;
grant select on public.screenshot_ocr_jobs to authenticated;
create policy screenshot_ocr_jobs_authorized_select on public.screenshot_ocr_jobs
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

create or replace function private.enqueue_screenshot_ocr_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.evidence_type = 'screenshot' then
    insert into public.screenshot_ocr_jobs(evidence_file_id) values (new.id)
    on conflict (evidence_file_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger evidence_files_enqueue_screenshot_ocr
after insert on public.evidence_files
for each row execute function private.enqueue_screenshot_ocr_job();

-- At most two OCR jobs may be active. The transaction advisory lock makes the
-- capacity check and claim atomic across simultaneous Vercel instances.
create or replace function public.claim_screenshot_ocr_job(p_evidence_file_id uuid, p_lock_token uuid)
returns public.screenshot_ocr_jobs
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  selected_job public.screenshot_ocr_jobs;
  active_count integer;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.evidence_files
    where id = p_evidence_file_id and uploaded_by = caller_id and evidence_type = 'screenshot'
  ) then raise exception 'The screenshot is unavailable' using errcode = '42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended('screenshot-ocr-capacity', 0));
  update public.screenshot_ocr_jobs
    set status = case when attempt_count >= 3 then 'failed' else 'queued' end,
        locked_at = null, lock_token = null, updated_at = now(),
        last_error = coalesce(last_error, 'The previous OCR worker stopped before finishing.')
    where status = 'processing' and locked_at < now() - interval '3 minutes';

  select * into selected_job from public.screenshot_ocr_jobs
    where evidence_file_id = p_evidence_file_id for update;
  if selected_job.id is null then
    insert into public.screenshot_ocr_jobs(evidence_file_id)
      values (p_evidence_file_id) returning * into selected_job;
  end if;
  if selected_job.status in ('processing', 'completed') then return selected_job; end if;
  if selected_job.attempt_count >= 3 then return selected_job; end if;

  select count(*) into active_count from public.screenshot_ocr_jobs where status = 'processing';
  if active_count >= 2 or selected_job.next_attempt_at > now() then return selected_job; end if;

  update public.screenshot_ocr_jobs set status = 'processing', attempt_count = attempt_count + 1,
    locked_at = now(), lock_token = p_lock_token, last_error = null, updated_at = now()
    where id = selected_job.id returning * into selected_job;
  return selected_job;
end;
$$;
revoke all on function public.claim_screenshot_ocr_job(uuid, uuid) from public;
grant execute on function public.claim_screenshot_ocr_job(uuid, uuid) to authenticated;

-- Existing screenshots need jobs when this migration is introduced.
insert into public.screenshot_ocr_jobs(evidence_file_id, status, attempt_count, completed_at)
select ef.id,
  case when ov.id is null then 'queued' else 'completed' end,
  case when ov.id is null then 0 else 1 end,
  case when ov.id is null then null else ov.processed_at end
from public.evidence_files ef
left join public.screenshot_ocr_validations ov on ov.evidence_file_id = ef.id
where ef.evidence_type = 'screenshot'
on conflict (evidence_file_id) do nothing;
