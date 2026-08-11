"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, GitCompareArrows, LoaderCircle, Search, XCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { selectStudyAction } from "@/app/paired-testing-demo/studies/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReviewerStudyWorkload, Study } from "@/lib/data/studies";

export function ReviewStudiesClient({ rows, activeStudyId }: { rows: Array<{ study: Study; workload: ReviewerStudyWorkload }>; activeStudyId: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingId, setPendingId] = useState<string>();
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => rows.filter(({ study }) => status === "all" || study.status === status).filter(({ study }) => `${study.study_code} ${study.name}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => b.workload.pending - a.workload.pending || b.workload.rejected - a.workload.rejected || a.study.name.localeCompare(b.study.name)), [query, rows, status]);

  function open(study: Study) {
    if (study.id === activeStudyId) { router.push("/paired-testing-demo/pairs"); return; }
    setPendingId(study.id);
    startTransition(async () => {
      const result = await selectStudyAction(study.id);
      if (!result.ok) { toast.error(result.message); setPendingId(undefined); return; }
      toast.success(result.message);
      router.push("/paired-testing-demo/pairs");
      router.refresh();
    });
  }

  const totalPending = rows.reduce((sum, row) => sum + row.workload.pending, 0);
  const totalAcceptedWithException = rows.reduce((sum, row) => sum + row.workload.acceptedWithException, 0);
  const totalAccepted = rows.reduce((sum, row) => sum + row.workload.accepted, 0);
  const totalRejected = rows.reduce((sum, row) => sum + row.workload.rejected, 0);
  const totalPairs = rows.reduce((sum, row) => sum + row.workload.total, 0);
  return <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Pending review" value={totalPending} icon={CircleDashed} /><Metric label="Accepted" value={totalAccepted} icon={CheckCircle2} /><Metric label="Accepted with exception" value={totalAcceptedWithException} icon={AlertTriangle} /><Metric label="Rejected" value={totalRejected} icon={XCircle} /><Metric label="Assigned pairs" value={totalPairs} icon={GitCompareArrows} /></div><section className="overflow-hidden rounded-md border border-border"><div className="grid gap-2 border-b border-border bg-card/35 p-3 sm:grid-cols-[minmax(0,1fr)_170px]"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search study name or code" className="pl-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div><div className="divide-y divide-border">{visible.map(({ study, workload }) => { const usable = workload.accepted + workload.acceptedWithException; const target = study.target_pair_count; const reviewState = workload.pending ? `${workload.pending} pair${workload.pending === 1 ? "" : "s"} need review` : "Review complete"; const date = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: study.display_timezone }).format(new Date(value)) : "Open"; return <article key={study.id}><div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(240px,1.3fr)_minmax(210px,1fr)_minmax(340px,1.2fr)_auto] lg:items-center"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{study.name}</h2><p className="mono mt-1 text-[10px] text-muted-foreground">{study.study_code}</p><p className="mt-2 text-xs capitalize text-muted-foreground">{study.status} | {study.default_currency ?? "Currency pending"}</p></div><div className="text-xs"><p className="font-medium">{study.display_timezone}</p><p className="mt-1 text-muted-foreground">{date(study.testing_starts_at)} - {date(study.testing_ends_at)}</p><p className={`mt-2 font-medium ${workload.pending ? "text-amber-300" : "text-primary"}`}>{reviewState}</p><p className="mt-1 text-muted-foreground">Usable pairs: {target ? `${usable}/${target} target` : usable}</p></div><div className="grid grid-cols-5 gap-2 text-center"><Count label="Pending" value={workload.pending} tone={workload.pending ? "primary" : "muted"} /><Count label="Accepted" value={workload.accepted} tone={workload.accepted ? "primary" : "muted"} /><Count label="Exception" value={workload.acceptedWithException} tone={workload.acceptedWithException ? "warning" : "muted"} /><Count label="Rejected" value={workload.rejected} tone={workload.rejected ? "danger" : "muted"} /><Count label="Total" value={workload.total} tone="muted" /></div><Button onClick={() => open(study)} disabled={pending} variant={workload.pending ? "default" : "outline"}>{pendingId === study.id ? <LoaderCircle className="size-4 animate-spin" /> : "Open review queue"}<ArrowRight className="size-4" /></Button></div></article>; })}{!visible.length ? <div className="px-6 py-14 text-center"><p className="text-sm font-medium">No assigned studies match</p><p className="mt-1 text-xs text-muted-foreground">Adjust the search or study-status filter.</p></div> : null}</div><div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">{visible.length} of {rows.length} assigned studies</div></section></div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof AlertTriangle }) { return <div className="data-panel flex min-h-24 items-center justify-between rounded-md p-4"><div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div><Icon className="size-5 text-primary" /></div>; }
function Count({ label, value, tone }: { label: string; value: number; tone: "primary" | "warning" | "danger" | "muted" }) { return <div><p className={`text-lg font-semibold ${tone === "primary" ? "text-primary" : tone === "warning" ? "text-amber-300" : tone === "danger" ? "text-red-300" : ""}`}>{value}</p><p className="mt-1 text-[9px] uppercase text-muted-foreground">{label}</p></div>; }
