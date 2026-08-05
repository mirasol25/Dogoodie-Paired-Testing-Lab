import { demoConfig } from "@/config/paired-testing-demo.config";
import { timestampDifferenceSeconds } from "@/lib/calculations/date-calculations";
import { haversineDistanceFeet } from "@/lib/calculations/geographic-distance";
import type {
  EvidenceFile,
  PairValidationStatus,
  RuleStatus,
  TestSubmission,
  ValidationResult,
} from "@/types/paired-testing-demo.types";

export interface PairValidationOutput {
  status: PairValidationStatus;
  results: ValidationResult[];
  timestampDifferenceSeconds: number;
  gpsDistanceFeet: number;
  evidenceComplete: boolean;
}

function comparisonRule(
  rule: string,
  label: string,
  valueA: string,
  valueB: string,
  required = true,
): ValidationResult {
  const passed = valueA.trim().toLowerCase() === valueB.trim().toLowerCase();
  return {
    rule,
    label,
    status: passed ? "pass" : "fail",
    testerAValue: valueA || "Missing",
    testerBValue: valueB || "Missing",
    difference: passed ? "Match" : "Mismatch",
    explanation: passed ? "Values conform to the configured comparison rule." : "Values do not match.",
    requirementLevel: required ? "required" : "advisory",
    affectedOverallStatus: !passed && required,
  };
}

function thresholdStatus(value: number, pass: number, warningMax: number): RuleStatus {
  if (value <= pass) return "pass";
  if (value <= warningMax) return "warning";
  return "fail";
}

export function validatePair(
  submissionA: TestSubmission | undefined,
  submissionB: TestSubmission | undefined,
  evidence: EvidenceFile[] = [],
): PairValidationOutput {
  if (!submissionA || !submissionB) {
    return {
      status: "incomplete",
      results: [{
        rule: "both_submissions",
        label: "Both paired submissions",
        status: "fail",
        testerAValue: submissionA ? "Present" : "Missing",
        testerBValue: submissionB ? "Present" : "Missing",
        difference: "Partner response incomplete",
        explanation: "Technical validation cannot proceed until both paired submissions are present.",
        requirementLevel: "required",
        affectedOverallStatus: true,
      }],
      timestampDifferenceSeconds: 0,
      gpsDistanceFeet: 0,
      evidenceComplete: false,
    };
  }

  const timestampGap = timestampDifferenceSeconds(submissionA.quoteTimestamp, submissionB.quoteTimestamp);
  const gpsGap = haversineDistanceFeet(
    submissionA.latitude,
    submissionA.longitude,
    submissionB.latitude,
    submissionB.longitude,
  );
  const timestampStatus = thresholdStatus(
    timestampGap,
    demoConfig.thresholds.timestamp.pass,
    demoConfig.thresholds.timestamp.warningMax,
  );
  const gpsStatus = thresholdStatus(gpsGap, demoConfig.thresholds.gps.pass, demoConfig.thresholds.gps.warningMax);
  const submissionEvidence = evidence.filter((file) =>
    file.submissionId === submissionA.id || file.submissionId === submissionB.id);
  const eachHas = (type: string) =>
    [submissionA.id, submissionB.id].every((id) =>
      submissionEvidence.some((file) => file.submissionId === id && file.evidenceType === type && file.integrityStatus === "complete"));
  const screenshotsComplete = eachHas("Quote screenshot");
  const recordingsComplete = eachHas("Screen recording");
  const metadataComplete = eachHas("Metadata record");
  const evidenceComplete = screenshotsComplete && recordingsComplete && metadataComplete;

  const results: ValidationResult[] = [
    comparisonRule("platform", "Platform", submissionA.platform, submissionB.platform),
    comparisonRule("pickup", "Pickup point", submissionA.pickup, submissionB.pickup),
    comparisonRule("destination", "Destination", submissionA.destination, submissionB.destination),
    comparisonRule("ride_tier", "Ride tier", submissionA.rideTier, submissionB.rideTier),
    comparisonRule("currency", "Currency", submissionA.currency, submissionB.currency),
    comparisonRule("os_family", "Operating-system family", submissionA.operatingSystem, submissionB.operatingSystem, demoConfig.rules.sameOsFamily),
    comparisonRule("app_version", "Application version", submissionA.appVersion, submissionB.appVersion, demoConfig.rules.sameAppVersion),
    {
      rule: "timestamp_sync",
      label: "Request synchronization",
      status: timestampStatus,
      testerAValue: submissionA.quoteTimestamp,
      testerBValue: submissionB.quoteTimestamp,
      difference: `${timestampGap.toFixed(1)} seconds`,
      explanation: timestampStatus === "pass"
        ? "Within the preliminary 5-second demonstration threshold."
        : timestampStatus === "warning"
          ? "Outside the pass threshold but within the preliminary warning range."
          : "Exceeds the preliminary 10-second failure threshold.",
      requirementLevel: "required",
      configuredThreshold: "≤5s pass · >5–10s warning · >10s fail",
      affectedOverallStatus: timestampStatus !== "pass",
    },
    {
      rule: "gps_distance",
      label: "Tester proximity",
      status: gpsStatus,
      testerAValue: `${submissionA.latitude.toFixed(6)}, ${submissionA.longitude.toFixed(6)}`,
      testerBValue: `${submissionB.latitude.toFixed(6)}, ${submissionB.longitude.toFixed(6)}`,
      difference: `${gpsGap.toFixed(1)} feet`,
      explanation: gpsStatus === "pass"
        ? "Within the preliminary 5-foot demonstration threshold."
        : gpsStatus === "warning"
          ? "Outside the pass threshold but within the preliminary warning range."
          : "Exceeds the preliminary 15-foot failure threshold.",
      requirementLevel: "required",
      configuredThreshold: "≤5ft pass · >5–15ft warning · >15ft fail",
      affectedOverallStatus: gpsStatus !== "pass",
    },
    ...[
      ["screenshot", "Quote screenshots", screenshotsComplete],
      ["screen_recording", "Screen recordings", recordingsComplete],
      ["metadata", "Metadata records", metadataComplete],
    ].map(([rule, label, complete]) => ({
      rule: String(rule),
      label: String(label),
      status: complete ? "pass" as const : "fail" as const,
      testerAValue: complete ? "Present" : "Missing or incomplete",
      testerBValue: complete ? "Present" : "Missing or incomplete",
      difference: complete ? "Complete" : "Required evidence missing",
      explanation: complete ? "Required synthetic evidence records are present." : "Required evidence must be completed before inclusion.",
      requirementLevel: "required" as const,
      affectedOverallStatus: !complete,
    })),
  ];

  const missingMetadata = [
    submissionA.platform, submissionA.pickup, submissionA.destination, submissionA.rideTier,
    submissionB.platform, submissionB.pickup, submissionB.destination, submissionB.rideTier,
  ].some((value) => !value);
  if (missingMetadata || !evidenceComplete) {
    return { status: "incomplete", results, timestampDifferenceSeconds: timestampGap, gpsDistanceFeet: gpsGap, evidenceComplete };
  }
  if (results.some((result) => result.status === "fail" && result.requirementLevel === "required")) {
    return { status: "invalid", results, timestampDifferenceSeconds: timestampGap, gpsDistanceFeet: gpsGap, evidenceComplete };
  }
  if (results.some((result) => result.status === "warning")) {
    return { status: "warning", results, timestampDifferenceSeconds: timestampGap, gpsDistanceFeet: gpsGap, evidenceComplete };
  }
  return { status: "valid", results, timestampDifferenceSeconds: timestampGap, gpsDistanceFeet: gpsGap, evidenceComplete };
}

