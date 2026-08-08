-- Align the Philippine ride catalogue with the categories displayed by the
-- provider apps. Reuse established service codes where possible so existing
-- study and submission foreign keys keep their meaning.
with catalog(platform_slug, service_code, display_name, normalized_category, metadata) as (
  values
    ('grab', 'standard-car', 'Standard - 4 Seater', 'economy_car', '{"ocr_aliases":["Standard Car","Standard Car 4 Seater","GrabCar"]}'::jsonb),
    ('grab', 'six-seater', 'Standard - 6 Seater', 'large_vehicle', '{"ocr_aliases":["Standard 6 Seater","Standard Car 6 Seater","GrabCar 6-Seater"]}'::jsonb),
    ('grab', 'pet-friendly-car', 'Standard - Pet', 'pet_friendly', '{"ocr_aliases":["Standard Car Pet","Grab Pet","GrabCar Pet"]}'::jsonb),
    ('grab', 'saver-car', 'Saver Car - 4 Seater', 'economy_saver', '{"ocr_aliases":["Saver Car","GrabCar Saver"]}'::jsonb),
    ('grab', 'metered-taxi', 'Metered Taxi - 4 Seater', 'metered_taxi', '{"ocr_aliases":["Metered Taxi","GrabTaxi"]}'::jsonb),
    ('indrive', 'standard-car', '4 Seater', 'economy_car', '{"ocr_aliases":["4 Seater","inDrive 4 Seater"]}'::jsonb),
    ('indrive', 'six-seater', '6 Seater', 'large_vehicle', '{"ocr_aliases":["6 Seater","inDrive 6 Seater"]}'::jsonb),
    ('indrive', 'comfort-xl', 'Comfort XL', 'comfort_xl', '{"ocr_aliases":["Comfort XL","inDrive Comfort XL"]}'::jsonb),
    ('indrive', 'taxi', 'Taxi', 'metered_taxi', '{"ocr_aliases":["Taxi","inDrive Taxi"]}'::jsonb)
)
insert into public.platform_services (platform_id, service_code, name, normalized_service_category, metadata, is_active)
select platforms.id, catalog.service_code, catalog.display_name, catalog.normalized_category, catalog.metadata, true
from catalog
join public.platforms on platforms.slug = catalog.platform_slug
on conflict (platform_id, service_code) do update set
  name = excluded.name,
  normalized_service_category = excluded.normalized_service_category,
  metadata = public.platform_services.metadata || excluded.metadata,
  is_active = true,
  updated_at = now();

-- These legacy Grab product names are not part of the corrected catalogue.
-- Rows are retained for historical foreign-key references but hidden from new
-- study selection.
update public.platform_services
set is_active = false, updated_at = now()
where platform_id = (select id from public.platforms where slug = 'grab')
  and service_code in ('premium-car', 'fast-car');

