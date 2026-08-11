"use client";

import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { selectStudyAction } from "@/app/paired-testing-demo/studies/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import type { Study } from "@/lib/data/studies";

interface TesterStudyRow {
  study: Study;
  workload: { assigned: number; needsAction: number; submitted: number };
}

const rowGrid = "xl:grid-cols-[minmax(260px,1.25fr)_minmax(150px,.7fr)_minmax(190px,.9fr)_minmax(220px,.85fr)_132px]";

function formatDate(value: string | null, timezone: string) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: timezone }).format(new Date(value)) : "Not set";
}

export function TesterStudiesClient({ rows, activeStudyId }: { rows: TesterStudyRow[]; activeStudyId: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string>();
  const [pending, startTransition] = useTransition();
  const visible = useMemo(
    () => rows.filter(({ study }) => `${study.study_code} ${study.name}`.toLowerCase().includes(query.trim().toLowerCase())),
    [query, rows],
  );

  function open(study: Study) {
    if (study.id === activeStudyId) {
      router.push(`/studies/${study.id}`);
      return;
    }
    setPendingId(study.id);
    startTransition(async () => {
      const result = await selectStudyAction(study.id);
      if (!result.ok) {
        toast.error(result.message);
        setPendingId(undefined);
        return;
      }
      toast.success(result.message);
      router.push(`/studies/${study.id}`);
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-card/35 p-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search study name or code" className="pl-9" />
        </div>
      </div>
      <div className={`hidden border-b border-border bg-secondary/25 px-5 py-3 xl:grid ${rowGrid}`}>
        <ColumnHeader>Study</ColumnHeader>
        <ColumnHeader>Status</ColumnHeader>
        <ColumnHeader>Testing period</ColumnHeader>
        <ColumnHeader>Assigned sessions</ColumnHeader>
        <span className="sr-only">Action</span>
      </div>
      <div className="divide-y divide-border">
        {visible.map(({ study, workload }) => {
          const actionLabel = ["completed", "archived"].includes(study.status) ? "View history" : "Open study";
          return (
            <article key={study.id}>
              <div className={`grid gap-5 px-4 py-5 sm:px-5 md:grid-cols-2 xl:items-center xl:gap-4 ${rowGrid}`}>
                <div className="min-w-0 md:col-span-2 xl:col-span-1">
                  <h2 className="text-sm font-semibold leading-5">{study.name}</h2>
                  <p className="mono mt-1 text-[10px] text-muted-foreground">{study.study_code}</p>
                </div>
                <div>
                  <p className="mb-2 text-[10px] uppercase text-muted-foreground xl:hidden">Status</p>
                  <StatusBadge status={study.status} />
                  <p className="mt-2 text-xs text-muted-foreground">{study.display_timezone} | {study.default_currency ?? "Currency pending"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground xl:hidden">Testing period</p>
                  <p className="mt-1 text-xs font-medium xl:mt-0">{formatDate(study.testing_starts_at, study.display_timezone)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">to {formatDate(study.testing_ends_at, study.display_timezone)}</p>
                </div>
                <div className="md:col-span-2 xl:col-span-1">
                  <p className="text-[10px] uppercase text-muted-foreground xl:hidden">Assigned sessions</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 border-y border-border py-3 text-center xl:mt-0 xl:border-y-0 xl:py-0">
                    <Count label="Assigned" value={workload.assigned} />
                    <Count label="Need action" value={workload.needsAction} highlight={workload.needsAction > 0} />
                    <Count label="Submitted" value={workload.submitted} />
                  </div>
                </div>
                <div className="flex md:col-span-2 md:justify-end xl:col-span-1">
                  <Button onClick={() => open(study)} disabled={pending} variant={workload.needsAction ? "default" : "outline"} className="w-full sm:w-auto">
                    {pendingId === study.id ? <LoaderCircle className="size-4 animate-spin" /> : actionLabel}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
        {!visible.length ? <div className="px-6 py-14 text-center"><p className="text-sm font-medium">No assigned studies match</p><p className="mt-1 text-xs text-muted-foreground">Adjust the study search.</p></div> : null}
      </div>
      <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">{visible.length} of {rows.length} assigned studies</div>
    </section>
  );
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-medium uppercase text-muted-foreground">{children}</p>;
}

function Count({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return <div><p className={`text-lg font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p><p className="mt-1 text-[9px] uppercase text-muted-foreground">{label}</p></div>;
}
