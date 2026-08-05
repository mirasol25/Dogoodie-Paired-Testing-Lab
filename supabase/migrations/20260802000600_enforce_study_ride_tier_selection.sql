create or replace function public.enforce_study_ride_tier_selection()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  service_ids uuid[];
  selected_count integer;
  provider_count integer;
  category_count integer;
begin
  if not (new.configuration ? 'platform_service_ids') then
    return new;
  end if;

  select coalesce(array_agg(value::uuid), '{}'::uuid[])
  into service_ids
  from jsonb_array_elements_text(new.configuration -> 'platform_service_ids');

  selected_count := cardinality(service_ids);
  select
    count(distinct platform_id),
    count(distinct normalized_service_category)
  into provider_count, category_count
  from public.platform_services
  where id = any(service_ids) and is_active;

  if new.study_type = 'within_platform_pair' then
    if selected_count <> 1 or provider_count <> 1 then
      raise exception 'Within-platform studies require exactly one provider and one ride tier' using errcode = '22023';
    end if;
  elsif new.study_type = 'cross_platform_comparison' then
    if selected_count < 2 or provider_count <> selected_count then
      raise exception 'Cross-platform studies require exactly one ride tier per provider' using errcode = '22023';
    end if;
    if category_count <> 1 then
      raise exception 'Cross-platform ride tiers must use one normalized category' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_study_ride_tier_selection on public.studies;
create trigger enforce_study_ride_tier_selection
before insert or update of study_type, configuration on public.studies
for each row execute function public.enforce_study_ride_tier_selection();

comment on function public.enforce_study_ride_tier_selection() is
  'Enforces the Phase 1 protocol rule: one exact tier for within-platform studies and one comparable tier per provider for cross-platform studies.';
