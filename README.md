# DoGoodie Paired Testing Lab

A polished front-end preparation prototype for protocol-led paired controlled rideshare pricing studies. The application demonstrates how synthetic testers, coordinators, expert reviewers, and law-firm viewers could organize assignments, validate technical conformity, review matched quote pairs, inspect evidence metadata, and prepare descriptive exports.

> Prototype demonstration using synthetic data. Validation rules, evidence requirements, statistical thresholds, and legal methodology are preliminary and require review by qualified legal, statistical, and forensic experts.

## What the prototype demonstrates

- A versioned paired-testing protocol and configurable preliminary thresholds
- Twelve deterministic synthetic assignments with 23 submissions
- Eight valid, two warning, one invalid, and one incomplete technical pair
- A high-fidelity side-by-side review for featured `PAIR-008`
- Local assignment creation and a mobile-first tester workflow
- Technical conformity rules for route, platform, tier, timestamps, GPS, device/app metadata, and evidence
- Role-aware reviewer actions that update pairs, dashboard metrics, activity, and reports without a reload
- Synthetic evidence and demonstration activity repositories
- Browser-generated CSV/JSON exports and a Letter-sized printable report

The prototype does **not** determine discrimination, causation, intent, liability, statistical significance, scientific validity, or legal admissibility.

## Intended demonstration users

- Test Coordinators
- Synthetic Testers
- Expert Reviewers
- Law-Firm Viewers

Phase 0 adds internal Supabase email/password authentication, database-backed profiles and roles, study membership, Row Level Security, and a private evidence-storage foundation. The synthetic workflow screens still use fixtures and Zustand until the builder phases migrate them deliberately. The former “View as” selector is preserved as reference code but is hidden and never controls database authorization.

## Technology stack

- Next.js 16 App Router with React Server Components by default
- React 19 and strict TypeScript
- Tailwind CSS 4
- shadcn/ui components using Radix primitives
- Lucide React
- Recharts
- Zustand with hydration-aware local persistence
- date-fns
- Zod and React Hook Form
- Supabase Auth, Postgres, Storage, `@supabase/ssr`, and `@supabase/supabase-js`
- Vitest, React Testing Library, and jsdom
- ESLint

## Setup and commands

```bash
npm install
npm run dev
```

Before sign-in can succeed, copy `.env.example` to an untracked `.env.local` and add the Supabase project URL and publishable key. Apply the migrations under `supabase/migrations` using [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md).

Open `http://localhost:3000`. The root route redirects through the protected `/paired-testing-demo` area; unauthenticated users are sent to `/login`.

Verification and production commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:run
npm run build
npm run start
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirect to the product overview |
| `/login` | Internal Supabase email/password sign-in |
| `/paired-testing-demo` | Product overview and active study |
| `/paired-testing-demo/dashboard` | Study metrics, charts, search, filtering, and pair queue |
| `/paired-testing-demo/protocol` | Active protocol, thresholds, exclusions, and version history |
| `/paired-testing-demo/assignments` | Paired assignments and local assignment creation |
| `/paired-testing-demo/submission` | Tester checklist, countdown, draft, and synthetic submission |
| `/paired-testing-demo/pairs` | Matched-pair list |
| `/paired-testing-demo/pairs/[pairId]` | Side-by-side comparison and expert review |
| `/paired-testing-demo/evidence` | Synthetic evidence metadata repository |
| `/paired-testing-demo/audit` | Demonstration Activity Log |
| `/paired-testing-demo/reports` | Evidence Package Preview and exports |
| `/paired-testing-demo/reports/print` | Browser-printable report |

## Project structure

```text
src/
  app/                         App Router routes, root theme, print CSS
  app/login/                   Internal email/password login
  components/
    ui/                        Official shadcn-generated primitives
    paired-testing/            Feature shell, screens, and shared components
  config/                      Central product/study/rule/report configuration
  data/                        Deterministic typed synthetic fixtures
  hooks/                       Hydration-aware client hooks
  lib/
    auth/                      Safe redirects and server authorization helpers
    calculations/              Price, distance, time, and dashboard metrics
    data/                      Typed Supabase data-access boundary
    supabase/                  Browser, server, and Proxy clients
    validation/                Pair engine and Zod form schemas
    exports/                   CSV and JSON manifest generation
    formatting/                Currency, timestamp, and file-size formatting
  store/                       Zustand demonstration state and actions
  tests/                       Auth, calculation, validation, state, form, and export tests
  types/                       Prototype and generated-compatible database types
  proxy.ts                     Next.js 16 session refresh and optimistic redirects
supabase/
  migrations/                  Ordered schema, RLS, and private Storage migrations
  config.toml                  Local Supabase configuration with signup disabled
```

## Synthetic-data policy

All initial testers, prices, timestamps, coordinates, devices, review identities, evidence records, hashes, events, and report values are fictional. Fixtures use stable IDs and absolute ISO timestamps. They do not use `Date.now()`, `Math.random()`, or random UUIDs. Browser time is used only after user interaction, such as creating an assignment or making a review decision.

Local evidence selectors retain browser `File` objects only in component memory. File contents, paths, and Blob URLs are not persisted or transmitted. Supabase is now integrated for authentication and provides a database/storage foundation, but the synthetic workflow does not yet write fixtures, submissions, or evidence to it. There are still no live rideshare APIs, remote evidence uploads, analytics, scraping, or background location collection.

## Global state behavior

`src/store/paired-testing-demo.store.ts` initializes from deterministic fixtures and persists appropriate demonstration state with Zustand. Persistence uses `skipHydration` and a client-side hydration hook, so server rendering never reads `localStorage`.

This local store is not an authorization source. Real identity, activation, global role, and future study access come from Supabase and are enforced server-side and by RLS.

Persisted state includes the selected role, assignments, submissions, pairs, reviewer decisions, evidence metadata, activity events, local counter, and tester draft. Raw file contents and sensitive browser paths are not persisted.

“Reset Demo Data” uses an accessible confirmation dialog and restores the original fixtures.

## Validation logic

The pair engine is in `src/lib/validation/pair-validation-engine.ts`. It evaluates technical conformity only.

- Absolute price difference: `abs(priceA - priceB)`
- Percentage difference: `abs(priceA - priceB) / min(priceA, priceB) * 100`
- Timestamp: ≤5 seconds pass; >5–10 warning; >10 fail
- GPS distance: ≤5 feet pass; >5–15 warning; >15 fail
- GPS calculations use the Haversine formula in meters and convert to feet
- Exact-match rules: platform, pickup, destination, ride tier, and currency
- Configurable checks: OS family, app version, network category, screenshot, and recording
- Incomplete: missing paired response, required metadata, or required evidence
- Invalid: at least one required technical rule fails
- Warning: no failure, but at least one threshold warning exists
- Valid: both submissions and required evidence are present with no failures or warnings

Rules intentionally do not calculate p-values, confidence intervals, statistical significance, discrimination, bias, causation, intent, liability, or admissibility.

## Export behavior

Exports are generated from current Zustand state with browser `Blob` downloads:

- Raw synthetic pair CSV
- Accepted pair CSV
- Excluded pair CSV
- Evidence inventory CSV
- Demonstration activity CSV
- JSON evidence package manifest

CSV values are escaped centrally. Exports remain synthetic demonstrations and are not certified evidence packages.

## Print behavior

The print route uses a restrained corporate report layout. `@media print` removes the application shell, controls, filters, and decoration, preserves table borders, and avoids card breaks where practical.

The default is US Letter:

```css
@page {
  size: Letter;
  margin: 0.6in;
}
```

To switch to A4, change the `@page` rule in `src/app/globals.css` and the configured label in `src/config/paired-testing-demo.config.ts`:

```css
@page {
  size: A4;
  margin: 15mm;
}
```

## Configuration locations

- Product name, branding, disclaimers, study context, aliases, locations, target, routes, thresholds, evidence rules, role labels, navigation, print format, export filenames, and shared copy: `src/config/paired-testing-demo.config.ts`
- Synthetic testers, prices, assignments, timestamps, coordinates, submissions, evidence records, reviewer decisions, audit events, and manifest: `src/data/paired-testing-demo.fixtures.ts`
- Validation behavior and overall status logic: `src/lib/validation/pair-validation-engine.ts`
- Price formula: `src/lib/calculations/price-calculations.ts`
- GPS formula: `src/lib/calculations/geographic-distance.ts`
- Dashboard metrics: `src/lib/calculations/dashboard-metrics.ts`
- Interface theme and print CSS: `src/app/globals.css`

## Features intentionally excluded

- Public registration and self-service account creation
- Production administrative UI for account activation, roles, and memberships
- Database migration of the existing synthetic fixture workflow
- Real testers, clients, experts, law firms, and personal information
- Database-backed prototype workflows and production evidence uploads
- Live rideshare APIs, quote automation, scraping, and credentials
- Real GPS tracking, IP collection, fingerprinting, or device monitoring
- Cryptographic signing, immutable audit infrastructure, or chain-of-custody guarantees
- Court filing, messaging, payments, subscriptions, and production deployment
- Legal advice, expert opinions, statistical-significance claims, or discrimination detection

## Known limitations

- This is an in-browser MVP; state can be edited or cleared and is not tamper-proof.
- Supabase authorization protects future database/storage records, while current fixture interactions remain local demonstration behavior.
- Selected evidence files are not restored after navigation or reload.
- Initial report timestamps are fixed fixture values; generated manifests use client interaction time.
- No real mobile devices, assistive technologies, external file formats, or expert workflows have been field-validated.
- Package ZIP generation is intentionally omitted.
- The preliminary rules and synthetic dataset are illustrative rather than scientifically validated.

## Recommended next steps after expert review

1. Confirm the actual comparison question, isolated variable, manual field workflow, required controls, exclusion logic, and synchronization method.
2. Confirm required evidence, metadata, retention, provenance, and review procedures with qualified forensic specialists and counsel.
3. Replace preliminary thresholds and terminology with approved methodology.
4. Define role permissions, separation of duties, escalation, corrections, and reviewer sign-off.
5. Define report, exhibit, manifest, and downstream analysis formats.
6. Obtain statistical methodology before adding inferential analysis.
7. Validate and operationalize the Phase 0 security foundation, then design encryption, backups, retention, audit architecture, privacy controls, and incident response.

See [ASSUMPTIONS.md](./ASSUMPTIONS.md) for the explicit unverified assumptions.
