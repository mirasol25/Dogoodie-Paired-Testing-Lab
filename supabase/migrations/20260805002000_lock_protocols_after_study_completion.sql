create or replace function private.enforce_protocol_study_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_study_id uuid := case when tg_op = 'DELETE' then old.study_id else new.study_id end;
  target_status public.study_status;
begin
  select status into target_status
  from public.studies
  where id = target_study_id;

  if target_status in ('completed', 'archived') then
    raise exception 'Protocols are read-only after a study is completed or archived' using errcode = '22023';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protocols_enforce_study_lifecycle on public.protocols;
create trigger protocols_enforce_study_lifecycle
before insert or update or delete on public.protocols
for each row execute function private.enforce_protocol_study_lifecycle();

revoke all on function private.enforce_protocol_study_lifecycle() from public;

comment on function private.enforce_protocol_study_lifecycle() is
  'Prevents protocol creation, editing, versioning, activation, or deletion after study completion or archive.';
