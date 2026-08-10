"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleGauge,
  FileCheck2,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/paired-testing/shared/metric-card";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { StudyServiceContext } from "@/components/paired-testing/shared/study-service-context";
import type { ProviderServiceOption, Study } from "@/lib/data/studies";
import type { AssignmentSummary } from "@/lib/data/assignments";
import type {
  ExpertReview,
  MatchedPairSummary,
} from "@/lib/data/matched-pairs";
import type { ActivityLogEvent } from "@/lib/data/activity-logs";
import type { ReactNode } from "react";

const colors = {
  valid: "#B7FF3C",
  warning: "#FFB020",
  invalid: "#D76C68",
  incomplete: "#76877E",
  pending: "#769688",
  accepted: "#B7FF3C",
  accepted_with_exception: "#FFB020",
  rejected: "#D76C68",
};

export function DashboardClient({
  study,
  serviceOptions,
  pairs,
  reviews,
  recentActivity,
  scopeSelector,
  portfolio,
  viewerMode = false,
}: {
  study: Study;
  serviceOptions: ProviderServiceOption[];
  assignments: AssignmentSummary[];
  pairs: MatchedPairSummary[];
  reviews: ExpertReview[];
  recentActivity: ActivityLogEvent[];
  scopeSelector?: ReactNode;
  portfolio?: { studyCount: number; targetPairs: number; testingStartsAt: string | null; testingEndsAt: string | null };
  viewerMode?: boolean;
}) {
  const latest = new Map<string, ExpertReview>();
  reviews.forEach((review) => {
    if (!latest.has(review.matched_pair_id))
      latest.set(review.matched_pair_id, review);
  });
  const technicalCount = (status: MatchedPairSummary["technical_status"]) =>
    pairs.filter((pair) => pair.technical_status === status).length;
  const reviewOutcome = (pair: MatchedPairSummary) => {
    const review = latest.get(pair.id);
    return review?.status === "accepted" && review.technical_exception
      ? "accepted_with_exception"
      : review?.status ?? "pending";
  };
  const reviewCount = (status: "pending" | "accepted" | "accepted_with_exception" | "rejected") => pairs.filter((pair) => reviewOutcome(pair) === status).length;
  const target = portfolio?.targetPairs ?? study.target_pair_count ?? 0;
  const acceptedWithException = reviewCount("accepted_with_exception");
  const rejected = reviewCount("rejected");
  const acceptedUsablePairs = pairs.filter((pair) => {
    const review = latest.get(pair.id);
    return review?.status === "accepted"
      && pair.evidence_status === "complete"
      && (["valid", "warning"].includes(pair.technical_status) || review.technical_exception);
  }).length;
  const replacementNeeded = target ? Math.max(target - acceptedUsablePairs, 0) : 0;
  const progress = target ? Math.min((acceptedUsablePairs / target) * 100, 100) : 0;
  const completeEvidence = pairs.filter(
    (pair) => pair.evidence_status === "complete",
  ).length;
  const evidenceRate = pairs.length
    ? (completeEvidence / pairs.length) * 100
    : 0;
  const variances = pairs
    .flatMap((pair) =>
      pair.percentage_fare_difference === null
        ? []
        : [pair.percentage_fare_difference],
    )
    .sort((a, b) => a - b);
  const average = variances.length
    ? variances.reduce((sum, value) => sum + value, 0) / variances.length
    : 0;
  const median = variances.length
    ? variances.length % 2
      ? variances[Math.floor(variances.length / 2)]
      : (variances[variances.length / 2 - 1] +
          variances[variances.length / 2]) /
        2
    : 0;
  const largest = variances.length ? Math.max(...variances.map(Math.abs)) : 0;
  const decidedReviews = reviewCount("accepted") + reviewCount("accepted_with_exception") + reviewCount("rejected");
  const acceptanceRate = decidedReviews
    ? (acceptedUsablePairs / decidedReviews) * 100
    : 0;
  const validationData = (
    viewerMode ? (["valid", "warning", "invalid", "incomplete"] as const) : (["valid", "warning", "invalid", "incomplete", "pending"] as const)
  ).map((status) => ({
    name: status,
    value: technicalCount(status),
    fill: colors[status],
  }));
  const reviewData = (
    viewerMode ? (["accepted", "accepted_with_exception", "rejected"] as const) : (["accepted", "accepted_with_exception", "rejected", "pending"] as const)
  ).map((status) => ({
    name: status,
    value: reviewCount(status),
    fill: colors[status],
  }));
  const varianceData = [
    { range: "0%", min: 0, max: 0 },
    { range: "0-5%", min: 0, max: 5 },
    { range: "5-15%", min: 5, max: 15 },
    { range: "15-30%", min: 15, max: 30 },
    { range: ">30%", min: 30, max: Infinity },
  ].map((bucket) => ({
    range: bucket.range,
    count: variances.map(Math.abs).filter((value) =>
      bucket.min === 0 && bucket.max === 0
        ? value === 0
        : value > bucket.min && value <= bucket.max,
    ).length,
  }));
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en", {
          dateStyle: "medium",
          timeZone: study.display_timezone,
        }).format(new Date(value))
      : "Open";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={viewerMode ? "Released results" : portfolio ? "Portfolio analytics" : `${study.study_code} - Study operations`}
        title={viewerMode ? (portfolio ? "Released Study Analytics" : "Released Study Dashboard") : portfolio ? "All Studies Dashboard" : "Study Dashboard"}
        description={portfolio ? `Computed from ${portfolio.studyCount} ${viewerMode ? "released" : "accessible"} ${portfolio.studyCount === 1 ? "study" : "studies"} and ${pairs.length} matched ${pairs.length === 1 ? "pair" : "pairs"}.` : `${study.name} | ${study.display_timezone} | ${study.default_currency ?? "Currency pending"}`}
        actions={scopeSelector}
      />
      {!portfolio ? <StudyServiceContext study={study} services={serviceOptions} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={viewerMode ? "Included comparisons" : "Accepted usable pairs"}
          value={viewerMode ? acceptedUsablePairs : target ? `${acceptedUsablePairs} / ${target}` : acceptedUsablePairs}
          note={
            viewerMode
              ? target ? `${acceptedUsablePairs} of ${target} target comparisons` : "Accepted for reporting"
              : target
              ? replacementNeeded ? `${replacementNeeded} replacement pair${replacementNeeded === 1 ? "" : "s"} needed` : "Study target reached"
              : "No target configured"
          }
          icon={<Target className="size-4" />}
        />
        <MetricCard
          label="Technically valid"
          value={technicalCount("valid")}
          note={
            pairs.length
              ? `${((technicalCount("valid") / pairs.length) * 100).toFixed(1)}% of submitted pairs`
              : "No submitted pairs"
          }
          icon={<CheckCircle2 className="size-4" />}
        />
        <MetricCard
          label={viewerMode ? "Review decisions" : "Pending expert review"}
          value={viewerMode ? decidedReviews : reviewCount("pending")}
          note={`${reviewCount("accepted")} accepted | ${acceptedWithException} with exception | ${reviewCount("rejected")} rejected`}
          icon={<CircleGauge className="size-4" />}
        />
        <MetricCard
          label="Evidence-complete rate"
          value={`${evidenceRate.toFixed(1)}%`}
          note={`${completeEvidence} of ${pairs.length} pairs complete`}
          icon={<FileCheck2 className="size-4" />}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Average signed variance"
          value={`${average.toFixed(2)}%`}
          note="Positive means Tester B was higher"
        />
        <MetricCard
          label="Median signed variance"
          value={`${median.toFixed(2)}%`}
          note="Positive means Tester B was higher"
        />
        <MetricCard
          label="Largest observed variance"
          value={`${largest.toFixed(2)}%`}
          note="Largest absolute difference"
        />
        <MetricCard
          label="Review acceptance rate"
          value={`${acceptanceRate.toFixed(1)}%`}
          note={
            decidedReviews
              ? `${acceptedUsablePairs} usable of ${decidedReviews} decided reviews`
              : "No review decisions yet"
          }
        />
      </div>
      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="data-panel">
          <CardHeader>
            <CardTitle className="text-sm">{portfolio ? "Portfolio progress" : "Study progress"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-semibold">
                {progress.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {acceptedUsablePairs} / {target || "No target"}
              </span>
            </div>
            <Progress value={progress} className="mt-5 h-2" />
            <p className="mt-2 text-[10px] text-muted-foreground">{pairs.length} total matched pair{pairs.length === 1 ? "" : "s"} recorded | {rejected} rejected record{rejected === 1 ? "" : "s"} retained outside the usable target</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Testing period</dt>
                <dd className="mt-1 font-medium">
                  {date(portfolio?.testingStartsAt ?? study.testing_starts_at)} -{" "}
                  {date(portfolio?.testingEndsAt ?? study.testing_ends_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{portfolio ? "Studies included" : "Study status"}</dt>
                <dd className="mt-1">
                  {portfolio ? <span className="text-sm font-semibold">{portfolio.studyCount}</span> : <StatusBadge status={study.status} />}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Chart title="Technical validation" data={validationData} type="pie" showLegend />
        <Chart title="Expert review" data={reviewData} type="bar" />
        <Chart
          title="Absolute fare variance distribution"
          data={varianceData.map((item) => ({
            name: item.range,
            value: item.count,
            fill: "#55C2AE",
          }))}
          type="bar"
        />
      </section>
      <section className={viewerMode ? "grid gap-3" : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]"}>
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-card/35 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase text-primary">{viewerMode ? "Released results" : "Review queue"}</p>
              <h2 className="mt-1 text-base font-semibold">
                {viewerMode ? "Included matched pairs" : "Recent matched pairs"}
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/paired-testing-demo/pairs">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {pairs.slice(0, 5).map((pair) => (
              <Link
                key={pair.id}
                href={`/paired-testing-demo/pairs/${pair.id}`}
                className="grid gap-2 px-4 py-3 hover:bg-secondary sm:grid-cols-[1fr_auto_auto] sm:items-center"
              >
                <div>
                  <p className="mono text-xs font-semibold">{pair.pair_code}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {pair.submissionA.testerName} /{" "}
                    {pair.submissionB.testerName}
                  </p>
                </div>
                <StatusBadge status={pair.technical_status} />
                <StatusBadge status={reviewOutcome(pair)} />
              </Link>
            ))}
            {!pairs.length ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No matched pairs yet.
              </p>
            ) : null}
          </div>
        </div>
        {!viewerMode ? <aside className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border bg-card/35 px-4 py-3">
            <p className="text-[10px] uppercase text-primary">
              Operational history
            </p>
            <h2 className="mt-1 text-base font-semibold">Recent activity</h2>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((event) => (
              <div key={event.id} className="px-4 py-3">
                <p className="text-xs font-medium">
                  {event.action.replaceAll(".", " ")}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {event.actor_name} |{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: study.display_timezone,
                  }).format(new Date(event.created_at))}
                </p>
              </div>
            ))}
            {!recentActivity.length ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No activity recorded.
              </p>
            ) : null}
          </div>
        </aside> : null}
      </section>
    </div>
  );
}

const tooltipStyle = {
  background: "#111F19",
  border: "1px solid #26372F",
  borderRadius: 6,
  color: "#F5F7F6",
  fontSize: 11,
};

const chartLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function Chart({
  title,
  data,
  type,
  showLegend = false,
}: {
  title: string;
  data: Array<{ name: string; value: number; fill: string }>;
  type: "pie" | "bar";
  showLegend?: boolean;
}) {
  return (
    <Card className="data-panel">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          {" "}
          <ResponsiveContainer width="100%" height="100%">
            {type === "pie" ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Pie>
                <ChartTooltip contentStyle={tooltipStyle} labelStyle={{ color: "#F5F7F6" }} formatter={(value, name) => [value, chartLabel(String(name))]} />
              </PieChart>
            ) : (
              <BarChart data={data} margin={{ left: -25 }}>
                <CartesianGrid stroke="#334A3F" strokeOpacity={0.75} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#C2CEC7", fontSize: 11 }}
                  tickFormatter={chartLabel}
                  height={38}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#C2CEC7", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip cursor={{ fill: "#B7FF3C", fillOpacity: 0.055 }} contentStyle={tooltipStyle} labelStyle={{ color: "#F5F7F6" }} labelFormatter={(label) => chartLabel(String(label))} />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                  minPointSize={2}
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        {showLegend ? <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground sm:grid-cols-3">{data.map((item) => <div key={item.name} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: item.fill }} /><span>{chartLabel(item.name)}</span><strong className="ml-auto text-foreground">{item.value}</strong></div>)}</div> : null}
      </CardContent>
    </Card>
  );
}
