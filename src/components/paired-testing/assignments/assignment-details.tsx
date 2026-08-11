"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, CalendarClock, ClipboardList, MapPin, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import type { AssignmentOperationalSummary, AssignmentRouteGuidance, AssignmentSummary, AssignmentTesterSummary, EvidenceRow, SubmissionRow, TesterWorkflowState } from "@/lib/data/assignments";
import { cancelAssignmentAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import type { Study } from "@/lib/data/studies";
import { TesterReadiness } from "@/components/paired-testing/assignments/tester-readiness";
import { TesterSubmissionForm } from "@/components/paired-testing/assignments/tester-submission-form";
import type { ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

function instructionsOf(assignment: AssignmentSummary) {
  const value = assignment.instructions;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return typeof value.operational_instructions === "string" ? value.operational_instructions : null;
}

function timezoneOf(assignment: AssignmentSummary, fallback: string) {
  const value = assignment.instructions;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  return typeof value.timezone === "string" ? value.timezone : fallback;
}

function protocolObservationFields(assignment: AssignmentSummary) {
  const value = assignment.protocolValidationConfiguration;
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const fields = (value as { observation_fields?: Array<{ code?: string; label?: string; required?: boolean; source?: string }> }).observation_fields;
  const allowedAdditionalObservationCodes = new Set([
    "estimated_arrival_time",
    "availability",
    "price_breakdown",
    "tester_notes",
    "app_version",
    "battery_percentage",
    "network_category",
    "account_age_membership",
  ]);
  return Array.isArray(fields)
    ? fields.filter((field): field is { code: string; label: string; required: boolean; source: string } => Boolean(
      field &&
      typeof field.code === "string" &&
      typeof field.label === "string" &&
      typeof field.source === "string" &&
      field.source === "tester" &&
      allowedAdditionalObservationCodes.has(field.code),
    ))
    : [];
}

function formatSchedule(value: string | null, timezone: string) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

export function AssignmentDetails({ study, assignment, routeGuidance, submission, technicalProfile, evidence, screenshotValidation, screenshotPreviewUrl, currentUserId, canManage, operations, workflow }: { study: Study; assignment: AssignmentSummary; routeGuidance: AssignmentRouteGuidance | null; submission: SubmissionRow | null; technicalProfile: Pick<SubmissionRow, "device_type" | "operating_system" | "operating_system_version" | "app_version"> | null; evidence: EvidenceRow[]; screenshotValidation: ScreenshotValidationResult | null; screenshotPreviewUrl: string; currentUserId: string; canManage: boolean; operations: AssignmentOperationalSummary | null; workflow: TesterWorkflowState | null }) {
  const timezone = timezoneOf(assignment, study.display_timezone || "UTC");
  const testerA = assignment.testers.find((tester) => tester.slot === "tester_a");
  const testerB = assignment.testers.find((tester) => tester.slot === "tester_b");
  const ownTester = assignment.testers.find((tester) => tester.userId === currentUserId);
  const ownSlot = ownTester?.slot;
  const testerView = Boolean(ownTester) && !canManage;
  const partnerTester = ownTester ? assignment.testers.find((tester) => tester.userId !== currentUserId) : undefined;
  const instructions = instructionsOf(assignment);
  const asynchronousTesting = assignment.testers.some((tester) => tester.testingSynchronization === "asynchronous");
  const showPreparation = !testerView || ownTester?.status === "assigned" || ownTester?.status === "ready";
  const ownSubmissionIsFinal = submission?.status === "submitted" || ownTester?.status === "submitted";

  if (testerView && ownTester && ownSubmissionIsFinal) {
    return <TesterSubmissionReceipt study={study} assignment={assignment} tester={ownTester} submission={submission} evidence={evidence} timezone={timezone} />;
  }

  return <div className="space-y-6">
    <PageHeader eyebrow={`${study.study_code} - ${assignment.assignment_code}`} title={testerView ? "Your testing session" : assignment.assignment_code} description={testerView ? "Complete each step using your assigned condition, route, and testing window." : "Controlled paired testing session"} actions={<div className="flex gap-2">{canManage && !["completed", "cancelled", "expired"].includes(assignment.status) ? <CancelAssignment assignment={assignment} /> : null}<Button asChild variant="outline"><Link href={`/studies/${study.id}/assignments`}><ArrowLeft className="size-4" />{testerView ? "Your assignments" : "Assignments"}</Link></Button></div>} />

    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3"><StatusBadge status={assignment.status} /><span className="mono text-xs text-muted-foreground">{assignment.protocolCode} v{assignment.protocolVersion}</span>{ownSlot ? <span className="text-xs font-medium">You are {ownSlot === "tester_a" ? "Tester A" : "Tester B"}</span> : null}</div>

    {testerView && ownTester ? <WorkflowProgress status={ownTester.status} workflow={workflow} /> : null}

    {showPreparation && instructions ? <section className="overflow-hidden rounded-md border border-primary/35 bg-primary/[0.045]">
      <div className="flex items-center gap-3 border-b border-primary/20 px-4 py-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10"><ClipboardList className="size-4 text-primary" /></div><div><p className="text-[10px] uppercase tracking-wider text-primary">Coordinator instructions</p><h2 className="mt-0.5 text-sm font-semibold">Read before beginning this paired session</h2></div></div>
      <div className="px-4 py-4"><p className="max-w-4xl whitespace-pre-wrap text-sm leading-6 text-foreground">{instructions}</p></div>
    </section> : null}

    {showPreparation ? <section className="border-y border-border py-5"><div className="mb-4"><p className="text-[10px] uppercase text-muted-foreground">Session overview</p><h2 className="mt-1.5 text-base font-semibold">Route and testing window</h2></div><div className="grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-[1fr_1fr_1.15fr]">
      <Location label="Pickup" value={assignment.pickup_location} instructions={routeGuidance?.pickupInstructions ?? null} accent="primary" />
      <Location label="Destination" value={assignment.destination_location} instructions={routeGuidance?.destinationInstructions ?? null} accent="amber" />
      <div className="bg-background p-4"><div className="flex gap-3"><CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-[10px] uppercase text-muted-foreground">{asynchronousTesting ? "Your testing window" : "Shared testing window"}</p><p className="mt-2 text-sm font-semibold leading-6">{formatSchedule(ownTester?.scheduledStart ?? assignment.scheduled_start, timezone)}</p><p className="text-xs leading-5 text-muted-foreground">Until {formatSchedule(ownTester?.scheduledEnd ?? assignment.scheduled_end, timezone)}</p><p className="mono mt-2 text-[10px] text-primary">{timezone}</p>{asynchronousTesting ? <p className="mt-2 text-xs leading-5 text-muted-foreground">Your partner has a separate window. Request-time synchronization is not evaluated.</p> : null}</div></div></div>
    </div></section> : null}

    {testerView && ownTester && showPreparation ? <div className="grid gap-4 border-t border-border pt-5 lg:grid-cols-2"><YourAssignment tester={ownTester} /><PartnerContact tester={partnerTester} /></div> : null}

    {ownTester ? <TesterReadiness assignment={assignment} ownSlot={ownTester} partnerSlot={assignment.testers.find((tester) => tester.userId !== currentUserId)} /> : null}

    {!testerView ? <section className="space-y-3 border-t border-border pt-5"><div><p className="text-[10px] uppercase text-muted-foreground">Tester pair</p><h2 className="mt-1.5 text-base font-semibold">Assigned sides</h2></div><div className="grid gap-4 md:grid-cols-2"><TesterPanel side="Tester A" tester={testerA} own={testerA?.userId === currentUserId} hideControls={Boolean(ownSlot) && testerA?.userId !== currentUserId} accent="primary" /><TesterPanel side="Tester B" tester={testerB} own={testerB?.userId === currentUserId} hideControls={Boolean(ownSlot) && testerB?.userId !== currentUserId} accent="amber" /></div></section> : null}

    {canManage && operations ? <OperationalProgress assignment={assignment} operations={operations} /> : null}
    {ownTester?.status === "in_progress" && !ownSubmissionIsFinal && workflow ? <TesterSubmissionForm study={study} assignment={assignment} ownSlot={ownTester} submission={submission} technicalProfile={technicalProfile} evidence={evidence} initialScreenshotValidation={screenshotValidation} screenshotPreviewUrl={screenshotPreviewUrl} timezone={timezone} workflow={workflow} partnerName={partnerTester?.displayName ?? "your partner"} routeGuidance={routeGuidance} protocolObservationFields={protocolObservationFields(assignment)} /> : null}
  </div>;
}

function TesterSubmissionReceipt({ study, assignment, tester, submission, evidence, timezone }: { study: Study; assignment: AssignmentSummary; tester: AssignmentTesterSummary; submission: SubmissionRow | null; evidence: EvidenceRow[]; timezone: string }) {
  const submittedAt = submission?.submitted_at ? formatSchedule(submission.submitted_at, timezone) : "Submission recorded";
  const fare = submission?.displayed_fare === null || submission?.displayed_fare === undefined ? "Not recorded" : `${submission.currency ?? study.default_currency ?? ""} ${submission.displayed_fare}`.trim();
  return <div className="space-y-6"><PageHeader eyebrow={`${study.study_code} - ${assignment.assignment_code}`} title="Submission receipt" description="Your observation is submitted and locked." actions={<Button asChild variant="outline"><Link href={`/studies/${study.id}/assignments`}><ArrowLeft className="size-4" />Your assignments</Link></Button>} />
    <section className="rounded-md border border-primary/35 bg-primary/[0.035] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] uppercase text-primary">Submission complete</p><h2 className="mt-1 text-lg font-semibold">{assignment.assignment_code}</h2><p className="mt-1 text-xs text-muted-foreground">Submitted {submittedAt}</p></div><StatusBadge status="submitted" /></div><div className="mt-5 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"><ReceiptFact label="Your condition" value={tester.protocolValue ?? "Assigned condition"} /><ReceiptFact label="Displayed fare" value={fare} /><ReceiptFact label="Evidence" value={`${evidence.length} file${evidence.length === 1 ? "" : "s"}`} /><ReceiptFact label="Route" value={`${assignment.pickup_location} to ${assignment.destination_location}`} /></div><p className="mt-4 text-xs leading-5 text-muted-foreground">This record is read-only. Contact the coordinator if a correction is required.</p></section>
  </div>;
}

function ReceiptFact({ label, value }: { label: string; value: string }) { return <div className="bg-background p-4"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>; }

function CancelAssignment({ assignment }: { assignment: AssignmentSummary }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  function submit() {
    if (reason.trim().length < 10) return toast.error("Enter a cancellation reason of at least 10 characters.");
    startTransition(async () => {
      const result = await cancelAssignmentAction(assignment.id, reason);
      if (result.ok) { toast.success(result.message); setOpen(false); }
      else toast.error(result.message);
    });
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><XCircle className="size-4" />Cancel assignment</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Cancel {assignment.assignment_code}?</DialogTitle><DialogDescription>This permanently closes collection for both testers. Submitted records remain preserved.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="cancellation-reason">Cancellation reason</Label><Textarea id="cancellation-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={4} placeholder="Explain why this assignment cannot continue." /><p className="text-xs text-muted-foreground">Required and recorded in the Activity Log.</p></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Keep assignment</Button><Button variant="destructive" onClick={submit} disabled={pending}>{pending ? "Cancelling..." : "Cancel assignment"}</Button></DialogFooter></DialogContent></Dialog>;
}

function OperationalProgress({ assignment, operations }: { assignment: AssignmentSummary; operations: AssignmentOperationalSummary }) {
  const progress = (tester?: AssignmentTesterSummary) => {
    const submission = operations.submissions.find((item) => item.userId === tester?.userId);
    return { submission: submission?.status ?? "not started", evidence: submission ? `${submission.completeEvidenceCount}/${submission.evidenceCount} integrity-complete` : "No evidence" };
  };
  const testerA = assignment.testers.find((tester) => tester.slot === "tester_a");
  const testerB = assignment.testers.find((tester) => tester.slot === "tester_b");
  return <section className="space-y-3 border-t border-border pt-5"><div><p className="text-[10px] uppercase text-primary">Coordinator view</p><h2 className="mt-1.5 text-base font-semibold">Collection and validation progress</h2></div><div className="grid gap-3 md:grid-cols-3">{[["Tester A", testerA, progress(testerA)], ["Tester B", testerB, progress(testerB)]].map(([label, tester, state]) => { const typedTester = tester as AssignmentTesterSummary | undefined; const typedState = state as ReturnType<typeof progress>; return <div key={String(label)} className="rounded-md border border-border p-4"><p className="text-[10px] uppercase text-muted-foreground">{String(label)}</p><p className="mt-2 text-sm font-semibold">{typedTester?.displayName ?? "Unassigned"}</p><p className="mt-2 text-xs capitalize">Submission: {typedState.submission.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">Evidence: {typedState.evidence}</p></div>; })}<div className="rounded-md border border-border p-4"><p className="text-[10px] uppercase text-muted-foreground">Matched validation</p>{operations.pair ? <><Link href={`/paired-testing-demo/pairs/${operations.pair.id}`} className="mono mt-2 block text-sm font-semibold hover:text-primary">{operations.pair.pairCode}</Link><div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={operations.pair.technicalStatus} /><StatusBadge status={operations.pair.evidenceStatus} /></div></> : <><p className="mt-2 text-sm font-semibold">Pair pending</p><p className="mt-1 text-xs text-muted-foreground">Created automatically after both submissions.</p></>}</div></div></section>;
}

function Location({ label, value, instructions, accent }: { label: string; value: string; instructions: string | null; accent: "primary" | "amber" }) {
  return <div className="flex gap-3 bg-background p-4"><MapPin className={`mt-0.5 size-4 shrink-0 ${accent === "primary" ? "text-primary" : "text-amber-400"}`} /><div className="min-w-0"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold leading-5">{value}</p>{instructions ? <div className="mt-3 border-t border-border pt-3"><p className="text-[10px] uppercase text-muted-foreground">Instructions</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">{instructions}</p></div> : <p className="mt-2 text-xs text-muted-foreground">No additional instructions.</p>}</div></div>;
}

function WorkflowProgress({ status, workflow }: { status: AssignmentTesterSummary["status"]; workflow: TesterWorkflowState | null }) {
  const current = status === "submitted" ? 5 : workflow?.bothEvidenceReady ? 4 : status === "in_progress" ? 3 : status === "ready" ? 2 : 1;
  const steps = ["Scheduled", "Ready", "Capture & Upload", "Details", "Submitted"];
  return <section aria-label="Testing progress"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] uppercase text-primary">Your progress</p><p className="text-[10px] text-muted-foreground">Step {current} of {steps.length}</p></div><div className="grid grid-cols-5 gap-1">{steps.map((step, index) => { const complete = index + 1 < current || status === "submitted"; const active = index + 1 === current && status !== "submitted"; return <div key={step} className="min-w-0"><div className={`h-1.5 rounded-sm ${complete || active ? "bg-primary" : "bg-secondary"}`} /><p className={`mt-2 hidden truncate text-[9px] sm:block ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{step}</p></div>; })}</div></section>;
}

function YourAssignment({ tester }: { tester: AssignmentTesterSummary }) {
  return <section><p className="text-[10px] uppercase text-primary">Your assignment</p><div className="mt-3 h-[calc(100%-1.5rem)] overflow-hidden rounded-md border border-border"><dl className="divide-y divide-border px-4 text-xs"><InfoRow label="Side" value={tester.slot === "tester_a" ? "Tester A" : "Tester B"} /><InfoRow label="Service" value={[tester.platformName, tester.serviceName].filter(Boolean).join(" - ") || "Assigned service"} /><InfoRow label="Condition" value={tester.protocolValue ?? "Assigned condition"} /></dl></div></section>;
}

function PartnerContact({ tester }: { tester?: AssignmentTesterSummary }) {
  return <section><p className="text-[10px] uppercase text-amber-300">Testing partner</p><div className="mt-3 h-[calc(100%-1.5rem)] overflow-hidden rounded-md border border-border"><dl className="divide-y divide-border px-4 text-xs"><InfoRow label="Name" value={tester?.displayName ?? "Partner not assigned"} /><InfoRow label="Email" value={tester?.email ?? "Not available"} email={Boolean(tester?.email)} /><InfoRow label="Condition" value={tester?.protocolValue ?? "Assigned condition unavailable"} /></dl></div></section>;
}

function InfoRow({ label, value, email = false }: { label: string; value: string; email?: boolean }) {
  return <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words font-medium">{email ? <a href={`mailto:${value}`} className="text-primary hover:underline">{value}</a> : value}</dd></div>;
}

function TesterPanel({ side, tester, own, hideControls, accent }: { side: string; tester?: AssignmentTesterSummary; own: boolean; hideControls: boolean; accent: "primary" | "amber" }) {
  const service = hideControls ? "Partner details are private" : tester ? `${tester.platformName ?? "Provider unavailable"} - ${tester.serviceName ?? "Tier unavailable"}` : "Slot unavailable";
  const condition = tester?.protocolValue ?? "Not configured";
  return <div className={`overflow-hidden rounded-md border border-border border-t-2 ${accent === "primary" ? "border-t-primary" : "border-t-amber-400"}`}><div className="flex items-start justify-between gap-3 border-b border-border bg-secondary/20 px-4 py-3"><div><p className="text-sm font-semibold">{side}</p><p className="mt-1 text-xs text-muted-foreground">{service}</p></div>{own ? <Badge variant="secondary">You</Badge> : <StatusBadge status={tester?.status ?? "unassigned"} />}</div><div className="space-y-4 p-4"><div><p className="text-sm font-medium">{tester?.displayName ?? "Unassigned"}</p>{tester?.email ? <p className="mt-1 text-xs text-muted-foreground">{tester.email}</p> : null}</div>{hideControls ? null : <div className="border-t border-border pt-3"><p className="text-[10px] uppercase text-muted-foreground">Assigned condition</p><p className="mt-1 text-sm font-medium">{condition}</p></div>}{own ? <StatusBadge status={tester?.status ?? "unassigned"} /> : null}</div></div>;
}
