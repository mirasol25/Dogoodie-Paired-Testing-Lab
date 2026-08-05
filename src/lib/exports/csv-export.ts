import type { AuditEvent, EvidenceFile, TestPair } from "@/types/paired-testing-demo.types";

function escapeCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}

export function pairsToCsv(pairs: TestPair[]): string {
  return rowsToCsv(
    ["Pair ID", "Assignment ID", "Technical status", "Review status", "Price difference", "Percentage difference", "Timestamp gap seconds", "GPS distance feet", "Evidence status"],
    pairs.map((pair) => [
      pair.id, pair.assignmentId, pair.overallValidationStatus, pair.expertReviewStatus,
      pair.absolutePriceDifference.toFixed(2), pair.percentagePriceDifference.toFixed(2),
      pair.timestampDifferenceSeconds.toFixed(1), pair.gpsDistanceFeet.toFixed(1), pair.evidenceStatus,
    ]),
  );
}

export function evidenceToCsv(evidence: EvidenceFile[]): string {
  return rowsToCsv(
    ["File ID", "Pair ID", "Assignment ID", "Tester", "Evidence type", "Filename", "MIME type", "Size bytes", "Capture timestamp", "Synthetic hash", "Integrity status"],
    evidence.map((file) => [
      file.id, file.pairId, file.assignmentId, file.testerAlias, file.evidenceType, file.filename,
      file.mimeType, file.sizeBytes, file.captureTimestamp, file.syntheticHash, file.integrityStatus,
    ]),
  );
}

export function auditToCsv(events: AuditEvent[]): string {
  return rowsToCsv(
    ["Event ID", "Timestamp", "Actor", "Actor role", "Action", "Object type", "Object ID", "Category", "Integrity indicator", "Note"],
    events.map((event) => [
      event.id, event.timestamp, event.actor, event.actorRole, event.action, event.objectType,
      event.objectId, event.category, event.integrityIndicator, event.note ?? "",
    ]),
  );
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

