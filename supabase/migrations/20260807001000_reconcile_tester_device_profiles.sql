-- Make this repair safe to run even when the original profile migration was
-- not applied to the current Supabase project.
alter table public.profiles
  add column if not exists network_type text,
  add column if not exists device_type text,
  add column if not exists operating_system text,
  add column if not exists operating_system_version text,
  add column if not exists app_version text;

-- Fill every missing reusable device field from each tester's newest
-- observation, including profiles partially populated by an earlier rollout.
with latest_submissions as (
  select distinct on (user_id)
    user_id,
    network_type,
    device_type,
    operating_system,
    operating_system_version,
    app_version
  from public.submissions
  order by user_id, updated_at desc
)
update public.profiles profile
set network_type = coalesce(profile.network_type, latest.network_type),
    device_type = coalesce(profile.device_type, latest.device_type),
    operating_system = coalesce(profile.operating_system, latest.operating_system),
    operating_system_version = coalesce(profile.operating_system_version, latest.operating_system_version),
    app_version = coalesce(profile.app_version, latest.app_version)
from latest_submissions latest
where latest.user_id = profile.id
  and (
    profile.network_type is null
    or profile.device_type is null
    or profile.operating_system is null
    or profile.operating_system_version is null
    or profile.app_version is null
  );
