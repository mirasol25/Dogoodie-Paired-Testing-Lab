with tier_catalog(platform_slug, service_code, display_name, normalized_category) as (
  values
    ('grab', 'saver-car', 'GrabCar Saver', 'economy_saver'),
    ('grab', 'metered-taxi', 'GrabTaxi', 'metered_taxi'),
    ('joyride', 'metered-taxi', 'JoyRide Taxi Cab', 'metered_taxi'),
    ('joyride', 'super-taxi', 'JoyRide Super Taxi', 'metered_taxi'),
    ('lyft', 'wait-and-save', 'Lyft Wait & Save', 'economy_saver')
)
insert into public.platform_services (
  platform_id,
  service_code,
  name,
  normalized_service_category,
  is_active
)
select
  platforms.id,
  tier_catalog.service_code,
  tier_catalog.display_name,
  tier_catalog.normalized_category,
  true
from tier_catalog
join public.platforms on platforms.slug = tier_catalog.platform_slug
on conflict (platform_id, service_code) do update
set
  name = excluded.name,
  normalized_service_category = excluded.normalized_service_category,
  is_active = true,
  updated_at = now();
