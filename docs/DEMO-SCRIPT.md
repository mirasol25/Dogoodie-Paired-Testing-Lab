# DoGoodie Paired Testing Lab: 8–12 Minute Demonstration Script

> **Phase 0 update:** This script was written for the original fixture/Zustand prototype. The application now requires an internal Supabase login and displays the authenticated database role; the former “View as” role selector is hidden. Statements below that say authentication or a database does not exist describe the original prototype workflow, not the new security foundation.

## Before the meeting

1. Start the application with `npm run dev`.
2. Open `http://127.0.0.1:3000`.
3. Click **Reset Demo Data** and confirm so the metrics begin at the known fixture state.
4. Select **Expert Reviewer** in the “View as” control.
5. Keep this sentence ready:

> “This is a synthetic preparation prototype. It demonstrates a possible workflow, not an approved methodology, production evidence system, or legal conclusion.”

The suggested timing below totals approximately ten minutes.

## 1. Introduce the concept on Overview

**Time:** 60 seconds  
**Page to open:** `/paired-testing-demo`

**Action to perform:** Point to the prototype label, synthetic-data label, active study card, and workflow.

**Simple talking points:**

- “The concept is a structured workspace for paired controlled price testing.”
- “The example compares two fictional account profiles on the same fictional platform.”
- “The intended flow is protocol, paired collection, technical checks, expert review, and package preparation.”
- “The main goal today is to discover where this workflow is accurate and where it is wrong.”

**Important disclaimer:**

- The Manhattan-to-JFK scenario, membership comparison, thresholds, and evidence rules are assumptions.

**Feedback to ask Skyler:**

- “Does this describe the problem your dad would recognize, or are we starting from the wrong workflow?”

## 2. Explain the study numbers on Dashboard

**Time:** 75 seconds  
**Page to open:** Click **Open Study Dashboard**.

**Action to perform:** Point to submitted pairs, technically valid pairs, pending review, evidence completeness, and the four charts. Scroll to the pair table and briefly use the Valid filter.

**Simple talking points:**

- “The demo begins with twelve synthetic pair records.”
- “Eight pass the current technical rules, two have warnings, one is invalid, and one is incomplete.”
- “Technical status is separate from expert review. Four are accepted, one flagged, one rejected, and six still pending.”
- “The system recalculates these numbers from current browser state.”

**Important disclaimer:**

- “These are descriptive synthetic counts. They do not establish statistical significance or discrimination.”

**Clarify the 11% figure:**

- “The screen shows 12 submitted, but 11% completion because the current completion formula excludes the one incomplete pair. That definition needs confirmation.”

**Feedback to ask Skyler:**

- “Which numbers would an expert or law firm actually need, and how should completion be defined?”

## 3. Review the preliminary Protocol

**Time:** 60 seconds  
**Page to open:** `/paired-testing-demo/protocol`

**Action to perform:** Expand the study question, fixed conditions, evidence, thresholds, and exclusions. Point to version history.

**Simple talking points:**

- “This page makes the testing rules explicit instead of leaving them in messages or memory.”
- “It separates what should stay the same from the one characteristic intended to differ.”
- “It also shows required evidence, exclusion ideas, and a version history.”

**Important disclaimer:**

- “The five- and ten-second timing rules and five- and fifteen-foot GPS rules are unapproved demonstration values.”

**Feedback to ask Skyler:**

- “Who should approve a protocol, and which controls and evidence are actually mandatory?”

## 4. Demonstrate local Assignment creation

**Time:** 60 seconds  
**Page to open:** `/paired-testing-demo/assignments`

**Action to perform:** Click **Create Demo Assignment**, review the fields, and create the default example. Point out the new sequential ID, normally `ASN-013`.

**Simple talking points:**

- “An assignment is the instruction record that pairs two testers with one route, platform, tier, variable, and time window.”
- “This form works locally and adds a demonstration activity event.”
- “In the current prototype, the new assignment does not yet create submissions or a matched-pair record.”

**Important disclaimer:**

- “Nothing is sent to a tester or server. This is browser-only state.”

**Feedback to ask Skyler:**

- “How are testers assigned and notified today, and what status steps are missing here?”

## 5. Demonstrate the Tester workflow

**Time:** 90 seconds  
**Page to open:** `/paired-testing-demo/submission`

**Action to perform:** Check the readiness items and click **Confirm Ready & Start Test**. Let the 3–2–1 countdown finish. Briefly show the form and file selectors. Do not spend time selecting real files unless desired.

**Simple talking points:**

- “The checklist tries to reduce avoidable differences before the test.”
- “The countdown simulates a synchronized request cue.”
- “The form captures quote, time, coordinates, device/app context, account profile, route, notes, and local evidence selections.”
- “No rideshare platform, GPS sensor, or external service is contacted.”

**Important implementation disclosure:**

- “This page is currently fixed to Tester Alpha and PAIR-008. A locally submitted response is saved, but it does not yet replace PAIR-008’s fixture submission or rerun validation.”

**Feedback to ask Skyler:**

- “Which fields should be automatic, which should be manual, and how should two testers actually coordinate?”

## 6. Explain the featured Matched Pair

**Time:** 120 seconds  
**Page to open:** `/paired-testing-demo/pairs/PAIR-008`

**Action to perform:** Point to the variance summary, two quote cards, conformity matrix, and evidence cards.

**Simple talking points:**

- “Tester Alpha sees $47.80 and Tester Bravo sees $64.05.”
- “The dollar difference is $16.25.”
- “The displayed 34.00% divides that difference by the lower $47.80 quote.”
- “The recorded requests are 3.2 seconds apart.”
- “The coordinate calculation places the testers about 3.8 feet apart.”
- “The current exact-match and evidence checks pass, so the technical status is Valid.”
- “The expert status remains Pending because technical conformity does not equal expert acceptance.”

**Important disclaimer:**

- “A price difference alone does not prove discrimination, causation, or liability.”

**Feedback to ask Skyler:**

- “Is this the right information and layout for an expert to decide whether a pair is usable?”

## 7. Perform an Expert Reviewer action

**Time:** 60 seconds  
**Page:** Remain on PAIR-008.

**Action to perform:** In the reviewer panel, choose a reason, add a short note such as “Demo decision for workflow discussion,” and click **Flag Follow-Up**.

**Simple talking points:**

- “Only the Expert Reviewer viewpoint enables these controls in the current interface.”
- “The decision immediately changes the pair, dashboard counts, report subsets, and activity state in this browser.”
- “Flagged means follow-up; it does not change the technical result.”

**Important disclaimer:**

- “The selected role is not real authentication or secure authorization.”

**Feedback to ask Skyler:**

- “What decisions, reasons, note requirements, and approval steps should an actual reviewer have?”

## 8. Show the Activity Log update

**Time:** 45 seconds  
**Page to open:** `/paired-testing-demo/audit`

**Action to perform:** Search for `PAIR-008`. Open the newest event details.

**Simple talking points:**

- “The review action added a timestamped demonstration event.”
- “Assignment creation, draft save, submission, and reviewer decisions also add local events.”
- “Many actions are not yet logged, and this data can be reset.”

**Important disclaimer:**

- “This is not immutable, tamper-proof, or a legal chain of custody.”

**Feedback to ask Skyler:**

- “Which actions must be recorded, and what correction or retention rules are required?”

## 9. Show Reports and printable output

**Time:** 60 seconds  
**Page to open:** `/paired-testing-demo/reports`

**Action to perform:** Point to current package counts. Optionally download the Accepted Pair CSV or JSON Package Manifest. Open **Preview Summary Report**, then show **Print / Save PDF**.

**Simple talking points:**

- “The direct download buttons create files from current browser state.”
- “The printable report updates its pair and review counts from current state.”
- “This demonstrates possible organization, not an approved expert or legal report.”

**Important implementation disclosure:**

- “The Generate Demo Package button currently shows a confirmation message only. It does not create a saved package or ZIP.”

**Feedback to ask Skyler:**

- “Which outputs are actually needed—tables, raw data, evidence inventory, exhibits, or a narrative report?”

## 10. End with limitations and discovery questions

**Time:** 60 seconds  
**Page:** Reports or return to Overview.

**Action to perform:** Point to the persistent synthetic disclaimer.

**Simple talking points:**

- “The prototype is useful because it makes assumptions visible.”
- “It has no real accounts, database, evidence storage, secure permissions, chain of custody, rideshare integration, statistical methodology, or legal conclusions.”
- “The next step should be expert discovery and a revised synthetic demonstration—not a production build.”

**Important disclaimer:**

- Do not describe the prototype as production-ready, court-ready, scientifically validated, or expert-approved.

**Feedback to ask Skyler:**

- “Could we review this with your dad specifically to identify the wrong assumptions, the minimum useful workflow, and the evidence and outputs he actually needs?”

## After the meeting

- Record answers in `docs/EXPERT-DISCOVERY-QUESTIONS.md`.
- Separate confirmed requirements from open questions.
- Use **Reset Demo Data** if you want to restore PAIR-008 to Pending and remove the local assignment/event changes.
- Remember that Reset does not directly clear local file objects in an already-open tester component; navigation or refresh does.
> **Archived prototype reference:** This script describes the former fixture/Zustand demonstration and is not an acceptance guide for the current database-backed application. Use [ACCEPTANCE_QA.md](./ACCEPTANCE_QA.md) for current verification.
