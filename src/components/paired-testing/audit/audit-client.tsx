"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight, Eye, History, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import type { ActivityLogEvent, ActivityLogFilterOptions } from "@/lib/data/activity-logs";
import type { AppRole } from "@/lib/data/profiles";

const roleLabels: Record<string, string> = { admin: "Administrator", test_coordinator: "Test Coordinator", tester: "Tester", expert_reviewer: "Expert Reviewer", law_firm_viewer: "Law-Firm Viewer" };

function eventCode(id: string) { return `EVT-${id.slice(0, 8).toUpperCase()}`; }
function actionLabel(value: string) { return value.split(".").map((part) => part.replaceAll("_", " ")).join(" - "); }
function filterLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function detailValue(event: ActivityLogEvent, key: string): string | undefined {
  if (!event.details || typeof event.details !== "object" || Array.isArray(event.details)) return undefined;
  const value = event.details[key];
  return typeof value === "string" ? value : undefined;
}
function eventSummary(event: ActivityLogEvent): string {
  const object = detailValue(event, "pair_code") || detailValue(event, "assignment_code") || detailValue(event, "protocol_code") || detailValue(event, "study_code") || detailValue(event, "evidence_code");
  const next = detailValue(event, "new_status") || detailValue(event, "status");
  const actions: Record<string, string> = {
    "study.created": "Study created",
    "study.status_changed": `Study status changed${next ? ` to ${next}` : ""}`,
    "study.member_added": "Study member added",
    "study.membership_status_changed": "Study membership updated",
    "protocol.activated": "Protocol version activated",
    "protocol.version_created": "Protocol version created",
    "assignment.created": "Paired assignment created",
    "assignment.status_changed": `Assignment status changed${next ? ` to ${next}` : ""}`,
    "assignment.cancelled": "Assignment cancelled by coordinator",
    "assignment.expired": "Assignment testing window expired",
    "assignment.tester_ready": "Tester confirmed readiness",
    "assignment.test_started": "Testing session started",
    "submission.draft_saved": "Observation draft saved",
    "submission.submitted": "Tester observation submitted",
    "evidence.uploaded": "Evidence file uploaded",
    "evidence.integrity_complete": "Evidence integrity check completed",
    "evidence.integrity_flagged": "Evidence integrity issue detected",
    "evidence.integrity_rejected": "Evidence file rejected",
    "pair.created": "Matched pair created",
    "pair.evidence_status_changed": `Pair evidence status changed${next ? ` to ${next}` : ""}`,
    "validation.completed": "Technical validation completed",
    "review.accepted": "Reviewer accepted matched pair",
    "review.flagged": "Reviewer flagged matched pair for follow-up",
    "review.rejected": "Reviewer rejected matched pair",
    "review.cleared": "Reviewer decision cleared",
    "report.generated": "Study report generated",
  };
  const summary = actions[event.action] || actionLabel(event.action);
  return object ? `${summary}: ${object}` : summary;
}
function eventHref(event: ActivityLogEvent): string | null {
  if (event.target_type === "assignment" && event.target_id) return `/paired-testing-demo/assignments/${event.target_id}`;
  if (event.target_type === "pair" && event.target_id) return `/paired-testing-demo/pairs/${event.target_id}`;
  if (event.target_type === "protocol") return "/paired-testing-demo/protocol";
  if (event.target_type === "evidence") return "/paired-testing-demo/evidence";
  if (event.target_type === "report") return "/paired-testing-demo/reports";
  if (event.target_type === "study") return "/paired-testing-demo/dashboard";
  return null;
}
function detailRows(event: ActivityLogEvent): Array<[string, string]> {
  if (!event.details || typeof event.details !== "object" || Array.isArray(event.details)) return [];
  return Object.entries(event.details).map(([key, value]) => [key.replaceAll("_", " "), typeof value === "string" ? value : JSON.stringify(value)]);
}

interface FilterState { search: string; category: string; actorId: string; targetType: string; action: string; dateFrom: string; dateTo: string; page: number; pageSize: number; total: number }

export function AuditClient({ role, study, events, categories, options, filters, basePath = "/audit" }: { role: AppRole; study: { code: string; name: string; timezone: string }; events: ActivityLogEvent[]; categories: string[]; options: ActivityLogFilterOptions; filters: FilterState; basePath?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.search);
  const [selected, setSelected] = useState<ActivityLogEvent | null>(null);
  const pages = Math.max(Math.ceil(filters.total / filters.pageSize), 1);

  const activeFilterCount = [filters.search, filters.category, filters.actorId, filters.targetType, filters.action, filters.dateFrom, filters.dateTo].filter(Boolean).length;

  function navigate(next: Partial<Pick<FilterState, "search" | "category" | "actorId" | "targetType" | "action" | "dateFrom" | "dateTo" | "page">>) {
    const params = new URLSearchParams();
    const search = next.search ?? filters.search;
    const category = next.category ?? filters.category;
    const actorId = next.actorId ?? filters.actorId;
    const targetType = next.targetType ?? filters.targetType;
    const action = next.action ?? filters.action;
    const dateFrom = next.dateFrom ?? filters.dateFrom;
    const dateTo = next.dateTo ?? filters.dateTo;
    const page = next.page ?? 1;
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (actorId) params.set("actor", actorId);
    if (targetType) params.set("target", targetType);
    if (action) params.set("action", action);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (page > 1) params.set("page", String(page));
        router.push(`${basePath}${params.size ? `?${params}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${study.code} - Operational history`} title={role === "expert_reviewer" ? "Review History" : role === "law_firm_viewer" ? "Study History" : role === "tester" ? "My Activity" : "Activity Log"} description={role === "expert_reviewer" ? `Validation, evidence, and review events for ${study.name}` : role === "law_firm_viewer" ? `Finalized study milestones for ${study.name}` : role === "tester" ? `Events connected to your assignments and submissions in ${study.name}` : study.name} />
      <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-muted-foreground">This is a system-recorded operational history. It is not a legally certified, immutable, or tamper-proof chain-of-custody record.</div>
      <section className="audit-filter-panel overflow-hidden rounded-md border border-border">
        <div className="space-y-3 border-b border-border bg-card/20 p-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <form className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={(event) => { event.preventDefault(); navigate({ search: query, page: 1 }); }}><div className="relative min-w-0"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search activity" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actor, action, object, or event" className="pl-9" /></div><Button type="submit" size="sm" variant="outline" className="h-8 px-3">Search</Button></form>
            <Select value={filters.category || "all"} onValueChange={(value) => navigate({ category: value === "all" ? "" : value, actorId: "", targetType: "", action: "", page: 1 })}><SelectTrigger className="w-full min-w-0"><SelectValue>{filters.category ? filterLabel(filters.category) : "All categories"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((category) => <SelectItem key={category} value={category}>{filterLabel(category)}</SelectItem>)}</SelectContent></Select>
            {activeFilterCount ? <Button variant="ghost" className="justify-start md:justify-center" onClick={() => { setQuery(""); router.push(basePath); }}><X className="size-4" />Clear ({activeFilterCount})</Button> : <span className="hidden md:block" />}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(180px,1.2fr)_minmax(300px,1.5fr)]">
            <Select value={filters.actorId || "all"} onValueChange={(value) => navigate({ actorId: value === "all" ? "" : value, page: 1 })}><SelectTrigger className="w-full min-w-0"><SelectValue>{filters.actorId ? options.actors.find((actor) => actor.id === filters.actorId)?.label ?? "Selected actor" : "All actors"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All actors</SelectItem>{options.actors.map((actor) => <SelectItem key={actor.id} value={actor.id}>{actor.label}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.targetType || "all"} onValueChange={(value) => navigate({ targetType: value === "all" ? "" : value, page: 1 })}><SelectTrigger className="w-full min-w-0"><SelectValue>{filters.targetType ? filterLabel(filters.targetType) : "All objects"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All objects</SelectItem>{options.targetTypes.map((target) => <SelectItem key={target} value={target}>{filterLabel(target)}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.action || "all"} onValueChange={(value) => navigate({ action: value === "all" ? "" : value, page: 1 })}><SelectTrigger className="w-full min-w-0"><SelectValue>{filters.action ? filterLabel(actionLabel(filters.action)) : "All actions"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All actions</SelectItem>{options.actions.map((action) => <SelectItem key={action} value={action}>{filterLabel(actionLabel(action))}</SelectItem>)}</SelectContent></Select>
            <div className="grid gap-2 sm:grid-cols-2"><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[9px] uppercase text-muted-foreground">From</span><Input type="date" aria-label="Activity start date" value={filters.dateFrom} onChange={(event) => navigate({ dateFrom: event.target.value, page: 1 })} className="pl-12" /></div><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[9px] uppercase text-muted-foreground">To</span><Input type="date" aria-label="Activity end date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => navigate({ dateTo: event.target.value, page: 1 })} className="pl-9" /></div></div>
          </div>
        </div>
        <div className="divide-y divide-border md:hidden">{events.map((event) => <article key={event.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="mono text-[10px] font-semibold text-primary">{eventCode(event.id)}</p><p className="mt-1 text-sm font-medium leading-5">{eventSummary(event)}</p></div><Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => setSelected(event)} title={`View ${eventCode(event.id)}`}><Eye className="size-4" /><span className="sr-only">View event</span></Button></div><div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs"><div><p className="text-[9px] uppercase text-muted-foreground">Actor</p><p className="mt-1 font-medium">{event.actor_name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{event.actor_role ? roleLabels[event.actor_role] : "System"}</p></div><div><p className="text-[9px] uppercase text-muted-foreground">Date &amp; time</p><p className="mt-1 leading-5 text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.timezone }).format(new Date(event.created_at))}</p></div></div><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline" className="capitalize">{event.category}</Badge><span className="text-[10px] capitalize text-muted-foreground">{event.target_type || "Record"}</span></div></article>)}{!events.length ? <p className="px-4 py-12 text-center text-sm text-muted-foreground">No activity matches the selected filters.</p> : null}</div>
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader className="bg-secondary/35"><TableRow><TableHead>Event</TableHead><TableHead>Date &amp; time</TableHead><TableHead>Actor</TableHead><TableHead>Activity</TableHead><TableHead>Object</TableHead><TableHead>Category</TableHead><TableHead>Integrity</TableHead><TableHead /></TableRow></TableHeader><TableBody>{events.map((event) => { const href = eventHref(event); return <TableRow key={event.id}><TableCell className="mono text-xs font-semibold">{eventCode(event.id)}</TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.timezone }).format(new Date(event.created_at))}</TableCell><TableCell className="min-w-44 whitespace-normal"><p className="text-sm font-medium">{event.actor_name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{event.actor_role ? roleLabels[event.actor_role] : "System"}</p></TableCell><TableCell className="min-w-64 whitespace-normal text-sm font-medium">{eventSummary(event)}</TableCell><TableCell>{href ? <Link href={href} className="group block"><p className="flex items-center gap-1 text-xs capitalize group-hover:text-primary">{event.target_type || "Record"}<ArrowUpRight className="size-3" /></p><p className="mono mt-0.5 max-w-28 truncate text-[10px] text-primary">{event.target_id || "-"}</p></Link> : <><p className="text-xs capitalize">{event.target_type || "Record"}</p><p className="mono mt-0.5 max-w-28 truncate text-[10px] text-muted-foreground">{event.target_id || "-"}</p></>}</TableCell><TableCell><Badge variant="outline" className="capitalize">{event.category}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">System-recorded</TableCell><TableCell><Button variant="ghost" size="icon-sm" onClick={() => setSelected(event)} title={`View ${eventCode(event.id)}`}><Eye className="size-4" /><span className="sr-only">View event</span></Button></TableCell></TableRow>; })}{!events.length ? <TableRow><TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">No activity matches the selected filters.</TableCell></TableRow> : null}</TableBody></Table></div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2"><p className="text-xs text-muted-foreground">{filters.total ? `${(filters.page - 1) * filters.pageSize + 1}-${Math.min(filters.page * filters.pageSize, filters.total)} of ${filters.total}` : "0 events"}</p><div className="flex items-center gap-2"><Button size="icon-sm" variant="outline" disabled={filters.page <= 1} onClick={() => navigate({ page: filters.page - 1 })} title="Previous page"><ChevronLeft className="size-4" /></Button><span className="min-w-16 text-center text-xs">{filters.page} / {pages}</span><Button size="icon-sm" variant="outline" disabled={filters.page >= pages} onClick={() => navigate({ page: filters.page + 1 })} title="Next page"><ChevronRight className="size-4" /></Button></div></div>
      </section>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><SheetContent><SheetHeader><SheetTitle className="flex items-center gap-2"><History className="size-4 text-primary" />Event details</SheetTitle><SheetDescription>System-recorded operational event for {study.code}.</SheetDescription></SheetHeader>{selected ? <div className="space-y-5 overflow-y-auto px-4 pb-6"><div><p className="mono text-lg font-semibold">{eventCode(selected.id)}</p><p className="mt-2 text-sm font-medium">{eventSummary(selected)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(selected.created_at).toISOString()}</p></div>{eventHref(selected) ? <Button asChild variant="outline" size="sm"><Link href={eventHref(selected)!}>Open related record<ArrowUpRight className="size-3.5" /></Link></Button> : null}<dl className="space-y-3 text-xs">{[["Actor", selected.actor_name], ["Actor email", selected.actor_email || "Not available"], ["Actor role", selected.actor_role ? roleLabels[selected.actor_role] : "System"], ["Action", actionLabel(selected.action)], ["Category", selected.category], ["Object", `${selected.target_type || "Record"} - ${selected.target_id || "Not available"}`]].map(([label, value]) => <div key={label} className="border-b border-border pb-2"><dt className="capitalize text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl>{detailRows(selected).length ? <div><p className="label-kicker">Event metadata</p><dl className="mt-3 space-y-3 text-xs">{detailRows(selected).map(([label, value]) => <div key={label} className="border-b border-border pb-2"><dt className="capitalize text-muted-foreground">{label}</dt><dd className="mono mt-1 break-words">{value}</dd></div>)}</dl></div> : null}</div> : null}</SheetContent></Sheet>
    </div>
  );
}
