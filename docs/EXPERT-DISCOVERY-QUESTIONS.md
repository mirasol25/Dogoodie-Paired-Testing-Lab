# Expert Discovery Questions

These questions are designed for Skyler to send to his dad in short form. They are based on the current synthetic prototype and are intended to reveal where its assumptions are wrong or incomplete.

The first round should be answerable through chat. The second round is better for a follow-up call after he has seen the prototype.

## First-Round Priority Questions

### Copy-ready chat version

> We built a synthetic visual prototype to help us understand the workflow. Before we revise it, could you give us short answers to these?
>
> 1. What exact question should a paired rideshare pricing test try to answer?
> 2. What two tester characteristics or account types should usually be compared?
> 3. How do you coordinate two testers today, from assignment through submission?
> 4. Which conditions absolutely must be the same for both testers?
> 5. How close in time and location do the two requests need to be?
> 6. What evidence is mandatory: screenshot, screen recording, device details, location, or something else?
> 7. What would automatically make a pair unusable?
> 8. What decisions should the expert reviewer be able to make about a pair?
> 9. What output does a law firm actually need at the end?
> 10. What would be the smallest useful first version for you?
>
> The current prototype is only a synthetic discussion tool. We especially want to know where it is wrong.

### Why each priority question matters

#### 1. Testing objective

**Question:** What exact question should a paired rideshare pricing test try to answer?

**Why it matters:** Every field, control, comparison, and report depends on the real study question. The current membership-status question is only an assumption.

#### 2. Comparison type

**Question:** What two tester characteristics or account types should usually be compared?

**Why it matters:** The prototype uses non-member versus subscription member. If the actual comparison is different, the tester profiles, isolated variable, protocol, and report language must change.

#### 3. Current workflow

**Question:** How do you coordinate two testers today, from assignment through submission?

**Why it matters:** This identifies the real sequence, tools, handoffs, and pain points. It prevents us from optimizing an imagined process.

#### 4. Required controls

**Question:** Which conditions absolutely must be the same for both testers?

**Why it matters:** The current engine requires matching platform, route, ride tier, currency, OS family, and app version. The expert may require more, fewer, or different controls.

#### 5. Time and location tolerances

**Question:** How close in time and location do the two requests need to be?

**Why it matters:** The current five/ten-second and five/fifteen-foot thresholds are unapproved assumptions. The answer may also reveal that tolerance should depend on context rather than a fixed rule.

#### 6. Evidence

**Question:** What evidence is mandatory: screenshot, screen recording, device details, location, or something else?

**Why it matters:** Evidence requirements determine tester burden, storage needs, validation, privacy, and future forensic handling.

#### 7. Exclusion

**Question:** What would automatically make a pair unusable?

**Why it matters:** The prototype distinguishes warning, invalid, and incomplete, but the actual exclusion rules may be materially different.

#### 8. Expert review

**Question:** What decisions should the expert reviewer be able to make about a pair?

**Why it matters:** The current accept/flag/reject/clear model may not match expert practice. The answer defines review status, reason codes, overrides, notes, and sign-off.

#### 9. Law-firm output

**Question:** What output does a law firm actually need at the end?

**Why it matters:** This determines whether the product should prioritize raw tables, a narrative report, evidence inventory, manifest, exhibits, or another format.

#### 10. First useful version

**Question:** What would be the smallest useful first version for you?

**Why it matters:** This provides a practical boundary for a revised demonstration or pilot and avoids prematurely building production infrastructure.

## Second-Round Discovery Questions

Use these after the expert has reviewed the prototype. They are grouped by the same decision areas.

## 1. Testing Objective

### Question

Are tests normally same-platform comparisons, cross-platform comparisons, different account profiles, different locations, different devices, or some combination?

**Why it matters:** The current data model assumes one same-platform, different-account pair.

### Question

Which interpretations or conclusions must the software explicitly avoid?

**Why it matters:** This defines safe terminology, disclaimers, report boundaries, and reviewer guidance.

## 2. Current Workflow

### Question

Who creates a test, who assigns testers, who monitors readiness, and who resolves missing information?

**Why it matters:** This defines real roles, ownership, handoffs, and permissions.

### Question

Where do mistakes or delays happen most often today?

**Why it matters:** The first useful version should solve the highest-value operational problem rather than reproduce every manual step.

## 3. Required Controls

### Question

Which conditions must match exactly, and which may differ within a tolerance?

**Why it matters:** The validation engine needs to distinguish exact matches, numeric thresholds, advisory checks, and contextual expert judgment.

### Question

Should operating system, app version, network type, battery level, device model, weather, demand conditions, or surge indicators be controlled?

**Why it matters:** The prototype captures some of these but does not validate all of them. The answer affects fields and rules.

### Question

Can an expert override a warning or failure, and what explanation is required?

**Why it matters:** This determines whether technical status is advisory, binding, or subject to documented override.

## 4. Evidence

### Question

How should evidence be named, linked, hashed, retained, corrected, and exported?

**Why it matters:** The current repository contains metadata placeholders only. Production evidence handling may be the largest technical and procedural requirement.

### Question

Does evidence need a continuous screen recording, visible device clock, account state, location proof, or witness confirmation?

**Why it matters:** This determines what testers must capture and what the system must verify.

### Question

Are there privacy or consent limits on collecting location, device, account, or recording data?

**Why it matters:** These limits affect design, lawful collection, security, and retention.

## 5. Expert Review

### Question

Should reviewers be able to request corrections, return a submission, exclude only one tester, or reopen a decision?

**Why it matters:** The current reviewer can only accept, flag, reject, or clear the whole pair.

### Question

Must a reviewer sign or certify a decision, and can more than one reviewer participate?

**Why it matters:** This affects identity, signatures, approvals, separation of duties, and audit design.

## 6. Law-Firm Outputs

### Question

Which columns and explanations belong in the pair table, and which details should remain internal?

**Why it matters:** Different audiences may need different levels of detail and confidentiality.

### Question

Do you need raw data, a narrative summary, evidence inventory, manifest, exhibits, or integration with another analysis tool?

**Why it matters:** This defines the output architecture and whether the current CSV/JSON/print model is useful.

### Question

How should incomplete, warning, rejected, and overridden pairs appear in an output?

**Why it matters:** The current report uses simple included/excluded subsets that may not be methodologically correct.

## 7. Security and Retention

### Question

Should work be organized by study, client, legal matter, law firm, or another structure?

**Why it matters:** This determines the future workspace and multi-tenant model.

### Question

Who may see tester identities, account details, locations, evidence, reviewer notes, and exports?

**Why it matters:** This defines the real authorization model.

### Question

How long must records be kept, and who may delete, correct, or place them on hold?

**Why it matters:** Retention, legal hold, corrections, and deletion must be designed before production storage.

## 8. First Useful Version

### Question

Would the first pilot be more useful as a tester-coordination tool, a pair-review tool, an evidence organizer, or a reporting tool?

**Why it matters:** This identifies the most valuable initial scope.

### Question

How many users, studies, pairs, and files would a small approved pilot involve?

**Why it matters:** This gives realistic scale, support, storage, and workflow requirements.

### Question

What would make you comfortable saying the revised prototype reflects the real process well enough for a limited pilot?

**Why it matters:** This creates a clear Phase 0/Phase 1 exit criterion.

## Suggested discovery sequence

1. Send the ten first-round questions.
2. Demonstrate the prototype using `docs/DEMO-SCRIPT.md`.
3. Record corrections as confirmed requirements, rejected assumptions, and open questions.
4. Use the second-round list for a focused 45–60 minute workflow session.
5. Ask the expert to review a revised synthetic prototype before planning a production pilot.
