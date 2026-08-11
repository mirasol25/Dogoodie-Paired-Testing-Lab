alter table public.submissions
  add column if not exists observation_data jsonb not null default '{}'::jsonb;

create or replace function public.save_submission_draft(
  p_assignment_id uuid, p_displayed_fare numeric, p_quote_timestamp timestamptz,
  p_latitude numeric, p_longitude numeric, p_network_type text, p_device_type text,
  p_operating_system text, p_operating_system_version text, p_app_version text,
  p_battery_percentage integer default null, p_observation_data jsonb default '{}'::jsonb, p_notes text default null
)
returns public.submissions
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid(); selected_assignment public.assignments; selected_study public.studies;
  selected_slot public.assignment_testers; saved_submission public.submissions; code_suffix text;
begin
  if caller_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into selected_assignment from public.assignments where id = p_assignment_id;
  select * into selected_slot from public.assignment_testers where assignment_id = p_assignment_id and user_id = caller_id;
  if selected_assignment.id is null or selected_slot.id is null then raise exception 'You are not assigned to this test' using errcode = '42501'; end if;
  if selected_assignment.status not in ('in_progress', 'awaiting_partner') or selected_slot.status <> 'in_progress' then
    raise exception 'Start this assignment before capturing a submission' using errcode = '22023';
  end if;
  if p_displayed_fare is null or p_displayed_fare <= 0 then raise exception 'Displayed fare must be greater than zero' using errcode = '22023'; end if;
  if p_quote_timestamp is null or p_quote_timestamp < selected_assignment.scheduled_start or p_quote_timestamp > selected_assignment.scheduled_end then
    raise exception 'Quote timestamp must be inside the assignment testing window' using errcode = '22023';
  end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Enter valid coordinates' using errcode = '22023'; end if;
  if p_battery_percentage is not null and p_battery_percentage not between 0 and 100 then raise exception 'Battery percentage must be between 0 and 100' using errcode = '22023'; end if;
  select * into selected_study from public.studies where id = selected_assignment.study_id;
  code_suffix := case when selected_slot.slot = 'tester_a' then 'SA' else 'SB' end;
  insert into public.submissions (
    submission_code, study_id, assignment_id, assignment_tester_id, user_id, platform_service_id,
    status, displayed_fare, currency, quote_timestamp, latitude, longitude, network_type, device_type,
    operating_system, operating_system_version, app_version, battery_percentage, account_profile,
    observation_data, pickup_location, destination_location, notes
  ) values (
    selected_assignment.assignment_code || '-' || code_suffix, selected_assignment.study_id, selected_assignment.id,
    selected_slot.id, caller_id, selected_slot.platform_service_id, 'draft', p_displayed_fare,
    selected_study.default_currency, p_quote_timestamp, p_latitude, p_longitude,
    nullif(trim(p_network_type), ''), nullif(trim(p_device_type), ''), nullif(trim(p_operating_system), ''),
    nullif(trim(p_operating_system_version), ''), nullif(trim(p_app_version), ''), p_battery_percentage,
    selected_slot.account_configuration, coalesce(p_observation_data, '{}'::jsonb),
    selected_assignment.pickup_location, selected_assignment.destination_location,
    nullif(trim(coalesce(p_notes, '')), '')
  ) on conflict (assignment_tester_id) do update set
    displayed_fare = excluded.displayed_fare, quote_timestamp = excluded.quote_timestamp,
    latitude = excluded.latitude, longitude = excluded.longitude, network_type = excluded.network_type,
    device_type = excluded.device_type, operating_system = excluded.operating_system,
    operating_system_version = excluded.operating_system_version, app_version = excluded.app_version,
    battery_percentage = excluded.battery_percentage, account_profile = excluded.account_profile,
    observation_data = excluded.observation_data, notes = excluded.notes, updated_at = now()
  where public.submissions.status = 'draft' returning * into saved_submission;
  if saved_submission.id is null then raise exception 'A submitted observation cannot be edited' using errcode = '22023'; end if;
  insert into public.activity_logs (study_id, actor_id, action, category, target_type, target_id, details)
  values (selected_assignment.study_id, caller_id, 'submission.draft_saved', 'submission', 'submission', saved_submission.id,
    jsonb_build_object('submission_code', saved_submission.submission_code, 'assignment_id', selected_assignment.id, 'slot', selected_slot.slot));
  return saved_submission;
end;
$$;

revoke all on function public.save_submission_draft(uuid, numeric, timestamptz, numeric, numeric, text, text, text, text, text, integer, jsonb, text) from public;
grant execute on function public.save_submission_draft(uuid, numeric, timestamptz, numeric, numeric, text, text, text, text, text, integer, jsonb, text) to authenticated;
