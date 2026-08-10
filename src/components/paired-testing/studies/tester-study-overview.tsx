import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, MapPin, Route, UserRoundCheck } from "lucide-react";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { AssignmentSummary, AssignmentTesterSummary } from "@/lib/data/assignments";
import type { Study } from "@/lib/data/studies";

interface Item { assignment: AssignmentSummary; slot: AssignmentTesterSummary }

function schedule(item: Item, timezone: string) {
  const start = item.slot.scheduledStart ?? item.assignment.scheduled_start;
  const end = item.slot.scheduledEnd ?? item.assignment.scheduled_end;
  if (!start || !end) return "Schedule pending";
  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: timezone }).format(new Date(start));
  const starts = new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone: timezone }).format(new Date(start));
  const ends = new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone: timezone }).format(new Date(end));
  return `${date}, ${starts} - ${ends}`;
}

function nextLabel(status: AssignmentTesterSummary["status"], historical: boolean) {
  if (historical || status === "submitted") return "View submission";
  if (status === "in_progress") return "Continue observation";
  if (status === "ready") return "Start test";
  return "Prepare assignment";
}

export function TesterStudyOverview({ study, items }: { study: Study; items: Item[] }) {
  const historical = ["completed", "archived"].includes(study.status);
  const actionable = items.filter(({ slot }) => ["assigned", "ready", "in_progress"].includes(slot.status));
  const submitted = items.filter(({ slot }) => slot.status === "submitted");
  const featured = actionable[0] ?? submitted.at(-1) ?? items[0];

  return <div className="space-y-6">
    <PageHeader eyebrow={`${study.study_code} - Tester workspace`} title={study.name} description={historical ? "Read-only history of your assigned sessions and submissions." : "Your assigned condition, schedule, route, and testing work."} actions={<Button asChild variant="outline"><Link href="/tester-studies">Assigned studies</Link></Button>} />

    <section className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={study.status} />{historical ? <span className="text-xs text-muted-foreground">Collection is closed. Your records are read-only.</span> : <span className="text-xs text-muted-foreground">{study.display_timezone}</span>}</div><Button asChild size="sm"><Link href={`/studies/${study.id}/assignments`}>{historical ? "View all history" : "All assignments"}<ArrowRight className="size-4" /></Link></Button></section>

    <div className="grid gap-3 sm:grid-cols-3">{[["Assigned", items.length], [historical ? "Completed" : "Needs action", historical ? submitted.length : actionable.length], ["Submitted", submitted.length]].map(([label, value]) => <div key={label} className="rounded-md border border-border p-4"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="numeric mt-2 text-2xl font-semibold">{value}</p></div>)}</div>

    {featured ? <section className="overflow-hidden rounded-md border border-primary/35"><div className="flex flex-col gap-3 border-b border-border bg-primary/[0.04] p-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] uppercase text-primary">{historical ? "Submission history" : actionable.length ? "Next assignment" : "Latest assignment"}</p><h2 className="mt-1 text-base font-semibold">{featured.assignment.assignment_code}</h2></div><StatusBadge status={featured.slot.status} /></div><div className="grid gap-px bg-border sm:grid-cols-2"><Fact icon={UserRoundCheck} label="Your assignment" value={`${featured.slot.slot === "tester_a" ? "Tester A" : "Tester B"} - ${[featured.slot.platformName, featured.slot.serviceName].filter(Boolean).join(" - ") || featured.slot.protocolValue || "Assigned condition"}`} /><Fact icon={CalendarClock} label={featured.slot.testingSynchronization === "asynchronous" ? "Your testing window" : "Shared testing window"} value={schedule(featured, study.display_timezone)} /><Fact icon={Route} label="Route" value={`${featured.assignment.pickup_location ?? "Pickup"} to ${featured.assignment.destination_location ?? "Destination"}`} /><Fact icon={Clock3} label="Study timezone" value={study.display_timezone} /></div><div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{historical ? "This assignment can be viewed but no longer changed." : featured.slot.status === "submitted" ? "Your observation has been submitted." : "Open the assignment to review instructions and continue."}</p><Button asChild><Link href={`/paired-testing-demo/assignments/${featured.assignment.id}`}>{nextLabel(featured.slot.status, historical)}<ArrowRight className="size-4" /></Link></Button></div></section> : <section className="rounded-md border border-border px-5 py-12 text-center"><CheckCircle2 className="mx-auto size-7 text-muted-foreground" /><h2 className="mt-3 text-sm font-semibold">No assigned sessions</h2><p className="mt-1 text-xs text-muted-foreground">A coordinator will assign a testing session when one is available.</p></section>}

    {!historical && featured ? <section className="border-t border-border pt-5"><p className="text-[10px] uppercase text-primary">Testing workflow</p><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{["Review instructions", "Confirm readiness", "Start test", "Record observation", "Upload evidence", "Submit"].map((step, index) => <div key={step} className="rounded-md border border-border px-3 py-3"><span className="mono text-[10px] text-primary">{index + 1}</span><p className="mt-1 text-xs font-medium">{step}</p></div>)}</div></section> : null}
  </div>;
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) { return <div className="bg-background p-4"><div className="flex items-center gap-2 text-primary"><Icon className="size-3.5" /><p className="text-[10px] uppercase">{label}</p></div><p className="mt-2 text-sm font-medium leading-6">{value}</p></div>; }
