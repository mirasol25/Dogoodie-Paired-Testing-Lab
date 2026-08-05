import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  FileArchive,
  MapPin,
  Route,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import type { ActivityLogEvent } from "@/lib/data/activity-logs";
import type { AssignmentSummary, AssignmentTesterSummary } from "@/lib/data/assignments";
import type { ExpertReview, MatchedPairSummary } from "@/lib/data/matched-pairs";
import type { AppRole } from "@/lib/data/profiles";
import type { Study } from "@/lib/data/studies";

interface OverviewClientProps {
  study: Study | null;
  pairs: MatchedPairSummary[];
  reviews: ExpertReview[];
  activity: ActivityLogEvent[];
  assignments: AssignmentSummary[];
  currentUserId: string;
  role: AppRole;
}

export function OverviewClient({
  study,
  pairs,
  reviews,
  activity,
  assignments,
  currentUserId,
  role,
}: OverviewClientProps) {
  if (!study) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold">No accessible study</h1>
        <p className="mt-2 text-sm text-muted-foreground">{role === "law_firm_viewer" ? "Finalized studies assigned to you will appear here after completion or archival." : "Ask an administrator or coordinator to add your account to a study."}</p>
        {["admin", "test_coordinator"].includes(role) ? (
          <Button asChild className="mt-5"><Link href="/paired-testing-demo/studies">Open studies</Link></Button>
        ) : null}
      </div>
    );
  }

  if (role === "tester") {
    return <TesterOverview study={study} assignments={assignments} activity={activity} currentUserId={currentUserId} />;
  }

  const latest = new Map<string, ExpertReview>();
  reviews.forEach((review) => {
    if (!latest.has(review.matched_pair_id)) latest.set(review.matched_pair_id, review);
  });
  const pending = pairs.filter((pair) => (latest.get(pair.id)?.status ?? "pending") === "pending").length;
  const valid = pairs.filter((pair) => pair.technical_status === "valid").length;
  const target = study.target_pair_count ?? 0;
  const progress = target ? Math.min((pairs.length / target) * 100, 100) : 0;
  const primary = role === "expert_reviewer"
    ? { href: "/paired-testing-demo/pairs", label: "Open review queue" }
    : { href: "/paired-testing-demo/dashboard", label: "Open study dashboard" };
  const recent = activity[0];

  return (
    <div className="space-y-6">
      <StudyHeader study={study} primary={primary} />
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
        <div className="rounded-md border border-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] uppercase text-primary">Active study</p><h2 className="mt-1 text-lg font-semibold">Collection and review progress</h2></div>
            <span className="text-xs text-muted-foreground">{study.display_timezone} | {study.default_currency ?? "Currency pending"}</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[["Target", target || "Not set"], ["Matched", pairs.length], ["Technically valid", valid], ["Pending review", pending]].map(([label, value]) => (
              <div key={label}><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>
            ))}
          </div>
          <Progress value={progress} className="mt-5 h-1.5" />
          <p className="mt-2 text-[10px] text-muted-foreground">{target ? `${progress.toFixed(0)}% of target collected` : "No pair target configured"}</p>
        </div>
        <RecentActivity activity={recent ? [recent] : []} study={study} showLog />
      </section>
      <section>
        <p className="text-[10px] uppercase text-primary">Study workflow</p>
        <h2 className="mt-1 text-lg font-semibold">From protocol to descriptive outputs</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Workflow icon={ClipboardCheck} title="Protocol" detail="Versioned controls and evidence requirements" href="/paired-testing-demo/protocol" />
          <Workflow icon={ShieldCheck} title="Matched validation" detail={`${pairs.length} paired observations`} href="/paired-testing-demo/pairs" />
          <Workflow icon={FileArchive} title="Evidence" detail="Private files and system metadata" href="/paired-testing-demo/evidence" />
          <Workflow icon={Scale} title="Reports" detail="Review decisions and descriptive exports" href="/paired-testing-demo/reports" />
        </div>
      </section>
      <InterpretationNote />
    </div>
  );
}

function TesterOverview({ study, assignments, activity, currentUserId }: Pick<OverviewClientProps, "study" | "assignments" | "activity" | "currentUserId"> & { study: Study }) {
  const ownAssignments = assignments
    .map((assignment) => ({ assignment, tester: assignment.testers.find((tester) => tester.userId === currentUserId) }))
    .filter((item): item is { assignment: AssignmentSummary; tester: AssignmentTesterSummary } => Boolean(item.tester))
    .sort((left, right) => new Date(left.assignment.scheduled_start ?? 0).getTime() - new Date(right.assignment.scheduled_start ?? 0).getTime());
  const next = [...ownAssignments].sort((left, right) => assignmentPriority(left.tester.status) - assignmentPriority(right.tester.status))[0];
  const activeCount = ownAssignments.filter(({ tester }) => !["submitted", "cancelled", "expired"].includes(tester.status)).length;

  return (
    <div className="space-y-6">
      <section className="border-y border-border py-7 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={study.status} /><span className="mono text-[10px] text-muted-foreground">{study.study_code}</span></div>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{study.name}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Your paired testing sessions, schedule, and submission status.</p>
          </div>
          <Button asChild><Link href="/paired-testing-demo/assignments">All assignments <ArrowRight className="size-4" /></Link></Button>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,.55fr)]">
        <NextSession study={study} item={next} activeCount={activeCount} totalCount={ownAssignments.length} />
        <RecentActivity activity={activity} study={study} />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] uppercase text-primary">Testing workflow</p><h2 className="mt-1 text-lg font-semibold">Your assigned sessions</h2></div>
          <span className="text-xs text-muted-foreground">{ownAssignments.length} assigned</span>
        </div>
        {ownAssignments.length ? (
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            {ownAssignments.map(({ assignment, tester }) => <TesterAssignmentRow key={assignment.id} assignment={assignment} tester={tester} study={study} />)}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-border px-5 py-10 text-center">
            <ClipboardCheck className="mx-auto size-5 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold">No sessions assigned</h3>
            <p className="mt-1 text-sm text-muted-foreground">A coordinator will add you to a paired testing session when one is ready.</p>
          </div>
        )}
      </section>
      <InterpretationNote />
    </div>
  );
}

function StudyHeader({ study, primary }: { study: Study; primary: { href: string; label: string } }) {
  return <section className="border-y border-border py-8 sm:py-10"><div className="max-w-4xl"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={study.status} /><span className="mono text-[10px] text-muted-foreground">{study.study_code}</span></div><h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{study.name}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{study.description || "Protocol-led paired testing, technical validation, expert review, and evidence organization."}</p><div className="mt-6 flex flex-wrap gap-2"><Button asChild><Link href={primary.href}>{primary.label}<ArrowRight className="size-4" /></Link></Button><Button asChild variant="outline"><Link href="/paired-testing-demo/protocol">View protocol</Link></Button></div></div></section>;
}

function NextSession({ study, item, activeCount, totalCount }: { study: Study; item: { assignment: AssignmentSummary; tester: AssignmentTesterSummary } | undefined; activeCount: number; totalCount: number }) {
  if (!item) return <div className="rounded-md border border-border p-5"><p className="text-[10px] uppercase text-primary">Next session</p><h2 className="mt-1 text-lg font-semibold">No active testing session</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">You have no session that requires action. Your completed sessions remain available in the assignments list.</p><div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4"><Metric label="Active" value={activeCount} /><Metric label="Assigned" value={totalCount} /></div></div>;
  const { assignment, tester } = item;
  const action = testerAction(tester.status);
  return <div className="rounded-md border border-primary/35 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase text-primary">Next session</p><h2 className="mt-1 text-lg font-semibold">{action.title}</h2><p className="mt-1 text-sm text-muted-foreground">{action.detail}</p></div><StatusBadge status={tester.status} /></div><div className="mt-5 grid gap-4 border-y border-border py-4 sm:grid-cols-2"><SessionFact icon={CalendarClock} label="Testing window" value={formatSchedule(assignment, study.display_timezone)} /><SessionFact icon={Route} label="Route" value={`${assignment.pickup_location ?? "Pickup"} to ${assignment.destination_location ?? "Destination"}`} /><SessionFact icon={MapPin} label="Your service" value={formatService(tester)} /><SessionFact icon={Clock3} label="Study timezone" value={study.display_timezone} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{activeCount} active of {totalCount} assigned session{totalCount === 1 ? "" : "s"}</p><Button asChild><Link href={`/paired-testing-demo/assignments/${assignment.id}`}>{action.button}<ArrowRight className="size-4" /></Link></Button></div></div>;
}

function TesterAssignmentRow({ assignment, tester, study }: { assignment: AssignmentSummary; tester: AssignmentTesterSummary; study: Study }) {
  const action = testerAction(tester.status);
  return <Link href={`/paired-testing-demo/assignments/${assignment.id}`} className="group grid gap-3 border-b border-border px-4 py-4 last:border-b-0 hover:bg-secondary/45 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="mono text-xs font-semibold">{assignment.assignment_code}</p><StatusBadge status={tester.status} /></div><p className="mt-2 text-sm font-medium">{formatService(tester)}</p><p className="mt-1 text-xs text-muted-foreground">{assignment.pickup_location ?? "Pickup"} to {assignment.destination_location ?? "Destination"}</p></div><div><p className="text-xs font-medium">{formatSchedule(assignment, study.display_timezone)}</p><p className="mt-1 text-xs text-muted-foreground">{action.detail}</p></div><ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" /></Link>;
}

function RecentActivity({ activity, study, showLog = false }: { activity: ActivityLogEvent[]; study: Study; showLog?: boolean }) {
  return <aside className="rounded-md border border-border p-5"><p className="text-[10px] uppercase text-primary">Recent activity</p>{activity.length ? <div className="mt-4 space-y-4">{activity.map((event) => <div key={event.id} className="border-l border-primary pl-3"><p className="text-sm font-medium capitalize">{event.action.replaceAll(".", " ")}</p><p className="mt-1 text-[10px] text-muted-foreground">{event.actor_name} | {formatActivityDate(event.created_at, study.display_timezone)}</p></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No activity recorded for your assigned sessions.</p>}{showLog ? <Button asChild variant="link" className="mt-3 h-auto px-0 text-xs"><Link href="/paired-testing-demo/audit">Open activity log<ArrowRight className="size-3" /></Link></Button> : null}</aside>;
}

function Workflow({ icon: Icon, title, detail, href }: { icon: typeof Scale; title: string; detail: string; href: string }) { return <Link href={href} className="group rounded-md border border-border p-4 hover:border-primary/35 hover:bg-secondary"><Icon className="size-4 text-primary" /><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p><ArrowRight className="mt-4 size-4 text-muted-foreground group-hover:text-primary" /></Link>; }
function Metric({ label, value }: { label: string; value: number }) { return <div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
function SessionFact({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) { return <div className="flex gap-2"><Icon className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-xs font-medium leading-5">{value}</p></div></div>; }
function InterpretationNote() { return <section className="border-t border-border pt-5"><p className="text-xs leading-6 text-muted-foreground">A pricing difference alone does not establish unlawful discrimination. Results require interpretation under the approved methodology, repeated observations, statistical analysis, alternative explanations, and applicable law.</p></section>; }

function assignmentPriority(status: AssignmentTesterSummary["status"]) { return status === "in_progress" ? 0 : status === "assigned" || status === "ready" ? 1 : status === "submitted" ? 2 : 3; }
function testerAction(status: AssignmentTesterSummary["status"]) { if (status === "assigned") return { title: "Confirm session readiness", detail: "Review the session details and confirm that you are ready to test.", button: "Open session" }; if (status === "ready") return { title: "Session ready", detail: "Wait for both testers to be ready, then begin within the scheduled window.", button: "Open session" }; if (status === "in_progress") return { title: "Capture and submit your quote", detail: "Record the required observation and upload the required evidence.", button: "Continue test" }; if (status === "submitted") return { title: "Observation submitted", detail: "Your submission is recorded. The paired result will progress after the other tester submits.", button: "View session" }; return { title: "Session closed", detail: "This session no longer requires action.", button: "View session" }; }
function formatService(tester: AssignmentTesterSummary) { return [tester.platformName, tester.serviceName].filter(Boolean).join(" - ") || "Assigned provider and ride tier"; }
function formatSchedule(assignment: AssignmentSummary, timezone: string) { if (!assignment.scheduled_start || !assignment.scheduled_end) return "Schedule pending"; const format = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone }); return `${format.format(new Date(assignment.scheduled_start))} to ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(assignment.scheduled_end))}`; }
function formatActivityDate(value: string, timezone: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value)); }
