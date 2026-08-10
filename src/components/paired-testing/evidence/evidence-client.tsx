"use client";

import Link from "next/link";
import { Eye, FileArchive, FileImage, Film, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { SecureEvidenceViewer } from "@/components/paired-testing/evidence/secure-evidence-viewer";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFileSize } from "@/lib/formatting/file-size";
import type { EvidenceRecord } from "@/lib/data/evidence";

function typeLabel(type: string) { return type === "screenshot" ? "Quote screenshot" : type === "screen_recording" ? "Screen recording" : type.replaceAll("_", " "); }
function formatDate(value: string | null, timezone: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value)) : "Not available"; }
function dateValue(value: string | null, timezone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function EvidenceClient({ records, studyCode, timezone, canOpenFiles }: { records: EvidenceRecord[]; studyCode: string; timezone: string; canOpenFiles: boolean }) {
  const [query, setQuery] = useState("");
  const [capturedDate, setCapturedDate] = useState("");
  const [selected, setSelected] = useState<EvidenceRecord>();
  const visible = useMemo(() => records.filter((record) => {
    const matchesDate = !capturedDate || dateValue(record.captured_at, timezone) === capturedDate;
    const text = [record.evidence_code, record.pairCode, record.assignmentCode, record.submissionCode, record.testerName, record.original_filename, record.evidence_type].join(" ").toLowerCase();
    return matchesDate && text.includes(query.trim().toLowerCase());
  }), [capturedDate, query, records, timezone]);

  return <div className="space-y-6">
    <PageHeader eyebrow={`${studyCode} - Evidence control`} title="Evidence Repository" description="Private screenshots, recordings, and system-generated metadata linked to persisted tester submissions." />
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Evidence files" value={records.length} icon={FileArchive} /><Summary label="Screenshots" value={records.filter((item) => item.evidence_type === "screenshot").length} icon={FileImage} /><Summary label="Screen recordings" value={records.filter((item) => item.evidence_type === "screen_recording").length} icon={Film} /><Summary label="Flagged or rejected" value={records.filter((item) => ["flagged", "rejected"].includes(item.integrity_status)).length} icon={ShieldCheck} /></div>
    <div className="overflow-hidden rounded-md border border-border"><div className="flex flex-col gap-2 border-b border-border bg-card/35 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search evidence" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file, pair, assignment, or tester" className="h-9 bg-background/45 pl-9 text-xs" /></div><Input type="date" aria-label="Filter evidence by capture date" value={capturedDate} onChange={(event) => setCapturedDate(event.target.value)} className="h-9 w-full bg-background/45 text-xs sm:w-48" /></div>
      <div className="overflow-x-auto"><Table className="min-w-[1050px] table-fixed"><TableHeader><TableRow><TableHead className="w-[18%]">Evidence</TableHead><TableHead className="w-[17%]">Pair / assignment</TableHead><TableHead className="w-[13%]">Tester</TableHead><TableHead className="w-[14%]">Type</TableHead><TableHead className="w-[17%]">Captured</TableHead><TableHead className="w-[11%]">Integrity</TableHead><TableHead className="w-[10%]"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{visible.map((record) => <TableRow key={record.id}><TableCell><p className="mono truncate font-semibold">{record.evidence_code || record.id}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">{record.original_filename}</p></TableCell><TableCell>{record.pairId ? <Link href={`/paired-testing-demo/pairs/${record.pairId}`} className="mono text-xs hover:text-primary">{record.pairCode}</Link> : <span className="text-xs text-muted-foreground">Pair pending</span>}<p className="mono mt-1 text-[10px] text-muted-foreground">{record.assignmentCode}</p></TableCell><TableCell className="truncate text-xs">{record.testerName}</TableCell><TableCell className="text-xs">{typeLabel(record.evidence_type)}</TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(record.captured_at, timezone)}</TableCell><TableCell><StatusBadge status={record.integrity_status} /></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon-sm" onClick={() => setSelected(record)} aria-label={`Inspect ${record.evidence_code || record.id}`}><Eye className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>
      {!visible.length ? <div className="px-6 py-12 text-center"><FileArchive className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{records.length ? "No matching evidence" : "No evidence uploaded yet"}</p><p className="mt-1 text-xs text-muted-foreground">{records.length ? "Adjust the search or captured date." : "Evidence appears here after testers upload assignment files."}</p></div> : null}<div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">{visible.length} of {records.length} persisted evidence files | Display timezone: {timezone}</div></div>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(undefined)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle className="flex items-center gap-2"><FileArchive className="size-4 text-primary" />Evidence metadata</SheetTitle><SheetDescription>System-generated metadata for a privately stored evidence file.</SheetDescription></SheetHeader>{selected ? <div className="space-y-5 px-4 pb-6"><div className="rounded-md border border-border bg-card/40 p-4"><p className="text-[10px] uppercase text-primary">{typeLabel(selected.evidence_type)}</p><p className="mono mt-2 break-all text-sm font-semibold">{selected.evidence_code || selected.id}</p><p className="mt-1 break-all text-xs text-muted-foreground">{selected.original_filename}</p></div><dl className="divide-y divide-border text-xs">{[["Pair", selected.pairCode || "Pair pending"], ["Assignment", selected.assignmentCode], ["Submission", selected.submissionCode], ["Tester", selected.testerName], ["Capture time", formatDate(selected.captured_at, timezone)], ["Upload time", formatDate(selected.uploaded_at, timezone)], ["MIME type", selected.mime_type], ["File size", formatFileSize(selected.size_bytes)], ["Integrity", selected.integrity_status]].map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] gap-4 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-medium">{value}</dd></div>)}</dl><div><p className="text-[10px] uppercase text-muted-foreground">SHA-256 fingerprint</p><p className="mono mt-2 break-all rounded-md bg-secondary/45 p-3 text-[10px] leading-5">{selected.sha256 || "Not available"}</p></div>{canOpenFiles ? <SecureEvidenceViewer evidenceId={selected.id} filename={selected.original_filename} mimeType={selected.mime_type} label="View evidence file" /> : <p className="rounded-md border border-border p-3 text-xs text-muted-foreground">Your role can inspect metadata but cannot open private evidence files.</p>}</div> : null}</SheetContent></Sheet>
  </div>;
}

function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: typeof FileArchive }) { return <div className="data-panel flex min-h-24 items-center justify-between rounded-md p-4"><div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div><Icon className="size-5 text-muted-foreground" /></div>; }
