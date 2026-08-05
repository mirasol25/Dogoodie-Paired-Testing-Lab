create or replace function public.create_study(
  p_study_code text,
  p_name text,
  p_study_type public.study_type,
  p_default_currency text,
  p_display_timezone text,
  p_description text default null,
  p_study_question text default null,
  p_isolated_variable text default null,
  p_target_pair_count integer default null,
  p_testing_starts_at timestamptz default null,
  p_testing_ends_at timestamptz default null,
  p_configuration jsonb default '{}'::jsonb
)
returns public.studies
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_role public.app_role := private.current_user_role();
  created_study public.studies;
begin
  if caller_id is null or caller_role not in ('admin', 'test_coordinator') then
    raise exception 'Only active administrators and test coordinators may create studies'
      using errcode = '42501';
  end if;

  if upper(trim(p_study_code)) !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then
    raise exception 'Study code must contain 3 to 32 letters, numbers, underscores, or hyphens'
      using errcode = '22023';
  end if;
  if length(trim(p_name)) < 3 or length(trim(p_name)) > 160 then
    raise exception 'Study name must contain 3 to 160 characters' using errcode = '22023';
  end if;
  if p_default_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be an ISO 4217 code' using errcode = '22023';
  end if;
  if trim(p_display_timezone) = '' then
    raise exception 'Display timezone is required' using errcode = '22023';
  end if;
  if p_target_pair_count is not null and p_target_pair_count <= 0 then
    raise exception 'Target pair count must be greater than zero' using errcode = '22023';
  end if;
  if p_testing_starts_at is not null and p_testing_ends_at is not null
    and p_testing_ends_at <= p_testing_starts_at then
    raise exception 'Testing end must be after testing start' using errcode = '22023';
  end if;

  insert into public.studies (
    study_code,
    name,
    description,
    study_type,
    status,
    study_question,
    isolated_variable,
    target_pair_count,
    default_currency,
    display_timezone,
    testing_starts_at,
    testing_ends_at,
    configuration,
    created_by
  ) values (
    upper(trim(p_study_code)),
    trim(p_name),
    nullif(trim(p_description), ''),
    p_study_type,
    'draft',
    nullif(trim(p_study_question), ''),
    nullif(trim(p_isolated_variable), ''),
    p_target_pair_count,
    p_default_currency,
    trim(p_display_timezone),
    p_testing_starts_at,
    p_testing_ends_at,
    coalesce(p_configuration, '{}'::jsonb),
    caller_id
  )
  returning * into created_study;

  if caller_role = 'test_coordinator' then
    insert into public.study_members (
      study_id,
      user_id,
      study_role,
      membership_status,
      added_by
    ) values (
      created_study.id,
      caller_id,
      'test_coordinator',
      'active',
      caller_id
    );
  end if;

  insert into public.activity_logs (
    study_id,
    actor_id,
    action,
    category,
    target_type,
    target_id,
    details
  ) values (
    created_study.id,
    caller_id,
    'study.created',
    'study',
    'study',
    created_study.id,
    jsonb_build_object('study_code', created_study.study_code, 'status', created_study.status)
  );

  return created_study;
end;
$$;

revoke all on function public.create_study(
  text,
  text,
  public.study_type,
  text,
  text,
  text,
  text,
  text,
  integer,
  timestamptz,
  timestamptz,
  jsonb
) from public;

grant execute on function public.create_study(
  text,
  text,
  public.study_type,
  text,
  text,
  text,
  text,
  text,
  integer,
  timestamptz,
  timestamptz,
  jsonb
) to authenticated;

comment on function public.create_study(
  text,
  text,
  public.study_type,
  text,
  text,
  text,
  text,
  text,
  integer,
  timestamptz,
  timestamptz,
  jsonb
) is 'Atomically creates a draft study and bootstraps active membership for its creating coordinator.';
