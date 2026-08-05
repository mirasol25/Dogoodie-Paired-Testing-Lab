"use client";

import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatDemoDate } from "@/lib/formatting/date-time";
import { useDemoStore } from "@/store/paired-testing-demo.store";
import type { DashboardFilter, TestPair } from "@/types/paired-testing-demo.types";
import { StatusBadge } from "./status-badge";

type SortMode = "newest" | "oldest" | "highest_variance" | "lowest_variance" | "timestamp" | "gps";

export function PairTable({ compact = false, initialFilter = "all" }: { compact?: boolean; initialFilter?: DashboardFilter }) {
  const pairs = useDemoStore((state) => state.pairs);
  const submissions = useDemoStore((state) => state.submissions);
  const query = useDemoStore((state) => state.pairSearchQuery);
  const setQuery = useDemoStore((state) => state.setSearchQuery);
  const filter = useDemoStore((state) => state.dashboardFilter);
  const setFilter = useDemoStore((state) => state.setDashboardFilter);
  const [sort, setSort] = React.useState<SortMode>("newest");

  React.useEffect(() => {
    if (initialFilter !== "all") setFilter(initialFilter);
  }, [initialFilter, setFilter]);

  const visible = pairs
    .filter((pair) => {
      if (filter !== "all" && pair.overallValidationStatus !== filter && pair.expertReviewStatus !== filter) return false;
      const a = submissions.find((item) => item.id === pair.testerASubmissionId);
      const b = submissions.find((item) => item.id === pair.testerBSubmissionId);
      const haystack = [pair.id, pair.assignmentId, a?.testerAlias, b?.testerAlias, a?.platform].join(" ").toLowerCase();
      return haystack.includes(query.toLowerCase());
    })
    .sort((a, b) => comparePairs(a, b, sort));

  return (
    <div className="data-panel overflow-hidden rounded-lg">
      <div className="flex flex-col gap-2 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search matched pairs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pair, assignment, tester…" className="h-9 bg-background/45 pl-9 text-xs" />
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as DashboardFilter)}>
            <SelectTrigger className="h-9 min-w-36 bg-background/45 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "valid", "warning", "invalid", "incomplete", "pending", "accepted", "flagged", "rejected"].map((value) =>
                <SelectItem key={value} value={value}>{value === "all" ? "All statuses" : value.replaceAll("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
            <SelectTrigger aria-label="Sort pairs" className="h-9 min-w-40 bg-background/45 text-xs"><ArrowUpDown className="size-3" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="highest_variance">Highest variance</SelectItem><SelectItem value="lowest_variance">Lowest variance</SelectItem>
              <SelectItem value="timestamp">Timestamp gap</SelectItem><SelectItem value="gps">GPS distance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/80 bg-secondary/35 hover:bg-secondary/35">
              <TableHead>Pair</TableHead><TableHead>Test date</TableHead><TableHead>Testers</TableHead>
              <TableHead className="text-right">Price A</TableHead><TableHead className="text-right">Price B</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              {!compact && <><TableHead className="text-right">Time gap</TableHead><TableHead className="text-right">GPS</TableHead></>}
              <TableHead>Technical</TableHead><TableHead>Review</TableHead><TableHead><span className="sr-only">Action</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((pair) => {
              const a = submissions.find((item) => item.id === pair.testerASubmissionId);
              const b = submissions.find((item) => item.id === pair.testerBSubmissionId);
              return (
                <TableRow key={pair.id} className={pair.id === "PAIR-008" ? "bg-primary/[0.035] hover:bg-primary/[0.06]" : "hover:bg-secondary/30"}>
                  <TableCell>
                    <Link href={`/paired-testing-demo/pairs/${pair.id}`} className="mono font-semibold text-foreground hover:text-primary">{pair.id}</Link>
                    <span className="mono mt-1 block text-[10px] text-muted-foreground">{pair.assignmentId}</span>
                    {pair.id === "PAIR-008" && <span className="mt-1 block text-[9px] font-semibold uppercase tracking-wider text-primary">Featured pair</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDemoDate(pair.createdAt)}</TableCell>
                  <TableCell className="min-w-36 text-xs"><span className="block">{a?.testerAlias ?? "Pending"}</span><span className="text-muted-foreground">{b?.testerAlias ?? "Partner pending"}</span></TableCell>
                  <TableCell className="numeric text-right">{a ? formatCurrency(a.displayedPrice) : "—"}</TableCell>
                  <TableCell className="numeric text-right">{b ? formatCurrency(b.displayedPrice) : "—"}</TableCell>
                  <TableCell className="numeric text-right"><span className="font-semibold text-foreground">{formatCurrency(pair.absolutePriceDifference)}</span><span className="block text-[10px] text-muted-foreground">{pair.percentagePriceDifference.toFixed(2)}%</span></TableCell>
                  {!compact && <><TableCell className="numeric text-right text-xs">{pair.timestampDifferenceSeconds.toFixed(1)}s</TableCell><TableCell className="numeric text-right text-xs">{pair.gpsDistanceFeet.toFixed(1)}ft</TableCell></>}
                  <TableCell><StatusBadge status={pair.overallValidationStatus} /></TableCell>
                  <TableCell><StatusBadge status={pair.expertReviewStatus} /></TableCell>
                  <TableCell className="text-right"><Button asChild variant="outline" size="sm" className="h-8 text-xs"><Link href={`/paired-testing-demo/pairs/${pair.id}`}>Review</Link></Button></TableCell>
                </TableRow>
              );
            })}
            {!visible.length && <TableRow><TableCell colSpan={compact ? 9 : 11} className="h-36 text-center text-sm text-muted-foreground">No matched pairs meet the selected criteria. Clear search or reset filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">{visible.length} of {pairs.length} synthetic pairs · Display timezone: America/New_York</div>
    </div>
  );
}

function comparePairs(a: TestPair, b: TestPair, sort: SortMode): number {
  if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
  if (sort === "highest_variance") return b.percentagePriceDifference - a.percentagePriceDifference;
  if (sort === "lowest_variance") return a.percentagePriceDifference - b.percentagePriceDifference;
  if (sort === "timestamp") return b.timestampDifferenceSeconds - a.timestampDifferenceSeconds;
  if (sort === "gps") return b.gpsDistanceFeet - a.gpsDistanceFeet;
  return b.createdAt.localeCompare(a.createdAt);
}

import React from "react";

