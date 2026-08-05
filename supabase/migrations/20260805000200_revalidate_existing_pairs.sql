do $$
declare
  pair_record record;
begin
  for pair_record in
    select id from public.matched_pairs order by created_at
  loop
    perform private.validate_matched_pair(pair_record.id, null);
  end loop;
end;
$$;

comment on function private.validate_matched_pair(uuid, uuid) is
  'Runs assignment-aware deterministic protocol checks. Existing pairs were revalidated after legacy submission-derived provider checks were removed.';
