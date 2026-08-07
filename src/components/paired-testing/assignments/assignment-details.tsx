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
import type { AssignmentOperationalSummary, AssignmentSummary, AssignmentTesterSummary, EvidenceRow, SubmissionRow } from "@/lib/data/assignments";
import { cancelAssignmentAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import type { Study } from "@/lib/data/studies";
import { TesterReadiness } from "@/components/paired-testing/assignments/tester-readiness";
import { TesterStart } from "@/components/paired-testing/assignments/tester-start";
import { TesterSubmissionForm } from "@/components/paired-testing/assignments/tester-submission-form";

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

function formatSchedule(value: string | null, timezone: string) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

export function AssignmentDetails({ study, assignment, submission, technicalProfile, evidence, currentUserId, canManage, operations }: { study: Study; assignment: AssignmentSummary; submission: SubmissionRow | null; technicalProfile: Pick<SubmissionRow, "network_type" | "device_type" | "operating_system" | "operating_system_version" | "app_version"> | null; evidence: EvidenceRow[]; currentUserId: string; canManage: boolean; operations: AssignmentOperationalSummary | null }) {
  const timezone = timezoneOf(assignment, study.display_timezone || "UTC");
  const testerA = assignment.testers.find((tester) => tester.slot === "tester_a");
  const testerB = assignment.testers.find((tester) => tester.slot === "tester_b");
  const ownTester = assignment.testers.find((tester) => tester.userId === currentUserId);
  const ownSlot = ownTester?.slot;
  const instructions = instructionsOf(assignment);
  return <div className="space-y-6">
    <PageHeader eyebrow={`${study.study_code} - Assignment`} title={assignment.assignment_code} description="Controlled paired testing session" actions={<div className="flex gap-2">{canManage && !["completed", "cancelled", "expired"].includes(assignment.status) ? <CancelAssignment assignment={assignment} /> : null}<Button asChild variant="outline"><Link href="/paired-testing-demo/assignments"><ArrowLeft className="size-4" />Assignments</Link></Button></div>} />

    <div className="flex flex-wrap items-center gap-2 border-y border-border py-3"><StatusBadge status={assignment.status} /><Badge variant="outline">{assignment.protocolCode} v{assignment.protocolVersion}</Badge>{ownSlot ? <Badge variant="secondary">Your side: {ownSlot === "tester_a" ? "Tester A" : "Tester B"}</Badge> : null}</div>

    <section className="overflow-hidden rounded-md border border-primary/35 bg-primary/[0.045]">
      <div className="flex items-center gap-3 border-b border-primary/20 px-4 py-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10"><ClipboardList className="size-4 text-primary" /></div><div><p className="text-[10px] uppercase tracking-wider text-primary">Coordinator instructions</p><h2 className="mt-0.5 text-sm font-semibold">Read before beginning this paired session</h2></div></div>
      <div className="px-4 py-4"><p className="max-w-4xl whitespace-pre-wrap text-sm leading-6 text-foreground">{instructions || "No additional operational instructions were added for this session. Follow the active protocol and assigned route."}</p></div>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5"><div><p className="text-[10px] uppercase text-muted-foreground">Route</p><h2 className="mt-1.5 text-base font-semibold">{assignment.pickup_location} to {assignment.destination_location}</h2></div><div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2 sm:divide-x sm:divide-border"><Location label="Pickup" value={assignment.pickup_location} accent="primary" /><Location label="Destination" value={assignment.destination_location} accent="amber" /></div></div>
      <div className="space-y-4"><div><p className="text-[10px] uppercase text-muted-foreground">Testing window</p><h2 className="mt-1.5 text-base font-semibold">Scheduled paired session</h2></div><div className="rounded-md border border-primary/25 bg-primary/[0.025] p-4"><div className="flex gap-3"><CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-medium">{formatSchedule(assignment.scheduled_start, timezone)}</p><p className="mt-1 text-sm text-muted-foreground">until {formatSchedule(assignment.scheduled_end, timezone)}</p><p className="mono mt-3 text-[10px] text-primary">{timezone}</p></div></div></div></div>
    </section>

    <section className="space-y-3 border-t border-border pt-5"><div><p className="text-[10px] uppercase text-muted-foreground">Tester pair</p><h2 className="mt-1.5 text-base font-semibold">Assigned sides</h2></div><div className="grid gap-4 md:grid-cols-2"><TesterPanel side="Tester A" tester={testerA} own={testerA?.userId === currentUserId} hideControls={Boolean(ownSlot) && testerA?.userId !== currentUserId} accent="primary" /><TesterPanel side="Tester B" tester={testerB} own={testerB?.userId === currentUserId} hideControls={Boolean(ownSlot) && testerB?.userId !== currentUserId} accent="amber" /></div></section>

    {canManage && operations ? <OperationalProgress assignment={assignment} operations={operations} /> : null}

    {ownTester ? <TesterReadiness assignment={assignment} ownSlot={ownTester} partnerSlot={assignment.testers.find((tester) => tester.userId !== currentUserId)} /> : null}
    {ownTester ? <TesterStart assignment={assignment} ownSlot={ownTester} partnerSlot={assignment.testers.find((tester) => tester.userId !== currentUserId)} /> : null}
    {ownTester?.status === "in_progress" ? <TesterSubmissionForm study={study} assignment={assignment} ownSlot={ownTester} submission={submission} technicalProfile={technicalProfile} evidence={evidence} timezone={timezone} /> : null}
    {ownTester?.status === "submitted" ? <section className="rounded-md border border-primary/25 bg-primary/[0.025] p-4"><p className="text-sm font-semibold text-primary">Observation submitted</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{assignment.status === "ready_for_validation" ? "Both tester observations are complete and ready for matching and validation." : "Your observation is locked. Waiting for the partner tester to submit."}</p></section> : null}

  </div>;
}

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

function Location({ label, value, accent }: { label: string; value: string; accent: "primary" | "amber" }) {
  return <div className="flex gap-3 p-4"><MapPin className={`mt-0.5 size-4 shrink-0 ${accent === "primary" ? "text-primary" : "text-amber-400"}`} /><div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>;
}

function TesterPanel({ side, tester, own, hideControls, accent }: { side: string; tester?: AssignmentTesterSummary; own: boolean; hideControls: boolean; accent: "primary" | "amber" }) {
  const service = hideControls ? "Partner configuration hidden" : tester ? `${tester.platformName ?? "Provider unavailable"} - ${tester.serviceName ?? "Tier unavailable"}` : "Slot unavailable";
  const condition = hideControls ? "Partner condition hidden" : tester?.protocolValue ?? "Not configured";
  return <div className={`overflow-hidden rounded-md border border-border border-t-2 ${accent === "primary" ? "border-t-primary" : "border-t-amber-400"}`}><div className="flex items-start justify-between gap-3 border-b border-border bg-secondary/20 px-4 py-3"><div><p className="text-sm font-semibold">{side}</p><p className="mt-1 text-xs text-muted-foreground">{service}</p></div>{own ? <Badge variant="secondary">You</Badge> : <StatusBadge status={tester?.status ?? "unassigned"} />}</div><div className="space-y-4 p-4"><div><p className="text-sm font-medium">{tester?.displayName ?? "Unassigned"}</p>{tester?.email ? <p className="mt-1 text-xs text-muted-foreground">{tester.email}</p> : null}</div><div className="border-t border-border pt-3"><p className="text-[10px] uppercase text-muted-foreground">Assigned condition</p><p className={`mt-1 text-sm font-medium ${hideControls ? "text-muted-foreground" : ""}`}>{condition}</p></div>{own ? <StatusBadge status={tester?.status ?? "unassigned"} /> : null}</div></div>;
}
