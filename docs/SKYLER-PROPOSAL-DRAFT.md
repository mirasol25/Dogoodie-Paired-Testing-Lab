# DoGoodie Paired Testing Lab

> **Phase 0 update:** This proposal predates the Supabase foundation. Internal authentication, database roles, study membership, RLS, and private Storage policies now exist as foundation code, while all workflow records and evidence interactions described here remain synthetic and local until the builder phases migrate them.

## Preliminary Product Concept and Prototype Proposal

**Status:** Draft for discussion  
**Current basis:** Synthetic front-end prototype  
**Purpose:** Expert discovery and workflow validation  

> This proposal describes a preliminary product concept. It is not a final product specification, approved testing methodology, expert opinion, legal conclusion, forensic procedure, or commitment to build a production system.

## 1. Executive Summary

The DoGoodie Paired Testing Lab is a proposed workspace for organizing paired controlled pricing studies. The concept is intended to help testing coordinators prepare consistent instructions, collect two related tester observations, check whether important technical conditions were sufficiently similar, present the observations side by side for expert review, and prepare organized descriptive exports.

A working synthetic prototype now demonstrates this concept. It includes an overview, study dashboard, protocol summary, assignment list, tester workflow, matched-pair review, evidence inventory, demonstration activity log, local exports, and printable report.

The prototype is deliberately limited. It has no real user accounts, database, evidence upload, rideshare integration, trusted GPS or device collection, immutable audit system, cryptographic signing, statistical inference, or legal conclusions. Its study design, thresholds, fields, evidence requirements, review workflow, and terminology have not been approved by the intended expert witness.

The recommended use of the prototype is as a visual discovery tool. It should help the project team and intended expert identify which assumptions are correct, which are wrong, and what a useful first version would actually require.

## 2. Background and Opportunity

The concept assumes that paired testing may currently involve a largely manual workflow:

- Coordinating two testers through messages, calls, or shared instructions
- Asking both testers to request a quote at nearly the same time
- Capturing screenshots, recordings, timestamps, locations, and device information
- Naming and transferring files
- Matching two submissions in a spreadsheet
- Checking whether route, timing, account, app, and device conditions were comparable
- Recording why an observation was included, flagged, or excluded
- Preparing organized tables and supporting records for an expert or law firm

That assumption requires confirmation.

If the assumption is directionally correct, fragmented tools may create avoidable work. Instructions can drift, files can be inconsistently labeled, paired submissions can be difficult to reconcile, and reviewer decisions can become separated from the underlying records.

The opportunity is not to automate legal or scientific judgment. The opportunity is to provide a clearer and more consistent operational workspace around an expert-approved methodology.

## 3. Proposed Solution

The proposed platform would guide a study through a structured sequence:

1. Define the study question and protocol.
2. Create a paired assignment for two testers.
3. Give both testers matching instructions.
4. Coordinate the request timing.
5. Collect each displayed price and required context.
6. Link the two submissions into a matched pair.
7. Apply expert-approved technical checks.
8. Present both observations and exceptions side by side.
9. Allow an authorized expert to accept, flag, reject, or defer the pair.
10. Produce approved tables, inventories, manifests, and reports.

The system would organize records and apply defined checks. It would not independently determine discrimination, intent, causation, liability, statistical significance, or admissibility.

## 4. Intended Users

### Test Coordinator

Prepares assignments, schedules paired testing, monitors progress, resolves missing information, and organizes records for review.

### Tester

Receives an assigned procedure, confirms readiness, performs the approved test, captures the displayed quote and required evidence, and submits the observation.

### Expert Reviewer

Compares the paired observations, reviews technical conformity and evidence, records notes, and makes an inclusion, follow-up, or exclusion decision.

### Law-Firm Viewer

Reviews study context, approved or review-ready observations, descriptive summaries, and authorized outputs without changing tester or reviewer records.

The current prototype displays these viewpoints but does not securely authenticate users or enforce production permissions.

## 5. Proposed End-to-End Workflow

### Step 1: Prepare study and protocol

The coordinator and qualified experts define the actual research question, controlled conditions, isolated variable, required evidence, thresholds, exclusions, and terminology.

### Step 2: Create paired assignment

The coordinator selects two appropriate testers and sets the platform, route, ride tier, time window, and account-profile difference.

### Step 3: Deliver matching instructions

Each tester receives the approved procedure and sees only the assignment relevant to that person.

### Step 4: Confirm readiness and coordinate timing

Both testers confirm required account, app, route, evidence, and device conditions. The approved coordination method provides the request cue.

### Step 5: Capture both observations

Each tester records the displayed quote, exact time, required location/device/app context, notes, and approved evidence.

### Step 6: Match the submissions

The system links both tester responses to one assignment and one pair.

### Step 7: Apply technical validation

The system checks only the rules approved for the study. It identifies matches, warnings, failures, and missing information.

### Step 8: Conduct expert review

An authorized reviewer examines the quotes, conditions, evidence, warnings, and explanations before making a decision.

### Step 9: Record the decision and history

The system records the decision, reason, notes, reviewer identity, and relevant activity.

### Step 10: Prepare outputs

Authorized users generate approved descriptive tables, evidence inventories, activity records, manifests, and reports.

## 6. Current Prototype Modules

### Overview

Introduces the concept, active synthetic study, workflow, value areas, disclaimers, and links to the main demonstration.

### Dashboard

Displays target progress, technical-status counts, review-status counts, descriptive variance metrics, four charts, and a searchable pair queue.

### Protocol

Shows a preliminary study question, fixed controls, isolated variable, evidence expectations, thresholds, exclusions, and synthetic version history.

### Assignments

Lists twelve fixture assignments and allows a local demonstration assignment to be added with sequential identifiers.

### Tester Submission

Demonstrates a readiness checklist, 3–2–1 request cue, structured metadata form, local screenshot/recording selection, draft save, and local submission.

### Matched Pair Comparison

Presents the strongest prototype screen: two tester observations, calculated variance, time and location differences, rule-by-rule checks, evidence metadata, interpretation warning, and reviewer actions.

### Evidence Repository

Inventories synthetic screenshot, recording, and metadata records and provides a details drawer.

### Demonstration Activity Log

Shows fixture events plus selected local assignment, submission, draft, and reviewer actions.

### Reports and Exports

Generates local pair, accepted, excluded, evidence, activity, and JSON manifest downloads and provides a browser-printable report.

## 7. Key Prototype Capabilities

### Functional locally

- Responsive navigation and screen layouts
- Persistent role viewpoint
- Dashboard calculations and charts
- Pair search, filter, sort, and navigation
- Local assignment creation
- Tester checklist, countdown, form validation, and local draft/submission
- Price, time, and GPS calculations
- Technical validation engine
- Reviewer accept, flag, reject, clear, reason, and notes
- Immediate review-count and report updates
- Demonstration activity-event additions for selected actions
- CSV and JSON downloads
- Browser printing and PDF preparation
- Reset to original synthetic state

### Simulated or partially connected

- All initial study, tester, price, evidence, decision, and activity data
- User roles and permissions
- Tester identity and assignment delivery
- Synchronized request process
- GPS, device, app, and network capture
- Evidence files, hashes, integrity, and event counts
- Protocol approval and versioning
- Evidence package framing
- Tester submission-to-pair matching
- Automatic revalidation after tester submission

### Not yet implemented

- Authentication and production authorization
- Database and secure evidence storage
- Real file upload and verified hashing
- Rideshare integration or automated requests
- Trusted location or device collection
- Multi-user coordination
- Immutable activity/audit architecture
- Cryptographic signatures
- Production chain of custody
- Statistical methodology or inferential analysis
- Legal conclusions or admissibility determination
- Law-firm tenancy
- Billing, licensing, onboarding, or support operations

## 8. Preliminary Validation Framework

The current prototype demonstrates the following unapproved rules.

### Request timing

- Five seconds or less: pass
- More than five and up to ten seconds: warning
- More than ten seconds: fail

### Tester proximity

- Five feet or less: pass
- More than five and up to fifteen feet: warning
- More than fifteen feet: fail

### Matching conditions

The current engine expects the same:

- Fictional platform
- Pickup
- Destination
- Ride tier
- Currency
- Operating-system family
- Application version

### Evidence completeness

The current engine expects a screenshot, screen recording, and metadata record for both testers.

A missing tester or required evidence produces an incomplete pair. A required mismatch or threshold failure produces an invalid pair. A warning without failure produces a warning pair. A complete pair with no warnings or failures is technically valid.

These rules are examples only. They should be replaced or removed based on expert direction.

## 9. Example Matched Pair

PAIR-008 compares two synthetic profiles:

- Tester Alpha: standard non-member account, displayed quote $47.80
- Tester Bravo: subscription-member account, displayed quote $64.05

The absolute difference is $16.25. The prototype expresses that as 34.00% relative to the lower quote. The request-time difference is 3.2 seconds, and the calculated distance between the entered coordinates is approximately 3.8 feet.

The fixture records match on platform, route, ride tier, currency, operating-system family, and application version, and they include the required synthetic evidence metadata. The technical result is therefore Valid under the demonstration rules.

The expert status remains Pending. This distinction is important: passing technical checks does not make the observation accepted, and neither status establishes unlawful discrimination.

## 10. Potential Value

### Testing coordinators

- Clearer assignment and readiness process
- More consistent data collection
- Less manual pair reconciliation
- Faster identification of missing information

### Expert witnesses

- Side-by-side presentation of controls and exceptions
- Explicit rule explanations
- Structured notes and decisions
- Easier review of synthetic package concepts

### Law firms

- Clear study context and limitations
- Organized descriptive tables and inventories
- Readable package preview
- Better visibility into how inclusion decisions were made

### Product demonstrations

- Concrete basis for expert discovery
- Faster discussion than a written requirements list alone
- Clear separation between technical checks and interpretation

### Future consulting services

If methodology and demand are validated, the workflow could support structured study operations and reporting services. No commercial demand, cost saving, legal outcome, or admissibility benefit should be assumed at this stage.

## 11. Current Limitations

- All records and results are synthetic.
- The methodology has not been approved.
- The prototype has no real users or secure permissions.
- Data exists in one browser, not a shared database.
- Selected files are not uploaded or retained.
- Synthetic hashes are not cryptographic verification.
- New assignments do not create new matched-pair records.
- Local tester submissions do not automatically update or validate a pair.
- The activity log is incomplete and can be reset.
- Report package metadata is partly fixed.
- The current completion metric excludes incomplete pairs, while submitted count includes them.
- The variance chart includes the incomplete pair in its zero-variance bin.
- No production privacy, security, retention, backup, or incident procedures exist.
- No statistical or legal conclusion is implemented.

## 12. Information Required From the Expert Witness

### Testing objective

- What exact question should the study answer?
- What comparison types are valid or useful?
- What conclusions must the system explicitly avoid?

### Current workflow

- How are tests coordinated today?
- Where do delays, errors, or rework occur?
- Who creates assignments and resolves exceptions?

### Required controls

- Which conditions must match exactly?
- Which conditions have tolerances?
- Which differences require warning versus exclusion?

### Evidence

- Which evidence is mandatory?
- Must a screenshot, recording, or both be captured?
- What metadata must be captured automatically or manually?
- What provenance, hashing, retention, or chain-of-custody process is required?

### Reviewer process

- Who can review?
- What decisions and reason codes are needed?
- Can decisions be corrected, and how should corrections be recorded?

### Exclusion criteria

- What automatically makes a pair unusable?
- Can an expert override a technical warning or failure?

### Outputs

- Which tables, manifests, reports, exhibits, or data files are required?
- Who receives them and in what format?

### Roles

- Which users need access, and what may each role see or change?

### Security and retention

- What information is sensitive?
- How long must data and evidence be retained?
- Are client-specific or matter-specific workspaces required?

### Statistical methodology

- What sample design and descriptive or inferential analysis is appropriate?
- Which calculations should be excluded until a statistician approves them?

### Legal terminology

- Which words are accurate and defensible?
- Which claims, labels, or disclaimers are required?

## 13. Recommended Development Phases

### Phase 0: Expert Discovery and Workflow Validation

- Review the current synthetic prototype.
- Confirm the real testing objective.
- Map the actual manual process.
- Identify the prototype’s incorrect assumptions.
- Approve terminology.
- Confirm required evidence, controls, exclusions, and outputs.
- Define what must change before any pilot.

### Phase 1: Revised Demonstration

- Update the workflow based on expert feedback.
- Correct fields, controls, roles, statuses, and reports.
- Connect assignments, submissions, matching, and validation inside the demonstration.
- Continue using synthetic data.
- Review again with the intended users.

### Phase 2: Small Functional Pilot

- Add secure accounts.
- Add controlled database and file storage.
- Add real workflow permissions.
- Implement the approved data and evidence model.
- Conduct limited approved testing.
- Treat the result as a pilot, not full production.

### Phase 3: Paid or Authorized Pilot

- Use with approved users and a defined study scope.
- Establish privacy, consent, retention, security, and evidence procedures.
- Add operational monitoring and support.
- Collect structured user and expert feedback.
- Evaluate product value and business model.

### Phase 4: Production MVP

- Multi-user study workspace
- Secure storage and backups
- Production permissions
- Approved evidence handling
- Comprehensive audit architecture
- Approved reports and exports
- Privacy and retention controls
- Operational support and incident response

### Phase 5: Law-Firm Productization

- Multi-tenant client or matter workspaces
- Client onboarding and administration
- Subscription or licensing model
- Support, service levels, and compliance
- Only after legal, business, methodology, and product-market validation

## 14. Risks and Open Questions

### Unverified methodology

The central study design and thresholds may be wrong or incomplete.

### Evidence admissibility

Admissibility depends on law, process, authentication, methodology, expert testimony, and case context. Software alone cannot guarantee it.

### Privacy

Real account, location, device, and evidence data may be sensitive.

### Platform terms

Any testing or integration must be reviewed against applicable platform terms, permissions, and law.

### Data collection permissions

Location, device, recording, and account collection may require notice, consent, or restrictions.

### Tester reliability

Human readiness, timing, and evidence capture need operational procedures and training.

### Statistical design

Sample size, independence, repeated observations, confounders, and analytical methods require qualified statistical review.

### Security

Production use would require authentication, authorization, encryption, monitoring, vulnerability management, backup, and incident response.

### Chain of custody

The current prototype provides no forensic custody guarantees.

### Retention

Retention, deletion, legal hold, correction, and export policies are undefined.

### Product-market validation

The prototype has not established willingness to pay, workflow fit, savings, or demand.

## 15. Proposed Next Step

**Review the current synthetic prototype with the intended expert witness and use it as a visual discovery tool before beginning any production build.**

The immediate objective should be to produce a validated workflow and assumption list—not to add production infrastructure to an unvalidated methodology.
> **Archived proposal draft:** This document predates the current database-backed workflow and directional fare formula. It is retained only as historical discovery material and must not be used as implementation or acceptance criteria.
