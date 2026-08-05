import { demoConfig } from "@/config/paired-testing-demo.config";
import type { AuditEvent, EvidenceFile, ReportManifest, TestPair } from "@/types/paired-testing-demo.types";

export function createManifest(
  pairs: TestPair[],
  evidence: EvidenceFile[],
  auditEvents: AuditEvent[],
  generatedAt = "2026-05-18T17:00:00.000Z",
): ReportManifest & { reviewStatusSummary: Record<string, number>; activityEventCount: number } {
  return {
    packageId: demoConfig.reports.packageId,
    studyId: demoConfig.study.id,
    generatedAt,
    protocolVersion: demoConfig.study.protocolVersion,
    includedPairCount: pairs.filter((pair) => pair.expertReviewStatus === "accepted").length,
    excludedPairCount: pairs.filter((pair) => pair.expertReviewStatus === "rejected" || pair.overallValidationStatus === "invalid").length,
    evidenceRecordCount: evidence.length,
    missingEvidenceCount: pairs.filter((pair) => pair.evidenceStatus === "missing").length,
    reports: [...demoConfig.reports.titles],
    disclaimer: demoConfig.disclaimer,
    reviewStatusSummary: pairs.reduce<Record<string, number>>((summary, pair) => {
      summary[pair.expertReviewStatus] = (summary[pair.expertReviewStatus] ?? 0) + 1;
      return summary;
    }, {}),
    activityEventCount: auditEvents.length,
  };
}

export function manifestToJson(manifest: ReturnType<typeof createManifest>): string {
  return JSON.stringify(manifest, null, 2);
}

