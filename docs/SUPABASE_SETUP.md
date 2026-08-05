# Supabase Setup and Internal User Bootstrap

This guide connects a Supabase project to the internal paired-testing application. The repository contains integration code and ordered migrations, but it does not contain credentials or an external project link.

## 1. Create the Supabase project

1. Sign in at `https://supabase.com/dashboard`.
2. Create a new project in the intended organization.
3. Use a strong database password and store it in the team's approved password manager.
4. Choose the closest appropriate region for the approved users and data-residency requirements.
5. Wait for project provisioning to finish.

Do not place the database password, secret key, or service-role key in chat, source control, issue trackers, or client-side environment variables.

## 2. Disable public registration

In Supabase Dashboard:

1. Open **Authentication → Providers → Email**.
2. Disable **Allow new users to sign up**.
3. Keep email/password authentication enabled for manually created internal users.
4. Do not enable anonymous sign-ins.

The checked-in local configuration also sets `enable_signup = false`, but the hosted Dashboard setting must be confirmed separately.

## 3. Copy the public connection values

Open the project's **Connect** dialog and copy:

- Project URL
- Publishable key

Create an untracked `.env.local` at the repository root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The application does not require the service-role key for normal login or user requests. Do not give it to routine builders.

The in-application invitation workflow requires a server-only Secret API key:

```dotenv
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVER_ONLY_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Create or copy the Secret key under **Project Settings -> API Keys -> Secret keys**. A legacy
`SUPABASE_SERVICE_ROLE_KEY` remains supported as a fallback, but new Supabase projects should use
`SUPABASE_SECRET_KEY`. It must never be prefixed with `NEXT_PUBLIC_`, imported by a Client Component,
or stored in Vercel's client-exposed configuration.

## 4. Configure invitation redirects and email

In **Authentication -> URL Configuration**:

1. Set the hosted application as the Site URL.
2. Add `http://localhost:3000/auth/confirm` for local development.
3. Add `https://YOUR_APP_DOMAIN/auth/confirm` for each approved deployment.

In **Authentication -> Email Templates -> Invite user**, make the invitation button use this URL:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">
  Create your password
</a>
```

The Admin page passes `/auth/confirm` as `RedirectTo`. The callback verifies the one-time token,
stores the authenticated session in secure cookies, and redirects the invited user to `/set-password`.
After a valid password is created, the pending profile is activated.

## 5. Install and link the Supabase CLI

The CLI is not committed as an application dependency. From the repository root:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
```

The project reference appears in the Dashboard URL:

```text
https://supabase.com/dashboard/project/YOUR_PROJECT_REF
```

Linking may request the database password. Only a maintainer responsible for migrations needs that access.

## 6. Review and apply migrations

First preview the pending migrations:

```bash
npx supabase@latest db push --dry-run
```

Then apply them:

```bash
npx supabase@latest db push
```

The ordered migrations create and evolve:

1. Enums, profiles, roles, and Auth triggers
2. Core relational tables and indexes
3. Security-definer authorization helpers
4. Row Level Security grants and policies
5. The private evidence bucket and Storage policies
6. Study, protocol, membership, assignment, submission, matching, validation, review, activity, and reporting workflows
7. Study and assignment lifecycle controls, submission revision history, and viewer release gating

Do not run `supabase db reset --linked` against a production or shared project. That command is destructive.

## 7. Regenerate database types

After the migrations succeed:

```bash
npx supabase@latest gen types typescript --linked --schema public > src/types/database.types.ts
npm run typecheck
```

The repository includes a generated-compatible type snapshot so the code compiles before a project exists. The linked schema becomes the source of truth after migration.

## 8. Create the first internal Auth user

In Supabase Dashboard:

1. Open **Authentication → Users**.
2. Click **Add user**.
3. Choose the option that creates the user directly rather than exposing public registration.
4. Enter the administrator's internal email and a temporary strong password.
5. Mark the email confirmed if that matches the approved internal onboarding process.

The database trigger automatically creates:

- A `profiles` row with `account_status = pending`
- A `user_roles` row with `role = tester`

The user cannot use the protected application until explicitly activated.

## 9. Promote and activate the first administrator

Open **SQL Editor** and replace the placeholder email:

```sql
begin;

update public.profiles
set account_status = 'active'
where email = 'FIRST_ADMIN@example.com';

update public.user_roles
set role = 'admin',
    assigned_by = user_id,
    assigned_at = now()
where user_id = (
  select id
  from public.profiles
  where email = 'FIRST_ADMIN@example.com'
);

commit;
```

Verify exactly one row changed in each update. If either statement affects zero or multiple rows, stop and correct the email before proceeding.

## 10. Create additional internal users

After the first administrator exists and the Secret key and email template are configured:

1. Sign in as an administrator.
2. Open **Manage accounts** from the account panel.
3. Select **Invite user**.
4. Enter the display name, email address, and global role.
5. Send the invitation.
6. The user follows the one-time email link and creates a password.

Invited profiles remain `pending` until password creation succeeds. The password-completion action
then activates that same profile. There is no public sign-up screen.

Allowed roles are `admin`, `test_coordinator`, `tester`, `expert_reviewer`, and `law_firm_viewer`.

## 11. Assign study membership

Global role alone does not grant access to every study. Add active study membership after the study exists:

```sql
insert into public.study_members (
  study_id,
  user_id,
  study_role,
  membership_status,
  added_by
)
values (
  'STUDY_UUID',
  'USER_UUID',
  'tester',
  'active',
  'ADMIN_UUID'
)
on conflict (study_id, user_id) do update
set study_role = excluded.study_role,
    membership_status = excluded.membership_status,
    added_by = excluded.added_by;
```

`admin` is deliberately prohibited as a study-level role because it is system-wide.

## 12. Configure Vercel

In Vercel, open **Project → Settings → Environment Variables** and add these to Production and Preview:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SECRET_KEY
```

Redeploy after changing environment variables. Mark `SUPABASE_SECRET_KEY` as sensitive and server-only.

## 13. Confirm authentication and RLS

Use at least four separate internal test accounts: coordinator, tester A, tester B, and law-firm viewer.

Confirm:

1. An unauthenticated browser is redirected to `/login?next=...`.
2. A pending account cannot enter the application.
3. An active account remains signed in after refresh.
4. Signing out clears the session and returns to `/login`.
5. Tester A cannot select Tester B's `assignment_testers`, submissions, or evidence.
6. A tester cannot insert an assignment or study membership.
7. A reviewer can read authorized study submissions but cannot edit validation results.
8. A law-firm viewer cannot read active/paused study workflow outputs, can inspect completed/archived assigned outputs and evidence metadata, cannot open private raw evidence files, and cannot modify records.
9. A user cannot change `user_roles` or their protected profile fields.
10. The `paired-testing-evidence` bucket is private and has no public URL.

Dashboard SQL Editor runs with elevated privileges and does not by itself prove that RLS works. Verification must use actual signed-in user sessions or a local Supabase test stack with JWT claims.

## 14. Local access for Paul and Jed

Each builder should:

1. Clone the private repository.
2. Run `npm install`.
3. Create their own untracked `.env.local` containing only the project URL and publishable key.
4. Receive a separate manually created Auth user—never share one account.
5. Receive only the global role and study memberships needed for their work.
6. Run `npm run dev` and sign in through `/login`.

They do not need:

- The database password
- The service-role key
- Another person's password
- Permission to run migrations against production

Only the migration maintainer needs `supabase link` and database deployment access.

## 15. Key rotation

When a key is rotated:

1. Rotate it through the Supabase Dashboard according to the project's incident/change procedure.
2. Update approved secret stores and Vercel environment variables.
3. Update each authorized developer's `.env.local` for publishable-key changes.
4. Redeploy affected environments.
5. Revoke old credentials and verify authentication and RLS again.

Never send a service-role key through chat or commit it to Git.
