# DoGoodie Paired Testing Lab

## Pilot Handoff and Demo Guide

**Audience:** pilot owners, administrators, coordinators, testers, reviewers, viewers, and deployment maintainers  
**Document status:** current-build operating guide  
**Last updated:** 10 August 2026  
**System of record:** the deployed application and its linked Supabase project

> This system organizes controlled paired pricing observations. It does not, by itself, prove discrimination, causation, intent, liability, statistical significance, scientific validity, or legal admissibility. Qualified methodology and legal reviewers remain responsible for study design and interpretation.

---

## 1. Quick Start

Use this section during a pilot. Use the later sections for preparation, training, and troubleshooting.

### Before collection

- [ ] The study owner approved the research question, isolated variable, A/B conditions, controls, tolerances, evidence, exclusions, and target.
- [ ] The coordinator verified the country, pickup and destination pins, timezone, currency, provider, and service/tier for both sides.
- [ ] The protocol and study are active.
- [ ] Every participant has an individual active account and active study membership.
- [ ] Testers completed Device Profile and confirmed device, app, recording, location, connectivity, and availability.
- [ ] Assignments use the intended timezone and testing windows.
- [ ] A secure escalation channel, export location, incident contact, and retention owner are known.

**Go/no-go rule:** Do not begin collection if any required item above is unresolved.

### Run one paired assignment

1. Each tester opens the assigned record and verifies the locked route, service/tier, condition, instructions, and window.
2. Each tester completes the readiness checklist and selects **Confirm ready**.
3. During the allowed window, each tester selects **Start test**. Synchronized assignments require both testers to be ready.
4. Each tester follows the locked route and service/tier, captures the quote without booking, and preserves the required evidence.
5. Each tester uploads the screenshot first, confirms the selected OCR fare/service result, then uploads any required recording.
6. Each tester completes the observation, saves the latest changes, reviews the record, and selects **Submit observation**.
7. After both sides submit, the system creates one matched pair and runs technical validation.
8. A reviewer examines both observations, validation results, and evidence before recording a decision.

### Close the pilot

- [ ] Every assignment is completed, cancelled, expired, or has a named next action.
- [ ] Every matched pair has a final review or is explicitly listed as pending.
- [ ] Invalid, warning, incomplete, and replacement outcomes are explained.
- [ ] Dashboard, pair table, exports, and report counts reconcile.
- [ ] Evidence and metadata were spot-checked by an authorized reviewer.
- [ ] PDF output was checked for clipping and page breaks.
- [ ] Access was removed for people who no longer need it.
- [ ] Product bugs, training issues, protocol issues, and methodology questions were separated in the debrief.

---

## 2. System Model

A complete test unit follows this lifecycle:

`Study -> Active protocol -> Assignment -> Two observations -> Matched pair -> Technical validation -> Human review -> Report/export`

### Terms that must remain distinct

| Term | Meaning |
|---|---|
| Technical validation | Deterministic checks against the locked assignment and protocol. |
| Human review | A documented decision about whether the pair is usable. |
| Price difference | A descriptive comparison, not a finding of causation or liability. |
| Accepted usable pair | A pair included under the configured report rules and counted toward the study target. |
| Directional difference | `Tester B fare - Tester A fare`. Positive means B was higher. |
| Percentage difference | `(B - A) / A x 100`. Not calculated when A is zero. |

### Technical statuses

| Status | Operational meaning | Required action |
|---|---|---|
| Valid | Required technical rules passed. | Send for human review. |
| Warning | A preferred/advisory tolerance was exceeded. | Review the affected rule and evidence. |
| Invalid | At least one required rule failed. | Reject or use an authorized, documented exception. |
| Incomplete | Partner response or required data/evidence is missing. | Resolve or schedule a replacement. |
| Pending | Pair creation or validation is not finished. | Check both tester submissions and processing state. |

Technical status and human review status are separate. A reviewer decision must never rewrite the underlying technical result.

---

## 3. Roles and Ownership

Use one named account per person and grant the minimum required role. Global role alone does not grant study access; active study membership is also required.

| Role | Primary responsibilities | Must not do |
|---|---|---|
| Administrator | Invite accounts, manage global roles, oversee access and deployment ownership. | Share credentials or grant broad access for convenience. |
| Coordinator | Configure studies and protocols, manage membership, schedule assignments, monitor collection, and prepare outputs. | Alter an active protocol to repair collected data. |
| Tester | Verify the assignment, execute the assigned condition, capture evidence, and submit an accurate observation. | Coordinate prices, edit evidence, book a ride, or use another person's account. |
| Expert reviewer | Inspect observations, rule results, and evidence; accept, accept with exception, reject, or clear a decision. | Treat technical validation as a legal or causal conclusion. |
| Law-firm viewer | Read released completed/archived assigned outputs. | Open raw evidence or export data unless separately authorized. |
| Deployment maintainer | Manage Vercel/Supabase configuration, migrations, backups, monitoring, and incident response. | Put secrets in source control, documents, screenshots, or chat. |

For demonstrations and QA, use separate browser profiles for separate users so sessions and permissions are not mixed.

---

## 4. Readiness Gates

### Gate A: Environment ready

**Owner:** deployment maintainer  
**Pass when:**

- The intended Vercel deployment is healthy.
- Production environment variables point to the intended Supabase project and production site URL.
- Required migrations are applied.
- Public registration is disabled.
- Invitation and password-recovery links work on the deployed domain.
- Private evidence storage policies and size limits are confirmed.
- Backup, retention, monitoring, incident response, and key-rotation ownership are assigned.

### Gate B: Study design ready

**Owner:** study/methodology owner  
**Pass when:**

- Research question and descriptive purpose are approved.
- Country, exact route pins, timezone, currency, provider, and services are correct.
- Isolated variable and A/B labels are unambiguous.
- Fixed controls, tolerances, evidence, observation fields, exclusions, and target are approved.
- Any external randomization or counterbalancing allocation is preserved.

### Gate C: People ready

**Owner:** coordinator  
**Pass when:**

- Required accounts are active with correct global roles and study membership.
- Testers completed Device Profile and device/browser checks.
- Participants received the same operational instructions and escalation contact.
- Backup testers and replacement capacity are available.

### Gate D: Assignment ready

**Owner:** coordinator and assigned testers  
**Pass when:**

- The active assignment locks the intended protocol, route, side-specific service/tier, conditions, currency, timezone, and schedule.
- The schedule is inside the study period and displayed in the intended timezone.
- Tester A and Tester B are distinct eligible accounts.
- Required capture and recording tools are ready.

---

## 5. Configuration Guide

### Create the study

1. Open **Studies -> Create study**.
2. Enter the study name, purpose, owner, and target accepted-pair count.
3. Select the country before setting the route.
4. Search and pin both pickup and destination. Verify the map pins and written addresses visually.
5. Review the derived timezone and currency.
6. Select the provider and exact service/tier for Tester A and Tester B.
7. Enable side-specific operating-system restrictions only when the protocol requires them.
8. Set the testing date range and review the summary.
9. Create the draft study, then add testers, reviewers, viewers, and coordinators through **Membership**.

Geocoding is an operational aid, not a legal determination of jurisdiction.

### Configure the protocol

Complete and review:

1. Study question and protocol details.
2. Isolated variable and exact Tester A/Tester B values.
3. Matching controls.
4. Validation thresholds.
5. Evidence and observation requirements.
6. Exclusion conditions and final preview.

Activate only after approval. An active protocol version is locked. Later methodology changes require a new documented version and must not silently alter prior assignments.

### Pairing and allocation

The coordinator currently selects Tester A and Tester B manually. The application does not implement study randomization, side allocation, counterbalancing, route allocation, or time-block randomization.

When random allocation is required:

1. Use an approved external reproducible procedure.
2. Preserve its method, seed, allocation sheet, and author.
3. Enter the resulting assignments without changing the allocation.
4. Record deviations factually.

---

## 6. Collection Procedures

### Coordinator: create assignments

1. Open **Assignments -> Create assignment**.
2. Select the active protocol and route.
3. Confirm the locked side-specific provider and service/tier.
4. Choose synchronized or asynchronous testing when available.
5. Set the date and windows in the displayed study timezone.
6. Set the number of paired sessions and select distinct eligible testers.
7. Add operational instructions that clarify execution without changing the protocol.
8. Review and create the assignments.

For asynchronous work, Tester B must begin at or after Tester A's window ends. The request-time synchronization rule is not applicable, but other configured controls remain active.

### Tester: prepare

Before test day:

- Update **Device profile** with accurate stable device information.
- Confirm the assigned condition and service/tier.
- Verify location permission, connectivity, battery, storage, and screen recording.
- Disable notification previews and remove unrelated personal content from view.
- Do not disclose quotes between testers.

### Tester: capture and submit

1. Open the assignment and read the locked route, condition, service/tier, window, and notes.
2. Complete all readiness items and select **Confirm ready**.
3. Select **Start test** only within the allowed tester-side window.
4. Follow the countdown or independent-start instruction.
5. Open the external provider app using the exact locked route and service/tier.
6. Capture the quote without booking.
7. Preserve the complete required screenshot and status-bar time. Do not crop, blur, annotate, or edit evidence.
8. Upload the screenshot first and confirm the correct OCR fare/service candidate. Replace unreadable or mismatched evidence.
9. Upload the required recording.
10. Complete the current observation fields, including app version and network information when requested.
11. Save the latest changes, review the record, and select **Submit observation**.

Submission locks the observation. Do not repeatedly resubmit after an error; record the exact error and escalate.

---

## 7. Review and Reporting

### Reviewer decision path

1. Open **Review studies -> Matched Pairs**.
2. Filter to pending work and open a pair.
3. Compare both fares, timestamps, locations, assigned conditions, and service/tier.
4. Review every technical rule and both evidence records/files.
5. Select one outcome:

| Outcome | Use when | Documentation |
|---|---|---|
| Accept pair | Complete evidence and acceptable technical result. | Select the applicable reason and factual note. |
| Accept with technical exception | An authorized reviewer deliberately includes a documented technical problem. | Detailed justification of at least 20 characters; use sparingly. |
| Reject pair | Pair must be excluded and normally replaced. | Factual reason and note of at least 10 characters. |
| Clear decision | Reassessment is required. | Explain why the decision returned to pending. |

### Report classification

- **Included:** expert accepted, evidence complete, and technically valid/warning; or accepted with a documented authorized exception.
- **Pending:** no final expert decision.
- **Excluded:** rejected or fails inclusion requirements.

Before distribution:

1. Reconcile accepted usable counts across Dashboard, pair table, and report.
2. Open CSV/JSON exports and confirm expected columns and row counts.
3. Preview the report and use browser **Print / Save PDF**.
4. Check Letter page breaks, clipped tables, charts, date/timezone labels, and included/pending/excluded counts.
5. Store exports only in the approved secure location.

---

## 8. Failure and Repeat Rules

Never repair a failed test by editing evidence, coordinating fares, or changing an active protocol retroactively.

| Situation | Action |
|---|---|
| Tester cannot start | Verify readiness, partner readiness for synchronized work, and tester-side window. |
| Observation cannot save | Verify Device Profile, required fields, and timestamp/window. |
| Observation cannot submit | Verify confirmed screenshot, correct service, latest saved changes, and all required evidence. |
| Pair does not appear | Confirm both tester slots show submitted; capture codes and exact error before escalating. |
| Evidence is unreadable/mismatched | Replace it before submission; do not force an incorrect OCR confirmation. |
| Required rule fails | Preserve the original attempt and send it for review; schedule a replacement when directed. |
| Tester or device becomes unavailable | Cancel/expire with a documented reason and create a new assignment. |
| Protocol problem is discovered | Pause collection, preserve existing records, and create/approve a new protocol version. |

Record the environment, study/assignment/pair code, role, local timestamp and timezone, browser/device, exact steps, exact error, and a sanitized screenshot. Never include passwords, tokens, or secrets.

---

## 9. Privacy and Security

Do not enter, upload, or share:

- Passwords, invitation/recovery links, API keys, database credentials, or access tokens.
- Payment details or provider login credentials.
- Government IDs, health information, unrelated chats, contacts, or private photos.
- Real passenger trip details, precise home addresses, or unnecessary third-party personal data.
- Cropped or edited evidence presented as original evidence.

Operational requirements:

- Use individual accounts and minimum permissions; never share logins.
- Use approved pilot identities and provider accounts.
- Treat evidence and exports as sensitive even when storage is private.
- Report lost devices, wrong-recipient access, account sharing, or exposed credentials immediately.
- Agree retention and deletion rules before collecting real data.
- Treat the activity log as operational history, not a cryptographically immutable chain of custody.

---

## 10. Recommended First Shakedown

This is an operational test, not a sample-size or statistical recommendation.

- One country and one short, unambiguous route.
- One provider and the same normalized service/tier on both sides.
- One approved isolated variable with clear A/B labels.
- Two primary testers and two backups.
- One coordinator, one reviewer, and one read-only viewer.
- Synchronized testing first; avoid cross-platform and asynchronous work in round one.
- Six planned matched pairs plus two replacement assignments.
- Stop after pair 1 for a process check, pair 3 for a data-quality check, and pair 6 for report/export QA.

Suggested operational success criteria:

- All users see only permitted studies and actions.
- At least five of six planned pairs reach review without operator intervention.
- Required evidence opens for authorized users and has complete metadata.
- Invalid/incomplete attempts have traceable reasons and replacement decisions.
- Report classification can be explained from underlying pairs.
- Dashboard, CSV, JSON, and PDF counts reconcile.

---

## 11. Demo Run Sheet (20 Minutes)

Use a clearly labeled training study and approved demonstration evidence. Do not create fabricated records in a real pilot study.

| Time | Area | Show | Key message |
|---:|---|---|---|
| 2 min | Overview | Purpose, active study, workflow | The system structures collection; it does not make legal conclusions. |
| 3 min | Study and Protocol | Route, services, A/B conditions, controls, tolerances, evidence, locked version | Assignments inherit an approved version. |
| 3 min | Membership and Assignment | Role-scoped access and one future assignment | Global role and study membership both matter; pairing is manual. |
| 5 min | Tester journey | Device Profile, readiness, start, screenshot/OCR, recording, observation, submit | Evidence-first workflow and locked submission. |
| 3 min | Pair and validation | Directional difference and rule-level results | Technical status is deterministic and separate from review. |
| 2 min | Expert review | Accept, exception, reject, clear | Exceptions require explicit human justification. |
| 2 min | Dashboard, report, audit | Reconcile counts, preview PDF, exports, activity | Outputs remain descriptive and require QA. |

### Demo recovery plan

- If two live tester accounts are unavailable, show a completed training pair.
- If external geocoding is unavailable, use an already configured training route.
- If email delivery is delayed, use previously activated training accounts; never share passwords.
- If evidence upload is unavailable, explain the expected flow and show existing approved training evidence.
- If an unexpected error occurs, stop the action, capture the sanitized error, and continue with a prepared completed record.

---

## 12. Technical Handoff

### Environment ownership

The receiving operator needs these non-secret references:

- Production and preview application URLs.
- Supabase project name/reference and owner.
- Vercel project and deployment owner.
- Migration maintainer.
- Monitoring/incident contact.
- Secure evidence export location and retention owner.
- Issue tracker and escalation channel.

Secrets must be delivered through the approved secret manager, never inside this guide or source control.

### Required application variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SECRET_KEY
```

`SUPABASE_SECRET_KEY` is server-only and must never use the `NEXT_PUBLIC_` prefix.

### Developer verification

```powershell
npm install
npm run typecheck
npm run lint
npm run test:run
npm run build
```

For local development, create an untracked `.env.local`, run `npm run dev`, and open `http://localhost:3000`. Routine testers, reviewers, viewers, and most developers do not need migration privileges, database passwords, or server secret keys.

Never run a linked database reset against a shared or production project.

### Release record

Complete this table for every pilot release:

| Item | Value |
|---|---|
| Application deployment URL | |
| Git commit | |
| Deployment date/time and timezone | |
| Supabase project reference | |
| Latest applied migration | |
| Pilot owner | |
| Coordinator | |
| Incident contact | |
| Approved export location | |
| Retention owner/policy reference | |
| Known limitations accepted by | |

---

## 13. Current Limitations

- No live rideshare API, scraping, automated quote request, booking, or provider notification.
- No built-in randomization or counterbalancing engine.
- OCR may misread fare, service, or time and requires tester confirmation.
- Geocoding is not a jurisdictional authority.
- Thresholds, controls, exclusions, sample size, and interpretation require independent approval.
- Reminders, exception escalation, and replacement scheduling remain partly manual.
- Activity history is not tamper-proof forensic chain-of-custody infrastructure.
- Browser-generated PDF output requires visual QA.
- Backups, monitoring, retention, incident response, and production operations remain environment-owner responsibilities.
- Provider/service availability must be confirmed in the actual environment before each pilot.

Treat unexpected behavior as a pilot finding. Preserve the record, document the context, and avoid undocumented workarounds.

