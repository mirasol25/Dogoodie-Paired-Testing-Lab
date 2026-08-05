"use client";

import Link from "next/link";
import {
  Download,
  FileArchive,
  FileJson,
  FileSpreadsheet,
  PackageOpen,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReportScopeAlert as DisclaimerAlert } from "@/components/paired-testing/reports/report-scope-alert";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { downloadTextFile, rowsToCsv } from "@/lib/exports/csv-export";
import type { Study } from "@/lib/data/studies";
import type { Protocol } from "@/lib/data/protocols";
import type { EvidenceRecord } from "@/lib/data/evidence";
import type {
  ExpertReview,
  MatchedPairSummary,
  MatchedPairValidationResult,
} from "@/lib/data/matched-pairs";
import type { ActivityLogEvent } from "@/lib/data/activity-logs";
import { recordReportExportAction } from "@/app/paired-testing-demo/reports/actions";
import type { AssignmentSummary } from "@/lib/data/assignments";
import {
  assignmentDisposition,
  classifyReportPairs,
  pairExclusionReason,
} from "@/lib/reports/report-classification";

type Props = {
  study: Study;
  protocol: Protocol | null;
  assignments: AssignmentSummary[];
  pairs: MatchedPairSummary[];
  reviews: ExpertReview[];
  validationResults: MatchedPairValidationResult[];
  evidence: EvidenceRecord[];
  activity: ActivityLogEvent[];
  activityTotal: number;
  canExport: boolean;
};

export function ReportsClient({
  study,
  protocol,
  assignments,
  pairs,
  reviews,
  validationResults,
  evidence,
  activity,
  activityTotal,
  canExport,
}: Props) {
  const classification = classifyReportPairs(pairs, reviews);
  const latestReview = classification.latest;
  const acceptedPairs = classification.included;
  const flaggedPairs = classification.flagged;
  const excludedPairs = classification.excluded;
  const accepted = acceptedPairs.length;
  const flagged = flaggedPairs.length;
  const rejected = pairs.filter(
    (pair) => latestReview.get(pair.id)?.status === "rejected",
  ).length;
  const pending = classification.pending.length;
  const disposition = assignmentDisposition(assignments);
  const evidenceComplete = pairs.filter(
    (pair) => pair.evidence_status === "complete",
  ).length;
  const packageId = `${study.study_code}-PKG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;

  const pairCsv = (selected: MatchedPairSummary[]) =>
    rowsToCsv(
      [
        "Pair",
        "Assignment",
        "Tester A",
        "Tester B",
        "Fare A",
        "Fare B",
        "Directional difference (B-A)",
        "Absolute difference",
        "Directional percent of A",
        "Technical",
        "Evidence",
        "Review",
      ],
      selected.map((pair) => [
        pair.pair_code,
        pair.assignmentCode,
        pair.submissionA.testerName,
        pair.submissionB.testerName,
        pair.submissionA.displayed_fare,
        pair.submissionB.displayed_fare,
        pair.directional_fare_difference,
        pair.absolute_fare_difference,
        pair.percentage_fare_difference,
        pair.technical_status,
        pair.evidence_status,
        latestReview.get(pair.id)?.status ?? "pending",
      ]),
    );

  function download(
    kind:
      | "pairs"
      | "accepted"
      | "excluded"
      | "assignments"
      | "reviews"
      | "validation"
      | "evidence"
      | "activity"
      | "manifest"
      | "package",
  ) {
    if (!canExport)
      return toast.error("Your role has read-only report access.");
    if (kind === "pairs")
      downloadTextFile(
        pairCsv(pairs),
        `${study.study_code}-pairs.csv`,
        "text/csv;charset=utf-8",
      );
    if (kind === "accepted")
      downloadTextFile(
        pairCsv(acceptedPairs),
        `${study.study_code}-accepted-pairs.csv`,
        "text/csv;charset=utf-8",
      );
    if (kind === "excluded")
      downloadTextFile(
        pairCsv(excludedPairs),
        `${study.study_code}-excluded-pairs.csv`,
        "text/csv;charset=utf-8",
      );
    if (kind === "assignments")
      downloadTextFile(
        rowsToCsv(
          [
            "Assignment",
            "Status",
            "Scheduled start",
            "Scheduled end",
            "Pickup",
            "Destination",
            "Disposition reason",
          ],
          assignments.map((assignment) => {
            const event = activity.find(
              (item) =>
                item.target_id === assignment.id &&
                ["assignment.cancelled", "assignment.expired"].includes(
                  item.action,
                ),
            );
            const details =
              event?.details &&
              typeof event.details === "object" &&
              !Array.isArray(event.details)
                ? event.details
                : {};
            return [
              assignment.assignment_code,
              assignment.status,
              assignment.scheduled_start,
              assignment.scheduled_end,
              assignment.pickup_location,
              assignment.destination_location,
              typeof details.reason === "string"
                ? details.reason
                : assignment.status === "completed"
                  ? "Paired observation completed"
                  : assignment.status === "cancelled"
                    ? "Cancelled before paired observation completed"
                    : assignment.status === "expired"
                      ? "Testing window ended before collection completed"
                      : "Operational workflow pending",
            ];
          }),
        ),
        `${study.study_code}-assignment-disposition.csv`,
        "text/csv;charset=utf-8",
      );
    if (kind === "reviews")
      downloadTextFile(
        rowsToCsv(
          [
            "Pair ID",
            "Reviewer ID",
            "Status",
            "Reason",
            "Note",
            "Decided at",
            "Updated at",
          ],
          reviews.map((review) => [
            review.matched_pair_id,
            review.reviewer_id,
            review.status,
            review.reason,
            review.note,
            review.decided_at,
            review.updated_at,
          ]),
        ),
        `${study.study_code}-reviews.csv`,
        "text/csv;charset=utf-8",
      );
    if (kind === "validation")
      downloadTextFile(
        rowsToCsv(
          ["Pair", "Rule code", "Rule", "Requirement", "Tester A", "Tester B", "Finding", "Result", "Affects overall"],
          validationResults.map((result) => [
            pairs.find((pair) => pair.id === result.matched_pair_id)?.pair_code ?? result.matched_pair_id,
            result.rule_code,
            result.label,
            result.requirement_level,
            JSON.stringify(result.tester_a_value),
            JSON.stringify(result.tester_b_value),
            result.observed_difference,
            result.status,
            result.affects_overall_status,
          ]),
        ),
        `${study.study_code}-validation-results.csv`,
        "text/csv;charset=utf-8",
      );
    if (kind === "evidence")
      downloadTextFile(
        rowsToCsv(
          [
            "Evidence",
            "Pair",
            "Assignment",
            "Submission",
            "Tester",
            "Type",
            "Filename",
            "MIME",
            "Size bytes",
            "Captured",
            "Uploaded",
            "SHA-256",
            "Integrity",
          ],
          evidence.map((file) => [
            file.evidence_code,
            file.pairCode,
            file.assignmentCode,
            file.submissionCode,
            file.testerName,
            file.evidence_type,
            file.original_filename,
            file.mime_type,
            file.size_bytes,
            file.captured_at,
            file.uploaded_at,
            file.sha256,
            file.integrity_status,
          ]),
        ),
        `${study.study_code}-evidence.csv`,
        "text/csv;charset=utf-8",
      );
    if (kind === "activity")
      downloadTextFile(
        rowsToCsv(
          [
            "Event",
            "Timestamp",
            "Actor",
            "Role",
            "Action",
            "Category",
            "Target type",
            "Target ID",
            "Details",
          ],
          activity.map((event) => [
            event.id,
            event.created_at,
            event.actor_name,
            event.actor_role,
            event.action,
            event.category,
            event.target_type,
            event.target_id,
            JSON.stringify(event.details),
          ]),
        ),
        `${study.study_code}-activity.csv`,
        "text/csv;charset=utf-8",
      );
    if (kind === "manifest")
      downloadTextFile(
        JSON.stringify(
          {
            packageId,
            generatedAt: new Date().toISOString(),
            study: {
              id: study.id,
              code: study.study_code,
              name: study.name,
              status: study.status,
              timezone: study.display_timezone,
              currency: study.default_currency,
            },
            protocol: protocol
              ? {
                  id: protocol.id,
                  code: protocol.protocol_code,
                  version: protocol.version,
                  title: protocol.title,
                }
              : null,
            counts: {
              assignments: disposition,
              pairs: pairs.length,
              included: accepted,
              flagged,
              rejected,
              excluded: excludedPairs.length,
              pending,
              evidence: evidence.length,
              evidenceCompletePairs: evidenceComplete,
              activityEvents: activityTotal,
            },
            files: [
              `${study.study_code}-assignment-disposition.csv`,
              `${study.study_code}-pairs.csv`,
              `${study.study_code}-reviews.csv`,
              `${study.study_code}-validation-results.csv`,
              `${study.study_code}-evidence.csv`,
              `${study.study_code}-activity.csv`,
            ],
          },
          null,
          2,
        ),
        `${study.study_code}-manifest.json`,
        "application/json",
      );
    if (kind === "package")
      downloadTextFile(
        JSON.stringify(
          {
            packageId,
            generatedAt: new Date().toISOString(),
            study,
            protocol,
            assignmentDisposition: disposition,
            assignments,
            pairClassification: {
              included: acceptedPairs.map((pair) => pair.id),
              flagged: flaggedPairs.map((pair) => pair.id),
              excluded: excludedPairs.map((pair) => ({
                id: pair.id,
                reason: pairExclusionReason(pair, latestReview),
              })),
              pending: classification.pending.map((pair) => pair.id),
            },
            pairs,
            reviews,
            validationResults,
            evidence,
            activity,
            activityTotal,
          },
          null,
          2,
        ),
        `${study.study_code}-evidence-package.json`,
        "application/json",
      );
    void recordReportExportAction(study.id, kind).catch(() =>
      toast.error(
        "The export was created, but its activity record could not be saved.",
      ),
    );
    toast.success("Persisted study export prepared.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${study.study_code} - Study outputs`}
        title="Reports & Evidence Package"
        description="Generate descriptive exports from persisted study, validation, evidence, review, and activity records."
        actions={
          <Button asChild>
            <Link href="/paired-testing-demo/reports/print">
              <Printer className="size-4" />
              Print report
            </Link>
          </Button>
        }
      />
      <DisclaimerAlert />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Matched pairs" value={pairs.length} />
        <Metric label="Included results" value={accepted} />
        <Metric label="Flagged follow-up" value={flagged} />
        <Metric label="Excluded pairs" value={excludedPairs.length} />
        <Metric label="Pending review" value={pending} />
      </div>
      <section className="rounded-md border border-border p-4">
        <p className="text-[10px] uppercase text-primary">Assignment disposition</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Disposition label="Total" value={disposition.total} />
          <Disposition label="Completed" value={disposition.completed} />
          <Disposition label="Cancelled" value={disposition.cancelled} />
          <Disposition label="Expired" value={disposition.expired} />
          <Disposition label="Unfinished" value={disposition.unfinished} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cancelled and expired assignments are operational exclusions and are not counted as observed fare comparisons.
        </p>
      </section>
      <ReportCharts pairs={pairs} reviews={reviews} />
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border bg-card/35 px-4 py-3">
            <p className="text-[10px] uppercase text-primary">
              Persisted package
            </p>
            <h2 className="mt-1 text-base font-semibold">Available outputs</h2>
          </div>
          <div className="grid sm:grid-cols-2">
            <Output
              icon={FileSpreadsheet}
              title="Matched pair results"
              detail={`${accepted} included, ${flagged} flagged, ${excludedPairs.length} excluded`}
            />
            <Output
              icon={ShieldCheck}
              title="Reviewer decisions"
              detail={`${reviews.length} recorded decisions`}
            />
            <Output
              icon={FileArchive}
              title="Evidence inventory"
              detail={`${evidence.length} private evidence records`}
            />
            <Output
              icon={FileSpreadsheet}
              title="Activity history"
              detail={`${activityTotal} operational events`}
            />
            <Output
              icon={FileJson}
              title="Package manifest"
              detail="Study identifiers and export inventory"
            />
            <Output
              icon={Printer}
              title="Printable summary"
              detail="Browser print and PDF preparation"
            />
          </div>
        </div>
        <aside className="rounded-md border border-border bg-card/25 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Package ID
              </p>
              <p className="mono mt-2 break-all text-sm font-semibold">
                {packageId}
              </p>
            </div>
            <PackageOpen className="size-5 text-primary" />
          </div>
          <dl className="mt-5 divide-y divide-border text-xs">
            {[
              ["Study", study.study_code],
              ["Protocol", protocol?.version ?? "No active protocol"],
              [
                "Evidence complete",
                `${evidenceComplete}/${pairs.length} pairs`,
              ],
              ["Activity records", String(activityTotal)],
              ["Timezone", study.display_timezone],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <StatusBadge status={canExport ? "Export enabled" : "Read only"} />
          </div>
        </aside>
      </section>
      <section className="rounded-md border border-border p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase text-primary">
              Functional local exports
            </p>
            <h2 className="mt-1 text-lg font-semibold">Study downloads</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Exports are generated from persisted records authorized for your
              account.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!canExport}
            onClick={() => download("package")}
          >
            <PackageOpen className="size-4" />
            Generate study package
          </Button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["assignments", "Assignment Disposition CSV"],
              ["pairs", "Raw Pair CSV"],
              ["accepted", "Included Pair CSV"],
              ["excluded", "Excluded Pair CSV"],
              ["reviews", "Review Decisions CSV"],
              ["validation", "Rule-level Validation CSV"],
              ["evidence", "Evidence Inventory CSV"],
              ["activity", "Activity Log CSV"],
              ["manifest", "JSON Package Manifest"],
            ] as const
          ).map(([kind, label]) => (
            <Button
              key={kind}
              variant="outline"
              className="justify-start"
              disabled={!canExport}
              onClick={() => download(kind)}
            >
              <Download className="size-4" />
              {label}
            </Button>
          ))}
          <Button asChild variant="outline" className="justify-start">
            <Link href="/paired-testing-demo/reports/print">
              <Printer className="size-4" />
              Preview Summary Report
            </Link>
          </Button>
        </div>
        {!canExport ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Viewer accounts can inspect report summaries but cannot download
            package files.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="data-panel min-h-24 rounded-md p-4">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Disposition({ label, value }: { label: string; value: number }) {
  return <div className="border-l border-border pl-3"><p className="text-[9px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function ReportCharts({ pairs, reviews }: { pairs: MatchedPairSummary[]; reviews: ExpertReview[] }) {
  const technical = ["valid", "warning", "invalid", "incomplete"].map((status) => ({
    label: status,
    value: pairs.filter((pair) => pair.technical_status === status).length,
  }));
  const latest = new Map<string, ExpertReview>();
  for (const review of reviews) if (!latest.has(review.matched_pair_id)) latest.set(review.matched_pair_id, review);
  const reviewCounts = ["accepted", "flagged", "rejected", "pending"].map((status) => ({
    label: status,
    value: pairs.filter((pair) => (latest.get(pair.id)?.status ?? "pending") === status).length,
  }));
  const variance = [
    { label: "Below 0%", test: (value: number) => value < 0 },
    { label: "0-5%", test: (value: number) => value >= 0 && value < 5 },
    { label: "5-15%", test: (value: number) => value >= 5 && value < 15 },
    { label: "15-30%", test: (value: number) => value >= 15 && value < 30 },
    { label: "30%+", test: (value: number) => value >= 30 },
  ].map((bucket) => ({ label: bucket.label, value: pairs.filter((pair) => pair.percentage_fare_difference !== null && bucket.test(pair.percentage_fare_difference)).length }));
  return <section className="grid gap-3 lg:grid-cols-3"><Distribution title="Technical validation" rows={technical} total={pairs.length} /><Distribution title="Expert review" rows={reviewCounts} total={pairs.length} /><Distribution title="Directional price variance" rows={variance} total={pairs.length} /></section>;
}

function Distribution({ title, rows, total }: { title: string; rows: Array<{ label: string; value: number }>; total: number }) {
  return <div className="rounded-md border border-border p-4"><p className="text-[10px] uppercase text-primary">Persisted results</p><h2 className="mt-1 text-sm font-semibold">{title}</h2><div className="mt-4 space-y-3">{rows.map((row) => <div key={row.label}><div className="mb-1 flex justify-between text-xs"><span className="capitalize text-muted-foreground">{row.label}</span><span className="mono">{row.value}</span></div><div className="h-2 overflow-hidden rounded-sm bg-secondary"><div className="h-full bg-primary" style={{ width: `${total ? Math.max((row.value / total) * 100, row.value ? 3 : 0) : 0}%` }} /></div></div>)}</div></div>;
}
function Output({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof FileJson;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-24 gap-3 border-b border-border p-4 odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
