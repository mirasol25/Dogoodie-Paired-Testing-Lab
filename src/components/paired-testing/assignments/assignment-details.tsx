import Link from "next/link";
import { ArrowLeft, CalendarClock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import type { AssignmentSummary, AssignmentTesterSummary, EvidenceRow, SubmissionRow } from "@/lib/data/assignments";
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

export function AssignmentDetails({ study, assignment, submission, evidence, currentUserId }: { study: Study; assignment: AssignmentSummary; submission: SubmissionRow | null; evidence: EvidenceRow[]; currentUserId: string }) {
  const timezone = timezoneOf(assignment, study.display_timezone || "UTC");
  const testerA = assignment.testers.find((tester) => tester.slot === "tester_a");
  const testerB = assignment.testers.find((tester) => tester.slot === "tester_b");
  const ownTester = assignment.testers.find((tester) => tester.userId === currentUserId);
  const ownSlot = ownTester?.slot;
  const instructions = instructionsOf(assignment);
  return <div className="space-y-6">
    <PageHeader eyebrow={`${study.study_code} - Assignment`} title={assignment.assignment_code} description="Controlled paired testing session" actions={<Button asChild variant="outline"><Link href="/paired-testing-demo/assignments"><ArrowLeft className="size-4" />Assignments</Link></Button>} />

    <div className="flex flex-wrap items-center gap-2 border-y border-border py-3"><StatusBadge status={assignment.status} /><Badge variant="outline">{assignment.protocolCode} v{assignment.protocolVersion}</Badge>{ownSlot ? <Badge variant="secondary">Your side: {ownSlot === "tester_a" ? "Tester A" : "Tester B"}</Badge> : null}</div>

    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5"><div><p className="text-[10px] uppercase text-muted-foreground">Route</p><h2 className="mt-1.5 text-base font-semibold">{assignment.pickup_location} to {assignment.destination_location}</h2></div><div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2 sm:divide-x sm:divide-border"><Location label="Pickup" value={assignment.pickup_location} accent="primary" /><Location label="Destination" value={assignment.destination_location} accent="amber" /></div></div>
      <div className="space-y-4"><div><p className="text-[10px] uppercase text-muted-foreground">Testing window</p><h2 className="mt-1.5 text-base font-semibold">Scheduled paired session</h2></div><div className="rounded-md border border-primary/25 bg-primary/[0.025] p-4"><div className="flex gap-3"><CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-medium">{formatSchedule(assignment.scheduled_start, timezone)}</p><p className="mt-1 text-sm text-muted-foreground">until {formatSchedule(assignment.scheduled_end, timezone)}</p><p className="mono mt-3 text-[10px] text-primary">{timezone}</p></div></div></div></div>
    </section>

    <section className="space-y-3 border-t border-border pt-5"><div><p className="text-[10px] uppercase text-muted-foreground">Tester pair</p><h2 className="mt-1.5 text-base font-semibold">Assigned sides</h2></div><div className="grid gap-4 md:grid-cols-2"><TesterPanel side="Tester A" tester={testerA} own={testerA?.userId === currentUserId} hideControls={Boolean(ownSlot) && testerA?.userId !== currentUserId} accent="primary" /><TesterPanel side="Tester B" tester={testerB} own={testerB?.userId === currentUserId} hideControls={Boolean(ownSlot) && testerB?.userId !== currentUserId} accent="amber" /></div></section>

    {ownTester ? <TesterReadiness assignment={assignment} ownSlot={ownTester} partnerSlot={assignment.testers.find((tester) => tester.userId !== currentUserId)} /> : null}
    {ownTester ? <TesterStart assignment={assignment} ownSlot={ownTester} partnerSlot={assignment.testers.find((tester) => tester.userId !== currentUserId)} /> : null}
    {ownTester?.status === "in_progress" ? <TesterSubmissionForm study={study} assignment={assignment} ownSlot={ownTester} submission={submission} evidence={evidence} timezone={timezone} /> : null}
    {ownTester?.status === "submitted" ? <section className="rounded-md border border-primary/25 bg-primary/[0.025] p-4"><p className="text-sm font-semibold text-primary">Observation submitted</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{assignment.status === "ready_for_validation" ? "Both tester observations are complete and ready for matching and validation." : "Your observation is locked. Waiting for the partner tester to submit."}</p></section> : null}

    <section className="border-t border-border pt-5"><p className="text-[10px] uppercase text-muted-foreground">Operational instructions</p><p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-foreground">{instructions || "No additional instructions were added."}</p></section>
  </div>;
}

function Location({ label, value, accent }: { label: string; value: string; accent: "primary" | "amber" }) {
  return <div className="flex gap-3 p-4"><MapPin className={`mt-0.5 size-4 shrink-0 ${accent === "primary" ? "text-primary" : "text-amber-400"}`} /><div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>;
}

function TesterPanel({ side, tester, own, hideControls, accent }: { side: string; tester?: AssignmentTesterSummary; own: boolean; hideControls: boolean; accent: "primary" | "amber" }) {
  const service = hideControls ? "Partner configuration hidden" : tester ? `${tester.platformName ?? "Provider unavailable"} - ${tester.serviceName ?? "Tier unavailable"}` : "Slot unavailable";
  const condition = hideControls ? "Partner condition hidden" : tester?.protocolValue ?? "Not configured";
  return <div className={`overflow-hidden rounded-md border border-border border-t-2 ${accent === "primary" ? "border-t-primary" : "border-t-amber-400"}`}><div className="flex items-start justify-between gap-3 border-b border-border bg-secondary/20 px-4 py-3"><div><p className="text-sm font-semibold">{side}</p><p className="mt-1 text-xs text-muted-foreground">{service}</p></div>{own ? <Badge variant="secondary">You</Badge> : <StatusBadge status={tester?.status ?? "unassigned"} />}</div><div className="space-y-4 p-4"><div><p className="text-sm font-medium">{tester?.displayName ?? "Unassigned"}</p>{tester?.email ? <p className="mt-1 text-xs text-muted-foreground">{tester.email}</p> : null}</div><div className="border-t border-border pt-3"><p className="text-[10px] uppercase text-muted-foreground">Assigned condition</p><p className={`mt-1 text-sm font-medium ${hideControls ? "text-muted-foreground" : ""}`}>{condition}</p></div>{own ? <StatusBadge status={tester?.status ?? "unassigned"} /> : null}</div></div>;
}
