"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileArchive, FlaskConical, Scale, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { calculateDashboardMetrics } from "@/lib/calculations/dashboard-metrics";
import { formatDemoDateTime } from "@/lib/formatting/date-time";
import { useDemoStore } from "@/store/paired-testing-demo.store";
import { DisclaimerAlert } from "@/components/paired-testing/shared/disclaimer-alert";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";

const values = [
  [ClipboardCheck, "Standardize field testing", "Convert informal coordination into a repeatable, versioned testing protocol."],
  [ShieldCheck, "Validate matched conditions", "Check synchronization, proximity, route, platform, tier, metadata, and evidence."],
  [FileArchive, "Organize evidence & metadata", "Link synthetic records, decisions, notes, and activity in one workspace."],
  [Scale, "Prepare review-ready exports", "Preview descriptive reports and expert review packages without legal conclusions."],
] as const;

export function OverviewClient() {
  const pairs = useDemoStore((state) => state.pairs);
  const events = useDemoStore((state) => state.auditEvents);
  const metrics = calculateDashboardMetrics(pairs, demoConfig.study.targetPairCount);
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-border bg-card/90 px-5 py-7 sm:px-8 sm:py-9">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 subtle-grid opacity-60 lg:block" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{demoConfig.product.badge}</span>
            <span className="rounded-md border border-teal-300/20 bg-teal-300/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-200">Synthetic data only</span>
          </div>
          <p className="label-kicker">Research operations · technical review · evidence organization</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] text-foreground sm:text-4xl">{demoConfig.product.name}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{demoConfig.product.description}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button asChild><Link href="/paired-testing-demo/dashboard">Open Study Dashboard <ArrowRight className="size-4" /></Link></Button>
            <Button asChild variant="outline"><Link href="/paired-testing-demo/pairs/PAIR-008">Review Featured Matched Pair</Link></Button>
            <Button asChild variant="ghost"><Link href="/paired-testing-demo/submission"><FlaskConical className="size-4" />Tester Submission</Link></Button>
          </div>
        </div>
      </section>

      <DisclaimerAlert />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="data-panel">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="label-kicker">Active demonstration study</p><h2 className="mt-2 text-lg font-semibold">{demoConfig.study.name}</h2><p className="mono mt-1 text-xs text-muted-foreground">{demoConfig.study.id}</p></div>
              <StatusBadge status="Active Demonstration" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[["Target", "100 pairs"], ["Submitted", `${pairs.length} pairs`], ["Technically valid", `${metrics.validPairs} pairs`], ["Pending review", `${metrics.pendingReviewPairs} pairs`]].map(([label, value]) =>
                <div key={label}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="numeric mt-1 text-lg font-semibold">{value}</p></div>)}
            </div>
            <Progress value={metrics.completionPercentage} className="mt-5 h-1.5" />
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{metrics.completionPercentage.toFixed(0)}% of target collected</span><span>{demoConfig.study.testingStart.slice(0, 10)} → {demoConfig.study.testingEnd.slice(0, 10)}</span></div>
          </CardContent>
        </Card>
        <Card className="data-panel">
          <CardContent className="p-5">
            <p className="label-kicker">Last demonstration activity</p>
            <div className="mt-4 border-l border-border pl-4">
              <p className="text-sm font-medium">{events[0]?.action}</p>
              <p className="mono mt-1 text-[10px] text-muted-foreground">{events[0]?.objectId} · {formatDemoDateTime(events[0]?.timestamp)}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{events[0]?.note}</p>
            </div>
            <Button asChild variant="link" className="mt-3 h-auto px-0 text-xs text-primary"><Link href="/paired-testing-demo/audit">Open activity log <ArrowRight className="size-3" /></Link></Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3"><p className="label-kicker">Demonstration value</p><h2 className="mt-2 text-lg font-semibold">A controlled workflow from protocol to review package</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {values.map(([Icon, title, description], index) => (
            <Card key={title} className="data-panel">
              <CardContent className="p-4"><div className="flex items-start justify-between"><Icon className="size-4 text-primary" /><span className="mono text-[10px] text-muted-foreground">0{index + 1}</span></div><h3 className="mt-5 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-secondary/25 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="label-kicker">Illustrative workflow</p><div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">{["Protocol", "Paired collection", "Technical validation", "Expert review", "Evidence package preview"].map((step, index) => <span key={step} className="contents"><span className="rounded-md border border-border bg-card px-3 py-2">{step}</span>{index < 4 && <ArrowRight className="size-3 text-muted-foreground" />}</span>)}</div></div>
          <Button asChild variant="outline"><Link href="/paired-testing-demo/protocol">View Testing Protocol</Link></Button>
        </div>
        <div className="mt-5 border-t border-border pt-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">What this demo does not do</p><p className="mt-2 text-xs leading-5 text-muted-foreground">No live rideshare integration · No real personal data · No legal conclusions · No production evidence certification</p></div>
      </section>
    </div>
  );
}

