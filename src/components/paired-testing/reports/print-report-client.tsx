"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoConfig } from "@/config/paired-testing-demo.config";
import type { Study } from "@/lib/data/studies";
import type { Protocol } from "@/lib/data/protocols";
import type { AssignmentSummary } from "@/lib/data/assignments";
import { assignmentDisposition, classifyReportPairs } from "@/lib/reports/report-classification";
import type {
  ExpertReview,
  MatchedPairSummary,
  MatchedPairValidationResult,
} from "@/lib/data/matched-pairs";
import type { EvidenceRecord } from "@/lib/data/evidence";

export function PrintReportClient({
  study,
  protocol,
  assignments,
  pairs,
  reviews,
  validationResults,
  evidence,
  activityTotal,
}: {
  study: Study;
  protocol: Protocol | null;
  assignments: AssignmentSummary[];
  pairs: MatchedPairSummary[];
  reviews: ExpertReview[];
  validationResults: MatchedPairValidationResult[];
  evidence: EvidenceRecord[];
  activityTotal: number;
}) {
  const classification = classifyReportPairs(pairs, reviews);
  const latest = classification.latest;
  const accepted = classification.included;
  const excluded = classification.excluded;
  const flagged = classification.flagged;
  const disposition = assignmentDisposition(assignments);
  const evidenceComplete = pairs.filter(
    (pair) => pair.evidence_status === "complete",
  ).length;
  const packageId = `${study.study_code}-PKG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  const failedRequiredChecks = validationResults.filter((result) => result.requirement_level === "required" && result.status === "fail").length;
  const warningChecks = validationResults.filter((result) => result.status === "warning").length;
  const nextReviewQuestions = [
    flagged.length ? `What follow-up resolves the ${flagged.length} flagged pair${flagged.length === 1 ? "" : "s"}?` : null,
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
              Neutral analytical memo and supporting appendices
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
            ["Matched pairs", pairs.length],
            ["Included results", accepted.length],
            ["Flagged", flagged.length],
            ["Evidence complete", `${evidenceComplete}/${pairs.length}`],
          ].map(([label, value]) => (
            <PrintMetric
              key={label}
              label={String(label)}
              value={String(value)}
            />
          ))}
        </div>
      </Section>
      <Section title="2. Method summary">
        <p className="leading-6">Two assigned testers collected contemporaneous fare observations for the locked route, provider or service tier, testing window, and protocol conditions. The system compared the submissions using the active protocol, retained required evidence and system metadata, and separated deterministic technical validation from expert review.</p>
      </Section>
      <Section title="3. Study context">
        <dl className="grid grid-cols-2 gap-x-8">
          {[
            ["Study code", study.study_code],
            ["Status", study.status],
            ["Currency", study.default_currency ?? "Not set"],
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
      <Section title="4. Observations and technical conformance">
        <div className="grid grid-cols-4 gap-2"><PrintMetric label="Observations" value={String(pairs.length)} /><PrintMetric label="Required failures" value={String(failedRequiredChecks)} /><PrintMetric label="Warnings" value={String(warningChecks)} /><PrintMetric label="Evidence records" value={String(evidence.length)} /></div>
        <PrintDistributions pairs={pairs} reviews={reviews} />
      </Section>
      <Section title="5. Expert-review status">
        <p className="leading-6">{accepted.length} included, {flagged.length} flagged for follow-up, {excluded.length} excluded, and {classification.pending.length} pending expert review. Technical findings inform these decisions but do not replace reviewer judgment.</p>
      </Section>
      <Section title="6. Limitations">
        <p className="leading-6">This memo is descriptive. A pricing difference alone does not establish unlawful discrimination. Findings require interpretation under the approved methodology, repeated observations, statistical analysis, alternative explanations, and applicable law.</p>
      </Section>
      <Section title="7. Next-review questions">
        <ol className="list-decimal space-y-1 pl-4">{nextReviewQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
      </Section>
      <div className="mt-10 border-t-2 border-[#17251f] pt-4 print:break-before-page"><p className="text-[10px] font-bold uppercase text-[#587065]">Supporting appendices</p></div>
      <Section title="A. Assignment disposition">
        <table className="w-full text-[8px]"><thead><tr className="bg-[#eef1ef]"><Head>Total</Head><Head>Completed</Head><Head>Cancelled</Head><Head>Expired</Head><Head>Unfinished</Head></tr></thead><tbody><tr><Cell>{disposition.total}</Cell><Cell>{disposition.completed}</Cell><Cell>{disposition.cancelled}</Cell><Cell>{disposition.expired}</Cell><Cell>{disposition.unfinished}</Cell></tr></tbody></table>
        <p className="mt-2 text-[#587065]">Cancelled and expired assignments are operational exclusions and do not represent observed fare comparisons.</p>
      </Section>
      <Section title="B. Included pairs">
        <PairTable pairs={accepted} latest={latest} />
      </Section>
      <Section title="C. Flagged follow-up pairs">
        <PairTable pairs={flagged} latest={latest} />
      </Section>
      <Section title="D. Excluded and incomplete pairs">
        <PairTable pairs={excluded} latest={latest} />
      </Section>
      <Section title="E. Reviewer decisions">
        <table className="w-full text-[8px]">
          <thead>
            <tr className="bg-[#eef1ef]">
              <Head>Pair</Head>
              <Head>Status</Head>
              <Head>Reason</Head>
              <Head>Reviewer note</Head>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const review = latest.get(pair.id);
              return (
                <tr key={pair.id}>
                  <Cell>{pair.pair_code}</Cell>
                  <Cell>{review?.status ?? "pending"}</Cell>
                  <Cell>{review?.reason ?? "-"}</Cell>
                  <Cell>{review?.note ?? "-"}</Cell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
      <Section title="F. Rule-level protocol results">
        <table className="w-full text-[8px]"><thead><tr className="bg-[#eef1ef]"><Head>Pair</Head><Head>Rule</Head><Head>Level</Head><Head>Finding</Head><Head>Result</Head></tr></thead><tbody>{validationResults.map((result) => <tr key={result.id}><Cell>{pairs.find((pair) => pair.id === result.matched_pair_id)?.pair_code ?? result.matched_pair_id}</Cell><Cell>{result.label}</Cell><Cell>{result.requirement_level}</Cell><Cell>{result.observed_difference ?? "-"}</Cell><Cell>{result.status}</Cell></tr>)}</tbody></table>
      </Section>
      <Section title="G. Evidence inventory">
        <table className="w-full text-[8px]"><thead><tr className="bg-[#eef1ef]"><Head>Evidence</Head><Head>Pair</Head><Head>Tester</Head><Head>Type</Head><Head>Integrity</Head></tr></thead><tbody>{evidence.map((file) => <tr key={file.id}><Cell>{file.evidence_code ?? file.id}</Cell><Cell>{file.pairCode ?? "Unpaired"}</Cell><Cell>{file.testerName}</Cell><Cell>{file.evidence_type}</Cell><Cell>{file.integrity_status}</Cell></tr>)}</tbody></table>
      </Section>
      <Section title="H. Package inventory">
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["Evidence records", evidence.length],
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
      <p className="mt-2 text-xl font-semibold">{value}</p>
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
            <Cell>{pair.submissionA.displayed_fare ?? "-"}</Cell>
            <Cell>{pair.submissionB.displayed_fare ?? "-"}</Cell>
            <Cell>
              {pair.percentage_fare_difference === null
                ? "-"
                : `${pair.percentage_fare_difference.toFixed(2)}%`}
            </Cell>
            <Cell>{pair.technical_status}</Cell>
            <Cell>{latest.get(pair.id)?.status ?? "pending"}</Cell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Head({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-[#b9c1bd] p-1.5 text-left">{children}</th>
  );
}
function Cell({ children }: { children: React.ReactNode }) {
  return <td className="border border-[#b9c1bd] p-1.5">{children}</td>;
}
