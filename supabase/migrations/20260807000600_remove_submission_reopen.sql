-- Submitted observations are final. Remove the administrative reopening RPC
-- so it cannot be invoked outside the application UI either.
drop function if exists public.admin_reopen_submission(uuid, text);
