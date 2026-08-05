create or replace function public.add_study_members(p_study_id uuid, p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  unique_user_ids uuid[];
  added_count integer := 0;
begin
  if auth.uid() is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct value), '{}'::uuid[]) into unique_user_ids
  from unnest(coalesce(p_user_ids, '{}'::uuid[])) value;
  if cardinality(unique_user_ids) = 0 then
    raise exception 'Select at least one account' using errcode = '22023';
  end if;
  if cardinality(unique_user_ids) > 100 then
    raise exception 'No more than 100 accounts can be added at once' using errcode = '22023';
  end if;
  foreach target_user_id in array unique_user_ids loop
    perform public.add_study_member(p_study_id, target_user_id);
    added_count := added_count + 1;
  end loop;
  return added_count;
end;
$$;

revoke all on function public.add_study_members(uuid, uuid[]) from public;
grant execute on function public.add_study_members(uuid, uuid[]) to authenticated;

comment on function public.add_study_members(uuid, uuid[]) is
  'Adds or restores up to 100 study members atomically using the single-member authorization rules.';
