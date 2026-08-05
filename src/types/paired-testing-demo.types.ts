export type Role = "coordinator" | "tester" | "expert_reviewer" | "law_firm_viewer";
export type PairValidationStatus = "pending" | "valid" | "warning" | "invalid" | "incomplete";
export type ReviewStatus = "pending" | "accepted" | "flagged" | "rejected";
export type EvidenceStatus = "complete" | "missing" | "pending" | "flagged" | "duplicate";
export type RuleStatus = "pass" | "warning" | "fail" | "not_applicable";
export type AssignmentStatus =
  | "not_started" | "in_progress" | "draft" | "awaiting_partner"
  | "ready_for_validation" | "completed" | "cancelled";
export type StatusType = PairValidationStatus | ReviewStatus | EvidenceStatus | AssignmentStatus | RuleStatus;

export interface StudyRoute { pickup: string; destination: string }
export interface Study {
  id: string; name: string; description: string; status: string; studyType: string;
  platform: string; route: StudyRoute; rideTier: string; isolatedVariable: string;
  testingStart: string; testingEnd: string; targetPairCount: number; protocolVersion: string;
  displayTimezone: string; createdAt: string; updatedAt: string;
}
export interface ProtocolRule {
  id: string; label: string; description: string; required: boolean;
}
export interface ProtocolVersion {
  version: string; effectiveDate: string; modifiedBy: string; summary: string; status: string;
}
export interface ValidationThreshold {
  pass: number; warningMax: number; unit: string;
}
export interface Protocol {
  id: string; version: string; question: string; fixedConditions: string[];
  isolatedVariable: string; requiredEvidence: string[]; exclusions: string[];
  versions: ProtocolVersion[];
}
export interface TesterProfile {
  id: string; alias: string; role: "Tester A" | "Tester B"; accountProfileCategory: string;
  membershipStatus: string; deviceType: string; operatingSystem: string;
  operatingSystemVersion: string; appVersion: string; defaultNetworkType: string;
}
export interface TestAssignment {
  id: string; studyId: string; pairId: string; testerAId: string; testerBId: string;
  scheduledStart: string; scheduledEnd: string; platform: string; pickup: string;
  destination: string; rideTier: string; isolatedVariable: string; status: AssignmentStatus;
  testerAStatus: string; testerBStatus: string; createdAt: string; updatedAt: string;
}
export interface TestSubmission {
  id: string; assignmentId: string; pairId: string; testerId: string; testerAlias: string;
  testerRole: "Tester A" | "Tester B"; platform: string; displayedPrice: number; currency: string;
  quoteTimestamp: string; latitude: number; longitude: number; networkType: string;
  deviceType: string; operatingSystem: string; operatingSystemVersion: string; appVersion: string;
  batteryPercentage: number; accountProfileCategory: string; membershipStatus: string;
  rideTier: string; pickup: string; destination: string; notes: string;
  evidenceFileIds: string[]; submissionStatus: "draft" | "submitted"; submittedAt: string;
}
export interface EvidenceFile {
  id: string; assignmentId: string; pairId: string; submissionId: string; testerId: string;
  testerAlias: string; evidenceType: string; filename: string; mimeType: string; sizeBytes: number;
  captureTimestamp: string; submissionTimestamp: string; syntheticHash: string;
  integrityStatus: EvidenceStatus; reviewStatus: string; chainEventCount: number;
  isSynthetic: boolean; notes: string;
}
export interface ValidationResult {
  rule: string; label: string; status: RuleStatus; testerAValue: string; testerBValue: string;
  difference: string; explanation: string; requirementLevel: "required" | "advisory";
  configuredThreshold?: string; affectedOverallStatus: boolean;
}
export interface ReviewerDecision {
  status: ReviewStatus; reason?: string; note?: string; decidedAt?: string;
}
export interface TestPair {
  id: string; studyId: string; assignmentId: string; testerASubmissionId?: string;
  testerBSubmissionId?: string; isolatedVariable: string; absolutePriceDifference: number;
  percentagePriceDifference: number; higherPricedTester: string; timestampDifferenceSeconds: number;
  gpsDistanceFeet: number; validationResults: ValidationResult[];
  overallValidationStatus: PairValidationStatus; evidenceStatus: EvidenceStatus;
  expertReviewStatus: ReviewStatus; reviewerDecision: ReviewerDecision; reviewerNotes: string[];
  createdAt: string; updatedAt: string;
}
export interface AuditEvent {
  id: string; timestamp: string; actor: string; actorRole: string; action: string;
  objectType: string; objectId: string; category: string; integrityIndicator: string; note?: string;
}
export interface ReportManifest {
  packageId: string; studyId: string; generatedAt: string; protocolVersion: string;
  includedPairCount: number; excludedPairCount: number; evidenceRecordCount: number;
  missingEvidenceCount: number; reports: string[]; disclaimer: string;
}
export interface DashboardMetrics {
  totalPairs: number; validPairs: number; warningPairs: number; invalidPairs: number;
  incompletePairs: number; acceptedPairs: number; flaggedPairs: number; rejectedPairs: number;
  pendingReviewPairs: number; completionPercentage: number; validationRate: number;
  acceptanceRate: number; averageObservedVariance: number; medianObservedVariance: number;
  largestObservedVariance: number; smallestObservedVariance: number; evidenceCompleteRate: number;
}
export interface NavigationItem { label: string; href: string; icon: string; roles?: Role[] }
export interface DemoNotification { id: string; message: string; tone: "success" | "warning" | "info" }
export interface TesterDraft { assignmentId: string; values: Record<string, unknown>; savedAt: string }
export type DashboardFilter = PairValidationStatus | ReviewStatus | "all";

