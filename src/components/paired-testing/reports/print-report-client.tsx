"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { configuredStudyServiceSides } from "@/components/paired-testing/shared/study-service-context";
import { demoConfig } from "@/config/paired-testing-demo.config";
import type { ProviderServiceOption, Study } from "@/lib/data/studies";
import type { Protocol } from "@/lib/data/protocols";
import type { AssignmentSummary } from "@/lib/data/assignments";
import type { AssignmentRouteOption } from "@/lib/data/assignments";
import { assignmentDisposition, classifyReportPairs } from "@/lib/reports/report-classification";
import type {
  ExpertReview,
  MatchedPairSummary,
  MatchedPairValidationResult,
} from "@/lib/data/matched-pairs";
import type { EvidenceRecord } from "@/lib/data/evidence";

export function PrintReportClient({
  study,
  serviceOptions,
  route,
  protocol,
  assignments,
  pairs,
  reviews,
  validationResults,
  evidence,
  activityTotal,
}: {
  study: Study;
  serviceOptions: ProviderServiceOption[];
  route: AssignmentRouteOption | null;
  protocol: Protocol | null;
  assignments: AssignmentSummary[];
  pairs: MatchedPairSummary[];
  reviews: ExpertReview[];
  validationResults: MatchedPairValidationResult[];
  evidence: EvidenceRecord[];
  activityTotal: number;
}) {
  const classification = classifyReportPairs(pairs, reviews);
  const studyConfiguration = study.configuration && typeof study.configuration === "object" && !Array.isArray(study.configuration) ? study.configuration as Record<string, unknown> : {};
  const asynchronousTesting = studyConfiguration.testing_synchronization === "asynchronous";
  const deviceDesign = typeof studyConfiguration.device_comparison_design === "string" ? studyConfiguration.device_comparison_design : "uncontrolled";
  const osLabel = deviceDesign === "uncontrolled" ? "No operating-system restriction" : deviceDesign === "same_operating_system" ? `Both testers: ${String(studyConfiguration.tester_a_operating_system ?? "Not recorded")}` : `Tester A: ${String(studyConfiguration.tester_a_operating_system ?? "Not recorded")} / Tester B: ${String(studyConfiguration.tester_b_operating_system ?? "Not recorded")}`;
  const latest = classification.latest;
  const accepted = classification.included;
  const excluded = classification.excluded;
  const acceptedWithException = accepted.filter((pair) => latest.get(pair.id)?.technical_exception).length;
  const acceptedNormally = accepted.length - acceptedWithException;
  const rejected = pairs.filter((pair) => latest.get(pair.id)?.status === "rejected").length;
  const serviceSides = configuredStudyServiceSides(study, serviceOptions);
  const testerAServiceLabel = serviceSides.testerA ? `${serviceSides.testerA.platformName} - ${serviceSides.testerA.serviceName}` : "Not configured";
  const testerBServiceLabel = serviceSides.testerB ? `${serviceSides.testerB.platformName} - ${serviceSides.testerB.serviceName}` : testerAServiceLabel;
  const reportStage = ["completed", "archived"].includes(study.status) ? "Final descriptive report" : "Interim descriptive report";
  const disposition = assignmentDisposition(assignments);
  const evidenceComplete = pairs.filter(
    (pair) => pair.evidence_status === "complete",
  ).length;
  const packageId = `${study.study_code}-PKG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  const failedRequiredChecks = validationResults.filter((result) => result.requirement_level === "required" && result.status === "fail").length;
  const warningChecks = validationResults.filter((result) => result.status === "warning").length;
  const evidenceMetadataAvailable = evidence.filter((file) => file.metadata && typeof file.metadata === "object" && !Array.isArray(file.metadata)).length;
  const includedVariances = accepted.map((pair) => pair.percentage_fare_difference).filter((value): value is number => value !== null);
  const includedRecordedPairs = accepted.filter(
    (pair) => pair.submissionA.displayed_fare !== null && pair.submissionB.displayed_fare !== null,
  );
  const averageTesterAFare = includedRecordedPairs.length
    ? includedRecordedPairs.reduce((total, pair) => total + (pair.submissionA.displayed_fare ?? 0), 0) / includedRecordedPairs.length
    : null;
  const averageTesterBFare = includedRecordedPairs.length
    ? includedRecordedPairs.reduce((total, pair) => total + (pair.submissionB.displayed_fare ?? 0), 0) / includedRecordedPairs.length
    : null;
  const averageDirectionalDifference = averageTesterAFare === null || averageTesterBFare === null
    ? null
    : averageTesterBFare - averageTesterAFare;
  const testerAHigherCount = includedRecordedPairs.filter(
    (pair) => (pair.submissionA.displayed_fare ?? 0) > (pair.submissionB.displayed_fare ?? 0),
  ).length;
  const testerBHigherCount = includedRecordedPairs.filter(
    (pair) => (pair.submissionB.displayed_fare ?? 0) > (pair.submissionA.displayed_fare ?? 0),
  ).length;
  const equalFareCount = includedRecordedPairs.length - testerAHigherCount - testerBHigherCount;
  const meanVariance = includedVariances.length ? includedVariances.reduce((total, value) => total + value, 0) / includedVariances.length : null;
  const sortedVariances = [...includedVariances].sort((a, b) => a - b);
  const medianVariance = sortedVariances.length ? (sortedVariances.length % 2 ? sortedVariances[Math.floor(sortedVariances.length / 2)] : (sortedVariances[(sortedVariances.length / 2) - 1] + sortedVariances[sortedVariances.length / 2]) / 2) : null;
  const technicallyValid = pairs.filter((pair) => pair.technical_status === "valid").length;
  const technicalValidationRate = pairs.length ? (technicallyValid / pairs.length) * 100 : null;
  const decidedReviews = accepted.length + rejected;
  const reviewAcceptanceRate = decidedReviews ? (accepted.length / decidedReviews) * 100 : null;
  const largestIncludedPair = accepted.filter((pair) => pair.absolute_fare_difference !== null).sort((a, b) => Math.abs(b.absolute_fare_difference ?? 0) - Math.abs(a.absolute_fare_difference ?? 0))[0] ?? null;
  const requestTimeThreshold = validationResults.find((result) => result.rule_code === "request_time_gap")?.threshold_configuration ?? null;
  const locationThreshold = validationResults.find((result) => result.rule_code === "location_distance_gap" || result.rule_code === "tester_a_pickup_proximity")?.threshold_configuration ?? null;
  const nextReviewQuestions = [
    excluded.length ? `Are the documented reasons sufficient for excluding ${excluded.length} pair${excluded.length === 1 ? "" : "s"}?` : null,
    classification.pending.length ? `When will expert review be completed for ${classification.pending.length} pending pair${classification.pending.length === 1 ? "" : "s"}?` : null,
    "Do repeated observations support the descriptive pattern after alternative explanations are considered?",
    "Does the approved methodology require additional statistical or legal review before external use?",
  ].filter((item): item is string => Boolean(item));
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en", {
          dateStyle: "medium",
          timeZone: study.display_timezone,
        }).format(new Date(value))
      : "Open";
  return (
    <article className="mx-auto max-w-[8.5in] bg-white p-7 text-[#181b19] shadow-2xl print:max-w-none print:p-0 print:shadow-none">
      <div className="no-print mb-5 flex items-center justify-between rounded-md bg-[#07100d] p-3 text-white">
        <Button asChild variant="ghost">
          <Link href="/paired-testing-demo/reports">
            <ArrowLeft className="size-4" />
            Reports
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / Save PDF
        </Button>
      </div>
      <header className="border-b-2 border-[#17251f] py-8">
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase text-[#587065]">
              DoGoodie | Paired Testing Lab
            </p>
            <h1 className="mt-4 text-3xl font-semibold">{study.name}</h1>
            <p className="mt-2 text-sm text-[#587065]">
              {reportStage} and supporting appendices
            </p>
          </div>
          <div className="text-right">
            <p className="mono text-sm font-semibold">{packageId}</p>
            <p className="mono mt-1 text-[10px] text-[#587065]">
              {study.study_code} | {protocol?.version ?? "No active protocol"}
            </p>
          </div>
        </div>
      </header>
      <Section title="Scope and limitation">
        <p className="mb-3 border border-[#b9c1bd] bg-[#f5f7f5] px-3 py-2 text-[9px] font-semibold uppercase text-[#355346]">{reportStage}. Generated {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.display_timezone }).format(new Date())} ({study.display_timezone}).</p>
        <p className="leading-6">
          This report presents descriptive results from the selected
          paired-testing study. Validation rules, evidence requirements, and
          statistical thresholds must be interpreted under the approved protocol
          and reviewed by qualified legal, statistical, and forensic experts.
        </p>
        <p className="mt-2 leading-6">{demoConfig.interpretationNote}</p>
      </Section>
      <Section title="1. Executive summary">
        <div className="grid grid-cols-4 gap-2">
          {[
            ["Target usable pairs", study.target_pair_count ? `${accepted.length}/${study.target_pair_count}` : "Not set"],
            ["Accepted usable pairs", accepted.length],
            ["Accepted normally", acceptedNormally],
            ["Accepted with exception", acceptedWithException],
            ["Rejected pairs", rejected],
            ["Pending review", classification.pending.length],
            ["Evidence complete", `${evidenceComplete}/${pairs.length}`],
            ["Metadata available", `${evidenceMetadataAvailable}/${evidence.length}`],
          ].map(([label, value]) => (
            <PrintMetric
              key={label}
              label={String(label)}
              value={String(value)}
            />
          ))}
        </div>
        <p className="mt-4 leading-6">{acceptedNormally} pair{acceptedNormally === 1 ? "" : "s"} were accepted without an exception, {acceptedWithException} pair{acceptedWithException === 1 ? "" : "s"} were accepted with a documented technical exception, {excluded.length} pair{excluded.length === 1 ? "" : "s"} were rejected, and {classification.pending.length} pair{classification.pending.length === 1 ? "" : "s"} remain pending review. {meanVariance === null ? "No included pair has a recorded fare variance." : `Across included pairs with recorded fares, the mean directional variance was ${meanVariance.toFixed(2)}% and the median was ${medianVariance?.toFixed(2)}%. Positive values mean Tester B received the higher fare.`} {asynchronousTesting ? "Because observations used separate tester windows, time-related market effects remain a possible alternative explanation." : ""}</p>
      </Section>
      <Section title="2. Answer to the study question">
        <p className="border-l-2 border-[#355346] pl-3 text-[11px] font-semibold leading-6">
          {study.study_question ?? "No study question was recorded."}
        </p>
        {includedRecordedPairs.length ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <PrintMetric label={`Tester A average | ${protocol?.tester_a_value ?? "Condition A"}`} value={formatFare(averageTesterAFare, study.default_currency)} />
              <PrintMetric label={`Tester B average | ${protocol?.tester_b_value ?? "Condition B"}`} value={formatFare(averageTesterBFare, study.default_currency)} />
              <PrintMetric label="Average difference (B - A)" value={formatSignedFare(averageDirectionalDifference, study.default_currency)} />
              <PrintMetric label="Mean signed variance" value={meanVariance === null ? "-" : `${meanVariance.toFixed(2)}%`} />
              <PrintMetric label="Recorded usable pairs" value={String(includedRecordedPairs.length)} />
              <PrintMetric label="Higher recorded outcome" value={`A: ${testerAHigherCount} | B: ${testerBHigherCount} | Equal: ${equalFareCount}`} />
            </div>
            <p className="mt-3 leading-6">
              Across {includedRecordedPairs.length} usable pair{includedRecordedPairs.length === 1 ? "" : "s"} with recorded outcomes, Tester A&apos;s condition had the higher value in {testerAHigherCount}, Tester B&apos;s condition had the higher value in {testerBHigherCount}, and {equalFareCount} were equal. The average directional difference was {formatSignedFare(averageDirectionalDifference, study.default_currency)} (Tester B minus Tester A){meanVariance === null ? "." : `, with a mean signed variance of ${meanVariance.toFixed(2)}%.`} These results describe the accepted observations and do not establish causation.
            </p>
          </>
        ) : (
          <p className="mt-3 leading-6">The accepted observations do not yet contain enough recorded values to answer the study question descriptively.</p>
        )}
      </Section>
      <Section title="3. Study design">
        <p className="leading-6">Two assigned testers collected {asynchronousTesting ? "sequential fare observations in separately enforced tester windows" : "synchronized fare observations in one shared testing window"} for the locked route, side-specific provider or service tier, and protocol conditions. The system compared the submissions using the active protocol, retained required evidence and system metadata, and separated deterministic technical validation from expert review.</p>
      </Section>
      <Section title="4. Study context">
        <dl className="grid grid-cols-2 gap-x-8">
          {[
            ["Study code", study.study_code],
            ["Status", study.status],
            ["Currency", study.default_currency ?? "Not set"],
            ["Tester A service", testerAServiceLabel],
            ["Tester B service", testerBServiceLabel],
            ["Comparison mode", study.study_type === "cross_platform_comparison" ? "Cross-platform comparison" : "Within-platform comparison"],
            ["Testing synchronization", asynchronousTesting ? "Separate tester windows" : "Synchronized paired session"],
            ["Operating-system control", osLabel],
            ["Pickup", route?.pickup ?? "Not recorded"],
            ["Destination", route?.destination ?? "Not recorded"],
            ["Timezone", study.display_timezone],
            [
              "Testing period",
              `${date(study.testing_starts_at)} - ${date(study.testing_ends_at)}`,
            ],
            [
              "Protocol",
              protocol
                ? `${protocol.protocol_code} | ${protocol.version}`
                : "No active protocol",
            ],
            ["Study question", study.study_question ?? "Not recorded"],
            ["Isolated variable", study.isolated_variable ?? "Not recorded"],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-[#d8ddda] py-2">
              <dt className="text-[8px] font-bold uppercase text-[#587065]">
                {label}
              </dt>
              <dd className="mt-1 text-[9px]">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="5. Intended tester difference">
        <p className="leading-6">The isolated variable is the only intended difference between the paired testers. All other fixed controls must remain matched under the active protocol.</p>
        <div className="mt-3 grid grid-cols-2 gap-3"><PrintMetric label="Tester A condition" value={protocol?.tester_a_value ?? "Not recorded"} /><PrintMetric label="Tester B condition" value={protocol?.tester_b_value ?? "Not recorded"} /></div>
      </Section>
      <Section title="6. Protocol controls">
        <ul className="space-y-1 leading-5"><li>Side-specific service control: each tester must use the provider and ride tier assigned to that protocol side.</li><li>{asynchronousTesting ? "Request-time synchronization: not applicable by study design; separate tester windows were enforced." : `Request-time threshold: ${formatThreshold(requestTimeThreshold)}.`}</li><li>Location threshold: {formatThreshold(locationThreshold)}. Tester-to-tester distance and each tester&apos;s pickup proximity remain validated.</li><li>Operating-system control: {osLabel}.</li><li>Required evidence: quote screenshot, screen recording, and system-generated metadata.</li></ul>
      </Section>
      <Section title="7. Descriptive fare results">
        <div className="grid grid-cols-3 gap-2"><PrintMetric label="Average signed variance" value={meanVariance === null ? "-" : `${meanVariance.toFixed(2)}%`} /><PrintMetric label="Median signed variance" value={medianVariance === null ? "-" : `${medianVariance.toFixed(2)}%`} /><PrintMetric label="Largest absolute variance" value={largestIncludedPair?.percentage_fare_difference === null || !largestIncludedPair ? "-" : `${Math.abs(largestIncludedPair.percentage_fare_difference).toFixed(2)}%`} /><PrintMetric label="Technical validation rate" value={technicalValidationRate === null ? "-" : `${technicalValidationRate.toFixed(1)}%`} /><PrintMetric label="Review acceptance rate" value={reviewAcceptanceRate === null ? "-" : `${reviewAcceptanceRate.toFixed(1)}%`} /><PrintMetric label="Matched pairs / submissions" value={`${pairs.length} / ${pairs.length * 2}`} /></div>
        <p className="mt-3 text-[#587065]">Positive signed variance means Tester B received the higher fare. These are descriptive results only.</p>
      </Section>
      <Section title="8. Largest included variance">
        {largestIncludedPair ? <div className="grid grid-cols-3 gap-2"><PrintMetric label="Pair" value={largestIncludedPair.pair_code} /><PrintMetric label="Tester A quote" value={formatFare(largestIncludedPair.submissionA.displayed_fare, largestIncludedPair.submissionA.currency)} /><PrintMetric label="Tester B quote" value={formatFare(largestIncludedPair.submissionB.displayed_fare, largestIncludedPair.submissionB.currency)} /><PrintMetric label="Variance" value={formatPercent(largestIncludedPair.percentage_fare_difference)} /><PrintMetric label="Request-time gap" value={asynchronousTesting ? "Not applicable by study design" : largestIncludedPair.timestamp_difference_seconds === null ? "-" : `${largestIncludedPair.timestamp_difference_seconds.toFixed(1)} seconds`} /><PrintMetric label="Technical / review" value={`${largestIncludedPair.technical_status} / ${reviewOutcome(latest.get(largestIncludedPair.id))}`} /></div> : <p>No included pair has a recorded fare difference.</p>}
        <p className="mt-3 text-[#587065]">This pair is selected mechanically as the included pair with the largest absolute recorded fare difference. It is not evidence of causation, discrimination, or liability.</p>
      </Section>
      <Section title="9. Paired submissions and technical conformance">
        <div className="grid grid-cols-4 gap-2"><PrintMetric label="Matched pairs" value={String(pairs.length)} /><PrintMetric label="Tester submissions" value={String(pairs.length * 2)} /><PrintMetric label="Required failures" value={String(failedRequiredChecks)} /><PrintMetric label="Warnings" value={String(warningChecks)} /></div>
        <PrintDistributions pairs={pairs} reviews={reviews} />
      </Section>
      <Section title="10. Expert-review status">
        <p className="leading-6">A technically invalid or incomplete pair is only included when an expert reviewer accepts it with a documented technical exception and its required evidence is complete. {accepted.length} usable pair{accepted.length === 1 ? "" : "s"} are included: {acceptedNormally} accepted without exception and {acceptedWithException} accepted with a documented technical exception. {excluded.length} pair{excluded.length === 1 ? "" : "s"} are rejected and {classification.pending.length} remain pending review. Technical findings inform these decisions but do not replace reviewer judgment.</p>
      </Section>
      <Section title="11. Limitations">
        <p className="leading-6">This memo is descriptive. A pricing difference alone does not establish unlawful discrimination. Findings require interpretation under the approved methodology, repeated observations, statistical analysis, alternative explanations, and applicable law.</p>
      </Section>
      <Section title="12. Next-review questions">
        <ol className="list-decimal space-y-1 pl-4">{nextReviewQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
      </Section>
      <div className="mt-10 border-t-2 border-[#17251f] pt-4 print:break-before-page"><p className="text-[10px] font-bold uppercase text-[#587065]">Supporting appendices</p></div>
      <Section title="A. Assignment testing windows">
        <table className="w-full text-[8px]"><thead><tr className="bg-[#eef1ef]"><Head>Assignment</Head><Head>Mode</Head><Head>Tester A window</Head><Head>Tester B window</Head></tr></thead><tbody>{assignments.map((assignment) => { const testerA = assignment.testers.find((tester) => tester.slot === "tester_a"); const testerB = assignment.testers.find((tester) => tester.slot === "tester_b"); return <tr key={assignment.id}><Cell>{assignment.assignment_code}</Cell><Cell>{testerA?.testingSynchronization === "asynchronous" ? "Separate windows" : "Synchronized"}</Cell><Cell>{formatReportWindow(testerA?.scheduledStart ?? assignment.scheduled_start, testerA?.scheduledEnd ?? assignment.scheduled_end, study.display_timezone)}</Cell><Cell>{formatReportWindow(testerB?.scheduledStart ?? assignment.scheduled_start, testerB?.scheduledEnd ?? assignment.scheduled_end, study.display_timezone)}</Cell></tr>; })}</tbody></table>
      </Section>
      <Section title="B. Assignment disposition">
        <table className="w-full text-[8px]"><thead><tr className="bg-[#eef1ef]"><Head>Total</Head><Head>Completed</Head><Head>Cancelled</Head><Head>Expired</Head><Head>Unfinished</Head></tr></thead><tbody><tr><Cell>{disposition.total}</Cell><Cell>{disposition.completed}</Cell><Cell>{disposition.cancelled}</Cell><Cell>{disposition.expired}</Cell><Cell>{disposition.unfinished}</Cell></tr></tbody></table>
        <p className="mt-2 text-[#587065]">Cancelled and expired assignments are operational exclusions and do not represent observed fare comparisons.</p>
      </Section>
      <Section title="C. Included pairs">
        <PairTable pairs={accepted} latest={latest} />
      </Section>
      <Section title="D. Rejected pairs">
        <PairTable pairs={excluded} latest={latest} />
      </Section>
      <Section title="E. Reviewer decisions">
        <table className="w-full text-[8px]">
          <thead>
            <tr className="bg-[#eef1ef]">
              <Head>Pair</Head>
              <Head>Status</Head>
              <Head>Reason</Head>
              <Head>Decided</Head>
              <Head>Reviewer note</Head>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const review = latest.get(pair.id);
              return (
                <tr key={pair.id}>
                  <Cell>{pair.pair_code}</Cell>
                  <Cell>{reviewOutcome(review)}</Cell>
                  <Cell>{review?.reason ?? "-"}</Cell>
                  <Cell>{review?.decided_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.display_timezone }).format(new Date(review.decided_at)) : "-"}</Cell>
                  <Cell>{review?.note ?? "-"}</Cell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
      <Section title="F. Rule-level protocol results">
        <table className="w-full text-[8px]"><thead><tr className="bg-[#eef1ef]"><Head>Pair</Head><Head>Rule</Head><Head>Level</Head><Head>Finding</Head><Head>Configured threshold</Head><Head>Result</Head></tr></thead><tbody>{validationResults.map((result) => <tr key={result.id}><Cell>{pairs.find((pair) => pair.id === result.matched_pair_id)?.pair_code ?? result.matched_pair_id}</Cell><Cell>{result.label}</Cell><Cell>{result.requirement_level}</Cell><Cell>{result.observed_difference ?? "-"}</Cell><Cell>{formatThreshold(result.threshold_configuration)}</Cell><Cell>{result.status}</Cell></tr>)}</tbody></table>
      </Section>
      <Section title="G. Evidence inventory">
        <p className="mb-2 text-[#587065]">{evidence.length} uploaded evidence record{evidence.length === 1 ? "" : "s"}; metadata is available for {evidenceMetadataAvailable}/{evidence.length} evidence record{evidence.length === 1 ? "" : "s"}. System metadata is stored with each evidence record rather than exported as a separate media file.</p>
        <table className="w-full text-[8px]"><thead><tr className="bg-[#eef1ef]"><Head>Evidence</Head><Head>Pair</Head><Head>Tester</Head><Head>Type</Head><Head>Integrity</Head></tr></thead><tbody>{evidence.map((file) => <tr key={file.id}><Cell>{file.evidence_code ?? file.id}</Cell><Cell>{file.pairCode ?? "Unpaired"}</Cell><Cell>{file.testerName}</Cell><Cell>{file.evidence_type}</Cell><Cell>{file.integrity_status}</Cell></tr>)}</tbody></table>
      </Section>
      <Section title="H. Package inventory">
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["Evidence records", evidence.length],
            ["Evidence metadata available", `${evidenceMetadataAvailable}/${evidence.length}`],
            ["Activity events", activityTotal],
            ["Review records", reviews.length],
            ["Generated", new Date().toISOString()],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between border-b border-[#d8ddda] py-2"
            >
              <dt className="text-[#587065]">{label}</dt>
              <dd className="mono">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <footer className="mt-10 flex justify-between border-t border-[#17251f] pt-3 text-[8px] uppercase text-[#587065]">
        <span>Descriptive study output | Expert interpretation required</span>
        <span>
          {study.study_code} | {packageId}
        </span>
      </footer>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="mb-3 border-b border-[#89978f] pb-2 text-sm font-semibold">
        {title}
      </h2>
      <div className="text-[10px]">{children}</div>
    </section>
  );
}
function PrintMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#b9c1bd] p-3">
      <p className="text-[8px] uppercase text-[#587065]">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold leading-6">{value}</p>
    </div>
  );
}
function PrintDistributions({ pairs, reviews }: { pairs: MatchedPairSummary[]; reviews: ExpertReview[] }) {
  const latest = new Map<string, ExpertReview>();
  for (const review of reviews) if (!latest.has(review.matched_pair_id)) latest.set(review.matched_pair_id, review);
  const rows = [
    ["Technically valid", pairs.filter((pair) => pair.technical_status === "valid").length],
    ["Technical warning", pairs.filter((pair) => pair.technical_status === "warning").length],
    ["Technical invalid/incomplete", pairs.filter((pair) => ["invalid", "incomplete"].includes(pair.technical_status)).length],
    ["Accepted review", pairs.filter((pair) => latest.get(pair.id)?.status === "accepted").length],
  ] as const;
  return <div className="mt-4 space-y-2">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[150px_1fr_28px] items-center gap-2"><span>{label}</span><div className="h-2 bg-[#e2e7e4]"><div className="h-full bg-[#618a76]" style={{ width: `${pairs.length ? Math.max((value / pairs.length) * 100, value ? 3 : 0) : 0}%` }} /></div><span className="mono text-right">{value}</span></div>)}</div>;
}
function PairTable({
  pairs,
  latest,
}: {
  pairs: MatchedPairSummary[];
  latest: Map<string, ExpertReview>;
}) {
  return (
    <table className="w-full text-[8px]">
      <thead>
        <tr className="bg-[#eef1ef]">
          <Head>Pair</Head>
          <Head>Fare A</Head>
          <Head>Fare B</Head>
          <Head>Variance</Head>
          <Head>Technical</Head>
          <Head>Review</Head>
        </tr>
      </thead>
      <tbody>
        {pairs.map((pair) => (
          <tr key={pair.id}>
            <Cell>{pair.pair_code}</Cell>
            <Cell>{formatFare(pair.submissionA.displayed_fare, pair.submissionA.currency)}</Cell>
            <Cell>{formatFare(pair.submissionB.displayed_fare, pair.submissionB.currency)}</Cell>
            <Cell>
              {pair.percentage_fare_difference === null
                ? "-"
                : `${pair.percentage_fare_difference.toFixed(2)}%`}
            </Cell>
            <Cell>{pair.technical_status}</Cell>
            <Cell>{reviewOutcome(latest.get(pair.id))}</Cell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function reviewOutcome(review: ExpertReview | undefined) {
  if (!review) return "Pending";
  if (review.status === "accepted" && review.technical_exception) return "Accepted with technical exception";
  return review.status.charAt(0).toUpperCase() + review.status.slice(1);
}
function formatFare(value: number | null, currency: string | null) {
  return value === null ? "-" : `${currency ?? ""} ${value.toFixed(2)}`.trim();
}
function formatSignedFare(value: number | null, currency: string | null) {
  if (value === null) return "-";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${currency ? `${currency} ` : ""}${Math.abs(value).toFixed(2)}`;
}
function formatPercent(value: number | null) {
  return value === null ? "-" : `${value.toFixed(2)}%`;
}
function formatReportWindow(start: string | null, end: string | null, timezone: string) {
  if (!start || !end) return "Not scheduled";
  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: timezone }).format(new Date(start));
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: timezone });
  return `${date}, ${time.format(new Date(start))}-${time.format(new Date(end))}`;
}
function formatThreshold(value: MatchedPairValidationResult["threshold_configuration"]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Protocol requirement";
  const entries = Object.entries(value).filter(([, item]) => ["string", "number", "boolean"].includes(typeof item));
  if (!entries.length) return "Protocol requirement";
  return entries.map(([key, item]) => `${key.replaceAll("_", " ")}: ${String(item)}`).join("; ");
}
function Head({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-[#b9c1bd] p-1.5 text-left">{children}</th>
  );
}
function Cell({ children }: { children: React.ReactNode }) {
  return <td className="border border-[#b9c1bd] p-1.5">{children}</td>;
}
