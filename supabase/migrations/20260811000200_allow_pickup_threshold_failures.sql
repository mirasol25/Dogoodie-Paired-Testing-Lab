-- Pickup proximity is a technical-validation finding. Preserve the tester's
-- actual coordinates even when they exceed the protocol threshold so expert
-- review can accept with exception or reject the completed pair.
drop trigger if exists submissions_enforce_pickup_proximity on public.submissions;
drop function if exists private.enforce_submission_pickup_proximity();

comment on function public.validate_assignment_pickup_location(uuid,numeric,numeric) is
  'Returns pickup proximity for immediate tester feedback without blocking submission; technical validation and expert review determine disposition.';
