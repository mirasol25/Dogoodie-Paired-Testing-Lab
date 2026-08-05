# DoGoodie Paired Testing Lab — Technical System Audit

**Audit date:** 2026-07-23 (Asia/Manila)  
**Repository name:** `dogoodie-paired-testing-lab` / DoGoodie Paired Testing Lab  
**Current branch:** `main`  
**Git status:** Dirty before this audit. HEAD was `70b3d532b9b464b50f8bfcc44330471da7fb8860` (`Initial DoGoodie Paired Testing Lab`). Existing Phase 0 authentication/database work was modified or untracked; this audit did not alter it.  
**Framework:** Next.js 16.2.10, React 19.2.4, TypeScript  
**Database:** Supabase PostgreSQL schema and RLS migrations exist; operational paired-testing screens do not yet use those tables  
**Authentication:** Supabase Auth, connected through server actions and session middleware/proxy  
**Deployment:** Not confirmed from the repository. Vercel is the intended platform according to project context, but no tracked Vercel project configuration proves a current deployment.  
**Data status:** Authentication profile/role reads are database-backed. Study, assignment, submission, evidence, validation, review, dashboard, activity, and report data remain deterministic fixtures plus browser-persisted Zustand state.  
**Overall maturity:** An authenticated internal preparation prototype with a strong database/security foundation, but not yet a complete database-backed pilot and not production-ready for real or legally sensitive evidence.

## Audit method and limits

This was a read-only inspection of source code, configuration, migrations, types, tests, documentation, and Git state. No package was installed, no migration was run, no remote database was queried or changed, no file was uploaded, and nothing was deployed. Environment-variable values were not read. The only new file created is this report.

Safe local verification on 2026-07-23:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test:run`: 8 test files passed, 42 tests passed.
- A production build was not run during this audit because it was not needed to establish the findings and would write build artifacts.
- Current remote Supabase migration state, hosted configuration, users, data, RLS behavior, Storage behavior, and Vercel deployment are **Not confirmed from the repository**.

Terms used in this report:

- **Database-backed:** the current application reads or writes the persistent remote entity in the user workflow.
- **Partially connected:** a real supporting layer exists, but the visible workflow is not fully wired to it.
- **Local-state only:** data is stored in Zustand/browser `localStorage`, not the operational database.
- **Fixture-based/simulated:** deterministic synthetic records or behaviors demonstrate an intended workflow.
- **UI-only:** the interface exists without the promised persistent or server-side operation.
- **Not implemented:** no working repository path for the capability was found.

# 1. Executive Summary

The project is a demonstration and preparation tool for coordinating paired rideshare price observations. Its intended workflow is to give two testers a controlled assignment, collect each tester's displayed price and supporting evidence, compare the two submissions under a protocol, let an expert make a separate human decision, and produce structured outputs for a law-firm audience.

The intended users represented in the repository are administrators, test coordinators, testers, expert reviewers, and law-firm viewers. The current boundary is narrower than that goal:

- Supabase email/password login, sign-out, session refresh, profile status checks, and database role/profile lookup are implemented.
- A normalized PostgreSQL model, row-level security policies, authorization helpers, and a private evidence bucket migration provide a substantial backend foundation.
- The visible operational product still runs from one synthetic study, deterministic fixture records, and a Zustand store persisted to browser `localStorage`.
- There are no working application writes for studies, protocols, assignments, tester slots, submissions, evidence metadata, pairs, validation results, expert reviews, reports, or database activity logs.
- There is no real evidence upload path, file hashing, evidence download flow, report approval/version model, notification service, or background job system.

Current classification:

| Classification | Verdict | Basis |
|---|---|---|
| Visual prototype | Yes | Complete role-oriented screens and synthetic walkthrough |
| Local functional prototype | Yes | Assignment, submission, review, reset, calculations, and exports work in local state, with limitations |
| Database-backed application | Partially | Auth/profile/role are backed by Supabase; core workflow is not |
| Authenticated internal system | Yes, at the route/session layer | Active database users can enter protected routes |
| Production-ready application | No | Core persistence, evidence controls, end-to-end authorization tests, operations, and governance are incomplete |

Important strengths:

1. The project separates deterministic technical validation from expert judgment in both its local model and database schema.
2. The database design is already broad enough for studies, versioned protocols, two tester slots, submissions, evidence metadata, pairs, validation results, and expert reviews.
3. RLS is enabled across the public schema, anonymous grants are revoked, and private helper functions are security-conscious.
4. Synthetic fixtures and tested calculation modules make the intended workflow easy to demonstrate without claiming scientific or legal validity.
5. The existing architecture can be extended incrementally; a rewrite is not justified.

Important gaps:

1. The paired-testing vertical slice is not wired to the database.
2. File selection does not upload or persist evidence.
3. Matching and validation do not run after local submissions.
4. Reports are browser-generated exports without a persistent report, version, approval, or package entity.
5. Activity history is browser-local and resettable; the database log has no controlled insertion path used by the application.

The most accurate maturity description is: **an authenticated, synthetic internal prototype with a production-oriented Supabase schema/RLS foundation, ready for incremental pilot implementation but not yet safe to treat as a real-data evidence system.**

# 2. Technology Stack

| Area | Confirmed technology/status | Repository evidence |
|---|---|---|
| Frontend | Next.js 16.2.10 App Router; React 19.2.4 | `package.json`, `src/app/` |
| Language | TypeScript with strict checking | `tsconfig.json`, `package.json` |
| Styling | Tailwind CSS 4 and global CSS | `package.json`, `postcss.config.mjs`, `src/app/globals.css` |
| Components | shadcn configuration, Base UI/React primitives, Lucide icons | `components.json`, `package.json`, `src/components/ui/` |
| Backend approach | Next.js server components/server actions plus Supabase client libraries; no separate API service | `src/app/auth/actions.ts`, `src/lib/supabase/`, absence of API route handlers |
| Database | Supabase PostgreSQL; local config targets PostgreSQL 17 | `supabase/config.toml`, `supabase/migrations/`, `src/types/database.types.ts` |
| Authentication | Supabase Auth email/password | `src/app/auth/actions.ts`, `src/lib/auth/server.ts`, `src/lib/supabase/proxy.ts` |
| File storage | Supabase Storage private bucket is defined in migrations/config, but the UI is not connected | `supabase/migrations/20260723000500_private_evidence_storage.sql`, `supabase/config.toml` |
| Hosting | Not confirmed from the repository. Vercel is intended; `.vercel` is ignored and there is no tracked `vercel.json` | `.gitignore`, `next.config.ts` |
| Forms | React Hook Form, Zod 4, Hook Form resolvers | `package.json`, `src/lib/validation/form-schemas.ts`, `src/lib/validation/auth-schemas.ts` |
| State | Zustand 5 with `persist` to browser `localStorage` | `src/store/paired-testing-demo.store.ts` |
| Reports/exports | Custom CSV/JSON serializers, browser Blob downloads, browser print; no dedicated PDF/ZIP library | `src/lib/exports/`, `src/components/paired-testing/reports/` |
| Charts | Recharts | `package.json`, `src/components/paired-testing/dashboard/dashboard-client.tsx` |
| Dates | date-fns plus native `Date`/`Intl` | `package.json`, `src/lib/calculations/date-calculations.ts`, `src/lib/formatting/date-time.ts` |
| Tests | Vitest, Testing Library, jsdom; ESLint and TypeScript checks | `vitest.config.ts`, `src/tests/`, `eslint.config.mjs`, `package.json` |
| Analytics/monitoring | Not implemented | No analytics, error-monitoring, or observability dependency/configuration found |
| Background jobs/queues | Not implemented | No queue, scheduler, or worker dependency/configuration found |
| Notifications | Not implemented | No email, SMS, push, or messaging provider found |
| AI | Not implemented | No AI SDK/provider calls, prompts, embeddings, or model configuration found |

The package manager is npm (`package-lock.json`). `next.config.ts` contains no custom runtime, output, security-header, or deployment settings.

# 3. Repository Structure

```text
src/app/
  auth/actions.ts                    Supabase login and logout server actions
  login/                             Public login route
  paired-testing-demo/               Protected prototype routes
    assignments/                     Assignment list and local create dialog
    submission/                      Hardcoded tester submission simulation
    pairs/[pairId]/                   Technical comparison and expert review
    evidence/                        Synthetic evidence metadata repository
    protocol/                        Fixture protocol viewer/export
    dashboard/                       Local metrics and charts
    audit/                           Browser-local activity history
    reports/                         CSV/JSON downloads and print view
src/components/
  auth/                              Login form
  paired-testing/                    Feature clients and shared prototype UI
  ui/                                Reusable UI primitives
src/config/                          Synthetic protocol/study configuration
src/data/                            Deterministic fixture generator/data
src/lib/
  auth/                              Server authorization and safe redirects
  calculations/                      Price, time, distance, dashboard calculations
  data/                              Current profile/role data-access function
  exports/                           CSV, JSON manifest, browser download logic
  formatting/                        Display formatting
  supabase/                          Browser/server/proxy clients and env names
  validation/                        Auth/form schemas and pair validation engine
src/store/                           Zustand/localStorage demo state and mutations
src/types/                           Prototype domain types and generated DB types
src/tests/                           Unit, store, component, export, auth tests
supabase/
  migrations/                        Identity, core schema, helpers, RLS, Storage
  config.toml                        Local Supabase/Auth/Storage configuration
  seed.sql                           Comments only; no seeded user or study data
docs/                                Setup, schema, walkthrough, demo, discovery docs
```

There is no `src/app/api/` route, route handler, queue worker, upload endpoint, webhook, report service, notification service, or background processor. The only current data-access module for an operational entity is `src/lib/data/profiles.ts`.

# 4. Current User Roles and Access Model

Two related role systems exist.

The database enum in `20260723000100_identity_and_enums.sql` and generated types defines:

- `admin`
- `coordinator`
- `tester`
- `reviewer`
- `viewer`

The local prototype type in `src/types/paired-testing-demo.types.ts` defines presentation roles:

- Test Coordinator
- Tester
- Expert Reviewer
- Law-Firm Viewer

`src/components/paired-testing/layout/app-shell.tsx` maps the signed-in database role to a local role: `admin` is displayed as `expert_reviewer`; other roles map to their closest local equivalent. This updates persisted browser preview state. The old `DemoRoleSwitcher` component remains in the file but is not rendered.

## Access layers

### Authentication

`src/proxy.ts` and `src/lib/supabase/proxy.ts` refresh/check the Supabase session for `/login` and `/paired-testing-demo/:path*`. `src/app/paired-testing-demo/layout.tsx` calls `requireActiveUser()`. Anonymous, pending, disabled, missing-profile, and missing-role cases are redirected or signed out.

### Route/server authorization

Only active-user status is enforced by the feature layout. `requireRole()` and `requireStudyMembership()` exist in `src/lib/auth/server.ts`, but no current feature route uses them. Therefore, any active authenticated role can directly open every prototype URL, including assignments, tester submission, evidence, pair review, audit, and reports.

This does not automatically grant database access because RLS separately controls future queries. It does mean route-level role separation and interface confidentiality are unfinished.

### Interface visibility

- All active users receive the same navigation.
- Assignment creation is hidden for the local law-firm viewer, but this is a client-side presentation condition.
- Expert review controls are shown according to local preview role.
- The tester submission page itself is available to every active user.
- The local role is in Zustand/browser state and is not an authorization source.

### Database RLS

`20260723000400_row_level_security.sql` enables RLS on all 16 public tables and defines study/global-role-aware policies. `20260723000300_authorization_helpers.sql` places authorization helpers in a private schema, uses constrained `search_path`, revokes public execution, and grants authenticated execution.

Intended database behavior includes:

- Admin: broad administrative access.
- Coordinator: manage/view authorized studies and their operational records.
- Tester: view assigned slots and own submissions/evidence, with controlled insert/update rules.
- Reviewer: view authorized technical material and record their own expert reviews.
- Viewer: read authorized study outputs while raw submissions and evidence are restricted.

The policies are a meaningful control, but their behavior against separate live accounts was not tested in this audit. **Current remote RLS enforcement is Not confirmed from the repository.**

## Role summary

| Role | Current visible behavior | Current real enforcement |
|---|---|---|
| Administrator | Identity is shown; locally mapped to expert-reviewer UI | Database policies define admin access; feature routes only require active status |
| Coordinator | Can view all synthetic screens and create local assignments | UI/local store today; intended study-scoped DB policies exist |
| Tester | Can view all synthetic navigation and use one hardcoded submission page | UI/local store today; intended own-slot/own-submission DB policies exist |
| Expert reviewer | Can record local accept/flag/reject decisions and notes | Local-state today; reviewer DB table/policies exist but UI is not connected |
| Law-firm viewer | Can view reports/dashboard; assignment create is hidden | Mostly UI-only today; viewer DB policies exist but feature routes are not role-restricted |

Direct URL bypass is therefore possible for **interface pages**, but repository evidence does not show a direct bypass of RLS-protected data. Future server actions must still call role/membership authorization and must not rely only on hidden controls or client-supplied IDs.

# 5. Authentication Status

## Implemented

- **Provider:** Supabase Auth.
- **Sign-in:** `signInAction()` in `src/app/auth/actions.ts` validates email/password with `loginSchema`, calls `signInWithPassword`, loads the matching profile and role, rejects pending/disabled/incomplete identities, and redirects through `getSafeNextPath()`.
- **Sign-out:** `signOutAction()` calls Supabase sign-out with local scope and redirects to `/login`.
- **Session handling:** `updateSession()` in `src/lib/supabase/proxy.ts` creates an SSR client, exchanges cookies, calls `getClaims()`, and handles optimistic redirects. `src/proxy.ts` applies it to login and protected routes.
- **Protected layout:** `requireActiveUser()` in `src/lib/auth/server.ts` verifies user, profile status, and role.
- **Profile creation:** the identity migration creates an Auth-user trigger that inserts `profiles` and a default `tester` `user_roles` row. New profiles initially have `pending` account status.
- **Role assignment:** stored in `public.user_roles`; first-admin promotion is an external/manual administrative SQL step documented in `docs/SUPABASE_SETUP.md`.
- **Redirect safety:** `getSafeNextPath()` only permits `/paired-testing-demo` and its descendants and rejects external, protocol-relative, backslash, and unrelated paths.
- **Errors/loading:** the login form displays configuration, credential, pending, disabled, and identity errors and uses a submitting/loading state.
- **No hosted signup UI:** repository UI exposes sign-in only. Local Supabase config disables signup and anonymous sign-in.

Required public environment-variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

An optional server-only `SUPABASE_SERVICE_ROLE_KEY` is named in `.env.example`, but the application does not import or require it. It must never be prefixed `NEXT_PUBLIC_` or distributed to builders who do not administer the database.

## Unfinished or not implemented

- Password reset, magic link, MFA, invite acceptance, account recovery, and self-service profile management.
- Role/membership administration UI.
- Server-side role enforcement on each feature route/action.
- Rate limiting, suspicious-login monitoring, and authentication audit reporting.
- Tested hosted signup settings; `supabase/config.toml` controls the local stack only.
- Confirmed live integration testing for session refresh, expiration, pending/disabled accounts, and separate-role accounts.

The user reported a working hosted login outside the repository, but live provider state is **Not confirmed from the repository**.

# 6. Database and Data Model

The database foundation is defined by five migrations:

1. `supabase/migrations/20260723000100_identity_and_enums.sql`
2. `supabase/migrations/20260723000200_core_schema.sql`
3. `supabase/migrations/20260723000300_authorization_helpers.sql`
4. `supabase/migrations/20260723000400_row_level_security.sql`
5. `supabase/migrations/20260723000500_private_evidence_storage.sql`

`src/types/database.types.ts` is a generated Supabase/PostgREST type file covering the public schema. `supabase/seed.sql` contains no actual seed records. Remote migration/data state is **Not confirmed from the repository**.

## Persistent public entities

Unless stated otherwise, current operational screens neither read nor write these entities. Current application database reads are limited to `profiles`, `user_roles`, and study membership checks in auth helpers.

| Entity | Purpose and key fields | Key/relationships/status/timestamps | Current app use |
|---|---|---|---|
| `profiles` | Application identity: `email`, `display_name`, `account_status` | PK `user_id`, FK `auth.users`; created/updated timestamps | Read during login/current identity; trigger-created |
| `user_roles` | One global application role per user | PK/FK `user_id`; `role`, `assigned_by`, `assigned_at` | Read during login/current identity; trigger creates default tester |
| `studies` | Study/matter-like container: code, name, question, isolated variable, target, timezone, schedule, JSON config | UUID PK; unique `study_code`; creator; status; created/updated | Schema only |
| `study_members` | User membership and study-specific role/status | Composite PK `study_id,user_id`; FKs study/profile; `added_by`, `created_at` | Checked by `requireStudyMembership()` when called; no current feature route calls it |
| `platforms` | Provider-neutral platforms | UUID PK; unique slug; category, active, metadata, timestamps | Schema only |
| `platform_services` | Services/tiers belonging to a platform | UUID PK; platform FK; unique platform/code; active, metadata, timestamps | Schema only |
| `study_platforms` | Studies-to-platforms join | Composite study/platform key | Schema only |
| `protocols` | Versioned technical protocol: question, controls/config JSON, effective/approval fields | UUID PK; study FK; unique study/code/version; status; creator/approver; timestamps | Schema only; UI uses fixture protocol |
| `assignments` | Scheduled paired test: route, protocol, isolated variable, instructions | UUID PK; unique assignment code; study/protocol FKs; status; schedule; creator; timestamps | Schema only; UI uses fixture/local assignment |
| `assignment_testers` | Tester A/B slot and service/account configuration | UUID PK; assignment/user FKs; unique assignment+slot and assignment+user; status; assigner; timestamps | Schema only |
| `submissions` | Tester quote/observation with fare, currency, quote time, GPS, device/app/battery/account/route/notes | UUID PK; unique submission code; FKs study, assignment, assignment tester, user, service; status; submitted/created/updated timestamps | Schema only; privacy-sensitive location/device/account details |
| `evidence_files` | Metadata for evidence objects: bucket/path/name/MIME/size/hash/capture/upload/integrity | UUID PK; unique evidence code; FKs study/assignment/submission/uploader; status; metadata; timestamps | Schema only; privacy-sensitive path/file metadata |
| `matched_pairs` | Links A/B submissions and stores calculated pair summary | UUID PK; unique pair code and one pair per assignment; FKs study/assignment/submissions; difference and technical/evidence statuses; timestamps | Schema only |
| `validation_results` | One rule outcome for a pair: label/status/values/difference/explanation/config snapshot | UUID PK; pair FK; rule key; affects-overall flag; created timestamp | Schema only |
| `expert_reviews` | Human review decision/reason/note for a pair | UUID PK; pair/reviewer FKs; unique pair+reviewer; status/decision timestamps | Schema only |
| `activity_logs` | Append-oriented study activity metadata: actor, action, category, target, JSON details | UUID PK; optional study/actor FKs; created timestamp | Schema only; authenticated SELECT is defined, but no controlled application insertion path exists |

`auth.users` is owned by Supabase Auth and is not a public application table.

## Entities not present as persistent tables

- Organizations/clients/legal matters: not implemented. Study membership is the current tenancy boundary.
- Reports and report versions: not implemented as database entities.
- Notifications: a local prototype concept/type may exist, but there is no persistent notification entity or delivery integration.
- Research sources, documents, claims, timelines, contradictions, expert-witness intelligence, legal holds, and retention schedules: not implemented.

## Fixture and local entities

`src/types/paired-testing-demo.types.ts`, `src/data/paired-testing-demo.fixtures.ts`, and `src/store/paired-testing-demo.store.ts` define/store synthetic tester profiles, assignments, submissions, evidence metadata, test pairs, validation rules, expert decisions, activity events, dashboard metrics, and a tester draft. These are separate from the generated database types and are not proof of persistent records.

# 7. Current End-to-End Workflow

| Stage | Current classification | Actual behavior and evidence |
|---|---|---|
| 1. User signs in | **Fully functional and database-backed at code level; live state not independently verified** | `signInAction()` authenticates with Supabase and reads profile/role; protected layout calls `requireActiveUser()` |
| 2. Coordinator creates study/protocol | **UI-only/not implemented** | Protocol page reads `demoConfig` and fixtures. No study/protocol create server action or DB mutation |
| 3. Coordinator creates assignment | **Functional but local-state only** | `AssignmentDialog` validates a form; `addAssignment()` adds a Zustand record and local activity event |
| 4. Testers receive/access assignments | **Simulated** | Assignment table shows fixtures/local records to all active users. No user-specific inbox, delivery, notification, or DB query |
| 5. Tester A submits | **Functional but local-state only and hardcoded** | `SubmissionClient` uses `assignmentsFixture[7]` and `testerProfilesFixture[0]`; `submitTesterObservation()` updates Zustand |
| 6. Tester B submits | **Fixture-based** | Existing partner submission is a fixture. No authenticated tester-specific two-sided flow |
| 7. Evidence/metadata stored | **UI-only/simulated** | File objects remain component memory; fake evidence IDs are stored on the local submission; fixture metadata is shown separately |
| 8. Submissions matched | **Fixture-based/not triggered for new submissions** | Fixture pairs are prebuilt. Local assignment/submission actions do not create or update a pair |
| 9. Validation runs | **Deterministic for fixtures, disconnected after user edits** | `validatePair()` builds fixture results; no automatic call after local submission/edit |
| 10. Results stored | **Local fixture/Zustand only** | Results are embedded in local pair objects; `validation_results` is unused |
| 11. Expert opens pair | **Functional local view** | `/pairs/[pairId]` finds a local pair and renders comparison |
| 12. Expert decides/notes | **Functional but local-state only** | `updateDecision()` changes Zustand and selected decisions create local audit events; DB `expert_reviews` is unused |
| 13. Draft report generated | **Partially functional local report** | Print report and CSV/JSON content derive from current browser state |
| 14. Report reviewed/approved | **Not implemented** | No report entity, status, version, reviewer approval, or signing workflow |
| 15. Export/package produced | **Individual local exports work; package is UI-only** | CSV/JSON/TXT and browser print work. “Generate Demo Package” only displays a toast; no ZIP |
| 16. Actions logged | **Partial and local-state only** | Selected store mutations append resettable browser events. Database `activity_logs` is not written |

This is not yet one coherent persistent workflow. Authentication is the only live application vertical. The core workflow is a synthetic demonstration with some functioning browser-local mutations.

# 8. Existing Automation Inventory

| Automation | Trigger/input/logic | Output/storage | Execution and limits |
|---|---|---|---|
| Auth identity bootstrap | Supabase Auth insert trigger creates pending profile and default tester role | PostgreSQL `profiles`, `user_roles` | Database trigger in identity migration; remote behavior not tested here |
| Safe login redirect | Login form sends `next`; `getSafeNextPath()` validates internal demo paths | Server redirect | Deterministic/server; no arbitrary external redirect |
| Session refresh/protection | Request under matched route calls `updateSession()`/`getClaims()` | Cookies and redirect response | Server/proxy; not a feature-role authorization layer |
| Local IDs | `addAssignment()` and `submitTesterObservation()` use store counters/hardcoded local formats | Zustand/localStorage | Deterministic client; not globally unique or concurrency-safe |
| Local timestamps | Store interactions and submission use browser `new Date()` | Zustand/localStorage | Client clock is not trusted |
| Absolute price difference | `absolutePriceDifference(priceA, priceB)` | Number in local pair/metrics | Deterministic client/module; zero/rounding semantics require domain approval |
| Percentage difference | `percentagePriceDifference(priceA, priceB)` | Percentage | Deterministic; uses a local formula, returns zero for a zero comparison base |
| Higher price label | `higherPricedTester()` compares two values | A/B/tie | Deterministic |
| Timestamp gap | `timestampDifferenceSeconds()` | Seconds | Deterministic; depends on parseable timestamps |
| Geographic distance | `haversineDistanceMeters()`/`haversineDistanceFeet()` | Distance | Deterministic Haversine calculation |
| Exact control comparison | `comparisonRule()` checks normalized strings for platform, route, tier, currency, and configured device controls | Validation rule result | Deterministic; semantic normalization is limited to trim/lowercase |
| Threshold evaluation | `thresholdStatus()` evaluates configured time/GPS pass/warn maxima | pass/warning/fail | Deterministic; thresholds are unapproved assumptions |
| Evidence completeness | `validatePair()` checks fixture evidence types/statuses for both submissions | complete/incomplete validation | Deterministic; hardcoded expected evidence and disconnected from selected Files |
| Pair status | `validatePair()` prioritizes incomplete, then required fail, warning, valid | `valid`, `warning`, `invalid`, `incomplete` | Deterministic; runs during fixture construction, not after live edits |
| Dashboard metrics | `calculateDashboardMetrics()` aggregates current local pairs | Counts, rates, price statistics | Client/module; some surrounding copy remains hardcoded |
| Review propagation | Store `updateDecision()` updates a local pair and adds selected local events | Zustand/localStorage | Client; no DB transaction or reviewer identity proof |
| CSV serialization | `pairsToCsv()`, `evidenceToCsv()`, `auditToCsv()`, `rowsToCsv()` | Browser-downloaded CSV | Client; no server authorization or export registry |
| Manifest generation | `createManifest()` and `manifestToJson()` | Browser-downloaded JSON | Client; current browser timestamp, no signature/hash/package |
| Protocol export | Protocol UI creates a text download | TXT | Client, fixture content |
| Print report | `PrintReportClient` formats current state; browser `window.print()` | User-selected printer/PDF | Client; not a versioned system report |

All analytical automation is deterministic. No AI-assisted automation is present. There is no queue, scheduled job, webhook, or notification automation.

# 9. Manual, Simulated, or Disconnected Steps

| Workflow Step | Current State | What Is Missing | Relevant Files | Risk or Impact |
|---|---|---|---|---|
| Study setup | Fixture/config only | Authorized CRUD, ownership, status transitions, validation | `src/config/paired-testing-demo.config.ts`, `studies` migration | Pilot cannot manage real studies |
| Protocol management | Fixture display plus version-capable schema | DB reads/writes, controlled publishing, immutable snapshots | protocol component; core schema | Rules shown may not be the rules used |
| Assignment creation | Local-state form | DB transaction, two slot records, membership checks, conflict handling | assignments client/store; core schema | New assignments are browser-specific |
| Assignment delivery | Simulated list | Per-tester query, readiness states, notification/reminder | assignments route; `assignment_testers` | Testers are not reliably directed |
| Tester identity | Login is real; submission identity is hardcoded | Bind `auth.uid()` to assignment slot and submission | auth server; submission client | Wrong person/assignment can be represented in UI |
| Synchronization | Countdown/checklist simulation | Authoritative readiness/start time and coordination state | submission client | Timing cannot be relied upon |
| Tester A/B submission | One hardcoded local form plus fixtures | DB insert/update rules, draft ownership, locked submission, both tester paths | submission client/store; `submissions` | No durable observation |
| Submission pairing | Prebuilt fixture | Transactional match after eligible A/B submissions; idempotency | fixtures; `matched_pairs` | New data never enters comparison queue |
| Evidence selection | Real browser file picker | Upload, retry, object path creation, metadata insert | submission client | File disappears on refresh/navigation |
| Evidence metadata | Synthetic fixture and future schema | Derive from actual object; validate against submission | fixtures; `evidence_files` | Metadata can diverge from file |
| Secure storage | Private bucket/policies defined | Application upload/signed-read endpoints and policy tests | Storage migration | Foundation exists but is unusable |
| File hashing | Synthetic labels/schema column only | Trusted server-side streaming hash and verification policy | fixtures; `evidence_files.sha256_hex` | No integrity attestation |
| MIME/size checks | Picker `accept` hints only | Server-side allowlist, signature sniffing, max size, rejection messages | submission client; Storage config | Invalid or unsafe files are not handled |
| Automatic validation | Works when fixtures are built | Trigger/service after pair completion and edits; persisted rule snapshots | validation engine; `validation_results` | UI may show stale results |
| Revalidation | Not implemented | Versioned rerun, supersession/history, reason | validation engine/schema | Changed data/rules not reflected |
| Expert review | Local decisions work | DB mutation, reviewer authorization, concurrency/reopen/approval rules | comparison client/store; `expert_reviews` | Decisions are not durable |
| Report generation | Local print/exports | DB-backed report model, frozen input snapshot, server rendering | reports components/exports | Outputs are not reproducible records |
| Report approval | Not implemented | Status machine, approver, timestamp, comments/sign-off | No report table | “Approved” output cannot be proven |
| Report versioning | Not implemented | Version entity and immutable inputs/artifacts | No report table | Later exports may silently differ |
| Activity logging | Selected local events | Server/database writer, authenticated actor, immutable event semantics | store; `activity_logs` | History is resettable/incomplete |
| Notifications | Not implemented | Channel, consent, templates, delivery/retry status | No service/table | Coordination remains manual |
| Evidence package | Button only refreshes toast | ZIP/archive job, checksums, manifest, authorization, download expiry | reports client | UI promise exceeds implementation |
| Persistence | Auth only for current user workflow | Typed repositories/server actions for all operational entities | `src/lib/data/profiles.ts` | Browser state cannot support a shared pilot |

# 10. Evidence Handling

## Current browser behavior

`FilePicker` in `src/components/paired-testing/submission/submission-client.tsx` provides separate screenshot and recording inputs. It uses browser `accept` hints (`image/*` and `video/*`). Selected `File` objects remain in React component memory and are not sent to a server, stored in Zustand, or uploaded.

On local submission, the observation receives fake IDs:

- `LOCAL-SCREENSHOT`
- `LOCAL-RECORDING`

No corresponding `EvidenceFile` record is appended. Consequently, the evidence repository does not gain the chosen files or their real metadata.

The synthetic evidence repository in `src/data/paired-testing-demo.fixtures.ts` includes display metadata such as filename, type, MIME label, size, capture/upload timestamp, integrity/review state, synthetic hash label, and chain-event count. These are fixtures, not inspected files.

## Intended storage foundation

`20260723000500_private_evidence_storage.sql` defines a private `PAIRED-TESTING-EVIDENCE` bucket and six policies:

- tester insert into authorized own path
- tester select own objects
- coordinator/reviewer select authorized objects
- admin insert
- admin update
- admin delete

The intended path shape is based on authorized study, assignment, and user IDs plus a generated filename. Local Supabase config/migration permits up to 50 MiB and allowlists JPEG, PNG, WebP, MP4, QuickTime, and JSON MIME types.

These policies and limits are a foundation, not a working application upload. The repository has no signed-upload endpoint, signed-read endpoint, upload service, retry state, object-to-row transaction, download control, or Storage client usage.

## Control status

| Control | Current status |
|---|---|
| File selection | Functional browser picker |
| Upload | Not implemented |
| Destination | Private Supabase bucket is defined, but unused by UI |
| Database relationship | `evidence_files` schema supports it; no current inserts |
| Size validation | Storage config has a limit; application/server validation not implemented |
| MIME validation | Picker hints and bucket allowlist exist; content signature validation not implemented |
| Malware scanning | Not implemented |
| Cryptographic hashing | Column exists; fixtures use display-only synthetic labels; trusted hashing not implemented |
| Duplicate detection | Not implemented |
| Access control | RLS/Storage policies defined; application path and live policy tests not implemented |
| Download/open | Not implemented in evidence UI |
| Deletion | Admin Storage policy exists; no UI, retention check, or legal-hold workflow |
| Retention | Not implemented |
| Evidence review | Synthetic status fields and expert UI context only |
| Chain of custody | Not implemented |

The current system does **not** provide a real chain of custody. Browser clocks, synthetic hashes, local activity events, and fixture “chain” counts are not forensic controls. Real evidence must not be described as court-ready or admissible based on this repository.

# 11. Validation Engine

The deterministic engine is `validatePair()` in `src/lib/validation/pair-validation-engine.ts`. Supporting functions are:

- `absolutePriceDifference()`, `percentagePriceDifference()`, `higherPricedTester()` in `src/lib/calculations/price-calculations.ts`
- `timestampDifferenceSeconds()` in `src/lib/calculations/date-calculations.ts`
- `haversineDistanceMeters()` and `haversineDistanceFeet()` in `src/lib/calculations/geographic-distance.ts`
- `comparisonRule()` and `thresholdStatus()` inside the validation engine

## Current rules

Exact comparisons normalize by trimming and lowercasing:

- same platform
- same pickup
- same destination
- same ride tier
- same currency
- same operating-system family when configured
- same app version when configured

Time rules from `src/config/paired-testing-demo.config.ts`:

- pass at 5 seconds or less
- warning above 5 through 10 seconds
- fail above 10 seconds

GPS rules:

- pass at 5 feet or less
- warning above 5 through 15 feet
- fail above 15 feet

Evidence completeness currently requires each submission's fixture evidence set to contain a completed quote screenshot, recording, and metadata. This expectation is encoded in validation behavior; it is not dynamically loaded from a persisted protocol version.

`sameNetworkCategory` exists in configuration but the engine does not generate a network-category comparison rule. Documentation or UI language implying that this check is active is therefore ahead of the code.

## Status behavior

- A missing A or B submission yields an `incomplete` pair result.
- Missing core metadata or required evidence causes overall `incomplete`.
- Otherwise, a required failure causes `invalid`.
- If no required failure exists but a warning exists, status is `warning`.
- Otherwise, status is `valid`.

Incomplete status therefore takes precedence over failure when required data/evidence is absent. Technical status is distinct from expert review status, which is a good architectural boundary.

## Configuration, version, persistence, and overrides

- Thresholds and some control flags are configured in a TypeScript fixture config, not a live database protocol.
- The schema supports protocol version linkage and validation config/value JSON snapshots.
- Fixture/local pair data displays a protocol version, but the current UI does not prove that validation was executed from a persisted immutable protocol record.
- Results are stored only in generated fixture/Zustand pair objects. The `validation_results` table is unused.
- Validation does not rerun after a local submission, file selection, assignment creation, edit, or review decision.
- Expert decisions can accept/flag/reject a pair separately; they do not overwrite the technical status. Override semantics, required reasoning, and reopening rules need expert approval.

Edge conditions requiring decisions/tests include invalid timestamps, coordinates outside valid ranges, currency precision, zero-value prices, duplicate submissions, exactly-on-threshold values, changing protocols, and which missing fields should be incomplete versus invalid.

# 12. Report and Export System

`src/components/paired-testing/reports/reports-client.tsx` generates browser downloads from the current Zustand state:

- all-pairs CSV
- accepted-pairs CSV
- excluded-pairs CSV
- evidence-inventory CSV
- activity-history CSV
- JSON manifest

`src/lib/exports/csv-export.ts` implements escaping, rows, and browser Blob downloads. `src/lib/exports/manifest-export.ts` creates/serializes the manifest. The protocol page also produces a TXT representation.

`src/components/paired-testing/reports/print-report-client.tsx` renders a browser-printable report using local pairs/submissions and calls `window.print()`. The user can choose “Save as PDF,” but the application does not create a server PDF artifact. The report includes study/protocol framing, pair results, calculations/summary, expert review statuses, evidence-related information, and explicit methodological limitations.

Current report facts:

- Source data is fixtures plus browser-local mutations, not operational database data.
- There is no `reports` or `report_versions` table.
- There is no draft/reviewed/approved status machine, approver identity, approval timestamp, signature, or frozen input snapshot.
- A reviewer decision affects which local pairs appear in accepted/excluded exports, but it is not a report approval.
- Downloads are not registered in an audit log by the server.
- The JSON manifest uses the current browser time, while the print view includes fixed fixture content/timestamps in places, so outputs are not one immutable package.
- “Generate Demo Package” only shows a success toast stating the manifest was refreshed. It does not assemble or download a ZIP/archive.
- The current print limitation text says no production authentication or storage is implemented. That wording is now stale because an authentication and Storage-policy foundation exists, although the evidence workflow remains unconnected.

No complete evidence package, checksum file, signed manifest, ZIP, retained artifact, or expiring authorized download is produced.

# 13. Activity Log and Auditability

The local store appends events for selected actions, including local assignment creation, draft/submission activity, and expert decision changes. Fixture events provide the rest of the visible history. `interactionTimestamp()` uses the browser clock. Actor labels are local/hardcoded display strings rather than authenticated database actor IDs.

Limitations:

- Events live in Zustand persisted to browser `localStorage`.
- A user can inspect or change local state through browser tools.
- Reset restores fixture state and removes local history.
- Reviewer note editing alone does not consistently produce its own audit event.
- Before-and-after values are not systematically recorded.
- Reads, exports, failed actions, authentication changes, and many mutations are not logged.
- Concurrent users do not share one history.

The schema includes `activity_logs` with actor, action, category, target, JSON details, and timestamp. The RLS migration makes ordinary authenticated access read-oriented and append-restricted, but the repository contains no trusted server/database function that currently writes these events for application operations. The table is therefore a foundation, not an active audit trail.

The browser activity page must not be described as immutable or tamper-resistant.

# 14. Current AI Usage

There is no confirmed AI integration.

No OpenAI, Anthropic, Gemini, local-model, AI SDK, embedding, OCR/document extraction, classifier, summarizer, anomaly detector, or AI report-drafting dependency/call was found. There are therefore no current model prompts, AI outputs, model error handling, hallucination controls, or AI data-sharing flows to document.

Any future AI capability must remain assistive: source-bounded extraction or drafting with provenance and mandatory human review. It must not determine technical validation, evidence integrity, legal conclusions, or final expert acceptance.

# 15. Automation Readiness Assessment

| Capability | Classification | Reason |
|---|---|---|
| A. Assignment automation | **Requires moderate extension** | Schema and UI concepts exist; needs DB services, transactions, permissions, scheduling/conflict rules |
| B. Tester-submission matching | **Requires moderate extension** | Two slots, submissions, and pairs are modeled; needs idempotent server-side match orchestration |
| C. Automatic validation/revalidation | **Requires moderate extension** | Tested deterministic engine exists; needs DB type adapters, version snapshots, transaction/job execution, history |
| D. Evidence metadata extraction | **Requires major architectural work** | Storage schema exists, but no upload pipeline, trusted inspection, hashing, extraction, or scanner |
| E. Missing-evidence detection | **Ready with minor-to-moderate work** | Current deterministic rule exists; must operate on real evidence rows and persisted protocol requirements |
| F. Draft report generation | **Requires moderate extension** | Local serializers/print model exist; needs persistent report/version/input snapshot and server artifact |
| G. AI-assisted report narrative | **Requires major work and domain approval** | No AI layer or approved corpus/prompts; provenance, privacy, review, and allowed-language decisions are missing |
| H. Human approval workflow | **Requires moderate extension** | Expert review model exists; report approval/version state does not |
| I. Notifications/reminders | **Requires major work and product decisions** | No provider, event/outbox, consent, templates, preferences, or delivery/retry model |
| J. Evidence-package generation | **Requires moderate-to-major extension** | Export primitives exist; needs authorized background archive, actual evidence, checksums, manifest, retention |
| K. Source provenance tracking | **Requires moderate-to-major extension** | Evidence metadata has partial provenance fields; trustworthy capture, transformations, versions, and export lineage are absent |
| L. Research-document ingestion | **Requires major architectural work; blocked by scope decisions** | No document/source model, parser, storage workflow, or approved sources |
| M. Timeline generation | **Requires major work; blocked by domain decisions** | No event/source claim model beyond operational activity |
| N. Contradiction tracking | **Requires major work; blocked by domain decisions** | No claim/evidence relation, resolution workflow, or review taxonomy |
| O. Expert-witness intelligence | **Requires major work; blocked by legal/product decisions** | Outside current paired-testing data model and MVP; sources, ethics, accuracy, and customer need undefined |

# 16. Recommended Automation Architecture

The existing Next.js/Supabase architecture should be extended incrementally.

## Recommended responsibility split

1. **Next.js server actions/service modules**
   - Validate untrusted input with Zod.
   - Derive user identity from the server session, never a client actor ID.
   - Enforce global role and study membership with `requireRole()`/`requireStudyMembership()`.
   - Orchestrate study, assignment, submission, review, report, and signed-file operations.
   - Return typed, user-safe errors.

2. **PostgreSQL constraints, RLS, and narrow transactional functions**
   - Remain the final authorization/data-integrity boundary.
   - Enforce uniqueness, ownership, slot relationships, status transitions where practical, and append-only important events.
   - Use narrowly scoped security-definer functions only where a normal RLS mutation cannot safely express a transaction.
   - Atomically create a pair and an activity event when both eligible submissions exist.

3. **Deterministic validation service**
   - Reuse the existing pure calculation/validation modules.
   - Convert generated database rows into a versioned validation input.
   - Persist every rule output, protocol version/config snapshot, engine version, execution time, and supersession reason.
   - Do not use AI for pass/warn/fail.

4. **Private Supabase Storage**
   - Generate object paths on the trusted server.
   - Use short-lived signed upload/download operations or server-mediated streaming.
   - Insert evidence metadata only after confirmed upload/inspection.
   - Never expose the service-role key to clients or general builder environments.

5. **Background jobs/outbox, when needed**
   - Initially, matching and small validation can run synchronously in a database transaction/server action.
   - Add an outbox/worker for hashing/scanning large files, revalidation batches, report/ZIP generation, and notifications.
   - Jobs need idempotency keys, retry limits, terminal failure state, operator visibility, and activity events.
   - A managed queue/worker choice is **Not confirmed from the repository** and should be selected only after pilot volume and hosting constraints are known.

6. **Reports**
   - Introduce report and report-version entities.
   - Freeze exact study/protocol/pair/review/evidence references per version.
   - Separate draft, under review, approved, superseded, and failed states.
   - Generate artifacts server-side; authorize every generation and download.

7. **AI, later**
   - Limit to approved-source extraction or draft narrative.
   - Store source references and model/run metadata without secrets.
   - Require a reviewer to edit/approve content.
   - Never let an AI output mutate deterministic validation or become a legal conclusion automatically.

Zapier or a similar external orchestrator may be acceptable later for low-risk internal notifications from a sanitized outbox. It should not perform core identity checks, RLS-sensitive mutations, evidence integrity work, technical validation, expert decisions, or report approval.

Until methodology, privacy, retention, and evidence procedures are approved, keep all workflow data synthetic or expressly authorized controlled pilot data.

# 17. Prioritized Implementation Plan

This plan is technical scope, not a compensation commitment. Paul and Jed should first submit a written, capped kickoff scope showing exactly which acceptance criteria they can complete. Any later scope or compensation through Sprints 1–3 remains subject to Skyler's approval. The project owner will write the formal sprint documentation; builders should supply PR summaries, migration notes, test evidence, known limitations, and handoff notes.

## Proposed Sprint 1–3 sequence

### Sprint 1 — Database-backed coordination vertical

Goal: replace the first synthetic path with a persistent, authorized study → protocol → assignment → tester-slot → tester draft/submission flow.

Suggested ownership:

- **Paul:** study/platform/service management, protocol creation/version selection, membership administration, coordinator workflows.
- **Jed:** assignment creation, tester A/B slot workflow, own-assignment list, draft and submit transitions.
- **Project owner:** architecture/integration review, migrations/RLS review, shared type/data-access conventions, acceptance testing, and sprint documentation.

Definition of done:

- A coordinator can create or select a study and published protocol, create an assignment, and assign two authorized testers.
- Each tester sees only their own relevant slot and can save a draft and submit a valid observation.
- Refresh and a separate browser session preserve the same database state.
- Cross-study, cross-user, and direct-ID attempts are denied by both server checks and RLS tests.
- Fixtures remain available as a clearly separate demo mode until the replacement flow is accepted.

### Sprint 2 — Pairing, real evidence, and persisted technical validation

Goal: complete controlled submission capture and automatically form/validate a pair.

Suggested ownership:

- **Paul:** controlled protocol publication/config snapshots, coordinator monitoring and correction/status workflows.
- **Jed:** server-generated evidence paths, private uploads, evidence metadata, submission locking, pairing, persisted validation results.
- **Project owner:** threat review, Storage/RLS test matrix, validation equivalence tests, failure/retry decisions, acceptance documentation.

Definition of done:

- Actual supported files upload privately and produce evidence rows linked to the correct tester submission.
- Two eligible submitted slots create exactly one matched pair, idempotently.
- Deterministic rules execute from the recorded protocol version and persist individual results plus overall status.
- Missing evidence is visible; reruns are controlled and versioned rather than silently overwriting history.
- Testers cannot read partner raw submissions/evidence unless methodology explicitly authorizes it.

This sprint does not by itself create forensic chain of custody. Hashing trust boundary, malware scanning, retention, correction, and legal-hold procedures still require approved design.

### Sprint 3 — Expert review, authorized reports, auditability, and pilot hardening

Goal: make the completed pair usable in a supervised internal pilot without implying legal/forensic readiness.

Suggested ownership:

- **Paul:** expert/reviewer and law-viewer workflows, report version/status/approval model, controlled administrative paths.
- **Jed:** signed evidence access, report/export artifact generation, controlled activity event creation, operational failure states.
- **Project owner:** end-to-end security testing, role-account rehearsal, backup/retention/incident decisions, release gate, and documentation.

Definition of done:

- Authorized reviewers can decide, reason, note, and—if approved by methodology—reopen a review without changing technical results.
- A report version freezes its inputs and cannot become “approved” without an authorized human action.
- Authorized exports/package generation are reproducible and logged.
- Important writes have authenticated actor IDs and server/database timestamps.
- Separate admin, coordinator, tester A, tester B, reviewer, and viewer accounts pass the full RLS/Storage/direct-URL matrix.
- The pilot uses only approved data and proceeds through a supervised rehearsal and rollback plan.

## Scope A — Complete the Current Functional Vertical Slice

| Priority | Task | Dependencies | Exact files likely affected or added | Difficulty | Acceptance criteria |
|---|---|---|---|---|---|
| A0 | Agree state machines and authorization matrix | Expert role/method decisions | `docs/DATABASE_SCHEMA.md`, new ADR/spec docs, current migrations | Medium | Approved transitions and per-role CRUD matrix exist before mutation code |
| A1 | Create typed operational data layer and server actions | A0, generated types | `src/lib/data/profiles.ts`; new `src/lib/data/{studies,protocols,assignments,submissions,pairs,reviews,reports}.ts`; new feature action files | Large | Feature clients contain no direct privileged mutation; errors typed; actor derived server-side |
| A2 | Connect study/protocol selection | A1, membership rules | protocol route/client; new study/protocol actions; `protocols` migration if transitions need refinement | Medium | Coordinator can create/select/publish authorized version; tester flow records exact version |
| A3 | Persist assignment plus two tester slots atomically | A1–A2 | assignments route/client, form schema, data actions, `assignments`, `assignment_testers` migrations/policies | Large | One authorized transaction creates assignment and exactly two valid distinct slots |
| A4 | Replace hardcoded submission identity and persist draft/submit | A3 | submission route/client, form schema, submission data actions, `submissions` policies | Large | Signed-in assigned tester edits only own draft; submit transition is durable and validated |
| A5 | Implement private evidence upload and metadata records | A4, evidence policy decisions | new evidence service/actions; submission/evidence clients; Storage/evidence migrations | Large | Server-derived path, real upload, verified row link, retry/failure UX, authorized signed read |
| A6 | Match and validate eligible submissions | A4–A5, approved protocol | validation engine adapter; pair service/function; pair/validation migrations | Large | Exactly one pair; deterministic versioned rule results; idempotent retries; incomplete evidence handled |
| A7 | Persist expert review | A6, review state decisions | pair comparison client; new review action/data module; `expert_reviews` policies | Medium | Authorized reviewer decision persists with reason/note/time; technical status remains unchanged |
| A8 | Add report version, human approval, and authorized export | A7, report requirements | new report migrations/types/services/routes; reports clients/exports/print view | Large | Frozen draft version, explicit human approval, reproducible authorized download |
| A9 | Add trusted activity events around every important mutation | A1–A8 | activity migration/function/service; all mutation actions; audit client | Large | Actor/server time/action/target/outcome recorded atomically; normal users cannot edit/delete logs |
| A10 | End-to-end role/RLS/Storage tests | A1–A9, test accounts/local stack | new integration/E2E test suites and fixtures | Large | Positive and negative matrix passes for each role and direct object attempt |

## Scope B — Automation-Ready Improvements

| Priority | Improvement | Purpose and acceptance boundary |
|---|---|---|
| B1 | Durable activity outbox/log | Atomic event with each important write; retryable downstream work; no client-authored actor/time |
| B2 | Report versions/artifact registry | Immutable inputs, checksum, status, creator/approver, supersession, generation failure |
| B3 | Protocol publication/version immutability | Submitted assignments retain exact rules even after a later protocol version |
| B4 | Trusted evidence inspection | MIME signature, size, hash, scanner status, extraction status, quarantine/rejection |
| B5 | Automatic revalidation | Explicit trigger/reason/engine version; historical results retained; no silent overwrite |
| B6 | Background processing | Idempotent worker for large hashing/scanning, report/archive generation, retries, dead-letter/operator view |
| B7 | Notifications | Sanitized outbox, user preferences/consent, delivery/retry status; never include sensitive evidence in message bodies |
| B8 | Failure/admin monitoring | Pending/failed/stuck jobs, orphaned objects, unmatched submissions, export failures, access anomalies |
| B9 | Retention/legal-hold controls | Approved schedules, deletion authorization, object+row consistency, hold overrides, recorded execution |
| B10 | Staging and operational controls | Separate project/data, backups, recovery rehearsal, monitoring, incident owner, release checklist |

## Scope C — Deferred AI and OSINT Capabilities

Keep these outside the paired-testing MVP until the functional pilot, data governance, and expert methodology are accepted:

- approved research-document ingestion
- source logging and provenance
- document metadata extraction
- claim classification
- timeline generation
- contradiction registers
- AI-assisted report drafting
- expert-witness intelligence
- docket or approved public-source research

Each future capability requires a defined source policy, lawful purpose, access/retention rules, citations, model/privacy review, accuracy evaluation, and mandatory human acceptance. None should alter deterministic pair validation or automatically make legal conclusions.

# 18. Security and Privacy Review

Ratings reflect current repository evidence and the risk **if the prototype is used for real data**. No Critical issue is asserted without proof of an exploitable production path.

| Rating | Confirmed risk | Evidence and consequence | Required control |
|---|---|---|---|
| High | Operational records are local and client-tamperable | Zustand `persist` in `src/store/paired-testing-demo.store.ts` | Do not use local records as evidence; move writes server-side |
| High | Evidence has no working secure ingestion/integrity pipeline | submission client; unused Storage/evidence schema | Private server-derived upload, inspection, hashing, metadata transaction |
| High | Live RLS/Storage behavior has not been integration-tested in repository | migrations exist; no policy integration tests | Separate-role positive/negative tests before real data |
| High | No retention, legal hold, or complete deletion procedure | no retention entities/workflow | Approve policy and implement object/row lifecycle before collection |
| High | Activity history is incomplete/resettable | local store/audit client; unused DB log writer | Trusted append event path with actor/server time |
| High | Synthetic and future real-data modes could be confused | same operational UI/store; no environment/data banner boundary | Explicit demo/pilot mode, isolated environment, no fixture mutation into production |
| Medium | Every active role can open every feature route | protected layout only calls `requireActiveUser()` | Server role/membership checks on routes/actions; RLS remains final boundary |
| Medium | Interface role restrictions are client/local state | app shell, assignment/review clients | Never authorize from Zustand or hidden controls |
| Medium | Sensitive location/device/account metadata is modeled without approved minimization | `submissions` fields | Purpose/consent/minimization, field-level UI controls, retention |
| Medium | Browser exports are not centrally authorized/registered artifacts | reports client/export utilities | Server-authorized export, access logging, expiry/watermark as required |
| Medium | Authentication recovery/MFA/rate-limit controls are absent | auth code/config | Define account lifecycle, MFA need, provider protections, admin recovery |
| Medium | No application-level direct-object test coverage | no RLS/E2E matrix | Test guessed study/assignment/submission/evidence IDs by every role |
| Medium | Evidence bucket permits admin deletion but has no retention/hold gate in application | Storage migration | Controlled delete function requiring policy checks and activity event |
| Low | Service-role key is named in example documentation | `.env.example` | Keep optional/server-only, never distribute/expose; rotate if ever disclosed |
| Low/none currently | AI data sharing | No AI integration found | Establish approval and redaction policy before adding any provider |

Security-positive evidence includes ignored `.env*` files except `.env.example`, use of public Supabase variables only in browser clients, no application use of the service-role key, safe internal login redirects, RLS enabled on all public tables, anonymous grants revoked, and private evidence bucket intent.

# 19. Bugs, Inconsistencies, and UX Confusion

| Issue | Confirmed evidence | Impact |
|---|---|---|
| New assignment never creates a pair | `addAssignment()` in store; assignments client | It cannot enter the pair queue or validation flow |
| Submission is bound to fixture array positions | `assignmentsFixture[7]`, `testerProfilesFixture[0]` in submission client | Signed-in identity and selected assignment are ignored |
| Local submission does not update/create pair | submission client/store | Comparison remains linked to old fixture data |
| “Awaiting paired validation” does not trigger validation | submission/store/validation engine call graph | Status message overstates automation |
| Chosen files become fake evidence IDs only | `LOCAL-SCREENSHOT`, `LOCAL-RECORDING` | File and metadata disappear; evidence page stays disconnected |
| File `accept` is broad and not security validation | `FilePicker` | Unsupported/unsafe content is not reliably rejected |
| Zod treats files as optional/`any`; UI separately requires them | form schema and submission client | Validation rules are split and can diverge |
| Network rule is configured but not evaluated | `sameNetworkCategory` in config; no engine rule | Protocol display can imply a nonexistent control |
| Required evidence behavior is hardcoded | validation engine/config usage | Persisted protocol requirements cannot drive the engine |
| Activity deep link is ignored | pair link includes `/audit?object=...`; `AuditClient` does not consume query | “Open Activity Log” does not focus on the pair |
| Package button only shows a toast | reports client | Users may believe a package was created |
| Print limitation text is stale | print report says no production authentication/storage | Understates the new foundation while evidence remains disconnected |
| Manifest timing is inconsistent | reports client uses current browser time; print/fixtures use fixed data | Outputs are not one reproducible version |
| Assignment Evidence column is inferred from assignment status | assignments client | It does not measure actual evidence |
| Active roles share all navigation/routes | app shell/protected layout | Role expectations are confusing and screens may reveal synthetic details |
| Tester draft is one global local object | store | It is not keyed per user/assignment and can collide |
| Saved draft is not loaded as form defaults | store and submission client | “Save draft” does not provide a reliable resume experience |
| Assignment schedule ordering is not validated | `assignmentSchema` | End time may precede start time |
| Dashboard copy includes fixed fixture totals/status text | dashboard client/config | Mutated local state can disagree with explanatory copy |
| Zero-price percentage behavior returns zero | price calculation | Technically deterministic but methodologically questionable; DB permits zero |
| Reviewer note change is not always its own event | comparison client/store | Visible activity history is incomplete |

# 20. Tests and Quality Status

Safe local results on audit date:

- ESLint: passed.
- TypeScript `tsc --noEmit`: passed.
- Vitest: 8 files passed; 42 tests passed.
- Known failing tests: none in this local run.
- Production build: not run during this audit.

Existing test areas:

| Test file | Coverage |
|---|---|
| `src/tests/auth/auth-foundation.test.ts` | Login validation, safe redirects, missing-config/proxy behavior |
| `src/tests/calculations/price-calculations.test.ts` | Price difference, percentage, higher side, median |
| `src/tests/calculations/dashboard-metrics.test.ts` | Local metric aggregation |
| `src/tests/validation/pair-validation-engine.test.ts` | Exact controls, thresholds, evidence/missing behavior, status outcomes |
| `src/tests/validation/form-schemas.test.ts` | Assignment/submission form validation |
| `src/tests/store/store.test.ts` | Local store mutations/reset behavior |
| `src/tests/exports/exports.test.ts` | CSV/manifest formatting |
| `src/tests/components/pair-table.test.tsx` | Pair table rendering/filtering behavior |

Critical missing coverage:

- Real Supabase sign-in, session refresh/expiry, sign-out, pending/disabled accounts.
- Auth-user trigger/profile/role bootstrap.
- Every RLS policy with separate admin/coordinator/tester/reviewer/viewer accounts.
- Storage upload/select/update/delete policy matrix and path traversal/guessed-ID attempts.
- Feature route/server-action authorization.
- Database transactions and concurrent/idempotent assignment/pair creation.
- Assignment → tester A/B submission → evidence → pair → validation → review → report integration.
- Revalidation/version/history behavior.
- Report authorization, approval, reproducibility, and artifact checksum.
- Trusted activity event completeness.
- Browser E2E behavior, accessibility, recovery/failure UX, and deployment smoke tests.

Minimum pilot gate: pure unit tests plus local Supabase integration tests, Storage policy tests, server-action tests, multi-role E2E tests, concurrency/idempotency tests, and a staging smoke/recovery rehearsal. Forty-two passing prototype tests do not establish production security or workflow completeness.

# 21. Deployment and Environment

- **Platform:** Not confirmed from the repository. Project context says Vercel is intended/connected, but there is no tracked `vercel.json` or project metadata.
- **Build command:** `npm run build` invokes `next build`.
- **Start command:** `npm run start` invokes `next start`.
- **Output settings:** default Next.js behavior; `next.config.ts` has no custom output configuration.
- **Public required variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Optional server-only variable:** `SUPABASE_SERVICE_ROLE_KEY`; not currently used and should normally remain unset for this application.
- **Local secrets:** `.env.local` is ignored by `.gitignore`; values were not inspected.
- **Local Supabase:** `supabase/config.toml` configures a local project, Auth behavior, and Storage limits. It does not prove hosted settings.
- **Staging:** Not confirmed from the repository.
- **Production/test separation:** Not confirmed from the repository.

Deployment risks:

1. Preview and production deployments could point to the same Supabase project if environment variables are reused.
2. Local `config.toml` signup settings do not automatically govern hosted Auth.
3. A successful build would not make the core workflow database-backed.
4. No monitoring, error reporting, backup/recovery runbook, or incident process is configured.
5. No source-controlled environment inventory distinguishes local, test, staging, and production projects.

The current deployed interface should be treated as safe only for synthetic demonstration data unless an authorized pilot has separately completed the RLS/Storage, privacy, retention, evidence, and operational gates described here.

# 22. Exact File Reference Index

| System Area | File Path | Important Functions/Components | Purpose |
|---|---|---|---|
| Dependencies/scripts | `package.json` | scripts/dependencies | Confirmed stack and quality commands |
| Route protection | `src/proxy.ts` | `proxy`, matcher config | Applies session handling |
| Supabase proxy | `src/lib/supabase/proxy.ts` | `updateSession`, `createLoginRedirect` | Cookie/session redirects |
| Server auth | `src/lib/auth/server.ts` | `getCurrentIdentity`, `requireActiveUser`, `requireRole`, `requireStudyMembership` | Server identity/authorization helpers |
| Login actions | `src/app/auth/actions.ts` | `signInAction`, `signOutAction` | Auth mutations |
| Redirect validation | `src/lib/auth/safe-next-path.ts` | `getSafeNextPath` | Prevents external login redirect |
| Login UI | `src/components/auth/login-form.tsx` | `LoginForm` | Sign-in states and errors |
| Protected layout | `src/app/paired-testing-demo/layout.tsx` | layout | Active-user enforcement |
| Supabase clients/env | `src/lib/supabase/{server,client,env}.ts` | `createClient`, env checks | Typed SSR/browser clients |
| Profile data access | `src/lib/data/profiles.ts` | `getProfileByUserId` | Current DB profile/role read |
| DB types | `src/types/database.types.ts` | generated `Database` | Schema-aligned TypeScript |
| Identity migration | `supabase/migrations/20260723000100_identity_and_enums.sql` | enums, Auth trigger | Profiles/roles/bootstrap |
| Core schema | `supabase/migrations/20260723000200_core_schema.sql` | 16 public tables | Operational relational model |
| Auth helpers | `supabase/migrations/20260723000300_authorization_helpers.sql` | private role/membership helpers | RLS predicates |
| RLS | `supabase/migrations/20260723000400_row_level_security.sql` | table policies | Row authorization |
| Storage | `supabase/migrations/20260723000500_private_evidence_storage.sql` | bucket/object policies | Intended private evidence access |
| Prototype domain | `src/types/paired-testing-demo.types.ts` | local interfaces/enums | Synthetic/local model |
| Fixtures | `src/data/paired-testing-demo.fixtures.ts` | deterministic fixture generation | Synthetic study/workflow |
| Protocol config | `src/config/paired-testing-demo.config.ts` | `demoConfig` | Unapproved demo rules/thresholds |
| Local store | `src/store/paired-testing-demo.store.ts` | `useDemoStore`, `addAssignment`, submission/review mutations | Browser-local behavior |
| Assignment UI | `src/components/paired-testing/assignments/assignments-client.tsx` | `AssignmentsClient`, `AssignmentDialog` | Local assignment list/create |
| Submission UI | `src/components/paired-testing/submission/submission-client.tsx` | `SubmissionClient`, `FilePicker` | Hardcoded local observation |
| Validation | `src/lib/validation/pair-validation-engine.ts` | `validatePair`, `comparisonRule`, `thresholdStatus` | Deterministic technical rules |
| Calculations | `src/lib/calculations/` | price/time/distance/metrics functions | Pure analytical helpers |
| Pair/review UI | `src/components/paired-testing/comparison/pair-comparison-client.tsx` | `PairComparisonClient` | Local technical/expert view |
| Evidence UI | `src/components/paired-testing/evidence/evidence-client.tsx` | `EvidenceClient` | Fixture metadata repository |
| Reports UI | `src/components/paired-testing/reports/reports-client.tsx` | `ReportsClient` | Local downloads/package toast |
| Print report | `src/components/paired-testing/reports/print-report-client.tsx` | `PrintReportClient` | Browser print output |
| Export serializers | `src/lib/exports/{csv-export,manifest-export}.ts` | CSV/manifest functions | Client export generation |
| Activity UI | `src/components/paired-testing/audit/audit-client.tsx` | `AuditClient` | Browser-local event list |
| App shell | `src/components/paired-testing/layout/app-shell.tsx` | `AppShell`, `DemoRoleSwitcher` | Navigation/account/local role mapping |
| Tests | `src/tests/` | 8 test files | Current unit/component coverage |
| Setup | `docs/SUPABASE_SETUP.md` | setup procedure | Manual project/admin instructions |
| Schema guide | `docs/DATABASE_SCHEMA.md` | entity/policy guide | Human-readable DB design |
| Foundation status | `docs/AUTH_DATABASE_FOUNDATION.md` | phase status | Known limits and handoff |
| Assumptions | `ASSUMPTIONS.md` | preliminary assumptions | Explicitly unapproved methodology |
| Discovery | `docs/EXPERT-DISCOVERY-QUESTIONS.md` | priority questions | Human/expert requirement gathering |

# 23. Questions That Require Human or Expert Decisions

## Methodology and product

1. What precise question may each study answer, and what conclusions must the software avoid?
2. Are comparisons same-platform, cross-platform, account-profile, demographic, geographic, device-based, or another design?
3. Which conditions must match exactly, which have tolerances, and which remain expert judgment?
4. Are the current 5/10-second and 5/15-foot thresholds acceptable? The repository cannot validate them scientifically.
5. Is network category required, and how is it measured consistently?
6. What automatically makes a submission or pair incomplete, invalid, excludable, or correctable?
7. Can technical failures be overridden? By whom, with what reason/sign-off?
8. What is the minimum useful supervised pilot: users, pairs, duration, platforms, and data sensitivity?

## Tester and workflow operations

9. How are testers recruited, verified, trained, scheduled, compensated, supported, and removed?
10. What readiness/synchronization procedure is authoritative?
11. May one coordinator or tester participate in multiple studies and roles?
12. May a submitted observation be corrected, withdrawn, or replaced? How is history retained?
13. Who resolves missing partners, duplicate observations, late submissions, and technical failures?

## Evidence, privacy, and legal/forensic expectations

14. Which evidence is mandatory: screenshot, continuous recording, visible clock, GPS proof, account state, device/network details, witness confirmation, or other?
15. What capture instructions, naming, hash, scanner, provenance, correction, export, and chain-of-custody controls are required?
16. Which personal/location/device/account fields are lawful and necessary, and what consent/notice is required?
17. What are retention, deletion, litigation/legal hold, backup, residency, and incident-response rules?
18. Who may see tester identities, partner data, raw evidence, reviewer notes, and exports?
19. Is the goal operational research support, litigation support, expert work product, or another category? Qualified counsel/expert must define expectations.

## Roles, review, reports, and customers

20. Should global roles and study roles differ, and who administers them?
21. What expert statuses, reason codes, reopen/correction rules, multi-reviewer rules, and sign-off are required?
22. What does a law firm need: raw data, pair table, narrative, evidence inventory, manifest, exhibits, statistics, or integration?
23. What report statuses/versions are required, and who can approve, supersede, download, or revoke access?
24. What client/matter/organization model is needed beyond `studies`?
25. Which customer and pricing decisions affect tenancy, usage limits, support, and scope? No pricing commitment is established by this audit.

## Real data and AI

26. Who can authorize real-data collection, under which approved protocol and environment?
27. What release gate must be met before synthetic-only restrictions are lifted?
28. Which AI tasks, if any, are permitted, with which approved sources/providers and data classes?
29. Must AI use be disclosed in reports? What citation, evaluation, and human approval are mandatory?
30. Are OSINT, docket/public-source research, contradiction tracking, and expert-witness intelligence actually customer requirements or separate products?

# 24. Final Technical Verdict

1. **What it already does well:** It communicates a plausible paired-testing workflow, keeps deterministic technical status separate from expert review, contains useful pure/tested calculation code, implements real Supabase authentication, and provides a strong normalized schema/RLS starting point.
2. **What prevents completeness:** The core workflow is not connected to persistent records or actual evidence; matching/validation do not execute after new submissions; reviews/reports/activity are local; and live multi-role security/Storage behavior is untested.
3. **Five highest-priority changes:**
   1. Establish typed server-side data access, authorization, and tested state transitions.
   2. Persist assignments, two tester slots, drafts, and submissions tied to `auth.uid()`.
   3. Implement private evidence upload/metadata with server-derived paths and security tests.
   4. Create idempotent matching plus persisted, versioned deterministic validation.
   5. Persist expert review, trusted activity events, and versioned human-approved reports.
4. **Feature that should not be rebuilt:** The deterministic calculation/validation modules and the overall Supabase relational/RLS foundation should be adapted and tested, not discarded. The synthetic prototype should remain temporarily as a regression/demo reference.
5. **What should remain deferred:** AI narrative, OSINT/research ingestion, expert-witness intelligence, contradiction/timeline tooling, and production-grade forensic claims.
6. **Can it extend incrementally?** Yes. Next.js server actions/services, PostgreSQL/RLS, private Storage, and pure validation modules form a reasonable incremental architecture. No objective evidence requires a complete rewrite.
7. **Immediate next development step:** Before real data, approve the role/state-transition matrix and implement one staging-only Sprint 1 path: coordinator creates an assignment with two slots; each authenticated tester sees only their slot and persists a draft/submission; multi-account RLS tests prove isolation.

## Adviser Handoff Summary

- **Current architecture:** Next.js App Router client/server UI, Supabase Auth/PostgreSQL/Storage foundation, Zustand local prototype state, deterministic TypeScript validation/calculation modules, browser-generated exports.
- **Current end-to-end workflow:** Real login leads into a synthetic/local workflow. Local assignment, hardcoded submission, fixture matching/validation, local expert decisions, and browser exports do not form a persistent shared pipeline.
- **Existing automation:** Safe login redirect/session checks, Auth profile bootstrap, price/time/GPS calculations, exact control checks, evidence completeness logic for fixtures, pair status, dashboard metrics, CSV/JSON/TXT serialization, and browser print.
- **Disconnected/manual steps:** Study/protocol CRUD, tester-specific delivery, two-sided submissions, upload, hashing/scanning, matching trigger, persisted validation/revalidation, persistent review, report approval/versioning, notifications, trustworthy logs, and ZIP package.
- **Database status:** Sixteen public tables, generated types, helpers, RLS, and private Storage policies exist. Application feature CRUD and live policy verification do not.
- **Authentication status:** Email/password sign-in, sign-out, session handling, active profile/role checks, protected layout, and safe redirects exist. Recovery/MFA/admin UI and per-feature role enforcement do not.
- **Evidence-storage status:** A private bucket and policies are defined, but files remain in browser memory and fixture metadata; there is no real upload/download/integrity/retention workflow.
- **Report status:** Local CSV/JSON/TXT and browser print work. There is no persistent report, version, approval, server artifact, or complete evidence package.
- **Highest-priority gaps:** Persistent authorized vertical slice, real evidence pipeline, idempotent matching/versioned validation, durable expert/report workflow, and multi-role RLS/Storage tests.
- **Recommended next step:** Complete the Sprint 1 staging vertical and isolation tests while keeping data synthetic. Let Paul and Jed propose a capped kickoff scope against the acceptance criteria; keep later scope approval with Skyler.
- **Files to inspect first:** `src/store/paired-testing-demo.store.ts`, `src/components/paired-testing/submission/submission-client.tsx`, `src/lib/validation/pair-validation-engine.ts`, `src/lib/auth/server.ts`, `src/app/auth/actions.ts`, `supabase/migrations/20260723000200_core_schema.sql`, `supabase/migrations/20260723000400_row_level_security.sql`, and `supabase/migrations/20260723000500_private_evidence_storage.sql`.
