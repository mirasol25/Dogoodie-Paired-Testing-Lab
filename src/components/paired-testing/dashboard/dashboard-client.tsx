"use client";

import { BarChart3, CheckCircle2, CircleGauge, FileCheck2, Target } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { calculateDashboardMetrics } from "@/lib/calculations/dashboard-metrics";
import { useDemoStore } from "@/store/paired-testing-demo.store";
import { DisclaimerAlert } from "@/components/paired-testing/shared/disclaimer-alert";
import { MetricCard } from "@/components/paired-testing/shared/metric-card";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { PairTable } from "@/components/paired-testing/shared/pair-table";

const colors = { valid: "#B7FF3C", warning: "#FFB020", invalid: "#D76C68", incomplete: "#76877E", accepted: "#B7FF3C", flagged: "#FFB020", rejected: "#D76C68", pending: "#769688" };

export function DashboardClient() {
  const pairs = useDemoStore((state) => state.pairs);
  const metrics = calculateDashboardMetrics(pairs, demoConfig.study.targetPairCount);
  const validationData = [
    { name: "Valid", value: metrics.validPairs, color: colors.valid },
    { name: "Warning", value: metrics.warningPairs, color: colors.warning },
    { name: "Invalid", value: metrics.invalidPairs, color: colors.invalid },
    { name: "Incomplete", value: metrics.incompletePairs, color: colors.incomplete },
  ];
  const reviewData = [
    { name: "Accepted", value: metrics.acceptedPairs, fill: colors.accepted },
    { name: "Flagged", value: metrics.flaggedPairs, fill: colors.flagged },
    { name: "Rejected", value: metrics.rejectedPairs, fill: colors.rejected },
    { name: "Pending", value: metrics.pendingReviewPairs, fill: colors.pending },
  ];
  const varianceData = [
    { range: "0%", count: pairs.filter((pair) => pair.percentagePriceDifference === 0).length },
    { range: "0–5%", count: pairs.filter((pair) => pair.percentagePriceDifference > 0 && pair.percentagePriceDifference <= 5).length },
    { range: "5–15%", count: pairs.filter((pair) => pair.percentagePriceDifference > 5 && pair.percentagePriceDifference <= 15).length },
    { range: "15–30%", count: pairs.filter((pair) => pair.percentagePriceDifference > 15 && pair.percentagePriceDifference <= 30).length },
    { range: ">30%", count: pairs.filter((pair) => pair.percentagePriceDifference > 30).length },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Study operations"
        title="Study Dashboard"
        description={`${demoConfig.study.name} · ${demoConfig.study.platform} · ${demoConfig.study.pickup} → ${demoConfig.study.destination}`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Submitted pairs" value={`${pairs.length} / ${demoConfig.study.targetPairCount}`} note={`${metrics.completionPercentage.toFixed(0)}% of demonstration target`} icon={<Target className="size-4" />} />
        <MetricCard label="Technically valid" value={metrics.validPairs} note={`${metrics.validationRate.toFixed(1)}% of completed pairs`} icon={<CheckCircle2 className="size-4" />} />
        <MetricCard label="Pending expert review" value={metrics.pendingReviewPairs} note={`${metrics.acceptedPairs} accepted · ${metrics.flaggedPairs} flagged`} icon={<CircleGauge className="size-4" />} />
        <MetricCard label="Evidence-complete rate" value={`${metrics.evidenceCompleteRate.toFixed(1)}%`} note="Synthetic record completeness" icon={<FileCheck2 className="size-4" />} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Average observed variance", `${metrics.averageObservedVariance.toFixed(2)}%`],
          ["Median observed variance", `${metrics.medianObservedVariance.toFixed(2)}%`],
          ["Largest observed variance", `${metrics.largestObservedVariance.toFixed(2)}%`],
          ["Review acceptance rate", `${metrics.acceptanceRate.toFixed(1)}%`],
        ].map(([label, value]) => <MetricCard key={label} label={label} value={value} note="Descriptive synthetic metric" />)}
      </div>

      <DisclaimerAlert compact />

      <section aria-label="Study charts" className="grid gap-3 lg:grid-cols-2">
        <Card className="data-panel">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Study progress</CardTitle><p className="text-xs text-muted-foreground">12 paired assignments collected against a preliminary target of 100.</p></CardHeader>
          <CardContent className="pt-5">
            <div className="flex items-end justify-between"><span className="numeric text-3xl font-semibold">{metrics.completionPercentage.toFixed(0)}%</span><span className="mono text-xs text-muted-foreground">{pairs.length} / {demoConfig.study.targetPairCount}</span></div>
            <Progress value={metrics.completionPercentage} className="mt-5 h-2" />
            <div className="mt-5 grid grid-cols-4 gap-2 text-center">{validationData.map((item) => <div key={item.name} className="rounded-md border border-border bg-secondary/30 p-2"><p className="numeric text-base font-semibold">{item.value}</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{item.name}</p></div>)}</div>
          </CardContent>
        </Card>
        <ChartCard title="Technical-validation distribution" summary={`Eight valid, two warning, one invalid, and one incomplete synthetic pair.`}>
          <PieChart><Pie data={validationData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={3} isAnimationActive={false}>{validationData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><ChartTooltip contentStyle={tooltipStyle} /><Legend iconType="circle" /></PieChart>
        </ChartCard>
        <ChartCard title="Expert-review distribution" summary={`${metrics.acceptedPairs} accepted, ${metrics.flaggedPairs} flagged, ${metrics.rejectedPairs} rejected, and ${metrics.pendingReviewPairs} pending review.`}>
          <BarChart data={reviewData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}><CartesianGrid stroke="#26372F" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#9AABA2", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#9AABA2", fontSize: 10 }} axisLine={false} tickLine={false} /><ChartTooltip cursor={{ fill: "rgba(255,255,255,.03)" }} contentStyle={tooltipStyle} /><Bar dataKey="value" name="Pairs" radius={[4, 4, 0, 0]} isAnimationActive={false}>{reviewData.map((item) => <Cell key={item.name} fill={item.fill} />)}</Bar></BarChart>
        </ChartCard>
        <ChartCard title="Observed price-variance distribution" summary="Descriptive distribution only; no statistical significance or causal conclusion is calculated.">
          <BarChart data={varianceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}><CartesianGrid stroke="#26372F" vertical={false} /><XAxis dataKey="range" tick={{ fill: "#9AABA2", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#9AABA2", fontSize: 10 }} axisLine={false} tickLine={false} /><ChartTooltip cursor={{ fill: "rgba(255,255,255,.03)" }} contentStyle={tooltipStyle} /><Bar dataKey="count" name="Pairs" fill="#55C2AE" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart>
        </ChartCard>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><div><p className="label-kicker">Matched comparisons</p><h2 className="mt-1.5 text-lg font-semibold">Pair review queue</h2></div><BarChart3 className="size-5 text-muted-foreground" /></div>
        <PairTable />
      </section>
    </div>
  );
}

const tooltipStyle = { background: "#111F19", border: "1px solid #26372F", borderRadius: 6, color: "#F5F7F6", fontSize: 11 };

function ChartCard({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <Card className="data-panel">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle><p className="sr-only">{summary}</p></CardHeader>
      <CardContent><div className="h-[210px] w-full" role="img" aria-label={summary}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></CardContent>
    </Card>
  );
}

