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
import type { Study } from "@/lib/data/studies";
import type { AssignmentSummary } from "@/lib/data/assignments";
import type {
  ExpertReview,
  MatchedPairSummary,
} from "@/lib/data/matched-pairs";
import type { ActivityLogEvent } from "@/lib/data/activity-logs";

const colors = {
  valid: "#B7FF3C",
  warning: "#FFB020",
  invalid: "#D76C68",
  incomplete: "#76877E",
  pending: "#769688",
  accepted: "#B7FF3C",
  flagged: "#FFB020",
  rejected: "#D76C68",
};

export function DashboardClient({
  study,
  pairs,
  reviews,
  recentActivity,
}: {
  study: Study;
  assignments: AssignmentSummary[];
  pairs: MatchedPairSummary[];
  reviews: ExpertReview[];
  recentActivity: ActivityLogEvent[];
}) {
  const latest = new Map<string, ExpertReview>();
  reviews.forEach((review) => {
    if (!latest.has(review.matched_pair_id))
      latest.set(review.matched_pair_id, review);
  });
  const technicalCount = (status: MatchedPairSummary["technical_status"]) =>
    pairs.filter((pair) => pair.technical_status === status).length;
  const reviewCount = (
    status: "pending" | "accepted" | "flagged" | "rejected",
  ) =>
    pairs.filter(
      (pair) => (latest.get(pair.id)?.status ?? "pending") === status,
    ).length;
  const target = study.target_pair_count ?? 0;
  const progress = target ? Math.min((pairs.length / target) * 100, 100) : 0;
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
  const largest = variances.length ? Math.max(...variances) : 0;
  const decidedReviews =
    reviewCount("accepted") + reviewCount("flagged") + reviewCount("rejected");
  const acceptanceRate = decidedReviews
    ? (reviewCount("accepted") / decidedReviews) * 100
    : 0;
  const validationData = (
    ["valid", "warning", "invalid", "incomplete", "pending"] as const
  ).map((status) => ({
    name: status,
    value: technicalCount(status),
    fill: colors[status],
  }));
  const reviewData = (
    ["accepted", "flagged", "rejected", "pending"] as const
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
    count: variances.filter((value) =>
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
        eyebrow={`${study.study_code} - Study operations`}
        title="Study Dashboard"
        description={`${study.name} | ${study.display_timezone} | ${study.default_currency ?? "Currency pending"}`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Submitted pairs"
          value={target ? `${pairs.length} / ${target}` : pairs.length}
          note={
            target
              ? `${progress.toFixed(0)}% of study target`
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
          label="Pending expert review"
          value={reviewCount("pending")}
          note={`${reviewCount("accepted")} accepted | ${reviewCount("flagged")} flagged | ${reviewCount("rejected")} rejected`}
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
          label="Average observed variance"
          value={`${average.toFixed(2)}%`}
          note="Across pairs with recorded fares"
        />
        <MetricCard
          label="Median observed variance"
          value={`${median.toFixed(2)}%`}
          note="Across pairs with recorded fares"
        />
        <MetricCard
          label="Largest observed variance"
          value={`${largest.toFixed(2)}%`}
          note="Highest recorded pair variance"
        />
        <MetricCard
          label="Review acceptance rate"
          value={`${acceptanceRate.toFixed(1)}%`}
          note={
            decidedReviews
              ? `${reviewCount("accepted")} of ${decidedReviews} decided reviews`
              : "No review decisions yet"
          }
        />
      </div>
      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="data-panel">
          <CardHeader>
            <CardTitle className="text-sm">Study progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-semibold">
                {progress.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {pairs.length} / {target || "No target"}
              </span>
            </div>
            <Progress value={progress} className="mt-5 h-2" />
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Testing period</dt>
                <dd className="mt-1 font-medium">
                  {date(study.testing_starts_at)} -{" "}
                  {date(study.testing_ends_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Study status</dt>
                <dd className="mt-1">
                  <StatusBadge status={study.status} />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Chart title="Technical validation" data={validationData} type="pie" />
        <Chart title="Expert review" data={reviewData} type="bar" />
        <Chart
          title="Fare variance distribution"
          data={varianceData.map((item) => ({
            name: item.range,
            value: item.count,
            fill: "#55C2AE",
          }))}
          type="bar"
        />
      </section>
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-card/35 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase text-primary">Review queue</p>
              <h2 className="mt-1 text-base font-semibold">
                Recent matched pairs
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
                <StatusBadge
                  status={latest.get(pair.id)?.status ?? "pending"}
                />
              </Link>
            ))}
            {!pairs.length ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No matched pairs yet.
              </p>
            ) : null}
          </div>
        </div>
        <aside className="overflow-hidden rounded-md border border-border">
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
        </aside>
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
function Chart({
  title,
  data,
  type,
}: {
  title: string;
  data: Array<{ name: string; value: number; fill: string }>;
  type: "pie" | "bar";
}) {
  return (
    <Card className="data-panel">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
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
                <ChartTooltip contentStyle={tooltipStyle} />
              </PieChart>
            ) : (
              <BarChart data={data} margin={{ left: -25 }}>
                <CartesianGrid stroke="#26372F" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9AABA2", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#9AABA2", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
