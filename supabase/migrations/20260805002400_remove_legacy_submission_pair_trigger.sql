drop trigger if exists submissions_form_pair on public.submissions;

drop function if exists private.pair_after_submission();

comment on function public.submit_tester_observation(uuid) is
  'The sole submission-finalization path: it locks the observation, updates assignment state, creates one pair after both testers submit, and starts deterministic validation.';
