"use client";

import Link from "next/link";
import { Download, FileJson, FileSpreadsheet, FileText, PackageOpen, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { reportManifestFixture } from "@/data/paired-testing-demo.fixtures";
import { auditToCsv, downloadTextFile, evidenceToCsv, pairsToCsv } from "@/lib/exports/csv-export";
import { createManifest, manifestToJson } from "@/lib/exports/manifest-export";
import { useDemoStore } from "@/store/paired-testing-demo.store";
import { DisclaimerAlert } from "@/components/paired-testing/shared/disclaimer-alert";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";

const outputs = [
  ["Study Summary Report", "Descriptive study context, protocol version, metrics, and limitations.", FileText],
  ["Accepted Pair Table", "Current expert-accepted pair records from demonstration state.", FileSpreadsheet],
  ["Excluded Pair Table", "Rejected, invalid, and incomplete pair records with statuses.", FileSpreadsheet],
  ["Evidence Inventory", "Synthetic record metadata and demonstration hash labels.", FileSpreadsheet],
  ["Activity Log Export", "Synthetic operational events; not an immutable audit log.", FileSpreadsheet],
  ["Evidence Package Manifest", "JSON package inventory and current review summary.", FileJson],
] as const;

export function ReportsClient() {
  const pairs = useDemoStore((state) => state.pairs);
  const evidence = useDemoStore((state) => state.evidence);
  const audit = useDemoStore((state) => state.auditEvents);
  const accepted = pairs.filter((pair) => pair.expertReviewStatus === "accepted");
  const excluded = pairs.filter((pair) => pair.expertReviewStatus === "rejected" || ["invalid", "incomplete"].includes(pair.overallValidationStatus));
  const download = (kind: "all" | "accepted" | "excluded" | "evidence" | "audit" | "manifest") => {
    if (kind === "all") downloadTextFile(pairsToCsv(pairs), demoConfig.reports.filenames.pairs, "text/csv;charset=utf-8");
    if (kind === "accepted") downloadTextFile(pairsToCsv(accepted), demoConfig.reports.filenames.acceptedPairs, "text/csv;charset=utf-8");
    if (kind === "excluded") downloadTextFile(pairsToCsv(excluded), demoConfig.reports.filenames.excludedPairs, "text/csv;charset=utf-8");
    if (kind === "evidence") downloadTextFile(evidenceToCsv(evidence), demoConfig.reports.filenames.evidence, "text/csv;charset=utf-8");
    if (kind === "audit") downloadTextFile(auditToCsv(audit), demoConfig.reports.filenames.audit, "text/csv;charset=utf-8");
    if (kind === "manifest") downloadTextFile(manifestToJson(createManifest(pairs, evidence, audit, new Date().toISOString())), demoConfig.reports.filenames.manifest, "application/json");
    toast.success("Synthetic demonstration export prepared.");
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Expert review package" title="Reports & Evidence Package Preview" description="Generate local demonstration exports and preview a browser-printable descriptive report." actions={<Button asChild><Link href="/paired-testing-demo/reports/print"><Printer className="size-4" />Print Report</Link></Button>} />
      <DisclaimerAlert />
      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {outputs.map(([title, description, Icon], index) => <Card key={title} className="data-panel"><CardContent className="p-4"><div className="flex items-start justify-between"><span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></span><span className="mono text-[10px] text-muted-foreground">OUT-{String(index + 1).padStart(2, "0")}</span></div><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p></CardContent></Card>)}
        </div>
        <Card className="data-panel"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="label-kicker">Package summary</p><p className="mono mt-2 text-xl font-semibold">{reportManifestFixture.packageId}</p></div><PackageOpen className="size-5 text-primary" /></div><dl className="mt-5 space-y-3 text-xs">{[["Study", demoConfig.study.id], ["Protocol", demoConfig.study.protocolVersion], ["Included pairs", String(accepted.length)], ["Excluded / incomplete", String(excluded.length)], ["Evidence records", String(evidence.length)], ["Missing evidence pairs", String(pairs.filter((pair) => pair.evidenceStatus === "missing").length)]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-border/70 pb-2"><dt className="text-muted-foreground">{label}</dt><dd className="mono">{value}</dd></div>)}</dl><div className="mt-4 flex flex-wrap gap-2"><StatusBadge status="Synthetic data" /><StatusBadge status="Expert review required" /></div></CardContent></Card>
      </section>
      <section className="data-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="label-kicker">Functional local exports</p><h2 className="mt-2 text-lg font-semibold">Demonstration downloads</h2><p className="mt-1 text-xs text-muted-foreground">Exports are generated from current browser state and do not contact a server.</p></div><Button variant="outline" onClick={() => { toast.success("Demo package manifest refreshed from current state."); }}><PackageOpen className="size-4" />Generate Demo Package</Button></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ExportButton label="Raw Synthetic Pair CSV" onClick={() => download("all")} />
          <ExportButton label="Accepted Pair CSV" onClick={() => download("accepted")} />
          <ExportButton label="Excluded Pair CSV" onClick={() => download("excluded")} />
          <ExportButton label="Evidence Inventory CSV" onClick={() => download("evidence")} />
          <ExportButton label="Activity Log CSV" onClick={() => download("audit")} />
          <ExportButton label="JSON Package Manifest" onClick={() => download("manifest")} />
          <Button asChild variant="outline" className="justify-start"><Link href="/paired-testing-demo/reports/print"><Printer className="size-4" />Preview Summary Report</Link></Button>
        </div>
      </section>
    </div>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button variant="outline" onClick={onClick} className="justify-start"><Download className="size-4" />{label}</Button>;
}

