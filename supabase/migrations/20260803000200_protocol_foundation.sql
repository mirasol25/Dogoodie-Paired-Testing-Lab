alter table public.protocols
  add column if not exists title text not null default 'Testing Protocol',
  add column if not exists description text,
  add column if not exists isolated_variable text,
  add column if not exists change_summary text;

alter table public.protocols
  drop constraint if exists protocols_fixed_controls_array,
  add constraint protocols_fixed_controls_array check (jsonb_typeof(fixed_controls) = 'array'),
  drop constraint if exists protocols_evidence_requirements_array,
  add constraint protocols_evidence_requirements_array check (jsonb_typeof(evidence_requirements) = 'array'),
  drop constraint if exists protocols_validation_configuration_object,
  add constraint protocols_validation_configuration_object check (jsonb_typeof(validation_configuration) = 'object'),
  drop constraint if exists protocols_exclusion_conditions_array,
  add constraint protocols_exclusion_conditions_array check (jsonb_typeof(exclusion_conditions) = 'array'),
  drop constraint if exists protocols_version_format,
  add constraint protocols_version_format check (version ~ '^v[0-9]+\.[0-9]+$');

create unique index if not exists protocols_one_active_per_study_idx
on public.protocols(study_id)
where status = 'active';

comment on column public.protocols.isolated_variable is
  'Snapshot of the controlled variable defined by this protocol version.';
comment on column public.protocols.change_summary is
  'Short explanation of what changed from the preceding protocol version.';
