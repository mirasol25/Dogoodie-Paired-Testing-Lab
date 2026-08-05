# Authentication and Database Foundation

## Scope

Phase 0 adds a secure Supabase foundation without moving the existing synthetic prototype into the database. Authentication, profiles, roles, study membership, schema, RLS, and private Storage policies are real foundation code. Dashboard data and prototype interactions still use fixtures and Zustand until the builder phases connect them deliberately.

## Architecture

```text
Browser
  ├─ /login → Server Action → Supabase Auth
  └─ /paired-testing-demo/*
         ↓
Next.js 16 Proxy
  ├─ validates/refreshes Supabase JWT cookies
  └─ optimistic redirect to /login?next=...
         ↓
Protected Server Layout
  ├─ verifies claims and current Auth user
  ├─ loads profiles + user_roles through RLS
  └─ requires account_status = active
         ↓
App Shell
  └─ displays actual name/email and database role
         ↓
Future builder data access
  └─ typed Supabase client → Postgres RLS / private Storage RLS
```

Proxy is not the authorization boundary. It refreshes cookies and provides a fast redirect. The protected server layout verifies the user again, and every database/storage operation remains constrained by RLS.

## Authentication flow

1. The user opens a protected path.
2. `src/proxy.ts` calls `updateSession()`.
3. Supabase `getClaims()` validates the access token and refreshes cookies if necessary.
4. An unauthenticated request is redirected to `/login?next=<safe-internal-path>`.
5. `/login` accepts email and password only. It has no registration link.
6. The Server Action calls `signInWithPassword()`.
7. The action loads the database profile and role.
8. Pending or disabled accounts are signed out and denied.
9. Active users return to the validated internal `next` path.
10. The protected layout repeats server-side identity and active-profile verification.
11. Logout calls Supabase `signOut()` in a Server Action and redirects to `/login`.

The safe-path helper accepts only `/paired-testing-demo` and its descendants. Absolute URLs, protocol-relative URLs, backslash tricks, and unrelated internal paths fall back to `/paired-testing-demo`.

## Supabase clients

| Utility | Runtime | Purpose |
|---|---|---|
| `src/lib/supabase/client.ts` | Browser Client Components | Future authenticated browser queries or realtime subscriptions |
| `src/lib/supabase/server.ts` | Server Components, Actions, Route Handlers | Cookie-aware server queries and Auth operations |
| `src/lib/supabase/proxy.ts` | Next.js Proxy | Token validation, refresh-cookie propagation, optimistic redirects |

All three use the project URL and publishable key. No client imports or normal application requests use the service-role key.

## Identity and global roles

`profiles` stores account identity and activation status. `user_roles` is the authoritative global authorization table.

Roles are not read from browser input, Zustand, URL parameters, or editable Auth metadata.

| Global role | Foundation meaning |
|---|---|
| `admin` | System-wide administration and operational correction |
| `test_coordinator` | Manages workflows only for assigned studies |
| `tester` | Accesses only assigned slots and owned submissions/evidence |
| `expert_reviewer` | Reviews authorized study records without changing technical validation |
| `law_firm_viewer` | Read-only access to authorized study/output records; no raw private submissions/evidence |

Every newly created Auth user receives:

- `account_status = pending`
- `role = tester`

An administrator must activate and, where necessary, change the role through a controlled process.

## Study membership

`study_members` scopes access to individual studies. A global `tester` or `expert_reviewer` does not automatically see every study.

An active membership contains:

- Study
- User
- Study-specific role
- Membership status
- Adding administrator/coordinator

`admin` is system-wide and is not allowed as a study role.

## RLS matrix

The table summarizes ordinary authenticated-client access. Admin access remains subject to active-account checks and policies.

| Resource | Admin | Assigned coordinator | Assigned tester | Assigned reviewer | Law-firm viewer |
|---|---|---|---|---|---|
| Own profile/role | Manage/read all | Own only | Own only | Own only | Own only |
| Studies | Manage all | Read/update assigned | Read assigned | Read assigned | Read assigned |
| Study membership | Manage all | Manage assigned study | Own row only | Own row only | Own row only |
| Platforms/services | Manage | Read | Read | Read | Read |
| Protocols | Manage | Manage assigned | Read assigned | Read assigned | Read assigned |
| Assignments | Manage | Manage assigned | Read only if assigned | Read authorized study | Read authorized study |
| Assignment tester slots | Manage | Manage assigned | Own slot only | Read authorized study | Read authorized study |
| Submissions | Operational manage | Read authorized | Own only; draft-to-submitted update | Read authorized | No raw access |
| Evidence metadata | Operational manage | Read authorized | Own only | Read authorized | No raw access |
| Matched pairs | Manage | Manage assigned | No partner comparison access | Read authorized | Read authorized |
| Validation results | Manage | Manage assigned | No access | Read only | Read only |
| Expert reviews | Operational manage | Read | No access | Create/update own | Read only |
| Activity logs | Read | Read authorized | Own actor events | Read authorized | Read authorized |

No anonymous policies are created. RLS is enabled on every public table.

## Submission safety

A tester can insert a submission only when:

- `user_id` equals `auth.uid()`
- The assignment slot belongs to that user
- The slot has not been removed

A tester can update only an existing draft. The draft may remain a draft or transition to submitted. Once submitted, it is no longer ordinarily editable. Full correction/versioning and immutable submission history remain future controls.

## Technical versus expert status

The schema keeps these separate:

- `matched_pairs.technical_status`
- `validation_results`
- `expert_reviews.status`

Expert reviewers can create or update only their own authorized reviews. They have read-only access to technical validation results. Coordinators cannot impersonate an expert review.

## Activity logging

Ordinary authenticated clients receive SELECT only on `activity_logs`. They receive no INSERT, UPDATE, or DELETE grant.

Future mutations should create logs through controlled server code or carefully reviewed database functions. Phase 0 does not claim the log is immutable, cryptographically signed, tamper-proof, or court-ready.

## Private evidence Storage

Bucket: `paired-testing-evidence`

Expected object path:

```text
{study_id}/{assignment_id}/{user_id}/{generated-file-id}-{sanitized-filename}
```

Rules:

- The bucket is private.
- There are no public URLs.
- Testers may upload only beneath their own user segment for an authorized assignment.
- Testers may read only their own objects.
- Active coordinators and reviewers may read objects only for assigned studies.
- Law-firm viewers do not automatically receive raw evidence.
- Only administrators receive ordinary update/delete policies.
- Future signed URLs must be short-lived and created only after server authorization.

The bucket has a 50 MiB object limit and a preliminary MIME allowlist. Builders must still validate file signatures, names, sizes, and workflow requirements in server code.

Not yet implemented:

- Upload interface
- Server-generated object paths
- Signed URL endpoint
- Malware scanning
- Trusted hash calculation
- Evidence retention/deletion workflow
- Legal hold
- Verified chain of custody

## What remains in fixtures and Zustand

All current prototype study content remains local:

- Synthetic study and protocol
- Tester aliases
- Twelve assignments
- Twenty-three submissions
- Evidence metadata
- Matched pairs and validation results
- Reviewer decisions
- Demonstration activity events
- Dashboard calculations
- CSV/JSON exports
- Printable report

Phase 0 does not copy those records into Supabase and does not rewrite their UI components.

The old presentation role selector is preserved as exported reference code but is no longer rendered. It cannot change the database profile, global role, study membership, or RLS result.

## Data-access boundary

`src/lib/data/profiles.ts` is the first typed data-access module. It loads the current profile and authoritative role without scattering raw queries through presentation components.

Future builder modules should add narrow modules such as:

```text
src/lib/data/studies.ts
src/lib/data/protocols.ts
src/lib/data/assignments.ts
src/lib/data/submissions.ts
src/lib/data/evidence.ts
```

Every server mutation must call reusable authorization helpers and still rely on RLS as the final database boundary.

## What the builders can implement next

Suggested Builder A boundary:

- Study creation and configuration
- Provider/platform/service configuration
- Protocol authoring, versioning, and approval workflow
- Study membership administration

Suggested Builder B boundary:

- Assignment and tester-slot workflow
- Submission capture and controlled draft transition
- Evidence upload using server-generated paths
- Matching, validation persistence, expert review, and activity logging

Both builders should keep the current synthetic prototype available until their replacement flow is accepted. They should not bypass the data-access modules, server authorization helpers, RLS, or private Storage rules.

## Current limitations

- No external Supabase project has been created or migrated by this repository change.
- No administrative UI exists for user activation, role assignment, or study membership.
- No existing fixture is database-backed.
- There are no password reset, MFA, invite acceptance, or account recovery screens.
- Email changes are not exposed in the UI.
- Activity logs are append-restricted but not cryptographically immutable.
- Database policy tests require a local or hosted Supabase environment.
- The handoff type file must be regenerated from the linked database after migration.
