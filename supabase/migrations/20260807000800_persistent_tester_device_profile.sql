alter table public.profiles
  add column if not exists network_type text,
  add column if not exists device_type text,
  add column if not exists operating_system text,
  add column if not exists operating_system_version text,
  add column if not exists app_version text;

-- Seed reusable profile values from the most recently saved observation.
update public.profiles profile
set network_type = latest.network_type,
    device_type = latest.device_type,
    operating_system = latest.operating_system,
    operating_system_version = latest.operating_system_version,
    app_version = latest.app_version
from lateral (
  select network_type, device_type, operating_system, operating_system_version, app_version
  from public.submissions
  where user_id = profile.id
  order by updated_at desc
  limit 1
) latest
where profile.device_type is null;

create or replace function private.sync_tester_device_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.network_type is not null and new.device_type is not null and new.operating_system is not null and new.operating_system_version is not null and new.app_version is not null then
    update public.profiles set network_type = new.network_type, device_type = new.device_type, operating_system = new.operating_system, operating_system_version = new.operating_system_version, app_version = new.app_version where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists submissions_sync_tester_device_profile on public.submissions;
create trigger submissions_sync_tester_device_profile
after insert or update of network_type, device_type, operating_system, operating_system_version, app_version on public.submissions
for each row execute function private.sync_tester_device_profile();
