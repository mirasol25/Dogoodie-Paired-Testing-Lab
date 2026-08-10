# Google Vision OCR Migration Change Report

**Application:** DoGoodie Paired Testing Lab  
**Date:** August 11, 2026  
**Status:** Implemented and verified locally; not deployed

## Executive summary

The application OCR engine has been changed from server-executed Tesseract.js to Google Cloud Vision. The tester-facing workflow remains unchanged:

> Select screenshot -> Upload -> OCR processing -> Review detected boxes -> Confirm fare, time, and ride tier

Only the OCR execution layer changes. Instead of using Vercel CPU and memory to run several Tesseract recognition passes, Vercel sends the stored screenshot to Google Cloud Vision and receives detected text and bounding polygons. Existing application rules continue to parse, display, confirm, validate, and store the result.

## Why the change was required

The original implementation performed multiple CPU- and memory-intensive Tesseract passes for every screenshot. Serverless cold starts, language-model loading, image preprocessing, and simultaneous tester uploads could cause long waits, memory pressure, function timeouts, and the generic message "An unexpected response was received from the server."

Google Cloud Vision moves the expensive OCR computation to Google's managed infrastructure. Vercel remains responsible for authentication, evidence authorization, retrieving the screenshot, calling the API, interpreting the response, enforcing study rules, and saving the result.

## Workflow comparison

### Previous Tesseract workflow

1. Tester selected and uploaded a screenshot to Supabase Storage.
2. Vercel downloaded the screenshot.
3. Vercel initialized Tesseract and its English language model.
4. Vercel performed several OCR passes for the selected card, status bar, battery region, and layout.
5. OCR candidates were parsed and saved.
6. Tester reviewed and confirmed the detected boxes.

### New Google Vision workflow

1. Tester selects and uploads a screenshot to Supabase Storage.
2. The existing OCR queue records and schedules the screenshot.
3. Vercel downloads the authorized screenshot and sends one text-detection request to Google Cloud Vision.
4. Google returns detected text and bounding polygons.
5. The application converts the response into its existing candidate-box format.
6. Existing fare, time, and ride-tier parsers evaluate the candidates.
7. Tester reviews and confirms the detected boxes.
8. Existing server and database validation rules enforce assignment and evidence requirements.

## Completed application changes

### Google Vision client integration

The official `@google-cloud/vision` Node.js client was added. Credentials are read only from server-side environment variables. No private credential is exposed through a `NEXT_PUBLIC_` variable or client bundle.

### Bounding-polygon conversion

Google word annotations are grouped into ordered text lines. Their polygon coordinates are converted to normalized application coordinates so the existing screenshot review modal can render selectable ride, fare, time, and battery candidates.

### Existing parsing retained

The existing fare parser, status-bar time parser, battery parser, service resolver, quote-time resolution, assignment-service comparison, and candidate confirmation checks remain in use.

### Provider configuration

The OCR provider is selected using:

```env
OCR_PROVIDER=google
```

Required Google credentials are:

```env
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_CLIENT_EMAIL=
GOOGLE_CLOUD_PRIVATE_KEY=
```

Tesseract remains available only when explicitly configured with `OCR_PROVIDER=tesseract`. The production path never silently falls back to Tesseract because that could unexpectedly restore the original CPU and timeout problem.

### Queue and retry behavior retained

The database-backed OCR queue remains responsible for queued, processing, completed, and failed states; controlled concurrency; automatic retries; and stale-worker recovery. Google Vision reduces server compute but does not eliminate the need to handle temporary network or provider failures.

### Error handling

Missing Google configuration produces a specific server-side configuration error. Google API response errors are captured by the queue, retained as the job error, and handled by the existing retry lifecycle.

### Tests

Mocked unit tests verify Google word-to-line grouping, ordering, malformed-annotation handling, and combined bounding coordinates without spending API quota.

## Verification completed

- TypeScript typecheck: passed
- ESLint: passed
- Automated tests: 105 passed across 19 test files
- Next.js production build: passed
- Live Google Vision credential/API test: passed
- Bundled Grab example: 71 text annotations returned

The live verification used only the repository's non-sensitive example screenshot. No tester evidence was sent during verification, and no credential value was printed.

## Security and privacy controls

- The service-account private key must remain in `.env.local` and encrypted Vercel environment variables.
- Credentials must never be committed to Git or pasted into tickets, chat, documentation, screenshots, or client-side code.
- The service account should have least-privilege access.
- Original screenshots remain private evidence in Supabase Storage.
- Evidence access, ownership, screenshot linkage, assignment validation, confirmation, and audit rules remain server-controlled.
- Privacy and evidence-processing documentation should identify Google Cloud as an external screenshot-processing provider.

## Production deployment checklist

1. Confirm Cloud Vision API and billing are enabled in the intended Google Cloud project.
2. Confirm the dedicated service account and key are active.
3. Add `OCR_PROVIDER=google` and all three Google credential variables to Vercel Production.
4. Mark the private key as sensitive and never use a `NEXT_PUBLIC_` prefix.
5. Apply the OCR queue database migration if it has not already been applied.
6. Deploy a new Vercel build; environment changes do not affect earlier deployments.
7. Upload one controlled screenshot and confirm ride, fare, time, bounds, database state, and audit linkage.
8. Test two simultaneous testers.
9. Test five simultaneous pairs (10 screenshots).
10. Review Vercel runtime logs, Google Vision usage, queue duration, retries, and failed jobs.
11. Configure Google Cloud budget and usage alerts.

## Rollback and fallback

For a controlled local or emergency test, setting `OCR_PROVIDER=tesseract` restores the previous OCR engine. This must be deliberate. Production does not automatically fall back because automatic fallback would make resource usage unpredictable.

If Google Vision is unavailable, uploaded evidence remains stored and its persisted OCR job can retry. A provider outage must not delete the original screenshot.

## Deployment status

The Google Vision integration is implemented and verified locally. No Vercel deployment and no remote database modification were performed as part of the application change.

## Separate dependency-security finding

The production dependency audit reports existing advisories, including advisories affecting Next.js 16.2.10 and transitive packages. These were not introduced by the Google Vision client and were not upgraded as part of the OCR migration. They should be addressed and regression-tested as a separate framework and dependency maintenance task before final production release.
