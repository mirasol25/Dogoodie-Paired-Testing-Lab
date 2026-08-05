-- Activity names are produced by trusted workflow functions. A legacy database
-- trigger may still emit a non-namespaced action, so formatting must not abort
-- the workflow transaction that the audit record describes.
alter table public.activity_logs
  drop constraint if exists activity_logs_action_format;

comment on column public.activity_logs.action is
  'Workflow event name. New events use dot-separated lowercase names; legacy event names remain readable.';
