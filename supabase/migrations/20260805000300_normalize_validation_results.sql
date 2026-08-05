update public.protocols p
set evidence_requirements = coalesce((
  select jsonb_agg(item)
  from jsonb_array_elements(p.evidence_requirements) item
  where item ->> 'code' not in ('gps_coordinates', 'evidence_metadata')
), '[]'::jsonb)
where exists (
  select 1 from jsonb_array_elements(p.evidence_requirements) item
  where item ->> 'code' in ('gps_coordinates', 'evidence_metadata')
);

create or replace function private.normalize_pair_validation_results(p_pair_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_failure boolean;
  required_evidence_missing boolean;
  advisory_warning boolean;
begin
  delete from public.validation_results
  where matched_pair_id = p_pair_id
    and rule_code in ('evidence_gps_coordinates', 'evidence_evidence_metadata');

  update public.validation_results vr
  set tester_a_value = to_jsonb(concat_ws(' | ', pa.name, psa.name)),
      tester_b_value = to_jsonb(concat_ws(' | ', pb.name, psb.name)),
      observed_difference = case when vr.status = 'pass' then 'Both match their locked assignments' else 'Assignment service mismatch' end,
      explanation = 'Each tester submission is checked against the provider and ride tier locked to that assignment side.'
  from public.matched_pairs mp
  join public.submissions sa on sa.id = mp.submission_a_id
  join public.submissions sb on sb.id = mp.submission_b_id
  left join public.platform_services psa on psa.id = sa.platform_service_id
  left join public.platform_services psb on psb.id = sb.platform_service_id
  left join public.platforms pa on pa.id = psa.platform_id
  left join public.platforms pb on pb.id = psb.platform_id
  where vr.matched_pair_id = p_pair_id and vr.matched_pair_id = mp.id
    and vr.rule_code = 'assigned_provider_tier';

  update public.validation_results
  set status = case
        when lower(trim(tester_a_value #>> '{}')) = lower(trim(tester_b_value #>> '{}')) then 'pass'::public.rule_status
        else 'warning'::public.rule_status
      end,
      observed_difference = case
        when lower(trim(tester_a_value #>> '{}')) = lower(trim(tester_b_value #>> '{}')) then 'Match'
        else 'Advisory difference'
      end,
      affects_overall_status = lower(trim(tester_a_value #>> '{}')) <> lower(trim(tester_b_value #>> '{}'))
  where matched_pair_id = p_pair_id
    and requirement_level = 'advisory'
    and rule_code in ('operating_system_family', 'app_version', 'device_model', 'network_category');

  update public.validation_results
  set status = 'warning',
      observed_difference = 'Optional evidence not provided',
      affects_overall_status = true
  where matched_pair_id = p_pair_id
    and requirement_level = 'advisory'
    and rule_code like 'evidence_%'
    and status = 'fail';

  update public.validation_results
  set observed_difference = case
    when status = 'pass' then 'Present for both testers'
    when requirement_level = 'advisory' then 'Optional evidence missing'
    else 'Required evidence missing'
  end
  where matched_pair_id = p_pair_id and rule_code like 'evidence_%';

  update public.validation_results
  set observed_difference = case when status = 'pass' then 'Match' else 'Mismatch' end
  where matched_pair_id = p_pair_id
    and rule_code in ('currency', 'pickup_location', 'destination_location');

  select
    coalesce(bool_or(status = 'fail' and requirement_level = 'required' and rule_code not like 'evidence_%'), false),
    coalesce(bool_or(status = 'fail' and requirement_level = 'required' and rule_code like 'evidence_%'), false),
    coalesce(bool_or(status = 'warning' or (status = 'fail' and requirement_level = 'advisory')), false)
  into required_failure, required_evidence_missing, advisory_warning
  from public.validation_results where matched_pair_id = p_pair_id;

  update public.matched_pairs set technical_status = case
    when required_evidence_missing then 'incomplete'::public.pair_validation_status
    when required_failure then 'invalid'::public.pair_validation_status
    when advisory_warning then 'warning'::public.pair_validation_status
    else 'valid'::public.pair_validation_status
  end where id = p_pair_id;
end;
$$;

create or replace function private.normalize_results_after_validation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.action = 'validation.completed' and new.target_type = 'pair' and new.target_id is not null then
    perform private.normalize_pair_validation_results(new.target_id);
  end if;
  return new;
end;
$$;

drop trigger if exists activity_logs_normalize_validation_results on public.activity_logs;
create trigger activity_logs_normalize_validation_results
after insert on public.activity_logs
for each row execute function private.normalize_results_after_validation();

do $$ declare pair_record record; begin
  for pair_record in select id from public.matched_pairs loop
    perform private.normalize_pair_validation_results(pair_record.id);
  end loop;
end $$;

revoke all on function private.normalize_pair_validation_results(uuid) from public;
revoke all on function private.normalize_results_after_validation() from public;
