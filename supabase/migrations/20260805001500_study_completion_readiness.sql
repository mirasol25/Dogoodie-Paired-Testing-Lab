create or replace function private.study_completion_readiness(p_study_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with assignment_counts as (
    select count(*)::int total,
      count(*) filter (where status = 'completed')::int completed,
      count(*) filter (where status = 'cancelled')::int cancelled,
      count(*) filter (where status = 'expired')::int expired,
      count(*) filter (where status not in ('completed', 'cancelled', 'expired'))::int unfinished
    from public.assignments where study_id = p_study_id
  ), pair_rows as (
    select mp.*,
      latest.status review_status
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
    'ready', ac.unfinished = 0 and mp.count = 0 and pc.technically_processed = pc.total
      and pc.pending_review = 0 and pc.included_evidence_complete = pc.included_pairs,
    'assignments', jsonb_build_object('total', ac.total, 'completed', ac.completed, 'cancelled', ac.cancelled, 'expired', ac.expired, 'unfinished', ac.unfinished),
    'pairs', jsonb_build_object('total', pc.total, 'technically_processed', pc.technically_processed, 'missing_for_completed_assignments', mp.count),
    'evidence', jsonb_build_object('complete', pc.included_evidence_complete, 'required', pc.included_pairs),
    'reviews', jsonb_build_object('pending', pc.pending_review, 'accepted', pc.accepted, 'flagged', pc.flagged, 'rejected', pc.rejected),
    'blockers', array_remove(array[
      case when ac.unfinished > 0 then ac.unfinished || ' assignment(s) are unfinished' end,
      case when mp.count > 0 then mp.count || ' completed assignment(s) have no matched pair' end,
      case when pc.technically_processed < pc.total then (pc.total - pc.technically_processed) || ' pair(s) await technical validation' end,
      case when pc.pending_review > 0 then pc.pending_review || ' pair(s) await final expert review' end,
      case when pc.included_evidence_complete < pc.included_pairs then (pc.included_pairs - pc.included_evidence_complete) || ' included pair(s) lack complete evidence' end
    ], null)
  )
  from assignment_counts ac cross join pair_counts pc cross join missing_pairs mp;
$$;

create or replace function public.get_study_completion_readiness(p_study_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to inspect completion readiness' using errcode = '42501';
  end if;
  return private.study_completion_readiness(p_study_id);
end;
$$;

create or replace function private.enforce_study_completion_readiness()
returns trigger language plpgsql security definer set search_path = '' as $$
declare readiness jsonb;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    readiness := private.study_completion_readiness(new.id);
    if not coalesce((readiness ->> 'ready')::boolean, false) then
      raise exception 'Study is not ready for completion: %', array_to_string(array(select jsonb_array_elements_text(readiness -> 'blockers')), '; ')
        using errcode = '55000';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists studies_enforce_completion_readiness on public.studies;
create trigger studies_enforce_completion_readiness before update of status on public.studies
for each row execute function private.enforce_study_completion_readiness();

revoke all on function private.study_completion_readiness(uuid) from public;
revoke all on function private.enforce_study_completion_readiness() from public;
revoke all on function public.get_study_completion_readiness(uuid) from public;
grant execute on function public.get_study_completion_readiness(uuid) to authenticated;
