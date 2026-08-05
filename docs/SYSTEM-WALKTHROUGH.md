# DoGoodie Paired Testing Lab: System Walkthrough

This document explains the application as it is currently implemented. It is written for a project manager with an IT background, not for a software developer. File and function references are included so that each statement can be traced to the source.

> **Phase 0 update:** This walkthrough primarily documents the original fixture/Zustand prototype. Supabase authentication, database roles, study membership, RLS, and a private Storage foundation now wrap that prototype. The old role switcher is hidden and no longer describes authorization. See `AUTH_DATABASE_FOUNDATION.md` and `SUPABASE_SETUP.md` for the current security architecture and setup.

> **Prototype boundary:** Everything in the initial study is synthetic. The current rules, evidence requirements, workflow, roles, and legal terminology are preliminary assumptions. The application does not prove discrimination, causation, liability, scientific validity, or legal admissibility.

## Part 1: Beginner-Friendly System Explanation

### A. The system in one sentence

The DoGoodie Paired Testing Lab is a browser-based demonstration of how two synthetic rideshare price observations could be coordinated, checked for technical similarity, compared side by side, reviewed by an expert, and organized into reports.

The product identity, study assumptions, labels, thresholds, and disclaimers are centralized in `src/config/paired-testing-demo.config.ts` as `demoConfig`.

### B. The problem it is trying to solve

A paired pricing study may otherwise be managed through messages, phone calls, screenshots, recordings, and spreadsheets:

- A coordinator tells two testers where and when to request a quote.
- The testers coordinate a countdown through chat or a call.
- Each tester captures a price, screenshot, recording, timestamp, and device details.
- Someone later tries to match the two records.
- An expert checks whether the route, ride type, request time, device conditions, and evidence were sufficiently similar.
- A law firm or reviewer needs an understandable package rather than a folder of disconnected files.

That manual process may become difficult because records can be mislabeled, testers can follow slightly different instructions, timestamps and locations can be hard to compare, and reviewer decisions can be separated from the underlying evidence.

The prototype shows a possible structured alternative: one protocol, one assignment record, two submissions, one matched-pair comparison, a repeatable technical checklist, one review decision, and a set of exports.

This description is a product assumption, not a confirmed account of an expert witness’s current process. The assumption is documented in `ASSUMPTIONS.md`.

### C. What “paired controlled testing” means

Imagine two fictional people:

- **Tester A** uses a standard, non-member account.
- **Tester B** uses a subscription-member account.

They both open the same fictional platform, RideApp A. They use the same pickup point, the same destination, the same ride tier, the same currency, and nearly the same request time. The intentionally different characteristic is membership status.

Tester A sees $47.80. Tester B sees $64.05.

The two observations are treated as a pair because they are meant to represent the same test conditions except for the isolated account characteristic. The application checks whether the supposedly matched conditions really were close enough. It does not assume they were.

A price difference alone does not prove unlawful discrimination. Other explanations, repeated observations, a validated study design, statistical analysis, expert interpretation, and applicable law would all matter. The application repeats this boundary through `demoConfig.interpretationNote`.

### D. Who uses the system

#### 1. Test Coordinator

**Goal:** Organize the study and create paired assignments.

**Likely pages:** Overview, Dashboard, Protocol, Assignments, Evidence, Activity Log, and Reports.

**Actual available actions:** Can view every route, create local demonstration assignments, use the tester workflow, search and filter records, download exports, and view reports. The role name itself does not enforce security.

**Actual restrictions:** Cannot edit expert decisions because the reviewer panel only enables editing when the selected role is `expert_reviewer`.

#### 2. Tester

**Goal:** Follow instructions and submit one synthetic quote observation.

**Likely page:** Tester Submission.

**Actual available actions:** Can view every route, complete the fixed PAIR-008 checklist, run the countdown, enter form values, select local files, save a draft, and submit a local response. The Tester role can also create assignments because the current assignment page hides that action only from the Law-Firm Viewer.

**Actual restrictions:** Cannot edit expert decisions.

#### 3. Expert Reviewer

**Goal:** Inspect a matched pair and record a review decision.

**Likely pages:** Dashboard, Matched Pairs, pair comparison, Evidence, Activity Log, and Reports.

**Actual available actions:** Can use every visible feature. This is the only role that sees enabled Accept, Flag, Reject, and Clear controls on the matched-pair comparison.

**Actual restrictions:** None at the presentation level.

#### 4. Law-Firm Viewer

**Goal:** Review the study, results, accepted records, and package preview.

**Likely pages:** Overview, Dashboard, Protocol, Matched Pairs, Evidence, Activity Log, Reports, and Print Report.

**Actual available actions:** Can navigate every route, use searches and filters, run the tester workflow, download exports, and print reports.

**Actual restrictions:** The Create Demo Assignment action is replaced with “Read-only role,” and expert-review controls are read-only.

#### Important reality about roles

The role switcher is not authentication or authorization. Authentication means proving who a person is; authorization means securely enforcing what that person may do. Neither exists. The selected label only changes a small amount of interface behavior.

All navigation items remain visible to all roles. This behavior is in `RoleSwitcher()`, `Navigation()`, `AssignmentsClient()`, and `PairComparisonClient()`.

### E. The complete system flow

The following describes both the product concept and what the current prototype actually does.

1. **A study and protocol are prepared.**
   - **Who:** Conceptually, a coordinator and experts.
   - **Page:** Overview and Protocol.
   - **Input:** None through the current UI.
   - **System behavior:** Loads one fixed study and one fixed protocol from `src/data/paired-testing-demo.fixtures.ts`.
   - **Output:** Study context, controls, evidence requirements, thresholds, and version history.
   - **Status:** Synthetic fixture only; there is no study or protocol editor.

2. **A coordinator creates a paired assignment.**
   - **Who:** Intended for a coordinator; currently any role except Law-Firm Viewer can do it.
   - **Page:** `/paired-testing-demo/assignments`.
   - **Input:** Two testers, date, time window, platform, route, ride tier, and isolated variable.
   - **System behavior:** `createDemoAssignment()` adds one assignment to Zustand state and adds an activity event.
   - **Output:** A sequential ID such as `ASN-013` and reserved pair ID `PAIR-013`.
   - **Status:** Fully functional locally, but it does not create a `TestPair`, submissions, or evidence records.

3. **Tester A and Tester B receive matching instructions.**
   - **Who:** Conceptually, the two testers.
   - **Page:** Tester Submission.
   - **Input:** None dynamically.
   - **System behavior:** The page always loads fixture assignment `assignmentsFixture[7]`, which is ASN-008 / PAIR-008, and always uses Tester Alpha.
   - **Output:** A fixed assignment header and checklist.
   - **Status:** Simulated; no assignment selection, invitation, account, or real delivery exists.

4. **A tester performs a simulated synchronized test.**
   - **Who:** The person using the browser.
   - **Page:** Tester Submission.
   - **Input:** Eight checklist confirmations.
   - **System behavior:** When all boxes are checked, the button starts a local 3–2–1 countdown using browser timers.
   - **Output:** The quote-entry form.
   - **Status:** Functional demonstration. No rideshare platform is contacted, and readiness/countdown actions do not create activity events.

5. **The tester submits a price and supporting information.**
   - **Who:** The browser user.
   - **Page:** Tester Submission.
   - **Input:** Price, timestamp, coordinates, device/app/network data, profile, route, notes, screenshot selection, and recording selection.
   - **System behavior:** Zod validates the fields. `submitTesterResponse()` adds `SUB-A-LOCAL-001`, marks ASN-008 `awaiting_partner`, and adds a “Submission completed” activity event.
   - **Output:** A submitted confirmation.
   - **Status:** Functional locally, with major limitations: file contents are not stored, no evidence records are created, the existing PAIR-008 still points to `SUB-A-008`, and validation is not rerun.

6. **The system matches two submissions.**
   - **Who:** Conceptually automatic.
   - **Page:** Matched Pairs.
   - **Input:** The initial fixture submissions.
   - **System behavior:** Initial pairs are constructed when the fixture module loads. `pairsFixture` looks up Tester A and Tester B fixture submissions by assignment and calls `validatePair()`.
   - **Output:** Twelve prebuilt matched-pair records.
   - **Status:** Synthetic fixture generation only. Newly entered submissions are not automatically matched into new or existing pairs.

7. **The validation engine checks similarity.**
   - **Who:** Automatic during fixture creation.
   - **Page:** Results appear on Dashboard, Matched Pairs, and pair comparison.
   - **Input:** Two fixture submissions plus fixture evidence records.
   - **System behavior:** `validatePair()` checks exact matches, timing, GPS proximity, and evidence presence.
   - **Output:** Rule-by-rule results and overall status: valid, warning, invalid, or incomplete.
   - **Status:** The calculation engine is functional and tested, but the live tester submission workflow does not call it.

8. **The pair receives an overall status.**
   - **Who:** Automatic.
   - **Output:** `valid`, `warning`, `invalid`, or `incomplete`.
   - **Status:** Functional for fixture creation and direct code use.

9. **An expert reviewer inspects the pair.**
   - **Who:** A browser user viewing as Expert Reviewer.
   - **Page:** `/paired-testing-demo/pairs/[pairId]`.
   - **Input:** A decision reason and optional note.
   - **System behavior:** Displays current store data side by side.
   - **Output:** A review decision.
   - **Status:** Fully functional locally for existing pair records.

10. **The expert accepts, flags, rejects, or clears the pair.**
    - **Who:** Expert Reviewer role only.
    - **System behavior:** `acceptPair()`, `flagPair()`, `rejectPair()`, or `clearPairDecision()` calls `updateDecision()`.
    - **Output:** Updated pair status, reviewer decision, optional appended note, current timestamp, and a new activity event.
    - **Status:** Fully functional locally and persisted in browser storage.

11. **The decision updates the dashboard and activity log.**
    - **Who:** Automatic React state update.
    - **System behavior:** Pages read the same Zustand state, so they update without reload.
    - **Output:** New review counts, list badges, report inclusion counts, and an activity event.
    - **Status:** Fully functional locally.

12. **Reports and exports use current demonstration state.**
    - **Who:** Any role.
    - **Page:** Reports and Print Report.
    - **System behavior:** CSV and JSON functions transform current state into browser downloads. The print page reads current pairs, submissions, and evidence.
    - **Output:** CSV, JSON, or browser print/PDF.
    - **Status:** Functional local exports. The “Generate Demo Package” button itself only shows a toast and does not save or download a package.

### F. Simple visual flow

```text
[Test Coordinator]
        ↓
[Study and Protocol]
        ↓
[Paired Assignment]
        ↓
[Tester A] + [Tester B]
        ↓
[Matched Submissions]
        ↓
[Technical Validation]
        ↓
[Expert Review]
        ↓
[Reports / Law-Firm Viewer]
```

This is the intended product flow. In the current prototype, the middle of this flow is not fully connected: assignments can be added and a local tester response can be added, but new submissions are not automatically paired or revalidated.

## Part 2: Data Throughout the System

### Plain-language relationship

One study has one displayed protocol. The study contains assignments. Each assignment is intended for two testers. Each tester may create a submission. Two submissions form a matched pair. A pair contains multiple validation results and may receive one current reviewer decision plus a list of notes. User actions may create activity events. Current in-browser state is used for tables, metrics, reports, and exports.

### Data inventory

| Data type | Meaning and users | Definition and storage | Pages and changes | Persistence and reality |
| --- | --- | --- | --- | --- |
| Study | The overall research project, route, period, target, platform, and isolated variable. Used by everyone. | `Study` in `src/types/paired-testing-demo.types.ts`; initial `studyFixture` in the fixture file; loaded into Zustand as `studies`. | Displayed across Overview, Dashboard, Protocol, shell, Reports, and Print. No UI changes it. | Fixture data; study is not included in the persisted subset, so it always reloads from source. |
| Protocol | The study question, controls, evidence expectations, exclusions, and version history. | `Protocol` type and `protocolFixture`. It is not in Zustand. | Displayed by `ProtocolClient`; downloadable as text. No editor exists. | Synthetic fixture only; never changes in the browser. |
| Tester Profile | A synthetic tester alias and assumed account/device configuration. | `TesterProfile` and `testerProfilesFixture`. Not in Zustand. | Used in Assignments, assignment creation options, and the fixed submission page. | Synthetic fixture only. |
| Assignment | Instructions pairing two testers with a date, window, platform, route, tier, and variable. | `TestAssignment`; fixture assignments and locally created assignments in Zustand `assignments`. | Assignments page displays and creates them. Save Draft and Submit change ASN-008 status. | Fixture or locally entered. Persisted after refresh. |
| Submission | One tester’s quote, time, coordinates, device/app data, profile, notes, and evidence-ID labels. | `TestSubmission`; fixture submissions plus `SUB-A-LOCAL-001` in Zustand `submissions`. | Displayed in tables and pair comparison when a pair points to it. Tester Submit adds a local record. | Fixture or locally entered; persisted. Actual file data is not included. |
| Evidence Record | Metadata describing a screenshot, recording, or metadata file. | `EvidenceFile`; `evidenceFixture`; Zustand `evidence`. | Evidence Repository, comparison cards, exports, and reports. No UI creates or edits these records. | Synthetic fixture only, persisted unchanged. |
| Matched Pair | The link between two submissions, calculated variance, validation status, evidence status, and review state. | `TestPair`; `pairsFixture`; Zustand `pairs`. | Dashboard, lists, comparison, reports, exports. Reviewer actions change review fields. | Synthetic fixture plus local review edits; persisted. No new pair is created from a new assignment. |
| Validation Result | One checklist result, such as same platform or timestamp gap. | `ValidationResult`; created by `validatePair()`. Stored inside each pair. | Comparison matrix. No UI edits it. | Calculated from fixtures at module load, then persisted inside pair state. It is not recalculated after local form submission. |
| Reviewer Decision | The current pending/accepted/flagged/rejected state, reason, note, and time. | `ReviewerDecision`, stored inside `TestPair`. | Comparison panel, tables, dashboard, reports. Reviewer buttons call store actions. | Fixture or locally entered; persisted. |
| Activity Event | A timestamped statement that something happened in the demo. | `AuditEvent`; fixture events and store-created events in `auditEvents`. | Overview, Activity Log, activity export. Assignment creation, draft save, submit, and review decisions add events. | Fixture or locally generated; persisted. Not immutable. |
| Report Manifest | A package summary: study, generation time, included/excluded counts, evidence count, reports, and disclaimer. | `ReportManifest`; fixed `reportManifestFixture`; dynamic `createManifest()`. | Reports package summary, JSON download, and print report. | Fixed fixture in some displays; dynamically generated JSON on download. Not stored as a package record. |

### Five storage concepts in plain language

#### Fixture data

A fixture is a prepared example record included with the application. It makes the demo predictable. Fixtures provide the initial study, protocol, eight testers, twelve assignments, 23 submissions, 68 evidence records, twelve pairs, decisions, and events. Project managers normally change these only when revising the demonstration scenario.

#### Zustand state

Zustand is the application’s shared in-browser working memory. It lets Dashboard, Matched Pairs, Reports, and other pages see the same current data without a server. A project manager does not need to understand the library during normal use; the important point is that changes are local to that browser.

#### localStorage persistence

`localStorage` is a small browser-owned storage area. The store persists role, assignments, submissions, pairs, evidence metadata, events, tester draft, and ID counter under `dogoodie-paired-testing-demo`. Refreshing the browser restores those values after client hydration.

Hydration means the browser connects the interactive application to the initial page. `useHydrated()` waits until the browser is available before reading `localStorage`, avoiding server/browser mismatch. This is an implementation safety detail, not a project-management workflow.

Search text and filters are not in the persisted subset, so they reset after a fresh load.

#### Locally selected files

Screenshot and recording `File` objects live only in `SubmissionClient` component memory. The UI shows name, MIME type, and size. It does not upload, persist, hash, preview, or create an `EvidenceFile` record for them. Navigating away or refreshing loses them.

#### Exported CSV or JSON files

Exports are new files created by the browser from current state. They are snapshots, not live links. Changing the app later does not update an already-downloaded file.

### What happens after common actions

- **Browser refresh:** Persisted state returns after hydration. Checklist state, countdown stage, locally selected files, evidence drawer selection, and local search terms do not return.
- **Reset Demo Data:** Restores original studies, assignments, submissions, pairs, evidence, events, role, filters, counter, and draft in Zustand. It does not directly clear component-local checklist/file/form state on an already-open Tester Submission page; navigation or refresh clears that local component state.
- **Create assignment:** Adds `ASN-013` or the next sequential ID, reserves matching `PAIR-013`, increments the counter, and adds an event. It does not create a pair object.
- **Save tester draft:** Stores one global draft object, marks ASN-008 `draft`, updates its timestamp, and adds an event. Returning to the form does not populate values from the saved draft; the presence of any draft only changes the displayed status text to “Draft saved.”
- **Submit tester response:** Adds or replaces `SUB-A-LOCAL-001`, marks ASN-008 `awaiting_partner`, marks Tester A submitted, and adds an event. It does not create evidence records, update pair pointers, match the fixture partner, or rerun validation.
- **Accept pair:** Sets review status to accepted, records reason/note/time, appends a non-empty note, and adds a review event. Dashboard and reports update.
- **Flag pair:** Same mechanism, with flagged status.
- **Reject pair:** Same mechanism, with rejected status; the pair enters excluded report selections.
- **Clear decision:** Returns the status to pending and adds a “Pair decision cleared” event. Existing reviewer notes remain in the notes list.

## Part 3: Page-by-Page Walkthrough

## Root Redirect

**Route:** `/`  
**Primary purpose:** Send visitors to the prototype overview.  
**Primary user roles:** All.  
**What the user sees:** No independent page; Next.js issues a redirect.  
**Main components:** `Home()` in `src/app/page.tsx`.  
**Available actions:** None.  
**Information entering the page:** URL request.  
**Information produced or changed:** None.  
**What happens after an action:** Browser loads `/paired-testing-demo`.  
**Where the data comes from:** No data.  
**What is functional:** Redirect.  
**What is simulated:** Nothing.  
**What is read-only:** Everything.  
**What is not yet implemented:** A separate public landing route.  
**Important source files:** `src/app/page.tsx`.  
**What I may eventually need to modify after expert feedback:** Whether the product should have a public landing page or open directly to an authenticated workspace.

## Product Overview

**Route:** `/paired-testing-demo`  
**Primary purpose:** Explain the concept and lead into the workflow.  
**Primary user roles:** All.  
**What the user sees:** Product name, prototype/synthetic labels, disclaimer, active-study card, target/submitted/valid/pending metrics, last event, value cards, workflow, and exclusions.  
**Main components:** `OverviewClient`, `DisclaimerAlert`, `StatusBadge`, `Progress`.  
**Available actions:** Open Dashboard, PAIR-008, Tester Submission, Protocol, or Activity Log.  
**Information entering the page:** Current `pairs` and `auditEvents` from Zustand.  
**Information produced or changed:** None.  
**What happens after an action:** Navigation only.  
**Where the data comes from:** `demoConfig`, fixtures, and current store.  
**What is functional:** Links and current metrics/event display.  
**What is simulated:** Study and activity content.  
**What is read-only:** All content.  
**What is not yet implemented:** Study creation, onboarding, or role-specific overview.  
**Important source files:** `src/components/paired-testing/overview/overview-client.tsx`; dashboard metrics utility.  
**What I may eventually need to modify after expert feedback:** Product positioning, terminology, study summary, target, and which workflow steps should be emphasized.

## Study Dashboard

**Route:** `/paired-testing-demo/dashboard`  
**Primary purpose:** Summarize technical and review status and provide the pair queue.  
**Primary user roles:** Coordinator, Expert Reviewer, Law-Firm Viewer; currently available to all.  
**What the user sees:** Eight metric cards, progress, four chart areas, disclaimer, and pair table.  
**Main components:** `DashboardClient`, `MetricCard`, Recharts components, `PairTable`.  
**Available actions:** Search, filter, sort, and open a pair.  
**Information entering the page:** Current pairs and submissions.  
**Information produced or changed:** Search/filter state only; no study data is edited.  
**What happens after an action:** Table updates immediately or navigates to comparison.  
**Where the data comes from:** Zustand, with calculations from `calculateDashboardMetrics()`.  
**What is functional:** Metrics, charts, search, filter, sort, and navigation.  
**What is simulated:** All underlying study observations.  
**What is read-only:** Metrics and charts.  
**What is not yet implemented:** Server queries, saved filters, drill-down chart interactions, real-time collection updates, or date/status configuration.  
**Important source files:** Dashboard client, pair table, `dashboard-metrics.ts`.  
**What I may eventually need to modify after expert feedback:** Metric definitions, completion denominator, chart bins, inclusion rules, and terminology.

## Testing Protocol

**Route:** `/paired-testing-demo/protocol`  
**Primary purpose:** Display the current demonstration methodology and its history.  
**Primary user roles:** All.  
**What the user sees:** Expandable study question, controls, isolated variable, evidence list, thresholds, exclusions, version history, disclaimer, and interpretation boundary.  
**Main components:** `ProtocolClient`, Radix Accordion, version table.  
**Available actions:** Expand/collapse, Print Protocol, Download Summary.  
**Information entering the page:** `protocolFixture` and `demoConfig`.  
**Information produced or changed:** Local TXT download or browser print only.  
**What happens after an action:** Download creates a short text summary; print opens browser printing.  
**Where the data comes from:** Fixtures/config, not Zustand.  
**What is functional:** Accordion, printing, text download.  
**What is simulated:** Protocol content and version history.  
**What is read-only:** Protocol.  
**What is not yet implemented:** Create/edit/approve/publish version workflow or signed approval.  
**Important source files:** Protocol client, fixture file, config file.  
**What I may eventually need to modify after expert feedback:** The research question, controls, evidence, thresholds, exclusions, approvers, and version language.

## Assignments

**Route:** `/paired-testing-demo/assignments`  
**Primary purpose:** List paired testing instructions and create a local example.  
**Primary user roles:** Intended Coordinator; currently all except Law-Firm Viewer can create.  
**What the user sees:** Counts, searchable table, tester pair, schedule, route, status, tester states, and a simplified evidence badge.  
**Main components:** `AssignmentsClient`, `AssignmentDialog`, `assignmentSchema`.  
**Available actions:** Search and Create Demo Assignment.  
**Information entering the page:** Existing assignments plus form fields.  
**Information produced or changed:** New assignment, counter, and assignment activity event.  
**What happens after an action:** New row appears and survives refresh.  
**Where the data comes from:** Zustand assignments and fixture tester profiles.  
**What is functional:** Search, validation, sequential IDs, state update, event, toast.  
**What is simulated:** Schedule and synthetic testers.  
**What is read-only:** Existing rows cannot be opened, edited, cancelled, or reassigned.  
**What is not yet implemented:** Corresponding pair creation, invitation/delivery, overdue logic, workflow management, evidence calculation, or coordinator-only security.  
**Important source files:** Assignments client, store `createDemoAssignment()`, form schema.  
**What I may eventually need to modify after expert feedback:** Assignment fields, scheduling model, readiness states, permissions, and coordination method.

## Tester Submission

**Route:** `/paired-testing-demo/submission`  
**Primary purpose:** Demonstrate a mobile-friendly checklist, countdown, and quote form.  
**Primary user roles:** Tester; currently available to all.  
**What the user sees:** Fixed ASN-008 / PAIR-008 context for Tester Alpha, checklist, countdown, form, local file selectors, and confirmation.  
**Main components:** `SubmissionClient`, `FilePicker`, React Hook Form, `testerSubmissionSchema`.  
**Available actions:** Check items, start countdown, reset form, save draft, select files, submit.  
**Information entering the page:** Fixed fixture context and user-entered form values/files.  
**Information produced or changed:** Draft or `SUB-A-LOCAL-001`, ASN-008 state, and event.  
**What happens after an action:** Draft persists; submission persists; local files do not. No validation follows.  
**Where the data comes from:** Direct fixture indexes for context; Zustand for draft/submission changes.  
**What is functional:** Checklist gating, countdown, validation, local file requirement, save/submit state actions.  
**What is simulated:** Quote request, GPS, device metadata, evidence capture, and partner coordination.  
**What is read-only:** Assignment identity and tester identity are fixed.  
**What is not yet implemented:** Assignment selection, real sensor collection, actual file storage, evidence record creation, partner response, automatic pair matching, or validation rerun.  
**Important source files:** Submission client, form schema, store `saveTesterDraft()` and `submitTesterResponse()`.  
**What I may eventually need to modify after expert feedback:** Every field, capture sequence, evidence requirements, synchronization method, draft recovery, and status progression.

## Matched Pairs

**Route:** `/paired-testing-demo/pairs`  
**Primary purpose:** Provide the review queue of paired comparisons.  
**Primary user roles:** Coordinator, Expert Reviewer, Law-Firm Viewer; available to all.  
**What the user sees:** Disclaimer and reusable pair table.  
**Main components:** `PairTable`, `StatusBadge`.  
**Available actions:** Search, filter by technical or review status, sort, open pair.  
**Information entering the page:** Current pairs and submissions.  
**Information produced or changed:** Filter/search state only.  
**What happens after an action:** Rows update or comparison opens.  
**Where the data comes from:** Zustand.  
**What is functional:** Search, combined status filter, sort, navigation.  
**What is simulated:** All initial records.  
**What is read-only:** Pair technical data.  
**What is not yet implemented:** New-pair creation from new assignments, batch actions, pagination, independent technical/review filters, or server data.  
**Important source files:** Pairs route and shared pair table.  
**What I may eventually need to modify after expert feedback:** Columns, filter model, queue prioritization, and inclusion rules.

## Matched Pair Comparison

**Route:** `/paired-testing-demo/pairs/[pairId]`  
**Primary purpose:** Show one pair’s quotes, controls, evidence metadata, and expert decision.  
**Primary user roles:** Expert Reviewer; read-only for other roles.  
**What the user sees:** Status summary, variance hero, two quote cards, conformity matrix, evidence cards, interpretation note, reviewer panel, and pair navigation.  
**Main components:** `PairComparisonClient`, `QuoteCard`, `VarianceMetric`, `StatusBadge`.  
**Available actions:** Expert decisions; previous/next; return; open Activity Log.  
**Information entering the page:** URL pair ID, current pairs/submissions/evidence, selected reason/note.  
**Information produced or changed:** Review status, decision, notes, timestamp, and activity event.  
**What happens after an action:** All state-reading screens update immediately and state persists.  
**Where the data comes from:** Zustand plus config.  
**What is functional:** Pair lookup, side-by-side display, role-gated decisions, current-state updates.  
**What is simulated:** Evidence files/hashes, actors, and methodology.  
**What is read-only:** Technical results and submission values.  
**What is not yet implemented:** Technical revalidation, evidence preview content, independent note-save button, decision approval/signature, or actual audit filtering. The “Open Activity Log” link adds `?object=PAIR-xxx`, but `AuditClient` ignores that query parameter.  
**Important source files:** Dynamic route, comparison client, store `updateDecision()`.  
**What I may eventually need to modify after expert feedback:** Review reasons, permission model, note requirements, comparison layout, rule explanations, and decision consequences.

## Evidence Repository

**Route:** `/paired-testing-demo/evidence`  
**Primary purpose:** Inventory synthetic evidence metadata.  
**Primary user roles:** Coordinator, Expert Reviewer, Law-Firm Viewer; available to all.  
**What the user sees:** Counts, search/filter, evidence table, and metadata drawer.  
**Main components:** `EvidenceClient`, Radix Sheet, evidence table.  
**Available actions:** Search, filter, open/close details.  
**Information entering the page:** Current evidence array.  
**Information produced or changed:** UI selection and filter only.  
**What happens after an action:** List narrows or drawer opens.  
**Where the data comes from:** Fixture-derived evidence persisted in Zustand.  
**What is functional:** Inventory browsing and metadata detail.  
**What is simulated:** Filenames, sizes, hashes, integrity, review state, and event counts.  
**What is read-only:** All evidence data.  
**What is not yet implemented:** Actual file preview/download, upload, integrity verification, hash calculation, editing, or chain of custody.  
**Important source files:** Evidence client, fixture file, `formatFileSize()`.  
**What I may eventually need to modify after expert feedback:** Evidence types, metadata, integrity states, provenance, access, retention, and preview rules.

## Demonstration Activity Log

**Route:** `/paired-testing-demo/audit`  
**Primary purpose:** Show a chronological demonstration history.  
**Primary user roles:** Coordinator, Expert Reviewer, Law-Firm Viewer; available to all.  
**What the user sees:** Warning, search/filter, event table, and details drawer.  
**Main components:** `AuditClient`, Radix Sheet.  
**Available actions:** Search, filter, inspect event.  
**Information entering the page:** Current activity events.  
**Information produced or changed:** UI selection/filter only.  
**What happens after an action:** List filters or drawer opens.  
**Where the data comes from:** Fixture events plus selected store actions.  
**What is functional:** Event display, filtering, local event additions.  
**What is simulated:** Initial history, actor identities, and integrity indicator.  
**What is read-only:** Events cannot be edited through the UI.  
**What is not yet implemented:** Immutability, signatures, tamper detection, comprehensive event coverage, pair query filtering, or server timestamps.  
**Important source files:** Audit client, store actions, fixtures.  
**What I may eventually need to modify after expert feedback:** Event taxonomy, mandatory events, actor identity, correction policy, retention, and audit guarantees.

## Reports and Evidence Package Preview

**Route:** `/paired-testing-demo/reports`  
**Primary purpose:** Summarize the package and download current-state exports.  
**Primary user roles:** Expert Reviewer and Law-Firm Viewer; available to all.  
**What the user sees:** Output inventory, package counts, disclaimers, export buttons, and print link.  
**Main components:** `ReportsClient`, CSV utilities, manifest utilities.  
**Available actions:** Download pair/evidence/activity CSVs, JSON manifest, open print report, click Generate Demo Package.  
**Information entering the page:** Current pairs, evidence, and events.  
**Information produced or changed:** Browser downloads only.  
**What happens after an action:** Download buttons create a file. Generate Demo Package only displays a toast; it creates no stored package, event, or download.  
**Where the data comes from:** Zustand; package ID/title/filenames from config; fixed package ID from fixture.  
**What is functional:** Six direct downloads and print navigation.  
**What is simulated:** Package framing and report inventory.  
**What is read-only:** Package summary.  
**What is not yet implemented:** Saved package versions, ZIP, package history, signatures, attachments, or generation event.  
**Important source files:** Reports client, `csv-export.ts`, `manifest-export.ts`.  
**What I may eventually need to modify after expert feedback:** Included/excluded rules, columns, filenames, manifest schema, report inventory, and package workflow.

## Printable Report

**Route:** `/paired-testing-demo/reports/print`  
**Primary purpose:** Present a browser-printable study summary.  
**Primary user roles:** Expert Reviewer and Law-Firm Viewer; available to all.  
**What the user sees:** Cover, disclaimer, metrics, protocol metadata, included/excluded tables, PAIR-008, evidence summary, limitations, and manifest.  
**Main components:** `PrintReportClient`, `ReportSection`, `PairReportTable`, print CSS.  
**Available actions:** Return to Reports and Print / Save PDF.  
**Information entering the page:** Current pairs/submissions/evidence plus fixed protocol/manifest fixtures.  
**Information produced or changed:** Browser print/PDF only.  
**What happens after an action:** Browser print dialog opens.  
**Where the data comes from:** Mixed: current Zustand state for results and fixed `reportManifestFixture.generatedAt` for the displayed generated time.  
**What is functional:** Current-state tables/metrics and print CSS.  
**What is simulated:** Report language, package ID, fixed generated timestamp, and all study content.  
**What is read-only:** Entire report.  
**What is not yet implemented:** A saved report record, current generation timestamp, approved template, pagination guarantees, exhibits, or signatures.  
**Important source files:** Print report client and `src/app/globals.css`.  
**What I may eventually need to modify after expert feedback:** Report sections, inclusion criteria, terminology, approvals, page size, and manifest details.

## Part 4: Major Component Inventory

### Application shell

`AppShell` provides:

- Desktop fixed sidebar at 1024px and above.
- Mobile navigation sheet below 1024px.
- Product brand and study context.
- Shared navigation from `demoConfig.navigation`.
- Sticky page header with current page label.
- Prototype/version label, synthetic-data label, role switcher, and reset.

Every paired-testing route uses this shell through `src/app/paired-testing-demo/layout.tsx`.

The individual route files are mostly React Server Components: server-generated page wrappers. The interactive screen components contain `"use client"`, meaning they run in the browser. A project manager generally does not need to modify this boundary.

### Role switcher

`RoleSwitcher()` calls store action `setRole()`. The selection persists in `localStorage`.

Actual differences:

- Expert Reviewer can edit review decisions.
- Law-Firm Viewer cannot create assignments.
- Every role sees every navigation item.
- Tester, Coordinator, and Expert Reviewer can currently create assignments.
- Every role can access and operate the tester page and downloads.

Therefore this is a demonstration viewpoint, not access control.

### Dashboard metric cards

`calculateDashboardMetrics()` calculates:

- **Target pairs:** Fixed at 100 in config.
- **Submitted pairs:** `pairs.length`, initially 12.
- **Valid:** Pairs with technical status `valid`, initially 8.
- **Warning:** Technical status `warning`, initially 2.
- **Invalid:** Technical status `invalid`, initially 1.
- **Incomplete:** Technical status `incomplete`, initially 1.
- **Pending review:** Review status `pending`, initially 6.
- **Accepted:** Review status `accepted`, initially 4.
- **Flagged:** Review status `flagged`, initially 1.
- **Rejected:** Review status `rejected`, initially 1.
- **Completion percentage:** Non-incomplete pairs divided by target: 11 / 100 = 11%.
- **Validation rate:** Valid pairs divided by non-incomplete pairs: 8 / 11 = 72.7%.
- **Acceptance rate:** Accepted divided by accepted + flagged + rejected: 4 / 6 = 66.7%.
- **Average variance:** Mean percentage variance across 11 non-incomplete pairs: 10.45%.
- **Median variance:** Middle sorted percentage among 11 non-incomplete pairs: 8.94%.
- **Largest variance:** 34.00%.
- **Smallest variance:** 0.00%; calculated but not displayed as a dashboard card.
- **Evidence-complete rate:** Pairs whose `evidenceStatus` is exactly `complete`: 10 / 12 = 83.3%.

Submitted is not valid: submitted means a pair record exists; valid means its technical rules passed. Valid is not accepted: technical status and expert judgment are separate. Pending can include valid, warning, or incomplete pairs.

### Charts

1. **Study progress:** Shows 11% against the 100-pair target and the four technical counts.
2. **Technical-validation distribution:** Pie chart of valid/warning/invalid/incomplete.
3. **Expert-review distribution:** Bar chart of accepted/flagged/rejected/pending.
4. **Observed variance distribution:** Counts pairs in 0%, 0–5%, 5–15%, 15–30%, and >30% bins.

The variance chart includes all pairs, including the incomplete pair whose stored variance is zero. No chart proves statistical significance, causation, or discrimination.

### Pair table

Important columns:

- Pair and assignment IDs
- Fixture creation/test date
- Tester aliases
- Prices A and B
- Dollar and percentage variance
- Timestamp and GPS gaps
- Technical and review statuses
- Review navigation

Search covers pair ID, assignment ID, tester aliases, and platform. One combined filter matches either technical status or review status. Sort supports newest, oldest, variance, timestamp, and GPS. A row does not itself have a click handler; the pair ID and Review button navigate.

### Protocol sections

`ProtocolClient` shows:

- Study question
- Fixed controls
- Membership status as isolated variable
- Required evidence/metadata list
- Preliminary timestamp and GPS thresholds
- Exclusion conditions
- Three synthetic protocol versions

The version table is historical display only.

### Assignment form

Fields:

- Tester A and B: synthetic profiles; must be different.
- Date/start/end: intended testing window.
- Platform, pickup, destination, ride tier: controlled test instructions.
- Isolated variable: what should differ.

`assignmentSchema` checks presence and distinct testers. `createDemoAssignment()` starts at counter 13, pads IDs to three digits, uses a hard-coded `-04:00` offset, and adds an assignment event.

### Tester checklist and countdown

The checklist is a human confirmation gate. It does not inspect the device or account. The single button “Confirm Ready & Start Test” begins the countdown once all boxes are checked. There is no separate Confirm Ready action and no readiness event. The countdown uses local timers and never contacts RideApp A or any service.

### Tester submission form

Fields and potential purpose:

- Price/currency: displayed quote.
- Quote timestamp: synchronization.
- Latitude/longitude: tester proximity.
- Network: connectivity context.
- Device, OS, OS version: device comparability.
- App version: software comparability.
- Battery: possible operating context.
- Account profile/membership: isolated account characteristic.
- Platform/tier/pickup/destination: exact-control comparison.
- Notes: exceptions or observations.
- Screenshot/recording: selected local evidence.

Save Draft persists values as one `testerDraft`, but the form does not restore from it. Submit requires both files to be selected, yet only stores placeholder evidence IDs.

### Matched-pair comparison

The comparison displays:

- Price A/B
- Absolute difference
- Percentage difference against the lower price
- Higher-priced tester
- Timestamp gap
- GPS distance
- Technical, evidence, and expert status
- Rule matrix
- Evidence metadata cards
- Reviewer decision panel
- Interpretation warning

Technical status is separate from expert status. Reviewer decisions change only expert review fields; they do not change technical status.

### Evidence repository

An evidence record is metadata about a supposed file. Screenshots, recordings, and metadata are separated so completeness can be checked by type. Synthetic hashes are fixed strings and are not computed from file contents.

The drawer displays metadata only. This is not a forensic vault because it has no stored files, access controls, verified hashing, signatures, immutability, retention, or chain-of-custody enforcement.

### Activity log

Initial fixtures describe study/protocol/assignment/submission/validation/review/report events. Live actions add events only for:

- Assignment creation
- Draft saving
- Submission
- Reviewer accept/flag/reject/clear
- Direct `addAuditEvent()` calls, although no current UI uses that generic action

Checklist, countdown, role changes, searches, evidence views, exports, and reset do not add events. The log is called a Demonstration Activity Log because browser users can clear or replace the underlying state.

### Reports and exports

- **Pair CSV:** IDs, technical/review statuses, variance, time/GPS gaps, evidence status for all pairs.
- **Accepted Pair CSV:** Same columns, accepted subset.
- **Excluded Pair CSV:** Same columns, rejected, invalid, or incomplete subset.
- **Evidence Inventory CSV:** Evidence metadata including synthetic hash.
- **Activity Log CSV:** Current event fields.
- **JSON Manifest:** Package summary, current review counts, evidence count, missing count, report titles, and activity count.
- **Printable Report:** Current results with fixed package metadata and PAIR-008 example.

Exports are organizational snapshots. They do not guarantee accuracy, authenticity, completeness, chain of custody, admissibility, or expert approval.

### Reset Demo Data

The accessible confirmation dialog exists to prevent accidental loss of local changes. `resetDemoData()` restores:

- Original study, assignments, submissions, pairs, evidence, and events
- Expert Reviewer role
- Empty search/filter values
- PAIR-008 selection
- No saved draft
- Local ID counter 13

It restores fixture decisions and therefore dashboard metrics. It does not directly clear a file object or checklist held in the currently mounted submission component. Those disappear on navigation or refresh.

## Part 5: Featured PAIR-008

### Who the testers represent

- Tester Alpha: synthetic Tester A, standard account, non-member.
- Tester Bravo: synthetic Tester B, subscription account, subscription member.

They are fictional profiles from `testerProfilesFixture`.

### Price calculations

Tester Alpha sees $47.80. Tester Bravo sees $64.05.

Absolute difference:

```text
$64.05 - $47.80 = $16.25
```

`absolutePriceDifference()` in `src/lib/calculations/price-calculations.ts` uses the absolute value so the displayed difference is positive regardless of order.

Percentage difference:

```text
$16.25 ÷ $47.80 × 100 = 33.9958% ≈ 34.00%
```

`percentagePriceDifference()` uses the smaller price as the denominator. This expresses how much higher the larger quote is relative to the lower quote. That formula is a configurable methodological assumption, not an approved statistical standard.

`higherPricedTester()` returns Tester Bravo.

### Timestamp calculation

Alpha: `2026-05-14T14:14:22.400Z`  
Bravo: `2026-05-14T14:14:25.600Z`

`timestampDifferenceSeconds()` parses the absolute ISO timestamps with date-fns, subtracts them in milliseconds, takes the absolute value, and divides by 1,000:

```text
3,200 milliseconds ÷ 1,000 = 3.2 seconds
```

### GPS calculation

Alpha: `40.758140, -73.985500`  
Bravo: `40.7581504, -73.985500`

`haversineDistanceMeters()` uses the Haversine formula, a standard way to estimate surface distance between latitude/longitude points on a sphere. `haversineDistanceFeet()` converts meters to feet using `3.280839895`. Result: approximately 3.8 feet.

A project manager does not need to manage the math, but should confirm with experts whether coordinates, precision, and distance tolerance are methodologically appropriate.

### Conditions and status

PAIR-008 passes:

- Both submissions present
- Same platform
- Same pickup
- Same destination
- Same ride tier
- Same currency
- Same OS family
- Same app version
- 3.2-second timing threshold
- Approximately 3.8-foot GPS threshold
- Both screenshots, recordings, and metadata fixture records present

Therefore `validatePair()` returns `valid`.

Its expert-review status is `pending` because `reviewByPair` contains no preloaded decision for pair 8. Technical validity does not automatically mean expert acceptance.

If accepted, flagged, or rejected, `updateDecision()` changes the expert status, stores the reason/note/time, adds an event, and updates dashboard/reports. Technical status remains valid.

The result still does not prove unlawful discrimination because it is one synthetic observation and technical similarity does not establish causation, intent, repeated pattern, statistical significance, or legal liability.

## Part 6: Validation Engine as a Checklist

### Rule-level labels

- **Pass:** The rule met the preliminary threshold.
- **Warning:** The rule is outside the preferred range but not beyond the failure range.
- **Fail:** A required condition did not match or exceeded the failure threshold.
- **Not applicable:** Supported by the type system, but the current engine does not generate this status.

### Overall labels

- **Incomplete:** A submission, required core metadata, or required evidence is missing.
- **Invalid:** Evidence is complete, but a required rule fails.
- **Warning:** No required failure exists, but at least one warning exists.
- **Valid:** Both submissions/evidence are complete and no warnings or failures exist.

### Default rules

Timestamp:

- ≤5 seconds: pass
- >5 and ≤10: warning
- >10: fail

GPS:

- ≤5 feet: pass
- >5 and ≤15: warning
- >15: fail

Exact matches:

- Platform
- Pickup
- Destination
- Ride tier
- Currency

Configured checks:

- OS family: required in current config
- App version: required in current config
- Network type: configuration contains `sameNetworkCategory: false`, but the current engine does not evaluate network type at all
- Screenshot: always required by current engine
- Recording: always required by current engine
- Metadata record: always required by current engine

The config flags `requiredScreenshot` and `requiredScreenRecording` exist, but `validatePair()` does not consult them; it always requires those types. This is an implementation/configuration mismatch.

Examples:

- Everything passes → Valid.
- Timestamp is 7 seconds, everything else passes → Warning.
- Ride tier differs and evidence is complete → Invalid.
- Second submission missing → Incomplete immediately.
- Required recording missing → Incomplete, even though the rule row itself says fail.

These are preliminary demonstration rules only.

## Part 7: Implemented vs. Simulated vs. Not Built

| Capability | Current Status | How It Works Now | Production Requirement |
| --- | --- | --- | --- |
| Study dashboard | Functional demonstration | Calculates current local metrics/charts | Server data, approved metric definitions |
| Role switching | Fully functional locally | Persists a display role | Authentication and enforced authorization |
| Real authentication | Not implemented | No login | Identity provider, sessions, recovery |
| Role authorization | Visual placeholder | Two UI gates only | Server-enforced permission model |
| Assignment creation | Fully functional locally | Adds assignment and event | Backend, workflow, edit/cancel, notifications |
| Tester countdown | Functional demonstration | Browser-only timer | Approved coordination and timing method |
| Tester form | Functional demonstration | Validates and stores local submission | Assignment-aware backend submission |
| File selection | Functional demonstration | Browser selects file metadata | Secure upload, scanning, storage |
| Remote evidence upload | Not implemented | Nothing leaves browser | Encrypted evidence storage |
| Paired validation | Functional demonstration | Runs while fixtures are built | Trigger after real matching and revisions |
| GPS calculation | Fully functional locally | Haversine from entered/fixture coordinates | Approved capture and precision |
| Timestamp calculation | Fully functional locally | ISO time difference | Trusted capture and clock policy |
| Reviewer actions | Fully functional locally | Update pair and event | Authenticated reviewer workflow |
| Reviewer notes | Functional demonstration | Saved with decisions | Independent notes, revisions, signatures |
| Activity events | Functional demonstration | Fixture plus selected local actions | Comprehensive append-only audit design |
| localStorage persistence | Fully functional locally | Browser storage | Central database and backups |
| Database storage | Not implemented | No database | Secure schema, migrations, backup |
| Real rideshare integration | Not implemented | Fictional platform only | Legal/technical approval and API strategy |
| Real GPS collection | Not implemented | Manual number entry | Consent-based sensor capture |
| Real app metadata collection | Not implemented | Manual entry | Approved capture/verification |
| Real chain of custody | Not implemented | Synthetic labels | Forensic process and controlled audit |
| Cryptographic signing | Not implemented | Fixed demo hash strings | Real hashing/signing/key management |
| CSV exports | Fully functional locally | Browser-generated snapshot | Approved schema and access logging |
| JSON manifest | Fully functional locally | Current-state browser download | Versioned package records and validation |
| Printable report | Functional demonstration | Browser print/PDF | Approved template and report lifecycle |
| Court admissibility | Not implemented | Explicitly disclaimed | Counsel/expert methodology and process |
| Statistical analysis | Not implemented | Descriptive counts/variance only | Qualified statistical design |
| Law-firm tenancy | Not implemented | One local workspace | Secure multi-tenant architecture |
| Subscription billing | Not implemented | None | Business validation and billing system |

## Part 8: What the Current Numbers Mean

Initial fixture state:

- Target: 100
- Pair records submitted/displayed: 12
- Valid: 8
- Warning: 2
- Invalid: 1
- Incomplete: 1
- Accepted: 4
- Flagged: 1
- Rejected: 1
- Pending review: 6
- Completion: 11%
- Validation rate: 72.7%
- Average variance: 10.45%
- Median variance: 8.94%
- Largest variance: 34.00%
- Evidence complete: 83.3%

The apparent inconsistency between “12 / 100 submitted” and “11% completion” is real. The dashboard card uses `pairs.length` for submitted, but `calculateDashboardMetrics()` excludes incomplete pairs from completion. Therefore:

```text
Submitted display = 12 / 100
Completion = 11 non-incomplete pairs / 100 = 11%
```

The Study Progress explanatory sentence is hard-coded as “12 paired assignments collected,” while the percentage is calculated from 11 non-incomplete pairs.

Other distinctions:

- A submitted pair can be warning, invalid, or incomplete.
- A technically valid pair can remain pending expert review.
- Pending review includes PAIR-010 even though it is incomplete.
- Invalid and incomplete records still appear in total pair count.
- Variance mean/median exclude the incomplete pair but include warning and invalid pairs.
- The variance-distribution chart does not apply that same exclusion; it bins all pairs, so PAIR-010 appears in the 0% bucket.

These definitions need expert and project confirmation before production.

## Part 9: Product Value and Limitations

### Potential value

If validated, the concept may support:

- More consistent testing instructions
- Less manual spreadsheet matching
- Easier side-by-side review
- Centralized evidence references and metadata
- Clear technical-check explanations
- Better traceability of demonstration decisions
- Faster export and report preparation
- A concrete visual tool for expert and law-firm discovery

### Current limitations

- No database or server persistence
- No real user authentication
- No production permission enforcement
- No real evidence upload or stored file
- No verified chain of custody or cryptographic signing
- No rideshare integration or automated quote request
- No approved testing methodology or evidence requirements
- No inferential statistical analysis
- No legal conclusions
- No production security, privacy, retention, backup, or incident architecture
- No law-firm workspace or tenancy
- No automatic connection from newly created assignment to pair
- No automatic connection from local tester submission to validation
- Incomplete event coverage
- Mixed fixed and current timestamps in reports

## Verified Inconsistencies and Potentially Confusing Behavior

These are not legal or methodological criticisms. They are differences between labels, configuration, or intended flow and what the current code actually does.

1. **Submitted count and completion use different populations.** Submitted displays all 12 pair records; completion excludes the incomplete pair and displays 11%.
2. **The progress sentence is fixed.** It says “12 paired assignments collected” even though the progress calculation uses 11 completed/non-incomplete pairs.
3. **The variance chart and summary metrics use different populations.** Mean/median exclude the incomplete pair; the distribution chart includes it in the 0% bin.
4. **Creating an assignment reserves a pair ID but does not create a pair.** The Dashboard and Matched Pairs remain at 12.
5. **The tester page is fixed to ASN-008 / PAIR-008 / Tester Alpha.** It does not load the selected role’s or a newly created assignment.
6. **A submitted tester response is disconnected from PAIR-008.** The pair still points to `SUB-A-008`, not `SUB-A-LOCAL-001`, and validation does not rerun.
7. **The local submission says “awaiting partner” even though fixture SUB-B-008 already exists.** The workflow does not reconcile the local record with the fixture partner.
8. **Save Draft does not restore the form.** It persists draft values and changes the status label, but the form initializes from fixed defaults on remount.
9. **Selected files do not become evidence records.** Only placeholder evidence IDs are placed on the local submission.
10. **Role behavior is narrower than the role descriptions imply.** All roles see all navigation; all except Law-Firm Viewer can create assignments; only review editing is restricted to Expert Reviewer.
11. **Network matching is configured but not evaluated.** `sameNetworkCategory` exists, but `validatePair()` has no network comparison rule.
12. **Screenshot/recording configuration flags are not honored.** The engine always requires screenshot, recording, and metadata evidence.
13. **Open Activity Log does not filter to the selected pair.** The comparison adds an `object` query parameter, but the Activity page does not read it.
14. **Generate Demo Package is a visual action only.** It shows a toast and creates no saved package, manifest, ZIP, or activity event.
15. **Excluded counts differ by output.** Reports and Print treat rejected, invalid, or incomplete pairs as excluded, initially yielding two. `createManifest()` and `reportManifestFixture` count rejected or invalid but not incomplete, initially yielding one.
16. **Print report generation time is fixed.** Results use current state, but the displayed manifest timestamp remains the fixture timestamp.
17. **Activity coverage is partial.** Checklist, countdown, role changes, evidence views, exports, package generation, print, and reset do not create events.
18. **Assignment-table evidence is inferred from assignment completion.** It does not calculate actual linked evidence completeness.

## Source Index

- Routes: `src/app`
- Shell and role/reset behavior: `src/components/paired-testing/layout/app-shell.tsx`
- Central assumptions: `src/config/paired-testing-demo.config.ts`
- Fixtures: `src/data/paired-testing-demo.fixtures.ts`
- Types: `src/types/paired-testing-demo.types.ts`
- Store/actions/persistence: `src/store/paired-testing-demo.store.ts`
- Hydration: `src/hooks/use-hydrated.ts`
- Validation: `src/lib/validation/pair-validation-engine.ts`
- Form rules: `src/lib/validation/form-schemas.ts`
- Price: `src/lib/calculations/price-calculations.ts`
- Time: `src/lib/calculations/date-calculations.ts`
- GPS: `src/lib/calculations/geographic-distance.ts`
- Dashboard metrics: `src/lib/calculations/dashboard-metrics.ts`
- CSV: `src/lib/exports/csv-export.ts`
- Manifest: `src/lib/exports/manifest-export.ts`
- Tests: `src/tests`
- Existing overview: `README.md`
- Assumption register: `ASSUMPTIONS.md`
