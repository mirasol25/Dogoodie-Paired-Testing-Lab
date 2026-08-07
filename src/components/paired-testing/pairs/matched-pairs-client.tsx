"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, GitCompareArrows, Search, XCircle } from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import type { MatchedPairSummary } from "@/lib/data/matched-pairs";

function money(value: number | null, currency: string | null) {
  if (value === null) return "Pending";
  try { return new Intl.NumberFormat("en", { style: "currency", currency: currency || "USD" }).format(value); }
  catch { return `${currency || ""} ${value.toFixed(2)}`.trim(); }
}

export function MatchedPairsClient({ pairs, timezone, canReview }: { pairs: MatchedPairSummary[]; timezone: string; canReview: boolean }) {
  const [query, setQuery] = useState("");
  const [technicalStatus, setTechnicalStatus] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const reviewOutcome = (pair: MatchedPairSummary) => pair.reviewStatus === "accepted" && pair.reviewTechnicalException ? "accepted_with_exception" : pair.reviewStatus;
  const visible = useMemo(() => pairs.filter((pair) => {
    if (technicalStatus !== "all" && pair.technical_status !== technicalStatus) return false;
    if (reviewStatus !== "all" && reviewOutcome(pair) !== reviewStatus) return false;
    return [pair.pair_code, pair.assignmentCode, pair.submissionA.testerName, pair.submissionB.testerName]
      .join(" ").toLowerCase().includes(query.trim().toLowerCase());
  }), [pairs, query, reviewStatus, technicalStatus]);
  const reviewCount = (value: string) => pairs.filter((pair) => reviewOutcome(pair) === value).length;

  return <div className="space-y-4">
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <Summary label="Total pairs" value={pairs.length} icon={GitCompareArrows} />
      <Summary label="Pending review" value={reviewCount("pending")} icon={CircleDashed} />
      <Summary label="Accepted" value={reviewCount("accepted")} icon={CheckCircle2} tone="success" />
      <Summary label="Accepted with exception" value={reviewCount("accepted_with_exception")} icon={AlertTriangle} tone="warning" />
      <Summary label="Rejected" value={reviewCount("rejected")} icon={XCircle} tone="danger" />
    </div>
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex flex-col gap-2 border-b border-border bg-card/35 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pair, assignment, or tester" className="h-9 bg-background/45 pl-9 text-xs" /></div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Select value={reviewStatus} onValueChange={setReviewStatus}><SelectTrigger className="h-9 w-full bg-background/45 text-xs sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All review outcomes</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="accepted">Accepted</SelectItem><SelectItem value="accepted_with_exception">Accepted with exception</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select><Select value={technicalStatus} onValueChange={setTechnicalStatus}><SelectTrigger className="h-9 w-full bg-background/45 text-xs sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All technical statuses</SelectItem>{["pending", "valid", "warning", "invalid", "incomplete"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Pair</TableHead><TableHead>Tester A</TableHead><TableHead>Tester B</TableHead><TableHead className="text-right">Fare difference</TableHead><TableHead>Paired</TableHead><TableHead>Technical</TableHead><TableHead>Review</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader><TableBody>
        {visible.map((pair) => <TableRow key={pair.id} className="group"><TableCell className="min-w-52"><Link href={`/paired-testing-demo/pairs/${pair.id}`} className="mono font-semibold hover:text-primary">{pair.pair_code}</Link><p className="mono mt-1 text-[10px] text-muted-foreground">{pair.assignmentCode}</p></TableCell><TesterCell name={pair.submissionA.testerName} fare={money(pair.submissionA.displayed_fare, pair.submissionA.currency)} /><TesterCell name={pair.submissionB.testerName} fare={money(pair.submissionB.displayed_fare, pair.submissionB.currency)} /><TableCell className="min-w-36 text-right"><p className="font-semibold">{money(pair.absolute_fare_difference, pair.submissionA.currency)}</p><p className="mt-1 text-[10px] text-muted-foreground">{pair.percentage_fare_difference === null ? "Not calculated" : `${pair.percentage_fare_difference.toFixed(2)}%`}</p></TableCell><TableCell className="min-w-44 whitespace-nowrap text-xs text-muted-foreground">{pair.paired_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(pair.paired_at)) : "Pending"}</TableCell><TableCell><StatusBadge status={pair.technical_status} /></TableCell><TableCell><StatusBadge status={reviewOutcome(pair)} /></TableCell><TableCell className="text-right"><Button asChild size="sm" variant={canReview && pair.reviewStatus === "pending" ? "default" : "ghost"} className="group-hover:text-primary"><Link href={`/paired-testing-demo/pairs/${pair.id}`}>{canReview ? "Review" : "Open"}<ArrowRight className="size-4" /></Link></Button></TableCell></TableRow>)}
      </TableBody></Table></div>
      {!visible.length ? <div className="flex flex-col items-center border-t border-border px-6 py-12 text-center"><GitCompareArrows className="size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{pairs.length ? "No matching pairs" : "No matched pairs yet"}</p><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{pairs.length ? "Adjust the search or status filters." : "A pair appears automatically after both assigned testers submit."}</p></div> : null}
      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">{visible.length} of {pairs.length} persisted pairs | Display timezone: {timezone}</div>
    </div>
  </div>;
}

function TesterCell({ name, fare }: { name: string; fare: string }) { return <TableCell className="min-w-44 text-xs"><p className="font-medium">{name}</p><p className="mt-1 text-muted-foreground">{fare}</p></TableCell>; }
function Summary({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: number; icon: ComponentType<{ className?: string }>; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const iconTone = tone === "success" ? "text-primary" : tone === "warning" ? "text-amber-300" : tone === "danger" ? "text-red-300" : "text-muted-foreground";
  return <div className="data-panel flex min-h-24 items-center justify-between rounded-md p-4"><div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div><Icon className={`size-5 ${iconTone}`} /></div>;
}
