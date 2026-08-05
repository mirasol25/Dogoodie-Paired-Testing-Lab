"use client";

import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Battery, CheckCircle2, Clock3, ExternalLink, FileJson,
  FileText, Film, History, MapPin, MonitorSmartphone, ShieldCheck, TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatDemoDateTime } from "@/lib/formatting/date-time";
import { formatFileSize } from "@/lib/formatting/file-size";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/store/paired-testing-demo.store";
import type { TestSubmission } from "@/types/paired-testing-demo.types";
import { DisclaimerAlert } from "@/components/paired-testing/shared/disclaimer-alert";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";

const reasons = ["Controls satisfied", "Minor clarification required", "Missing evidence", "Timestamp concern", "GPS concern", "App-version mismatch", "Route mismatch", "Ride-tier mismatch", "Duplicate submission", "Methodology concern", "Other"];

export function PairComparisonClient({ pairId }: { pairId: string }) {
  const pairs = useDemoStore((state) => state.pairs);
  const submissions = useDemoStore((state) => state.submissions);
  const evidence = useDemoStore((state) => state.evidence);
  const role = useDemoStore((state) => state.role);
  const accept = useDemoStore((state) => state.acceptPair);
  const flag = useDemoStore((state) => state.flagPair);
  const reject = useDemoStore((state) => state.rejectPair);
  const clear = useDemoStore((state) => state.clearPairDecision);
  const [reason, setReason] = useState("Controls satisfied");
  const [note, setNote] = useState("");
  const pair = pairs.find((item) => item.id === pairId);
  const index = pairs.findIndex((item) => item.id === pairId);
  const submissionA = submissions.find((item) => item.id === pair?.testerASubmissionId);
  const submissionB = submissions.find((item) => item.id === pair?.testerBSubmissionId);
  const pairEvidence = evidence.filter((file) => file.pairId === pairId);
  const canReview = role === "expert_reviewer";

  const evidenceByTester = useMemo(() => ({
    a: pairEvidence.filter((file) => file.submissionId === submissionA?.id),
    b: pairEvidence.filter((file) => file.submissionId === submissionB?.id),
  }), [pairEvidence, submissionA?.id, submissionB?.id]);

  if (!pair) return <div className="data-panel rounded-lg p-10 text-center"><h1 className="text-xl font-semibold">Pair not found</h1><p className="mt-2 text-sm text-muted-foreground">The requested demonstration pair does not exist.</p><Button asChild className="mt-5"><Link href="/paired-testing-demo/pairs">Return to Matched Pairs</Link></Button></div>;

  const decide = (action: "accept" | "flag" | "reject" | "clear") => {
    if (action === "accept") accept(pair.id, reason, note);
    if (action === "flag") flag(pair.id, reason, note);
    if (action === "reject") reject(pair.id, reason, note);
    if (action === "clear") clear(pair.id);
    setNote("");
    toast.success(action === "clear" ? "Reviewer decision cleared." : `Pair ${action === "flag" ? "flagged for follow-up" : `${action}ed`}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${pair.id === "PAIR-008" ? "Featured demonstration pair · " : ""}${pair.assignmentId}`}
        title={`Matched Pair Comparison · ${pair.id}`}
        description={`${demoConfig.study.name} · ${formatDemoDateTime(pair.createdAt)}`}
        actions={<Button asChild variant="outline"><Link href={`/paired-testing-demo/audit?object=${pair.id}`}><History className="size-4" />Open Activity Log</Link></Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatus label="Technical status" status={pair.overallValidationStatus} />
        <SummaryStatus label="Expert review" status={pair.expertReviewStatus} />
        <SummaryStatus label="Evidence" status={pair.evidenceStatus} />
        <div className="data-panel rounded-lg p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Protocol / variable</p><p className="mono mt-2 text-xs font-semibold">{demoConfig.study.protocolVersion}</p><p className="mt-1 text-xs text-muted-foreground">{pair.isolatedVariable}</p></div>
      </div>
      <DisclaimerAlert />

      <section className="relative overflow-hidden rounded-xl border border-primary/20 bg-[linear-gradient(135deg,rgba(183,255,60,.09),rgba(13,24,20,.96)_38%)] p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-full w-1/3 subtle-grid opacity-45" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div><p className="label-kicker">Observed synthetic price variance</p><p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-foreground">{formatCurrency(pair.absolutePriceDifference)} <span className="text-xl font-medium text-primary">/ {pair.percentagePriceDifference.toFixed(2)}%</span></p><p className="mt-2 text-xs text-muted-foreground">{pair.higherPricedTester} received the higher displayed quote.</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[620px]">
              <VarianceMetric label={submissionA?.testerAlias ?? "Tester A"} value={submissionA ? formatCurrency(submissionA.displayedPrice) : "—"} />
              <VarianceMetric label={submissionB?.testerAlias ?? "Tester B"} value={submissionB ? formatCurrency(submissionB.displayedPrice) : "—"} accent />
              <VarianceMetric label="Timestamp gap" value={`${pair.timestampDifferenceSeconds.toFixed(1)}s`} />
              <VarianceMetric label="GPS distance" value={`${pair.gpsDistanceFeet.toFixed(1)}ft`} />
            </div>
          </div>
          <div className="mt-5 flex items-start gap-2 border-t border-primary/10 pt-4 text-xs leading-5 text-muted-foreground"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" /><span>{demoConfig.messages.expertReview}. A pricing difference alone is not a legal or causal conclusion.</span></div>
        </div>
      </section>

      <section>
        <div className="mb-3"><p className="label-kicker">Paired submissions</p><h2 className="mt-1.5 text-lg font-semibold">Side-by-side quote record</h2></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <QuoteCard submission={submissionA} evidenceCount={evidenceByTester.a.length} tone="a" />
          <QuoteCard submission={submissionB} evidenceCount={evidenceByTester.b.length} tone="b" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between"><div><p className="label-kicker">Automated protocol checks</p><h2 className="mt-1.5 text-lg font-semibold">Technical conformity matrix</h2></div><p className="hidden text-xs text-muted-foreground sm:block">Preliminary configuration · {demoConfig.study.protocolVersion}</p></div>
        <div className="data-panel overflow-x-auto rounded-lg">
          <Table><TableHeader><TableRow><TableHead>Rule</TableHead><TableHead>Tester A</TableHead><TableHead>Tester B</TableHead><TableHead>Difference</TableHead><TableHead>Status</TableHead><TableHead>Explanation</TableHead><TableHead>Threshold</TableHead></TableRow></TableHeader>
          <TableBody>{pair.validationResults.map((result) => <TableRow key={result.rule}><TableCell className="min-w-40"><span className="font-medium">{result.label}</span><span className="mt-1 block text-[9px] uppercase tracking-wider text-muted-foreground">{result.requirementLevel}</span></TableCell><TableCell className="mono max-w-52 text-[10px]">{result.testerAValue}</TableCell><TableCell className="mono max-w-52 text-[10px]">{result.testerBValue}</TableCell><TableCell className="numeric whitespace-nowrap text-xs">{result.difference}</TableCell><TableCell><StatusBadge status={result.status} /></TableCell><TableCell className="min-w-64 text-xs leading-5 text-muted-foreground">{result.explanation}</TableCell><TableCell className="mono min-w-44 text-[10px] text-muted-foreground">{result.configuredThreshold ?? "Exact match"}</TableCell></TableRow>)}</TableBody></Table>
        </div>
      </section>

      <section>
        <div className="mb-3"><p className="label-kicker">Linked records</p><h2 className="mt-1.5 text-lg font-semibold">Synthetic evidence preview</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pairEvidence.map((file) => <Card key={file.id} className="data-panel"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><span className="grid size-8 place-items-center rounded-md bg-secondary text-primary">{file.evidenceType === "Screen recording" ? <Film className="size-4" /> : file.evidenceType === "Metadata record" ? <FileJson className="size-4" /> : <FileText className="size-4" />}</span><StatusBadge status={file.integrityStatus} /></div><p className="mt-4 text-sm font-semibold">{file.evidenceType}</p><p className="mono mt-1 text-[10px] text-primary">{file.id} · {file.testerAlias}</p><p className="mt-3 truncate text-xs text-muted-foreground">{file.filename}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground"><span>{formatFileSize(file.sizeBytes)}</span><span>{file.chainEventCount} activity events</span></div><div className="mt-3 border-t border-border pt-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Synthetic demonstration hash</p><p className="mono mt-1 truncate text-[9px] text-muted-foreground">{file.syntheticHash}</p></div></CardContent></Card>)}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="data-panel"><CardHeader><CardTitle className="text-sm">Interpretation note</CardTitle></CardHeader><CardContent><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-7 text-muted-foreground">{demoConfig.interpretationNote}</p></div></CardContent></Card>
        <Card className="data-panel border-primary/15"><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-sm">Expert reviewer panel</CardTitle><StatusBadge status={pair.expertReviewStatus} /></div></CardHeader><CardContent>
          {canReview ? <div className="space-y-4"><div><Label>Decision reason</Label><Select value={reason} onValueChange={setReason}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{reasons.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="review-note">Reviewer note</Label><Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1.5 min-h-24" placeholder="Add methodology context or follow-up requirements…" /></div><div className="grid grid-cols-2 gap-2"><Button onClick={() => decide("accept")}><CheckCircle2 className="size-4" />Accept Pair</Button><Button variant="outline" className="border-amber-300/30 text-amber-200" onClick={() => decide("flag")}>Flag Follow-Up</Button><Button variant="destructive" onClick={() => decide("reject")}>Reject Pair</Button><Button variant="ghost" onClick={() => decide("clear")}>Clear Decision</Button></div></div> : <div className="rounded-md border border-border bg-secondary/30 p-4 text-xs leading-5 text-muted-foreground">Review decisions are read-only for the current “{demoConfig.roles[role]}” view. Switch to Expert Reviewer to edit decisions and notes.</div>}
          {pair.reviewerNotes.length > 0 && <div className="mt-4 border-t border-border pt-4"><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Reviewer notes</p>{pair.reviewerNotes.map((item, noteIndex) => <p key={`${item}-${noteIndex}`} className="mt-2 rounded-md bg-secondary/35 p-2.5 text-xs leading-5 text-muted-foreground">{item}</p>)}</div>}
        </CardContent></Card>
      </section>

      <nav aria-label="Pair navigation" className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div className="flex gap-2"><Button asChild variant="outline" disabled={index <= 0}><Link href={index > 0 ? `/paired-testing-demo/pairs/${pairs[index - 1].id}` : "#"}><ArrowLeft className="size-4" />Previous Pair</Link></Button><Button asChild variant="outline" disabled={index >= pairs.length - 1}><Link href={index < pairs.length - 1 ? `/paired-testing-demo/pairs/${pairs[index + 1].id}` : "#"}>Next Pair<ArrowRight className="size-4" /></Link></Button></div>
        <div className="flex gap-2"><Button asChild variant="ghost"><Link href="/paired-testing-demo/pairs">Return to Matched Pairs</Link></Button><Button asChild variant="ghost"><Link href="/paired-testing-demo/dashboard">Dashboard<ExternalLink className="size-3.5" /></Link></Button></div>
      </nav>
    </div>
  );
}

function SummaryStatus({ label, status }: { label: string; status: string }) { return <div className="data-panel rounded-lg p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><div className="mt-2"><StatusBadge status={status} /></div></div>; }
function VarianceMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div className="rounded-md border border-white/10 bg-background/35 p-3 backdrop-blur"><p className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className={cn("numeric mt-2 text-xl font-semibold", accent && "text-primary")}>{value}</p></div>; }
function QuoteCard({ submission, evidenceCount, tone }: { submission?: TestSubmission; evidenceCount: number; tone: "a" | "b" }) {
  if (!submission) return <Card className="data-panel"><CardContent className="grid min-h-[420px] place-items-center p-6 text-center"><div><p className="text-lg font-semibold">Partner submission incomplete</p><p className="mt-2 text-sm text-muted-foreground">This pair cannot be validated until the second synthetic response is present.</p></div></CardContent></Card>;
  const metadata = [
    [MonitorSmartphone, "Device", `${submission.deviceType} · ${submission.operatingSystem} ${submission.operatingSystemVersion}`],
    [FileJson, "Application", `${submission.platform} · v${submission.appVersion}`],
    [MapPin, "GPS coordinates", `${submission.latitude.toFixed(6)}, ${submission.longitude.toFixed(6)}`],
    [Clock3, "Quote timestamp", formatDemoDateTime(submission.quoteTimestamp)],
    [Battery, "Battery / network", `${submission.batteryPercentage}% · ${submission.networkType}`],
    [FileText, "Evidence availability", `${evidenceCount} linked synthetic records`],
  ] as const;
  return <Card className={cn("data-panel overflow-hidden", tone === "b" && "border-primary/20")}><div className={cn("border-b border-border p-4", tone === "b" && "bg-primary/[0.035]")}><div className="flex items-start justify-between gap-4"><div><p className="label-kicker">{submission.testerRole}</p><h3 className="mt-1.5 text-lg font-semibold">{submission.testerAlias}</h3><p className="mt-1 text-xs text-muted-foreground">{submission.accountProfileCategory} · {submission.membershipStatus}</p></div><p className={cn("numeric text-3xl font-semibold tracking-[-0.04em]", tone === "b" && "text-primary")}>{formatCurrency(submission.displayedPrice)}</p></div></div><CardContent className="p-4"><div className="grid gap-2 sm:grid-cols-2">{metadata.map(([Icon, label, value]) => <div key={label} className="rounded-md border border-border/70 bg-secondary/25 p-3"><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="size-3.5" />{label}</div><p className="mono mt-2 text-[10px] leading-5 text-foreground">{value}</p></div>)}</div><div className="mt-3 rounded-md border border-border bg-secondary/25 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Controlled route</p><p className="mt-2 text-xs">{submission.pickup}</p><p className="mt-1 text-xs text-muted-foreground">→ {submission.destination} · {submission.rideTier}</p></div><div className="mt-3 rounded-md border border-border bg-secondary/25 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Submission notes</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{submission.notes}</p></div></CardContent></Card>;
}
