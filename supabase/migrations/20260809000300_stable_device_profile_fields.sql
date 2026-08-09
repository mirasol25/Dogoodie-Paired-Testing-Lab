-- Device profiles contain only stable hardware and operating-system details.
-- Network and provider-app version remain per-submission observations because
-- they can change between testing sessions.
drop function if exists public.update_own_device_profile(text, text, text, text, text);

create function public.update_own_device_profile(
  p_device_type text,
  p_operating_system text,
  p_operating_system_version text
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
  if nullif(trim(p_device_type), '') is null
    or nullif(trim(p_operating_system), '') is null
    or nullif(trim(p_operating_system_version), '') is null then
    raise exception 'All device profile fields are required' using errcode = '22023';
  end if;

  select * into current_profile
  from public.profiles
  where id = caller_id
  for update;

  previous_values := jsonb_build_object(
    'device_type', current_profile.device_type,
    'operating_system', current_profile.operating_system,
    'operating_system_version', current_profile.operating_system_version
  );
  next_values := jsonb_build_object(
    'device_type', trim(p_device_type),
    'operating_system', trim(p_operating_system),
    'operating_system_version', trim(p_operating_system_version)
  );

  if previous_values = next_values then return; end if;

  insert into public.device_profile_history (user_id, changed_by, previous_values, new_values)
  values (caller_id, caller_id, previous_values, next_values);

  update public.profiles set
    device_type = trim(p_device_type),
    operating_system = trim(p_operating_system),
    operating_system_version = trim(p_operating_system_version)
  where id = caller_id;
end;
$$;

revoke all on function public.update_own_device_profile(text, text, text) from public;
grant execute on function public.update_own_device_profile(text, text, text) to authenticated;
