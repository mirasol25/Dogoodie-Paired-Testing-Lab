-- Keep the initial catalog focused on passenger tiers that can be compared across providers.
with tier_catalog(platform_slug, service_code, display_name, normalized_category) as (
  values
    ('grab', 'standard-car', 'GrabCar', 'economy_car'),
    ('grab', 'premium-car', 'GrabCar+', 'premium_car'),
    ('grab', 'six-seater', 'GrabCar 6-Seater', 'large_vehicle'),
    ('joyride', 'standard-car', 'JoyRide Car', 'economy_car'),
    ('joyride', 'motorcycle-taxi', 'JoyRide MC Taxi', 'motorcycle_taxi'),
    ('angkas', 'motorcycle-taxi', 'Angkas Passenger', 'motorcycle_taxi'),
    ('move-it', 'motorcycle-taxi', 'MOVE IT Moto-Taxi', 'motorcycle_taxi'),
    ('indrive', 'standard-car', 'inDrive City Ride', 'economy_car'),
    ('uber', 'standard-car', 'UberX', 'economy_car'),
    ('uber', 'comfort', 'Uber Comfort', 'premium_car'),
    ('uber', 'xl', 'UberXL', 'large_vehicle'),
    ('uber', 'black', 'Uber Black', 'luxury_car'),
    ('uber', 'black-suv', 'Uber Black SUV', 'luxury_suv'),
    ('lyft', 'standard-car', 'Lyft Standard', 'economy_car'),
    ('lyft', 'extra-comfort', 'Lyft Extra Comfort', 'premium_car'),
    ('lyft', 'xl', 'Lyft XL', 'large_vehicle'),
    ('lyft', 'black', 'Lyft Black', 'luxury_car'),
    ('lyft', 'black-suv', 'Lyft Black SUV', 'luxury_suv')
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

comment on column public.platform_services.normalized_service_category is
  'Cross-provider comparison category. Branded ride tiers are comparable only when this value matches.';
