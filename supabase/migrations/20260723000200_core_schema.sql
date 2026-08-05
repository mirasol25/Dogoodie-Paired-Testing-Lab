create table public.studies (
  id uuid primary key default gen_random_uuid(),
  study_code text not null unique,
  name text not null,
  description text,
  study_type public.study_type not null,
  status public.study_status not null default 'draft',
  study_question text,
  isolated_variable text,
  target_pair_count integer check (target_pair_count is null or target_pair_count > 0),
  default_currency text check (default_currency is null or default_currency ~ '^[A-Z]{3}$'),
  display_timezone text not null default 'UTC',
  testing_starts_at timestamptz,
  testing_ends_at timestamptz,
  configuration jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (testing_ends_at is null or testing_starts_at is null or testing_ends_at > testing_starts_at)
);

create table public.study_members (
  study_id uuid not null references public.studies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_role public.app_role not null,
  membership_status public.membership_status not null default 'invited',
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (study_id, user_id),
  check (study_role <> 'admin')
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  provider_category text not null default 'transportation',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_services (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id) on delete cascade,
  service_code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform_id, service_code)
);

create table public.study_platforms (
  study_id uuid not null references public.studies(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (study_id, platform_id)
);

create table public.protocols (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete cascade,
  protocol_code text not null,
  version text not null,
  status public.protocol_status not null default 'draft',
  study_question text not null,
  fixed_controls jsonb not null default '[]'::jsonb,
  evidence_requirements jsonb not null default '[]'::jsonb,
  validation_configuration jsonb not null default '{}'::jsonb,
  exclusion_conditions jsonb not null default '[]'::jsonb,
  effective_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (study_id, protocol_code),
  unique (study_id, version),
  unique (id, study_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_code text not null unique,
  study_id uuid not null references public.studies(id) on delete cascade,
  protocol_id uuid not null,
  status public.assignment_status not null default 'not_started',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  pickup_location text not null,
  destination_location text not null,
  isolated_variable text not null,
  instructions jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, study_id),
  foreign key (protocol_id, study_id) references public.protocols(id, study_id) on delete restrict,
  check (scheduled_end is null or scheduled_start is null or scheduled_end > scheduled_start)
);

create table public.assignment_testers (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  slot public.tester_slot not null,
  platform_service_id uuid references public.platform_services(id) on delete restrict,
  status public.assignment_tester_status not null default 'assigned',
  account_configuration jsonb not null default '{}'::jsonb,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, slot),
  unique (assignment_id, user_id),
  unique (id, assignment_id, user_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_code text unique,
  study_id uuid not null,
  assignment_id uuid not null,
  assignment_tester_id uuid not null,
  user_id uuid not null,
  platform_service_id uuid references public.platform_services(id) on delete restrict,
  status public.submission_status not null default 'draft',
  displayed_fare numeric(12,2) check (displayed_fare is null or displayed_fare >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  quote_timestamp timestamptz,
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  network_type text,
  device_type text,
  operating_system text,
  operating_system_version text,
  app_version text,
  battery_percentage smallint check (battery_percentage is null or battery_percentage between 0 and 100),
  account_profile jsonb not null default '{}'::jsonb,
  pickup_location text,
  destination_location text,
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_tester_id),
  unique (id, study_id, assignment_id),
  foreign key (assignment_id, study_id) references public.assignments(id, study_id) on delete cascade,
  foreign key (assignment_tester_id, assignment_id, user_id)
    references public.assignment_testers(id, assignment_id, user_id) on delete restrict,
  check ((status = 'submitted' and submitted_at is not null) or status <> 'submitted')
);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  evidence_code text unique,
  study_id uuid not null,
  assignment_id uuid not null,
  submission_id uuid not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  evidence_type text not null,
  storage_bucket text not null default 'paired-testing-evidence',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  integrity_status public.evidence_integrity_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (submission_id, study_id, assignment_id)
    references public.submissions(id, study_id, assignment_id) on delete cascade,
  check (storage_bucket = 'paired-testing-evidence')
);

create table public.matched_pairs (
  id uuid primary key default gen_random_uuid(),
  pair_code text not null unique,
  study_id uuid not null,
  assignment_id uuid not null,
  submission_a_id uuid not null,
  submission_b_id uuid not null,
  absolute_fare_difference numeric(12,2) check (absolute_fare_difference is null or absolute_fare_difference >= 0),
  percentage_fare_difference numeric(12,4) check (percentage_fare_difference is null or percentage_fare_difference >= 0),
  higher_priced_slot public.tester_slot,
  timestamp_difference_seconds numeric(12,3) check (timestamp_difference_seconds is null or timestamp_difference_seconds >= 0),
  gps_distance_feet numeric(14,4) check (gps_distance_feet is null or gps_distance_feet >= 0),
  technical_status public.pair_validation_status not null default 'pending',
  evidence_status public.evidence_integrity_status not null default 'pending',
  paired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id),
  foreign key (assignment_id, study_id) references public.assignments(id, study_id) on delete cascade,
  foreign key (submission_a_id, study_id, assignment_id)
    references public.submissions(id, study_id, assignment_id) on delete restrict,
  foreign key (submission_b_id, study_id, assignment_id)
    references public.submissions(id, study_id, assignment_id) on delete restrict,
  check (submission_a_id <> submission_b_id)
);

create table public.validation_results (
  id uuid primary key default gen_random_uuid(),
  matched_pair_id uuid not null references public.matched_pairs(id) on delete cascade,
  rule_code text not null,
  label text not null,
  status public.rule_status not null,
  requirement_level public.requirement_level not null default 'required',
  tester_a_value jsonb,
  tester_b_value jsonb,
  observed_difference text,
  explanation text,
  threshold_configuration jsonb,
  affects_overall_status boolean not null default false,
  created_at timestamptz not null default now(),
  unique (matched_pair_id, rule_code)
);

create table public.expert_reviews (
  id uuid primary key default gen_random_uuid(),
  matched_pair_id uuid not null references public.matched_pairs(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  status public.review_status not null default 'pending',
  reason text,
  note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matched_pair_id, reviewer_id),
  check ((status = 'pending' and decided_at is null) or (status <> 'pending' and decided_at is not null))
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  study_id uuid references public.studies(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  category text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger studies_set_updated_at before update on public.studies
for each row execute function private.set_updated_at();
create trigger platforms_set_updated_at before update on public.platforms
for each row execute function private.set_updated_at();
create trigger platform_services_set_updated_at before update on public.platform_services
for each row execute function private.set_updated_at();
create trigger protocols_set_updated_at before update on public.protocols
for each row execute function private.set_updated_at();
create trigger assignments_set_updated_at before update on public.assignments
for each row execute function private.set_updated_at();
create trigger assignment_testers_set_updated_at before update on public.assignment_testers
for each row execute function private.set_updated_at();
create trigger submissions_set_updated_at before update on public.submissions
for each row execute function private.set_updated_at();
create trigger evidence_files_set_updated_at before update on public.evidence_files
for each row execute function private.set_updated_at();
create trigger matched_pairs_set_updated_at before update on public.matched_pairs
for each row execute function private.set_updated_at();
create trigger expert_reviews_set_updated_at before update on public.expert_reviews
for each row execute function private.set_updated_at();

create index study_members_user_idx on public.study_members(user_id, membership_status);
create index platform_services_platform_idx on public.platform_services(platform_id);
create index study_platforms_platform_idx on public.study_platforms(platform_id);
create index protocols_study_idx on public.protocols(study_id, status);
create index assignments_study_idx on public.assignments(study_id, status);
create index assignments_protocol_idx on public.assignments(protocol_id);
create index assignment_testers_user_idx on public.assignment_testers(user_id, status);
create index assignment_testers_assignment_idx on public.assignment_testers(assignment_id);
create index submissions_study_idx on public.submissions(study_id, status);
create index submissions_assignment_idx on public.submissions(assignment_id);
create index submissions_user_idx on public.submissions(user_id, status);
create index evidence_files_study_idx on public.evidence_files(study_id);
create index evidence_files_assignment_idx on public.evidence_files(assignment_id);
create index evidence_files_submission_idx on public.evidence_files(submission_id);
create index evidence_files_uploader_idx on public.evidence_files(uploaded_by);
create index matched_pairs_study_idx on public.matched_pairs(study_id, technical_status);
create index validation_results_pair_idx on public.validation_results(matched_pair_id);
create index expert_reviews_pair_idx on public.expert_reviews(matched_pair_id, status);
create index expert_reviews_reviewer_idx on public.expert_reviews(reviewer_id);
create index activity_logs_study_created_idx on public.activity_logs(study_id, created_at desc);
create index activity_logs_actor_idx on public.activity_logs(actor_id);

comment on table public.study_platforms is
  'Provider-agnostic study/platform join supporting one or many providers per study.';
comment on column public.assignment_testers.platform_service_id is
  'Using one service per tester slot supports both within-platform and cross-platform comparisons.';
comment on table public.activity_logs is
  'Append-only through ordinary application access; this foundation is not cryptographically immutable.';
