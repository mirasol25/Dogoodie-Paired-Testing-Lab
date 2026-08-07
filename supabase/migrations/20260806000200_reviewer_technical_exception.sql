alter table public.expert_reviews
  add column if not exists technical_exception boolean not null default false;

drop function if exists public.save_expert_review(uuid, public.review_status, text, text);

create function public.save_expert_review(
  p_matched_pair_id uuid,
  p_status public.review_status,
  p_reason text,
  p_note text,
  p_technical_exception boolean default false
)
returns public.expert_reviews language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  selected_pair public.matched_pairs;
  previous_status public.review_status;
  saved_review public.expert_reviews;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_pair from public.matched_pairs where id = p_matched_pair_id;
  if selected_pair.id is null then raise exception 'Matched pair was not found' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.role = 'expert_reviewer'
    join public.study_members sm on sm.user_id = p.id and sm.study_id = selected_pair.study_id
      and sm.study_role = 'expert_reviewer' and sm.membership_status = 'active'
    where p.id = caller_id and p.account_status = 'active'
  ) then raise exception 'Only an assigned expert reviewer may decide this pair' using errcode = '42501'; end if;
  if p_status <> 'pending' and trim(coalesce(p_reason, '')) = '' then raise exception 'A decision reason is required' using errcode = '22023'; end if;
  if p_status in ('flagged', 'rejected') and length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Flagged and rejected decisions require a reviewer note' using errcode = '22023'; end if;
  if p_technical_exception and p_status <> 'accepted' then raise exception 'A technical exception may be recorded only for an accepted pair' using errcode = '22023'; end if;
  if p_technical_exception and length(trim(coalesce(p_note, ''))) < 20 then raise exception 'Accepting with a technical exception requires a detailed reviewer note' using errcode = '22023'; end if;

  select status into previous_status from public.expert_reviews where matched_pair_id = p_matched_pair_id and reviewer_id = caller_id;
  insert into public.expert_reviews (matched_pair_id, reviewer_id, status, reason, note, technical_exception, decided_at)
  values (p_matched_pair_id, caller_id, p_status,
    case when p_status = 'pending' then null else trim(p_reason) end,
    case when p_status = 'pending' or trim(coalesce(p_note, '')) = '' then null else trim(p_note) end,
    case when p_status = 'pending' then false else p_technical_exception end,
    case when p_status = 'pending' then null else now() end)
  on conflict (matched_pair_id, reviewer_id) do update set
    status = excluded.status, reason = excluded.reason, note = excluded.note,
    technical_exception = excluded.technical_exception, decided_at = excluded.decided_at, updated_at = now()
  returning * into saved_review;

  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected_pair.study_id, caller_id,
    case when p_status = 'pending' then 'review.cleared'
      when p_technical_exception then 'review.accepted_with_exception'
      else 'review.' || p_status::text end,
    'review', 'pair', selected_pair.id,
    jsonb_build_object('pair_code', selected_pair.pair_code, 'status', p_status, 'technical_exception', p_technical_exception, 'previous_status', previous_status, 'reason', saved_review.reason, 'note', saved_review.note));
  return saved_review;
end;
$$;

revoke all on function public.save_expert_review(uuid, public.review_status, text, text, boolean) from public;
grant execute on function public.save_expert_review(uuid, public.review_status, text, text, boolean) to authenticated;

comment on column public.expert_reviews.technical_exception is
  'True only when an expert reviewer accepts a pair despite a recorded technical exception and provides a documented rationale.';
