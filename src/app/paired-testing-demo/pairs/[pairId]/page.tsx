import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, Clock3, GitCompareArrows, MessageSquareText, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { normalizedValidationResults, ValidationResultsView } from "@/components/paired-testing/pairs/validation-results-view";
import { PairEvidenceView } from "@/components/paired-testing/pairs/pair-evidence-view";
import { ExpertReviewPanel } from "@/components/paired-testing/pairs/expert-review-panel";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { StudyServiceContext } from "@/components/paired-testing/shared/study-service-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActiveStudy } from "@/lib/data/active-study";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { requireActiveUser } from "@/lib/auth/server";
import { listStudyEvidence } from "@/lib/data/evidence";
import { listProviderServiceOptions } from "@/lib/data/studies";
import { listPairReviews, listPairValidationResults, listStudyMatchedPairs, type MatchedPairSubmission } from "@/lib/data/matched-pairs";
import { getSubmissionScreenshotValidation } from "@/lib/data/screenshot-ocr";
import { listStudyProtocols } from "@/lib/data/protocols";

const show = (value: string | number | null) => value === null || value === "" ? "Not recorded" : String(value);

function SubmissionPanel({ label, submission }: { label: string; submission: MatchedPairSubmission }) {
  const rows = [
    ["Tester", submission.testerName],
    ["Displayed fare", `${submission.currency || ""} ${submission.displayed_fare ?? "Not recorded"}`.trim()],
    ["Quote timestamp", submission.quote_timestamp ? new Date(submission.quote_timestamp).toLocaleString() : "Not recorded"],
    ["Coordinates", submission.latitude !== null && submission.longitude !== null ? `${submission.latitude}, ${submission.longitude}` : "Not recorded"],
    ["Network", show(submission.network_type)], ["Device", show(submission.device_type)],
    ["Operating system", [submission.operating_system, submission.operating_system_version].filter(Boolean).join(" ") || "Not recorded"],
    ["App version", show(submission.app_version)],
    ["Battery", submission.battery_percentage === null ? "Not recorded" : `${submission.battery_percentage}%`],
  ];
  return <section className="overflow-hidden rounded-md border border-border"><div className="border-b border-border bg-card/45 px-4 py-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{submission.testerName}</p></div><dl className="divide-y divide-border">{rows.map(([name, entry]) => <div key={name} className="grid grid-cols-[125px_1fr] gap-4 px-4 py-3 text-xs"><dt className="text-muted-foreground">{name}</dt><dd className="break-words font-medium">{entry}</dd></div>)}</dl></section>;
}

export default async function PairPage({ params }: { params: Promise<{ pairId: string }> }) {
  const { pairId } = await params;
  const identity = await requireActiveUser(`/paired-testing-demo/pairs/${pairId}`);
  const study = await getActiveStudy();
  if (!study) notFound();
  const pairs = await listStudyMatchedPairs(study.id);
  const pair = pairs.find((candidate) => candidate.id === pairId);
  if (!pair) notFound();
  const [results, studyEvidence, reviews, serviceOptions, ocrA, ocrB, protocols] = await Promise.all([listPairValidationResults(pair.id), listStudyEvidence(study.id), listPairReviews(pair.id), listProviderServiceOptions(), getSubmissionScreenshotValidation(pair.submissionA.id), getSubmissionScreenshotValidation(pair.submissionB.id), listStudyProtocols(study.id)]);
  const pairProtocol = protocols.find((protocol) => protocol.id === pair.protocolId) ?? null;
  const evidence = studyEvidence.filter((record) => record.pairId === pair.id);
  const canOpenFiles = ["admin", "test_coordinator", "expert_reviewer"].includes(identity.profile.role) || evidence.some((record) => record.uploaded_by === identity.user.id);
  const displayResults = normalizedValidationResults(results);
  const passed = displayResults.filter((result) => result.status === "pass" || result.status === "not_applicable").length;
  const pairedAt = pair.paired_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.display_timezone }).format(new Date(pair.paired_at)) : "Pending";
  const canReview = identity.profile.role === "expert_reviewer";
  const displayedReview = canReview ? reviews.find((review) => review.reviewer_id === identity.user.id) ?? null : reviews[0] ?? null;
  const displayedReviewOutcome = displayedReview?.status === "accepted" && displayedReview.technical_exception
    ? "accepted_with_exception"
    : displayedReview?.status ?? "pending";
  const pairIndex = pairs.findIndex((candidate) => candidate.id === pair.id);
  const previousPair = pairIndex > 0 ? pairs[pairIndex - 1] : null;
  const nextPair = pairIndex < pairs.length - 1 ? pairs[pairIndex + 1] : null;
  const nextPendingPair = pairs.find((candidate, index) => index > pairIndex && candidate.reviewStatus === "pending")
    ?? pairs.find((candidate) => candidate.id !== pair.id && candidate.reviewStatus === "pending")
    ?? null;

  return <div className="space-y-6">
    <PageHeader eyebrow={`${pair.assignmentCode} - Persisted pair`} title={pair.pair_code} description={`Technical comparison for ${study.name}.`} actions={<Button asChild variant="outline"><Link href="/paired-testing-demo/pairs"><ArrowLeft className="size-4" />Back to pairs</Link></Button>} />
    <StudyServiceContext study={study} services={serviceOptions} />
    <section className="grid overflow-hidden rounded-md border border-border lg:grid-cols-[1.2fr_1fr_1fr]"><Outcome label="Technical outcome"><StatusBadge status={pair.technical_status} className="px-3 py-1.5" /><span className="text-xs text-muted-foreground">{passed} of {displayResults.length} checks passed or not applicable</span></Outcome><Outcome label="Review status"><StatusBadge status={displayedReviewOutcome} className="px-3 py-1.5" /></Outcome><Outcome label="Paired at"><span className="text-sm font-medium">{pairedAt}</span></Outcome></section>
    {pair.technical_status === "pending" ? <div className="flex items-start gap-3 rounded-md border border-amber-400/25 bg-amber-400/[0.04] p-4"><Clock3 className="mt-0.5 size-4 text-amber-300" /><div><p className="text-sm font-semibold">Pending technical validation</p><p className="mt-1 text-xs text-muted-foreground">The submissions are linked. Calculated differences and protocol checks are not available yet.</p></div></div> : null}
    <Tabs defaultValue="validation" className="gap-4"><TabsList><TabsTrigger value="validation">Validation results</TabsTrigger><TabsTrigger value="submissions">Paired submissions</TabsTrigger><TabsTrigger value="evidence">Evidence</TabsTrigger></TabsList><TabsContent value="validation"><div className="mb-3"><p className="text-[10px] uppercase text-primary">Protocol checks</p><h2 className="mt-1 text-lg font-semibold">Rule-by-rule findings</h2></div><ValidationResultsView results={results} timezone={study.display_timezone} protocolConfiguration={pairProtocol?.validation_configuration} /></TabsContent><TabsContent value="submissions"><div className="grid gap-4 lg:grid-cols-2"><SubmissionPanel label="Tester A submission" submission={pair.submissionA} /><SubmissionPanel label="Tester B submission" submission={pair.submissionB} /></div></TabsContent><TabsContent value="evidence"><PairEvidenceView records={evidence} submissionAId={pair.submissionA.id} submissionBId={pair.submissionB.id} timezone={study.display_timezone} canOpenFiles={canOpenFiles} ocrValidations={[ocrA, ocrB].filter(Boolean)} /></TabsContent></Tabs>
    <div className="space-y-3"><section className="overflow-hidden rounded-md border border-primary/30 bg-primary/[0.035]"><div className="flex min-h-14 items-center gap-3 border-b border-primary/20 px-5 py-3"><MessageSquareText className="size-4 text-primary" /><div><p className="text-[10px] uppercase text-primary">Reviewer context</p><h2 className="mt-1 text-sm font-semibold">Tester notes</h2></div></div><div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0"><div className="p-4"><p className="text-xs font-semibold">Tester A: {pair.submissionA.testerName}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{pair.submissionA.notes?.trim() || "No note provided."}</p></div><div className="p-4"><p className="text-xs font-semibold">Tester B: {pair.submissionB.testerName}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{pair.submissionB.notes?.trim() || "No note provided."}</p></div></div></section><section className="overflow-hidden rounded-md border border-border bg-card/25"><div className="flex min-h-14 items-center gap-3 border-b border-border bg-card/35 px-5 py-3"><BookOpenCheck className="size-4 text-primary" /><div><p className="text-[10px] uppercase text-muted-foreground">Methodology guardrail</p><h2 className="mt-1 text-sm font-semibold">Interpretation note</h2></div></div><div className="p-5 sm:p-6"><div className="max-w-4xl border-l-2 border-primary pl-4"><p className="text-base font-medium leading-7">A pricing difference is an observed result, not a legal conclusion.</p><p className="mt-3 text-sm leading-7 text-muted-foreground">{demoConfig.interpretationNote}</p></div><div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-xs font-medium">Technical findings</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Confirm protocol controls and evidence integrity before deciding.</p></div></div><div className="flex gap-3"><GitCompareArrows className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-xs font-medium">Study context</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Interpret this pair alongside repeated observations and alternative explanations.</p></div></div></div></div></section><ExpertReviewPanel pairId={pair.id} review={displayedReview} canReview={canReview} technicalStatus={pair.technical_status} evidenceStatus={pair.evidence_status} /></div>
    <nav aria-label="Pair review navigation" className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2"><Button asChild variant="outline" size="sm" className={!previousPair ? "pointer-events-none opacity-50" : undefined}><Link href={previousPair ? `/paired-testing-demo/pairs/${previousPair.id}` : "#"}><ArrowLeft className="size-4" />Previous pair</Link></Button><Button asChild variant="outline" size="sm" className={!nextPair ? "pointer-events-none opacity-50" : undefined}><Link href={nextPair ? `/paired-testing-demo/pairs/${nextPair.id}` : "#"}>Next pair<ArrowRight className="size-4" /></Link></Button></div><div className="flex gap-2"><Button asChild variant="ghost" size="sm"><Link href="/paired-testing-demo/pairs">Return to matched pairs</Link></Button>{canReview && nextPendingPair ? <Button asChild size="sm"><Link href={`/paired-testing-demo/pairs/${nextPendingPair.id}`}>Next pending<ArrowRight className="size-4" /></Link></Button> : null}</div></nav>
  </div>;
}

function Outcome({ label, children }: { label: string; children: React.ReactNode }) { return <div className="flex min-h-24 flex-col justify-center gap-3 border-b border-border p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><div className="flex flex-wrap items-center gap-3">{children}</div></div>; }
