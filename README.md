# DoGoodie Paired Testing Lab

An internal, database-backed workspace for controlled paired rideshare pricing studies. Administrators manage accounts and study access; coordinators create studies, protocols, and paired assignments; testers submit observations and required evidence; expert reviewers make human review decisions; law-firm viewers inspect report-ready outputs.

The application produces descriptive study records. It does not determine discrimination, causation, intent, liability, statistical significance, scientific validity, or legal admissibility.

## Core workflow

1. An administrator invites internal accounts and assigns global roles.
2. An administrator or coordinator creates a study, route, protocol, and study membership.
3. A coordinator creates a paired assignment with a locked protocol, route, provider/tier conditions, and study-timezone testing window.
4. Tester A and Tester B complete contemporaneous observations and upload protocol-required evidence.
5. The system creates one matched pair and stores deterministic rule-level validation results.
6. An expert reviewer accepts, flags, or rejects the pair with a reason and note.
7. Authorized roles inspect dashboards, activity history, reports, and evidence-package exports.
8. Viewers receive assigned study outputs after the study is completed or archived.

Submitted observations are locked. An administrator can reopen one with a mandatory reason; the prior submission, pair, validation, and review state is retained in revision history before resubmission.

## Technology

- Next.js 16, React 19, strict TypeScript, Tailwind CSS 4, and shadcn/ui
- Supabase Auth, Postgres, Row Level Security, and private Storage
- Zod, React Hook Form, MapLibre GL, Recharts, Vitest, and ESLint

## Local setup

```bash
npm install
```

Create an untracked `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVER_ONLY_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Apply every ordered SQL file under `supabase/migrations`, then run:

```bash
npm run dev
```

Open `http://localhost:3000`. Public registration is disabled; follow [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) to bootstrap the first administrator and configure invitation redirects.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Human acceptance checks, including separate-account RLS, mobile tester collection, US/USD and PH/PHP scenarios, evidence boundaries, reopen/resubmit, lifecycle completion, and viewer release gating are in [docs/ACCEPTANCE_QA.md](./docs/ACCEPTANCE_QA.md).

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | Internal sign-in |
| `/paired-testing-demo/admin/accounts` | Administrator account invitations and lifecycle |
| `/paired-testing-demo/studies` | Study creation, lifecycle, route, and membership |
| `/paired-testing-demo/protocol` | Versioned protocol authoring and publication |
| `/paired-testing-demo/assignments` | Paired assignment creation and tester workflow |
| `/paired-testing-demo/pairs` | Deterministic validation and expert review |
| `/paired-testing-demo/evidence` | Authorized evidence inventory and private viewer |
| `/paired-testing-demo/audit` | Role-scoped activity history |
| `/paired-testing-demo/dashboard` | Persisted study metrics and distributions |
| `/paired-testing-demo/reports` | Memo, CSV/JSON exports, and evidence package |

## Calculation contract

- Directional fare difference: `Side B - Side A`
- Absolute fare difference: `abs(directional difference)`
- Percentage fare difference: `directional difference / Side A * 100`
- Percentage is `null` when either fare is missing or Side A is zero.
- Time and location thresholds come from the active protocol.
- Required evidence comes from the active protocol; system metadata is generated for every uploaded file.
- Deterministic technical status and expert review status remain separate.

## Security boundaries

- Authentication and authorization are enforced on the server and through Supabase RLS.
- The evidence bucket is private; storage paths are not public URLs.
- Testers access only their assigned collection records.
- Coordinators manage assigned studies; reviewers access assigned review work.
- Viewers are read-only and only receive completed or archived assigned study outputs.
- Report exports are generated from persisted authorized records and logged.

## Known limitations

- Ride quotes are entered manually; there are no live rideshare APIs, scraping, or automated booking actions.
- Location search depends on an external geocoding provider and is a usability filter, not a jurisdictional determination.
- Validation thresholds and methodology require approval by qualified legal, statistical, and forensic experts.
- The activity log is an operational history, not cryptographically immutable chain-of-custody infrastructure.
- Browser print output can vary by browser and printer settings.
- Deployment operations, backup policy, retention, incident response, and production monitoring remain environment-owner responsibilities.

See [ASSUMPTIONS.md](./ASSUMPTIONS.md) for unresolved methodology assumptions.
