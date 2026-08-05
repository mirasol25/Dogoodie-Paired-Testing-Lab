create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum (
  'admin',
  'test_coordinator',
  'tester',
  'expert_reviewer',
  'law_firm_viewer'
);
create type public.account_status as enum ('pending', 'active', 'disabled');
create type public.membership_status as enum ('invited', 'active', 'removed');
create type public.study_type as enum ('within_platform_pair', 'cross_platform_comparison');
create type public.study_status as enum ('draft', 'active', 'paused', 'completed', 'archived');
create type public.protocol_status as enum ('draft', 'active', 'superseded', 'archived');
create type public.assignment_status as enum (
  'not_started', 'in_progress', 'draft', 'awaiting_partner',
  'ready_for_validation', 'completed', 'cancelled'
);
create type public.assignment_tester_status as enum (
  'invited', 'assigned', 'ready', 'in_progress', 'submitted', 'removed'
);
create type public.tester_slot as enum ('tester_a', 'tester_b');
create type public.submission_status as enum ('draft', 'submitted', 'withdrawn');
create type public.evidence_integrity_status as enum ('pending', 'complete', 'flagged', 'rejected');
create type public.pair_validation_status as enum ('pending', 'valid', 'warning', 'invalid', 'incomplete');
create type public.rule_status as enum ('pass', 'warning', 'fail', 'not_applicable');
create type public.requirement_level as enum ('required', 'advisory');
create type public.review_status as enum ('pending', 'accepted', 'flagged', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  account_status public.account_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_role not null default 'tester',
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, account_status)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    'pending'
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'tester');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.sync_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = coalesce(new.email, ''), updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row execute function private.sync_auth_user_email();

comment on table public.user_roles is
  'Authoritative global roles. Roles are not stored in editable auth user metadata.';
comment on function private.handle_new_auth_user() is
  'Creates a pending profile and conservative tester role for each manually created Auth user.';
