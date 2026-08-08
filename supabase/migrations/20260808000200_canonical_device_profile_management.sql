-- The account profile is the canonical source for future assignment defaults.
-- Submissions remain immutable historical snapshots and no longer silently
-- replace the account defaults.
drop trigger if exists submissions_sync_tester_device_profile on public.submissions;
drop function if exists private.sync_tester_device_profile();

create table if not exists public.device_profile_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  previous_values jsonb not null,
  new_values jsonb not null,
  changed_at timestamptz not null default now()
);

alter table public.device_profile_history enable row level security;
revoke all on public.device_profile_history from anon;
grant select on public.device_profile_history to authenticated;

drop policy if exists device_profile_history_select_self_or_admin on public.device_profile_history;
create policy device_profile_history_select_self_or_admin on public.device_profile_history
for select to authenticated using (user_id = (select auth.uid()) or private.is_admin());

create or replace function public.update_own_device_profile(
  p_network_type text,
  p_device_type text,
  p_operating_system text,
  p_operating_system_version text,
  p_app_version text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  current_profile public.profiles;
  previous_values jsonb;
  next_values jsonb;
begin
  if caller_id is null or not private.is_active_user() then
    raise exception 'An active account is required' using errcode = '42501';
  end if;
  if nullif(trim(p_network_type), '') is null
    or nullif(trim(p_device_type), '') is null
    or nullif(trim(p_operating_system), '') is null
    or nullif(trim(p_operating_system_version), '') is null
    or nullif(trim(p_app_version), '') is null then
    raise exception 'All device profile fields are required' using errcode = '22023';
  end if;

  select * into current_profile from public.profiles where id = caller_id for update;
  previous_values := jsonb_build_object(
    'network_type', current_profile.network_type,
    'device_type', current_profile.device_type,
    'operating_system', current_profile.operating_system,
    'operating_system_version', current_profile.operating_system_version,
    'app_version', current_profile.app_version
  );
  next_values := jsonb_build_object(
    'network_type', trim(p_network_type),
    'device_type', trim(p_device_type),
    'operating_system', trim(p_operating_system),
    'operating_system_version', trim(p_operating_system_version),
    'app_version', trim(p_app_version)
  );

  if previous_values = next_values then return; end if;

  insert into public.device_profile_history (user_id, changed_by, previous_values, new_values)
  values (caller_id, caller_id, previous_values, next_values);

  update public.profiles set
    network_type = trim(p_network_type),
    device_type = trim(p_device_type),
    operating_system = trim(p_operating_system),
    operating_system_version = trim(p_operating_system_version),
    app_version = trim(p_app_version)
  where id = caller_id;
end;
$$;

revoke all on function public.update_own_device_profile(text, text, text, text, text) from public;
grant execute on function public.update_own_device_profile(text, text, text, text, text) to authenticated;

