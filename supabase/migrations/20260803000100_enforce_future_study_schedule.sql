create or replace function public.enforce_future_study_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.testing_starts_at is not null and new.testing_starts_at < now() then
    raise exception 'Testing cannot start in the past' using errcode = '22023';
  end if;
  if new.testing_starts_at is not null and new.testing_ends_at is not null
    and new.testing_ends_at <= new.testing_starts_at then
    raise exception 'Testing must end after it starts' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_future_study_schedule on public.studies;
create trigger enforce_future_study_schedule
before insert or update of testing_starts_at, testing_ends_at on public.studies
for each row execute function public.enforce_future_study_schedule();

comment on function public.enforce_future_study_schedule() is
  'Prevents new or rescheduled studies from starting in the past and requires the end to follow the start.';
