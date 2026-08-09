"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import type { AssignmentSummary, AssignmentTesterSummary } from "@/lib/data/assignments";
import type { Study } from "@/lib/data/studies";

interface TesterAssignmentItem { study: Study; assignment: AssignmentSummary; slot: AssignmentTesterSummary }

function formatSchedule(assignment: AssignmentSummary, slot: AssignmentTesterSummary, timezone: string) {
  const startsAt = slot.scheduledStart ?? assignment.scheduled_start;
  const endsAt = slot.scheduledEnd ?? assignment.scheduled_end;
  if (!startsAt || !endsAt) return "Schedule pending";
  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: timezone }).format(new Date(startsAt));
  const time = new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone: timezone }).format(new Date(startsAt));
  const end = new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone: timezone }).format(new Date(endsAt));
  return `${date}, ${time} - ${end}`;
}

export function TesterAssignmentsClient({ study, items }: { study: Study | null; items: TesterAssignmentItem[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;
    return items.filter(({ study, assignment, slot }) => [study.name, study.study_code, assignment.assignment_code, assignment.pickup_location, assignment.destination_location, slot.platformName, slot.serviceName].join(" ").toLowerCase().includes(search));
  }, [items, query]);

  return <div className="space-y-6">
    <PageHeader eyebrow={study ? `${study.study_code} - Testing workflow` : "Testing workflow"} title="Your assigned sessions" description={study ? `Paired testing sessions assigned to you for ${study.name}.` : "Select an assigned study to view its paired testing sessions."} />
    <div className="grid gap-3 sm:grid-cols-3">{[["Assigned", items.length], ["Needs action", items.filter(({ slot }) => ["assigned", "ready", "in_progress"].includes(slot.status)).length], ["Submitted", items.filter(({ slot }) => slot.status === "submitted").length]].map(([label, value]) => <div key={label} className="data-panel rounded-md p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="numeric mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
    <section className="overflow-hidden rounded-md border border-border"><div className="border-b border-border bg-card/35 p-3"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search your assigned sessions" placeholder="Search assignment or route" className="h-9 bg-background/45 pl-9 text-xs" /></div></div><div className="divide-y divide-border">{visible.map(({ study, assignment, slot }) => <Link key={assignment.id} href={`/paired-testing-demo/assignments/${assignment.id}`} className="group grid gap-3 px-4 py-4 hover:bg-secondary/45 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"><div><p className="text-[10px] uppercase text-primary">{study.study_code}</p><p className="mt-1 text-sm font-semibold">{study.name}</p><p className="mono mt-1 text-[10px] text-muted-foreground">{assignment.assignment_code}</p></div><div><p className="text-xs font-medium">{assignment.pickup_location ?? "Pickup"} to {assignment.destination_location ?? "Destination"}</p><p className="mt-1 text-xs text-muted-foreground">{[slot.platformName, slot.serviceName].filter(Boolean).join(" - ") || "Assigned provider and tier"}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">{slot.testingSynchronization === "asynchronous" ? `Your ${slot.slot === "tester_a" ? "Tester A" : "Tester B"} window` : "Shared testing window"}</p><p className="mt-1 text-xs font-medium">{formatSchedule(assignment, slot, study.display_timezone)}</p><div className="mt-2"><StatusBadge status={slot.status} /></div></div><ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" /></Link>)}{!visible.length ? <div className="px-6 py-12 text-center"><ClipboardList className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{items.length ? "No matching sessions" : study ? "No sessions assigned" : "No study selected"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{items.length ? "Try a different assignment or route search." : study ? "A coordinator will add you to a paired testing session when one is ready." : "Choose a study from the study card to view its assignments."}</p></div> : null}</div></section>
  </div>;
}
