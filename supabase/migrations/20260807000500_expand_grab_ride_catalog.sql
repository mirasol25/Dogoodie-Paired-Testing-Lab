-- The OCR verifier matches the actual product selected in the screenshot, not
-- merely the provider. Keep the catalogue aligned with products displayed by
-- Grab in the tested market and keep screen-facing names as explicit aliases.
with grab as (
  select id from public.platforms where slug = 'grab'
)
insert into public.platform_services (
  platform_id,
  service_code,
  name,
  normalized_service_category,
  metadata,
  is_active
)
select
  grab.id,
  catalog.service_code,
  catalog.name,
  catalog.normalized_service_category,
  catalog.metadata::jsonb,
  true
from grab
cross join (
  values
    ('fast-car', 'Grab Fast', 'economy_car', '{"ocr_aliases":["Fast","Grab Fast"]}'),
    ('pet-friendly-car', 'GrabCar Pet', 'economy_car', '{"ocr_aliases":["Standard Car Pet","Grab Pet","GrabCar Pet"]}')
) as catalog(service_code, name, normalized_service_category, metadata)
on conflict (platform_id, service_code) do update
set
  name = excluded.name,
  normalized_service_category = excluded.normalized_service_category,
  metadata = public.platform_services.metadata || excluded.metadata,
  is_active = true,
  updated_at = now();

-- Preserve existing metadata while supplying the exact title shown on a Grab
-- card. The six-seat text is a capacity badge in the supplied screenshots;
-- it is not automatically treated as the separate GrabCar 6-Seater product.
update public.platform_services
set
  metadata = metadata || '{"ocr_aliases":["Standard Car"]}'::jsonb,
  updated_at = now()
where platform_id = (select id from public.platforms where slug = 'grab')
  and service_code = 'standard-car';

