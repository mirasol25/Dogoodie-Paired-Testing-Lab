"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ReportLibraryItem {
  id: string;
  code: string;
  name: string;
  status: string;
  updatedAt: string;
  matchedPairs: number;
  usablePairs: number;
  pendingReviews: number;
  targetPairs: number | null;
}

export function ReportLibrary({ items }: { items: ReportLibraryItem[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const visible = useMemo(() => items.filter((item) => {
    const matchesQuery = `${item.code} ${item.name}`.toLowerCase().includes(query.trim().toLowerCase());
    const isFinal = ["completed", "archived"].includes(item.status);
    return matchesQuery && (stage === "all" || (stage === "final" ? isFinal : !isFinal));
  }), [items, query, stage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border-y border-border py-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search report or study code" aria-label="Search reports" className="pl-9" />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter report stage"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All reports</SelectItem><SelectItem value="final">Final reports</SelectItem><SelectItem value="interim">Interim reports</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table className="min-w-[880px]">
          <TableHeader><TableRow><TableHead>Study</TableHead><TableHead>Report stage</TableHead><TableHead>Usable results</TableHead><TableHead>Review queue</TableHead><TableHead>Updated</TableHead><TableHead className="text-right"><span className="sr-only">Action</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {visible.map((item) => {
              const final = ["completed", "archived"].includes(item.status);
              return <TableRow key={item.id}><TableCell className="min-w-72 whitespace-normal"><p className="font-medium">{item.name}</p><p className="mono mt-1 text-[10px] text-primary">{item.code}</p></TableCell><TableCell><Badge variant={final ? "default" : "outline"}>{final ? "Final" : "Interim"}</Badge><p className="mt-1 text-[10px] capitalize text-muted-foreground">{item.status}</p></TableCell><TableCell><p className="text-sm font-medium">{item.usablePairs}{item.targetPairs ? ` / ${item.targetPairs}` : ""}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.matchedPairs} matched total</p></TableCell><TableCell><span className={item.pendingReviews ? "text-amber-300" : "text-muted-foreground"}>{item.pendingReviews} pending</span></TableCell><TableCell className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.updatedAt))}</TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/reports/${item.id}`}>Open report<ArrowRight className="size-3.5" /></Link></Button></TableCell></TableRow>;
            })}
            {!visible.length ? <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No reports match the current filters.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Showing {visible.length} of {items.length} accessible reports.</p>
    </div>
  );
}
