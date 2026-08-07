"use client";

import { FileImage, FileJson, Film, type LucideIcon } from "lucide-react";
import { SecureEvidenceViewer } from "@/components/paired-testing/evidence/secure-evidence-viewer";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { formatFileSize } from "@/lib/formatting/file-size";
import type { EvidenceRecord } from "@/lib/data/evidence";

type OCRValidation = { submission_id: string; service_validation: string; raw_ride_label: string | null; detected_fare_min: number | null; detected_status_bar_time: string | null; detected_battery_percentage: number | null; resolved_quote_timestamp: string | null };

function date(value: string | null, timezone: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value)) : "Not available"; }
function metadataComplete(files: EvidenceRecord[]) { return files.length === 2 && files.every((file) => file.original_filename && file.mime_type && file.size_bytes > 0 && file.sha256 && file.captured_at && file.uploaded_at && file.uploaded_by); }

export function PairEvidenceView({ records, submissionAId, submissionBId, timezone, canOpenFiles, ocrValidations = [] }: { records: EvidenceRecord[]; submissionAId: string; submissionBId: string; timezone: string; canOpenFiles: boolean; ocrValidations?: OCRValidation[] }) {
  return <div className="grid gap-4 lg:grid-cols-2"><TesterEvidence label="Tester A evidence" files={records.filter((item) => item.submission_id === submissionAId)} timezone={timezone} canOpenFiles={canOpenFiles} validation={ocrValidations.find((item) => item.submission_id === submissionAId)} /><TesterEvidence label="Tester B evidence" files={records.filter((item) => item.submission_id === submissionBId)} timezone={timezone} canOpenFiles={canOpenFiles} validation={ocrValidations.find((item) => item.submission_id === submissionBId)} /></div>;
}

function TesterEvidence({ label, files, timezone, canOpenFiles, validation }: { label: string; files: EvidenceRecord[]; timezone: string; canOpenFiles: boolean; validation?: OCRValidation }) {
  const screenshot = files.find((item) => item.evidence_type === "screenshot");
  const recording = files.find((item) => item.evidence_type === "screen_recording");
  const metadata = metadataComplete(files);
  return <section className="overflow-hidden rounded-md border border-border"><div className="border-b border-border bg-card/40 px-4 py-3"><p className="text-[10px] uppercase text-muted-foreground">Required evidence</p><h3 className="mt-1 font-semibold">{label}</h3></div><div className="divide-y divide-border"><EvidenceItem label="Quote screenshot" icon={FileImage} file={screenshot} timezone={timezone} canOpenFiles={canOpenFiles} />{validation ? <div className="p-4 text-xs"><div className="flex items-center justify-between gap-3"><p className="font-medium">Automatic screenshot validation</p><StatusBadge status={validation.service_validation} /></div><p className="mt-2 text-muted-foreground">Detected service: {validation.raw_ride_label || "Unreadable"}</p><div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3"><Meta label="OCR fare" value={validation.detected_fare_min?.toString() ?? "Not read"} /><Meta label="OCR time" value={validation.detected_status_bar_time ?? "Not read"} /><Meta label="OCR battery" value={validation.detected_battery_percentage === null ? "Not read" : `${validation.detected_battery_percentage}%`} /></div></div> : null}<EvidenceItem label="Screen recording" icon={Film} file={recording} timezone={timezone} canOpenFiles={canOpenFiles} /><div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start"><div className="flex gap-3"><FileJson className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-medium">System-generated metadata</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Filename, MIME type, size, fingerprint, timestamps, uploader, and storage linkage.</p></div></div><StatusBadge status={metadata ? "complete" : "incomplete"} /></div></div></section>;
}

function EvidenceItem({ label, icon: Icon, file, timezone, canOpenFiles }: { label: string; icon: LucideIcon; file?: EvidenceRecord; timezone: string; canOpenFiles: boolean }) {
  return <div className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-sm font-medium">{label}</p><p className="mt-1 truncate text-xs text-muted-foreground">{file?.original_filename || "Required file missing"}</p></div></div><StatusBadge status={file ? file.integrity_status : "missing"} /></div>{file ? <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs sm:grid-cols-2"><Meta label="Captured" value={date(file.captured_at, timezone)} /><Meta label="Uploaded" value={date(file.uploaded_at, timezone)} /><Meta label="File" value={`${file.mime_type} | ${formatFileSize(file.size_bytes)}`} /><Meta label="SHA-256" value={file.sha256 ? "Available" : "Missing"} /></div> : null}{file && canOpenFiles ? <div className="mt-4"><SecureEvidenceViewer evidenceId={file.id} filename={file.original_filename} mimeType={file.mime_type} /></div> : null}</div>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] uppercase text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>; }
