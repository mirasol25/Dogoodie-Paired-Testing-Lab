"use client";

import { ArrowRight, Check, LoaderCircle, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { selectStudyAction } from "@/app/paired-testing-demo/studies/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Study } from "@/lib/data/studies";

export function ViewStudiesClient({ studies, activeStudyId }: { studies: Study[]; activeStudyId: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingId, setPendingId] = useState<string>();
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => studies.filter((study) => status === "all" || study.status === status).filter((study) => `${study.study_code} ${study.name}`.toLowerCase().includes(query.trim().toLowerCase())), [query, status, studies]);

  function select(study: Study) {
    if (study.id === activeStudyId) { router.push("/paired-testing-demo/dashboard"); return; }
    setPendingId(study.id);
    startTransition(async () => {
      const result = await selectStudyAction(study.id);
      if (!result.ok) { toast.error(result.message); setPendingId(undefined); return; }
      toast.success(result.message);
      router.push("/paired-testing-demo/dashboard");
      router.refresh();
    });
  }

  const date = (study: Study, value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: study.display_timezone }).format(new Date(value)) : "Open";
  return <section className="overflow-hidden rounded-md border border-border"><div className="grid gap-2 border-b border-border bg-card/35 p-3 sm:grid-cols-[minmax(0,1fr)_170px]"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search study name or code" className="pl-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All report-ready</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div><div className="divide-y divide-border">{visible.map((study) => { const selected = study.id === activeStudyId; return <article key={study.id} className={selected ? "bg-primary/[0.04]" : undefined}><div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(220px,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold">{study.name}</h2>{selected ? <span className="flex items-center gap-1 text-[10px] text-primary"><Check className="size-3" />Selected</span> : null}</div><p className="mono mt-1 text-[10px] text-muted-foreground">{study.study_code}</p><p className="mt-2 text-xs capitalize text-muted-foreground">{study.status} | {study.default_currency ?? "Currency pending"}</p></div><div className="text-xs"><p className="font-medium">{study.display_timezone}</p><p className="mt-1 text-muted-foreground">{date(study, study.testing_starts_at)} - {date(study, study.testing_ends_at)}</p></div><Button variant={selected ? "default" : "outline"} disabled={pending} onClick={() => select(study)}>{pendingId === study.id ? <LoaderCircle className="size-4 animate-spin" /> : null}{selected ? "Open dashboard" : "Select study"}<ArrowRight className="size-4" /></Button></div></article>; })}{!visible.length ? <div className="p-12 text-center text-sm text-muted-foreground">No completed or archived assigned studies are available.</div> : null}</div><div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">{visible.length} of {studies.length} report-ready studies</div></section>;
}
