import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, FileText, GitCompareArrows } from "lucide-react";
import { MetricCard } from "@/components/paired-testing/shared/metric-card";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReactNode } from "react";

export interface GlobalStudySummary { id: string; code: string; name: string; status: string; assignments: number; matchedPairs: number; usablePairs: number; pendingReviews: number; targetPairs: number | null }

export function GlobalDashboard({ studies, viewerMode = false, scopeSelector }: { studies: GlobalStudySummary[]; viewerMode?: boolean; scopeSelector?: ReactNode }) {
  const active = studies.filter((study) => ["active", "paused"].includes(study.status)).length;
  const assignments = studies.reduce((sum, study) => sum + study.assignments, 0);
  const pairs = studies.reduce((sum, study) => sum + study.matchedPairs, 0);
  const usable = studies.reduce((sum, study) => sum + study.usablePairs, 0);
  const pending = studies.reduce((sum, study) => sum + study.pendingReviews, 0);
  if (viewerMode) return <ViewerDashboard studies={studies} pairs={pairs} usable={usable} scopeSelector={scopeSelector} />;
  return <div className="space-y-6"><PageHeader eyebrow="Portfolio operations" title="Dashboard" description="Overall progress and workload across every study you can access." actions={scopeSelector} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Accessible studies" value={studies.length} note={`${active} active or paused`} icon={<BookOpen className="size-4" />} /><MetricCard label="Assignments" value={assignments} note="Across all studies" icon={<ClipboardCheck className="size-4" />} /><MetricCard label="Matched pairs" value={pairs} note="All persisted comparisons" icon={<GitCompareArrows className="size-4" />} /><MetricCard label="Pending reviews" value={pending} note="Across the review portfolio" icon={<CheckCircle2 className="size-4" />} /></section>
    <section className="overflow-hidden rounded-md border border-border"><div className="border-b border-border bg-card/35 px-4 py-3"><p className="text-[10px] uppercase text-primary">Study portfolio</p><h2 className="mt-1 text-base font-semibold">Progress by study</h2></div><div className="overflow-x-auto"><Table className="min-w-[900px]"><TableHeader><TableRow><TableHead>Study</TableHead><TableHead>Status</TableHead><TableHead>Target progress</TableHead><TableHead>Assignments</TableHead><TableHead>Review queue</TableHead><TableHead className="text-right"><span className="sr-only">Action</span></TableHead></TableRow></TableHeader><TableBody>{studies.map((study) => { const progress = study.targetPairs ? Math.min(study.usablePairs / study.targetPairs * 100, 100) : 0; return <TableRow key={study.id}><TableCell className="min-w-72 whitespace-normal"><p className="font-medium">{study.name}</p><p className="mono mt-1 text-[10px] text-primary">{study.code}</p></TableCell><TableCell><Badge variant={study.status === "active" ? "default" : "outline"} className="capitalize">{study.status}</Badge></TableCell><TableCell className="min-w-48"><div className="flex justify-between text-xs"><span>{study.usablePairs} usable</span><span className="text-muted-foreground">{study.targetPairs ?? "No target"}</span></div><Progress value={progress} className="mt-2 h-1.5" /></TableCell><TableCell>{study.assignments}</TableCell><TableCell className={study.pendingReviews ? "text-amber-300" : "text-muted-foreground"}>{study.pendingReviews} pending</TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/studies/${study.id}`}>Open study<ArrowRight className="size-3.5" /></Link></Button></TableCell></TableRow>; })}{!studies.length ? <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No accessible studies.</TableCell></TableRow> : null}</TableBody></Table></div></section>
  </div>;
}

function ViewerDashboard({ studies, pairs, usable, scopeSelector }: { studies: GlobalStudySummary[]; pairs: number; usable: number; scopeSelector?: ReactNode }) {
  const archived = studies.filter((study) => study.status === "archived").length;
  return <div className="space-y-6">
    <PageHeader eyebrow="Released results" title="Dashboard" description="A read-only overview of the finalized studies and reports released to your account." actions={scopeSelector} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Released studies" value={studies.length} note={`${archived} archived`} icon={<BookOpen className="size-4" />} />
      <MetricCard label="Finalized comparisons" value={pairs} note="Across released studies" icon={<GitCompareArrows className="size-4" />} />
      <MetricCard label="Included comparisons" value={usable} note="Accepted for reporting" icon={<CheckCircle2 className="size-4" />} />
      <MetricCard label="Reports available" value={studies.length} note="One report workspace per study" icon={<FileText className="size-4" />} />
    </section>
    <section className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-card/35 px-4 py-3"><p className="text-[10px] uppercase text-primary">Released studies</p><h2 className="mt-1 text-base font-semibold">Available results</h2></div>
      <div className="overflow-x-auto"><Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>Study</TableHead><TableHead>Status</TableHead><TableHead>Total comparisons</TableHead><TableHead>Included in report</TableHead><TableHead className="text-right"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>
        {studies.map((study) => <TableRow key={study.id}><TableCell className="min-w-72 whitespace-normal"><p className="font-medium">{study.name}</p><p className="mono mt-1 text-[10px] text-primary">{study.code}</p></TableCell><TableCell><Badge variant="outline" className="capitalize">{study.status}</Badge></TableCell><TableCell>{study.matchedPairs}</TableCell><TableCell>{study.usablePairs}</TableCell><TableCell><div className="flex justify-end gap-2"><Button asChild size="sm" variant="outline"><Link href={`/studies/${study.id}`}>Open study<ArrowRight className="size-3.5" /></Link></Button><Button asChild size="sm"><Link href={`/reports/${study.id}`}>View report<FileText className="size-3.5" /></Link></Button></div></TableCell></TableRow>)}
        {!studies.length ? <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">No completed or archived studies have been released to this account.</TableCell></TableRow> : null}
      </TableBody></Table></div>
    </section>
  </div>;
}
