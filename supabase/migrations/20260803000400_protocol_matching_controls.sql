create or replace function public.save_protocol_matching_controls(
  p_study_id uuid,
  p_protocol_id uuid,
  p_optional_controls text[] default '{}'::text[]
)
returns public.protocols
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  updated_protocol public.protocols;
  allowed_optional_controls constant text[] := array[
    'operating_system_family',
    'app_version',
    'device_model',
    'network_category'
  ];
  controls jsonb;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_optional_controls, '{}'::text[])) control_code
    where not (control_code = any(allowed_optional_controls))
  ) then
    raise exception 'An optional matching control is not supported' using errcode = '22023';
  end if;

  controls := jsonb_build_array(
    jsonb_build_object('code', 'provider', 'label', 'Provider', 'comparison', 'exact', 'required', true),
    jsonb_build_object('code', 'ride_tier', 'label', 'Exact ride tier', 'comparison', 'exact', 'required', true),
    jsonb_build_object('code', 'pickup_location', 'label', 'Pickup location', 'comparison', 'exact', 'required', true),
    jsonb_build_object('code', 'destination_location', 'label', 'Destination location', 'comparison', 'exact', 'required', true),
    jsonb_build_object('code', 'currency', 'label', 'Currency', 'comparison', 'exact', 'required', true)
  );

  if 'operating_system_family' = any(coalesce(p_optional_controls, '{}'::text[])) then
    controls := controls || jsonb_build_array(jsonb_build_object('code', 'operating_system_family', 'label', 'Operating-system family', 'comparison', 'exact', 'required', false));
  end if;
  if 'app_version' = any(coalesce(p_optional_controls, '{}'::text[])) then
    controls := controls || jsonb_build_array(jsonb_build_object('code', 'app_version', 'label', 'App version', 'comparison', 'exact', 'required', false));
  end if;
  if 'device_model' = any(coalesce(p_optional_controls, '{}'::text[])) then
    controls := controls || jsonb_build_array(jsonb_build_object('code', 'device_model', 'label', 'Device model', 'comparison', 'exact', 'required', false));
  end if;
  if 'network_category' = any(coalesce(p_optional_controls, '{}'::text[])) then
    controls := controls || jsonb_build_array(jsonb_build_object('code', 'network_category', 'label', 'Network category', 'comparison', 'exact', 'required', false));
  end if;

  update public.protocols
  set fixed_controls = controls
  where id = p_protocol_id and study_id = p_study_id and status = 'draft'
  returning * into updated_protocol;

  if updated_protocol.id is null then
    raise exception 'Only a draft protocol can be edited' using errcode = '22023';
  end if;

  insert into public.activity_logs (
    study_id, actor_id, action, category, target_type, target_id, details
  ) values (
    p_study_id,
    caller_id,
    'protocol.matching_controls_saved',
    'protocol',
    'protocol',
    updated_protocol.id,
    jsonb_build_object(
      'version', updated_protocol.version,
      'required_control_count', 5,
      'optional_controls', to_jsonb(coalesce(p_optional_controls, '{}'::text[]))
    )
  );

  return updated_protocol;
end;
$$;

revoke all on function public.save_protocol_matching_controls(uuid, uuid, text[]) from public;
grant execute on function public.save_protocol_matching_controls(uuid, uuid, text[]) to authenticated;

comment on function public.save_protocol_matching_controls(uuid, uuid, text[]) is
  'Stores canonical exact-match controls on an editable draft protocol. Required Phase 1 controls cannot be disabled.';
