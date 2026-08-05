# Acceptance QA

Run these checks against a non-production Supabase project after all migrations are applied. Use separate browser profiles for each account so cookies and RLS results cannot be confused.

## Required accounts

- Administrator
- Test coordinator
- Tester A
- Tester B
- Expert reviewer
- Law-firm viewer

Assign every non-admin account to the study under its matching global role.

## Authentication and authorization

1. Invite a user and confirm the link opens password creation before the product workspace.
2. Confirm a pending account cannot enter protected routes.
3. Confirm password completion activates the same account and opens its role-appropriate home.
4. Confirm public sign-up is unavailable.
5. Confirm Tester A cannot select or update Tester B's submission or evidence through the UI or Supabase client.
6. Confirm the coordinator cannot manage a study without active membership.
7. Confirm the reviewer cannot edit validation results, assignments, protocols, or evidence files.
8. Confirm the viewer cannot access active/paused study pairs, evidence, activity, dashboard, or reports.
9. Complete the study and confirm the assigned viewer can read released outputs but cannot export or open raw evidence files.

## Study and protocol scenarios

### Philippines scenario

1. Create a PH study using a Philippines search filter and pin both route locations in the Philippines.
2. Confirm timezone and PHP currency derive from the pinned route.
3. Confirm only configured PH providers and their basic tiers are offered.
4. Create and activate a protocol with screenshot required and recording optional.

### United States scenario

1. From the same coordinator account, change the search country to US.
2. Pin both route locations in the United States.
3. Confirm the study timezone and USD currency derive from the route rather than the coordinator's device timezone.
4. Confirm configured US providers and compatible tiers are offered.

## Assignment and collection

1. Create a testing window in the study timezone and confirm past dates/times cannot be selected.
2. Confirm the route, protocol, provider/tier, side condition, currency, and timezone are read-only after assignment creation.
3. Confirm both testers must be ready before collection starts.
4. Confirm timestamps outside the assignment window are rejected.
5. Submit Tester A and verify the record locks while the assignment awaits Tester B.
6. Submit Tester B and verify exactly one matched pair is created and the assignment completes.
7. Confirm directional variance equals `B - A`, absolute variance equals `abs(B - A)`, and percentage equals `(B - A) / A * 100`.
8. Repeat with Side B cheaper and confirm directional and percentage values are negative while absolute variance remains positive.
9. Repeat with Side A fare `0` and confirm percentage is not calculated.

## Evidence boundaries

1. Attempt every disallowed file type and confirm it is rejected before registration.
2. Test the exact maximum allowed screenshot and recording sizes; they must succeed.
3. Test one byte above each limit; it must fail.
4. Confirm each stored record contains filename, MIME type, size, SHA-256, captured/uploaded timestamps, uploader, bucket, and storage path.
5. Confirm submission fails when a protocol-required evidence type is absent.
6. Confirm an optional recording does not make evidence incomplete when it is absent.
7. Confirm integrity-flagged evidence marks the pair evidence state as flagged without automatically making a human review decision.

## Reopen and resubmit

1. Confirm coordinators and reviewers do not see or execute the reopen command.
2. As admin, reopen a submitted observation with fewer than 10 reason characters; it must fail.
3. Reopen with a valid reason and confirm the prior submission, pair, validation, and review state exists in `submission_revisions`.
4. Confirm only the selected tester returns to `in_progress`; the partner remains submitted.
5. Correct and resubmit; confirm one new matched pair and fresh validation results are created.
6. Confirm `submission.reopened` and subsequent lifecycle events appear in the Activity Log.

## Review, lifecycle, and reports

1. Confirm required technical failures produce invalid/incomplete status and advisory differences produce warning status.
2. Confirm an expert can accept, flag, reject, and clear a decision with a reason/note where required.
3. Confirm technical status never automatically writes an expert decision.
4. Confirm study completion is blocked while assignments, validation, evidence, or required review work remains unresolved.
5. Confirm cancelled and expired assignments appear in report disposition but not as observed fare pairs.
6. Confirm reports include method, context, observations, technical results, expert status, limitations, next-review questions, charts, rule-level results, evidence inventory, and included/flagged/excluded pair tables.
7. Confirm CSV and JSON exports use persisted records and create report export activity events.
8. Print or save the memo as Letter PDF and inspect page breaks, table clipping, and chart visibility.

## Mobile and accessibility

1. Test tester collection at 360x800 and 390x844 viewports on a physical mobile device.
2. Confirm no horizontal overflow, obscured controls, or keyboard-covered required inputs.
3. Complete collection using touch only and keyboard only.
4. Confirm dialog focus is trapped, labels are announced, errors identify their inputs, and status is not communicated by color alone.
