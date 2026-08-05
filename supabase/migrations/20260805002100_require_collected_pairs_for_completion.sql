create or replace function private.study_completion_readiness(p_study_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with study_record as (
    select target_pair_count from public.studies where id = p_study_id
  ), assignment_counts as (
    select count(*)::int total,
      count(*) filter (where status = 'completed')::int completed,
      count(*) filter (where status = 'cancelled')::int cancelled,
      count(*) filter (where status = 'expired')::int expired,
      count(*) filter (where status not in ('completed', 'cancelled', 'expired'))::int unfinished
    from public.assignments where study_id = p_study_id
  ), pair_rows as (
    select mp.*, latest.status review_status
    from public.matched_pairs mp
    left join lateral (
      select er.status from public.expert_reviews er
      where er.matched_pair_id = mp.id
      order by er.updated_at desc, er.created_at desc limit 1
    ) latest on true
    where mp.study_id = p_study_id
  ), pair_counts as (
    select count(*)::int total,
      count(*) filter (where technical_status <> 'pending')::int technically_processed,
      count(*) filter (where coalesce(review_status, 'pending') = 'pending')::int pending_review,
      count(*) filter (where review_status = 'accepted')::int accepted,
      count(*) filter (where review_status = 'flagged')::int flagged,
      count(*) filter (where review_status = 'rejected')::int rejected,
      count(*) filter (where review_status <> 'rejected' and evidence_status = 'complete')::int included_evidence_complete,
      count(*) filter (where review_status <> 'rejected')::int included_pairs
    from pair_rows
  ), missing_pairs as (
    select count(*)::int count from public.assignments a
    where a.study_id = p_study_id and a.status = 'completed'
      and not exists (select 1 from public.matched_pairs mp where mp.assignment_id = a.id)
  )
  select jsonb_build_object(
    'ready', ac.total > 0 and pc.total > 0
      and (sr.target_pair_count is null or pc.total >= sr.target_pair_count)
      and ac.unfinished = 0 and mp.count = 0 and pc.technically_processed = pc.total
      and pc.pending_review = 0 and pc.included_evidence_complete = pc.included_pairs,
    'target_pairs', sr.target_pair_count,
    'assignments', jsonb_build_object('total', ac.total, 'completed', ac.completed, 'cancelled', ac.cancelled, 'expired', ac.expired, 'unfinished', ac.unfinished),
    'pairs', jsonb_build_object('total', pc.total, 'technically_processed', pc.technically_processed, 'missing_for_completed_assignments', mp.count),
    'evidence', jsonb_build_object('complete', pc.included_evidence_complete, 'required', pc.included_pairs),
    'reviews', jsonb_build_object('pending', pc.pending_review, 'accepted', pc.accepted, 'flagged', pc.flagged, 'rejected', pc.rejected),
    'blockers', array_remove(array[
      case when ac.total = 0 then 'No assignments have been created' end,
      case when pc.total = 0 then 'No matched observations have been collected' end,
      case when sr.target_pair_count is not null and pc.total < sr.target_pair_count
        then (sr.target_pair_count - pc.total) || ' additional matched pair(s) are required to reach the study target' end,
      case when ac.unfinished > 0 then ac.unfinished || ' assignment(s) are unfinished' end,
      case when mp.count > 0 then mp.count || ' completed assignment(s) have no matched pair' end,
      case when pc.technically_processed < pc.total then (pc.total - pc.technically_processed) || ' pair(s) await technical validation' end,
      case when pc.pending_review > 0 then pc.pending_review || ' pair(s) await final expert review' end,
      case when pc.included_evidence_complete < pc.included_pairs then (pc.included_pairs - pc.included_evidence_complete) || ' included pair(s) lack complete evidence' end
    ], null)
  )
  from study_record sr cross join assignment_counts ac cross join pair_counts pc cross join missing_pairs mp;
$$;

revoke all on function private.study_completion_readiness(uuid) from public;

comment on function private.study_completion_readiness(uuid) is
  'Requires collected matched observations, the configured pair target, terminal assignments, technical validation, evidence completeness, and final expert review before completion.';
