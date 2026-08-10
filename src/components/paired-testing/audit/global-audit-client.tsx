"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import type { ActivityLogEvent } from "@/lib/data/activity-logs";

export interface GlobalActivityEvent { event: ActivityLogEvent; studyId: string; studyCode: string; studyName: string; timezone: string }
const label = (value: string) => value.replaceAll("_", " ").replaceAll(".", " - ");

export function GlobalAuditClient({ events, studies }: { events: GlobalActivityEvent[]; studies: Array<{ id: string; code: string; name: string }> }) {
  const [query, setQuery] = useState("");
  const [studyId, setStudyId] = useState("all");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => [...new Set(events.map(({ event }) => event.category))].sort(), [events]);
  const visible = useMemo(() => events.filter((item) => {
    const haystack = `${item.studyCode} ${item.studyName} ${item.event.actor_name} ${item.event.action} ${item.event.target_type ?? ""}`.toLowerCase();
    return (studyId === "all" || item.studyId === studyId) && (category === "all" || item.event.category === category) && haystack.includes(query.trim().toLowerCase());
  }), [events, query, studyId, category]);
  return <div className="space-y-6"><PageHeader eyebrow="System operations" title="Activity Log" description="System-recorded activity across every study you can access." /><div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-muted-foreground">This operational history is system-recorded. It is not a legally certified, immutable, or tamper-proof chain-of-custody record.</div>
    <section className="overflow-hidden rounded-md border border-border"><div className="grid gap-2 border-b border-border p-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_minmax(260px,360px)_190px]"><div className="relative min-w-0 md:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search study, actor, action, or object" aria-label="Search global activity" className="pl-9" /></div><Select value={studyId} onValueChange={setStudyId}><SelectTrigger aria-label="Filter activity by study" className="w-full min-w-0 overflow-hidden [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"><SelectValue /></SelectTrigger><SelectContent className="max-w-[min(92vw,34rem)]"><SelectItem value="all">All studies</SelectItem>{studies.map((study) => <SelectItem key={study.id} value={study.id}>{study.code} - {study.name}</SelectItem>)}</SelectContent></Select><Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Filter activity by category" className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent></Select></div>
      <div className="overflow-x-auto"><Table className="min-w-[980px]"><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Study</TableHead><TableHead>Actor</TableHead><TableHead>Activity</TableHead><TableHead>Object</TableHead><TableHead>Category</TableHead><TableHead className="text-right"><span className="sr-only">Action</span></TableHead></TableRow></TableHeader><TableBody>{visible.map(({ event, studyId: id, studyCode, studyName, timezone }) => <TableRow key={`${id}-${event.id}`}><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(event.created_at))}</TableCell><TableCell className="min-w-52 whitespace-normal"><p className="text-xs font-medium">{studyName}</p><p className="mono mt-1 text-[10px] text-primary">{studyCode}</p></TableCell><TableCell className="min-w-40 whitespace-normal"><p className="text-xs font-medium">{event.actor_name}</p><p className="mt-1 text-[10px] capitalize text-muted-foreground">{event.actor_role?.replaceAll("_", " ") ?? "System"}</p></TableCell><TableCell className="min-w-56 whitespace-normal text-xs font-medium capitalize">{label(event.action)}</TableCell><TableCell className="text-xs capitalize">{event.target_type ?? "Record"}</TableCell><TableCell><Badge variant="outline" className="capitalize">{event.category}</Badge></TableCell><TableCell className="text-right"><Button asChild variant="ghost" size="sm"><Link href={`/studies/${id}/activity`}>Study log<ArrowRight className="size-3.5" /></Link></Button></TableCell></TableRow>)}{!visible.length ? <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No activity matches the selected filters.</TableCell></TableRow> : null}</TableBody></Table></div><div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Showing {visible.length} of {events.length} recent accessible events.</div></section>
  </div>;
}
