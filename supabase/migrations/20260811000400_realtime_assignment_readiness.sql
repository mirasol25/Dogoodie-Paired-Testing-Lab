-- Let assigned testers receive readiness transitions immediately. Row-level
-- security still controls which assignment tester rows each client can read.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'assignment_testers'
  ) then
    alter publication supabase_realtime add table public.assignment_testers;
  end if;
end;
$$;

comment on table public.assignment_testers is
  'Paired tester slots; status changes are published for authorized real-time workflow updates.';
