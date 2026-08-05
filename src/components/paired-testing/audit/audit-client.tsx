"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, History, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import type { ActivityLogEvent, ActivityLogFilterOptions } from "@/lib/data/activity-logs";

const roleLabels: Record<string, string> = { admin: "Administrator", test_coordinator: "Test Coordinator", tester: "Tester", expert_reviewer: "Expert Reviewer", law_firm_viewer: "Law-Firm Viewer" };

function eventCode(id: string) { return `EVT-${id.slice(0, 8).toUpperCase()}`; }
function actionLabel(value: string) { return value.split(".").map((part) => part.replaceAll("_", " ")).join(" - "); }
function detailRows(event: ActivityLogEvent): Array<[string, string]> {
  if (!event.details || typeof event.details !== "object" || Array.isArray(event.details)) return [];
  return Object.entries(event.details).map(([key, value]) => [key.replaceAll("_", " "), typeof value === "string" ? value : JSON.stringify(value)]);
}

interface FilterState { search: string; category: string; actorId: string; targetType: string; action: string; dateFrom: string; dateTo: string; page: number; pageSize: number; total: number }

export function AuditClient({ study, events, categories, options, filters }: { study: { code: string; name: string; timezone: string }; events: ActivityLogEvent[]; categories: string[]; options: ActivityLogFilterOptions; filters: FilterState }) {
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
    router.push(`/paired-testing-demo/audit${params.size ? `?${params}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${study.code} - Operational history`} title="Activity Log" description={study.name} />
      <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-muted-foreground">This is a system-recorded operational history. It is not a legally certified, immutable, or tamper-proof chain-of-custody record.</div>
      <section className="overflow-hidden rounded-md border border-border">
        <div className="space-y-3 border-b border-border p-3"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><form className="relative max-w-md flex-1" onSubmit={(event) => { event.preventDefault(); navigate({ search: query, page: 1 }); }}><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search activity" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actor, action, object, or event" className="pl-9 pr-20" /><Button type="submit" size="sm" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2">Search</Button></form><Select value={filters.category || "all"} onValueChange={(value) => navigate({ category: value === "all" ? "" : value, page: 1 })}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((category) => <SelectItem key={category} value={category} className="capitalize">{category}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[180px_180px_180px_150px_150px_auto]"><Select value={filters.actorId || "all"} onValueChange={(value) => navigate({ actorId: value === "all" ? "" : value, page: 1 })}><SelectTrigger><SelectValue placeholder="All actors" /></SelectTrigger><SelectContent><SelectItem value="all">All actors</SelectItem>{options.actors.map((actor) => <SelectItem key={actor.id} value={actor.id}>{actor.label}</SelectItem>)}</SelectContent></Select><Select value={filters.targetType || "all"} onValueChange={(value) => navigate({ targetType: value === "all" ? "" : value, page: 1 })}><SelectTrigger><SelectValue placeholder="All objects" /></SelectTrigger><SelectContent><SelectItem value="all">All objects</SelectItem>{options.targetTypes.map((target) => <SelectItem key={target} value={target} className="capitalize">{target}</SelectItem>)}</SelectContent></Select><Select value={filters.action || "all"} onValueChange={(value) => navigate({ action: value === "all" ? "" : value, page: 1 })}><SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger><SelectContent><SelectItem value="all">All actions</SelectItem>{options.actions.map((action) => <SelectItem key={action} value={action} className="capitalize">{actionLabel(action)}</SelectItem>)}</SelectContent></Select><Input type="date" aria-label="Activity start date" value={filters.dateFrom} onChange={(event) => navigate({ dateFrom: event.target.value, page: 1 })} /><Input type="date" aria-label="Activity end date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => navigate({ dateTo: event.target.value, page: 1 })} /><Button variant="ghost" disabled={!activeFilterCount} onClick={() => { setQuery(""); router.push("/paired-testing-demo/audit"); }}><X className="size-4" />Clear {activeFilterCount ? `(${activeFilterCount})` : ""}</Button></div>
        </div>
        <div className="overflow-x-auto"><Table><TableHeader className="bg-secondary/35"><TableRow><TableHead>Event</TableHead><TableHead>Date &amp; time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Object</TableHead><TableHead>Category</TableHead><TableHead>Integrity</TableHead><TableHead /></TableRow></TableHeader><TableBody>{events.map((event) => <TableRow key={event.id}><TableCell className="mono text-xs font-semibold">{eventCode(event.id)}</TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.timezone }).format(new Date(event.created_at))}</TableCell><TableCell className="min-w-44 whitespace-normal"><p className="text-sm font-medium">{event.actor_name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{event.actor_role ? roleLabels[event.actor_role] : "System"}</p></TableCell><TableCell className="min-w-48 whitespace-normal text-sm font-medium capitalize">{actionLabel(event.action)}</TableCell><TableCell><p className="text-xs capitalize">{event.target_type || "Record"}</p><p className="mono mt-0.5 max-w-28 truncate text-[10px] text-primary">{event.target_id || "-"}</p></TableCell><TableCell><Badge variant="outline" className="capitalize">{event.category}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">System-recorded</TableCell><TableCell><Button variant="ghost" size="icon-sm" onClick={() => setSelected(event)} title={`View ${eventCode(event.id)}`}><Eye className="size-4" /><span className="sr-only">View event</span></Button></TableCell></TableRow>)}{!events.length ? <TableRow><TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">No activity matches the selected filters.</TableCell></TableRow> : null}</TableBody></Table></div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2"><p className="text-xs text-muted-foreground">{filters.total ? `${(filters.page - 1) * filters.pageSize + 1}-${Math.min(filters.page * filters.pageSize, filters.total)} of ${filters.total}` : "0 events"}</p><div className="flex items-center gap-2"><Button size="icon-sm" variant="outline" disabled={filters.page <= 1} onClick={() => navigate({ page: filters.page - 1 })} title="Previous page"><ChevronLeft className="size-4" /></Button><span className="min-w-16 text-center text-xs">{filters.page} / {pages}</span><Button size="icon-sm" variant="outline" disabled={filters.page >= pages} onClick={() => navigate({ page: filters.page + 1 })} title="Next page"><ChevronRight className="size-4" /></Button></div></div>
      </section>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><SheetContent><SheetHeader><SheetTitle className="flex items-center gap-2"><History className="size-4 text-primary" />Event details</SheetTitle><SheetDescription>System-recorded operational event for {study.code}.</SheetDescription></SheetHeader>{selected ? <div className="space-y-5 overflow-y-auto px-4 pb-6"><div><p className="mono text-lg font-semibold">{eventCode(selected.id)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(selected.created_at).toISOString()}</p></div><dl className="space-y-3 text-xs">{[["Actor", selected.actor_name], ["Actor email", selected.actor_email || "Not available"], ["Actor role", selected.actor_role ? roleLabels[selected.actor_role] : "System"], ["Action", actionLabel(selected.action)], ["Category", selected.category], ["Object", `${selected.target_type || "Record"} - ${selected.target_id || "Not available"}`]].map(([label, value]) => <div key={label} className="border-b border-border pb-2"><dt className="capitalize text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl>{detailRows(selected).length ? <div><p className="label-kicker">Event metadata</p><dl className="mt-3 space-y-3 text-xs">{detailRows(selected).map(([label, value]) => <div key={label} className="border-b border-border pb-2"><dt className="capitalize text-muted-foreground">{label}</dt><dd className="mono mt-1 break-words">{value}</dd></div>)}</dl></div> : null}</div> : null}</SheetContent></Sheet>
    </div>
  );
}
