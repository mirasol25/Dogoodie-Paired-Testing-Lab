create or replace function private.protect_terminal_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('completed', 'cancelled', 'expired')
    and new.status is distinct from old.status then
    raise exception 'Terminal assignments are read-only' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_terminal_assignment() from public;

comment on function private.protect_terminal_assignment() is
  'Prevents terminal workflow transitions while allowing idempotent validation writes that retain the same terminal status.';
