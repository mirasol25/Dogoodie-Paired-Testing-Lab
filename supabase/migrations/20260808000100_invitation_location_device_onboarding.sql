alter table public.profiles
  add column if not exists tester_country_name text,
  add column if not exists registration_latitude double precision,
  add column if not exists registration_longitude double precision,
  add column if not exists registration_ip inet,
  add column if not exists ip_country_code text,
  add column if not exists location_review_status text not null default 'unverified',
  add column if not exists browser_language text,
  add column if not exists browser_timezone text,
  add column if not exists screen_size text,
  add column if not exists registration_user_agent text,
  add column if not exists device_profile_created_at timestamptz;

alter table public.profiles drop constraint if exists profiles_location_review_status_check;
alter table public.profiles add constraint profiles_location_review_status_check
  check (location_review_status in ('unverified', 'verified', 'review_required'));

alter table public.profiles drop constraint if exists profiles_registration_coordinates_check;
alter table public.profiles add constraint profiles_registration_coordinates_check check (
  (registration_latitude is null and registration_longitude is null)
  or (registration_latitude between -90 and 90 and registration_longitude between -180 and 180)
);

comment on column public.profiles.location_review_status is
  'review_required when browser GPS country and edge-provider IP country disagree.';
