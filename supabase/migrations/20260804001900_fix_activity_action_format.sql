alter table public.activity_logs
  drop constraint if exists activity_logs_action_format;

alter table public.activity_logs
  add constraint activity_logs_action_format
  check (action ~ '^[a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)+$')
  not valid;

comment on constraint activity_logs_action_format on public.activity_logs is
  'Requires dot-separated lowercase event names such as submission.submitted.';
