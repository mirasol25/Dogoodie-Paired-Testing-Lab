import { demoConfig } from "@/config/paired-testing-demo.config";
import { absolutePriceDifference, higherPricedTester, percentagePriceDifference } from "@/lib/calculations/price-calculations";
import { validatePair } from "@/lib/validation/pair-validation-engine";
import type {
  AuditEvent,
  EvidenceFile,
  Protocol,
  ReportManifest,
  ReviewerDecision,
  Study,
  TestAssignment,
  TesterProfile,
  TestPair,
  TestSubmission,
} from "@/types/paired-testing-demo.types";

const pad = (value: number) => String(value).padStart(3, "0");
const isoAt = (day: number, seconds = 0) =>
  new Date(Date.parse(`2026-05-${String(6 + day).padStart(2, "0")}T14:14:22.400Z`) + seconds * 1000).toISOString();

export const studyFixture: Study = {
  id: demoConfig.study.id,
  name: demoConfig.study.name,
  description: "Controlled synthetic comparison of displayed prices under closely matched conditions.",
  status: demoConfig.study.status,
  studyType: demoConfig.study.studyType,
  platform: demoConfig.study.platform,
  route: { pickup: demoConfig.study.pickup, destination: demoConfig.study.destination },
  rideTier: demoConfig.study.rideTier,
  isolatedVariable: demoConfig.study.isolatedVariable,
  testingStart: demoConfig.study.testingStart,
  testingEnd: demoConfig.study.testingEnd,
  targetPairCount: demoConfig.study.targetPairCount,
  protocolVersion: demoConfig.study.protocolVersion,
  displayTimezone: demoConfig.study.timezone,
  createdAt: "2026-05-01T13:00:00.000Z",
  updatedAt: "2026-05-11T16:30:00.000Z",
};

export const protocolFixture: Protocol = {
  id: "PROTO-001",
  version: demoConfig.study.protocolVersion,
  question: "Under closely matched testing conditions, does RideApp A display materially different prices to different synthetic tester profiles?",
  fixedConditions: [
    "Same fictional platform", "Same pickup point", "Same destination point", "Same ride tier",
    "Closely synchronized quote request", "Same operating-system family", "Same application version",
    "Same network category when required", "Same currency", "Same study window",
  ],
  isolatedVariable: demoConfig.study.isolatedVariable,
  requiredEvidence: [
    "Quote screenshot", "Full-screen-recording placeholder", "Timestamp", "Latitude", "Longitude",
    "Device type", "Operating system", "App version", "Network category", "Ride tier",
    "Pickup", "Destination", "Tester identifier", "Assignment identifier", "Submission notes",
  ],
  exclusions: [
    "Missing second submission", "Mismatched platform", "Mismatched route", "Mismatched ride tier",
    "Excessive timestamp difference", "Excessive GPS distance", "Missing required evidence",
    "App-version mismatch", "Duplicate submission", "Reviewer rejection",
  ],
  versions: [
    { version: "v1.2", effectiveDate: "2026-05-11T16:30:00.000Z", modifiedBy: "Protocol Working Group", summary: "Clarified evidence completeness and warning thresholds.", status: "Active" },
    { version: "v1.1", effectiveDate: "2026-05-06T15:00:00.000Z", modifiedBy: "Test Coordinator", summary: "Added screen-recording placeholder requirement.", status: "Superseded" },
    { version: "v1.0", effectiveDate: "2026-05-01T13:00:00.000Z", modifiedBy: "Research Team", summary: "Initial demonstration protocol.", status: "Superseded" },
  ],
};

const aliases = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"];
export const testerProfilesFixture: TesterProfile[] = aliases.map((alias, index) => ({
  id: `TESTER-${String(index + 1).padStart(2, "0")}`,
  alias: `Tester ${alias}`,
  role: index % 2 === 0 ? "Tester A" : "Tester B",
  accountProfileCategory: index % 2 === 0 ? "Standard account" : "Subscription account",
  membershipStatus: index % 2 === 0 ? "Non-member" : "Subscription member",
  deviceType: index < 4 ? "Phone Model X" : "Phone Model Y",
  operatingSystem: "iOS",
  operatingSystemVersion: index < 6 ? "18.4" : "18.4.1",
  appVersion: "7.14.2",
  defaultNetworkType: "5G",
}));

const testerPairs = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 3], [2, 5], [4, 7], [0, 1], [2, 7], [4, 1], [6, 3], [0, 5]];
export const assignmentsFixture: TestAssignment[] = testerPairs.map(([a, b], index) => {
  const number = index + 1;
  const incomplete = number === 10;
  return {
    id: `ASN-${pad(number)}`,
    studyId: studyFixture.id,
    pairId: `PAIR-${pad(number)}`,
    testerAId: testerProfilesFixture[a].id,
    testerBId: testerProfilesFixture[b].id,
    scheduledStart: isoAt(number, -120),
    scheduledEnd: isoAt(number, 600),
    platform: studyFixture.platform,
    pickup: studyFixture.route.pickup,
    destination: studyFixture.route.destination,
    rideTier: studyFixture.rideTier,
    isolatedVariable: studyFixture.isolatedVariable,
    status: incomplete ? "awaiting_partner" : "completed",
    testerAStatus: "Submitted",
    testerBStatus: incomplete ? "Not started" : "Submitted",
    createdAt: "2026-05-02T12:00:00.000Z",
    updatedAt: isoAt(number, 90),
  };
});

const pricePairs = [
  [52, 52], [49.9, 51.2], [61.4, 58.1], [44.5, 50.25], [55.75, 55.75], [48.2, 53.4],
  [62, 59.25], [47.8, 64.05], [50, 56.5], [45, 0], [58, 71], [67, 61.5],
];
const timeGaps = [2.1, 3.8, 1.7, 4.4, 2.8, 4.9, 3.5, 3.2, 7.2, 0, 12.4, 6.4];
const latitudeGaps = [0.000006, 0.000009, 0.000008, 0.000007, 0.00001, 0.000006, 0.000008, 0.0000104, 0.000025, 0, 0.00006, 0.000024];

const submissions: TestSubmission[] = [];
assignmentsFixture.forEach((assignment, index) => {
  const number = index + 1;
  const [testerAIndex, testerBIndex] = testerPairs[index];
  const profiles = [testerProfilesFixture[testerAIndex], testerProfilesFixture[testerBIndex]];
  const roles = ["Tester A", "Tester B"] as const;
  const suffixes = ["A", "B"];
  const quoteTimes = [isoAt(number), isoAt(number, timeGaps[index])];
  const baseLatitude = 40.758 + index * 0.00002;
  const latitudes = [baseLatitude, baseLatitude + latitudeGaps[index]];

  roles.forEach((role, side) => {
    if (number === 10 && side === 1) return;
    const profile = profiles[side];
    const invalidPair = number === 11 && side === 1;
    submissions.push({
      id: `SUB-${suffixes[side]}-${pad(number)}`,
      assignmentId: assignment.id,
      pairId: assignment.pairId,
      testerId: profile.id,
      testerAlias: profile.alias,
      testerRole: role,
      platform: studyFixture.platform,
      displayedPrice: pricePairs[index][side],
      currency: "USD",
      quoteTimestamp: quoteTimes[side],
      latitude: latitudes[side],
      longitude: -73.9855,
      networkType: "5G",
      deviceType: profile.deviceType,
      operatingSystem: profile.operatingSystem,
      operatingSystemVersion: profile.operatingSystemVersion,
      appVersion: invalidPair ? "7.13.9" : "7.14.2",
      batteryPercentage: 82 - index - side * 3,
      accountProfileCategory: profile.accountProfileCategory,
      membershipStatus: profile.membershipStatus,
      rideTier: invalidPair ? "Priority Ride" : studyFixture.rideTier,
      pickup: studyFixture.route.pickup,
      destination: studyFixture.route.destination,
      notes: number === 8
        ? "Quote captured immediately after synchronized request cue. No visible surge message."
        : number === 11 ? "Technical mismatch retained to demonstrate exclusion review." : "Synthetic protocol-led submission.",
      evidenceFileIds: [],
      submissionStatus: "submitted",
      submittedAt: isoAt(number, timeGaps[index] + 25 + side),
    });
  });
});

export const evidenceFixture: EvidenceFile[] = [];
let evidenceCounter = 1;
submissions.forEach((submission) => {
  const types = ["Quote screenshot", "Screen recording", "Metadata record"];
  if (submission.pairId === "PAIR-010") types.splice(1, 1);
  types.forEach((evidenceType, index) => {
    const id = `FILE-${pad(evidenceCounter++)}`;
    submission.evidenceFileIds.push(id);
    evidenceFixture.push({
      id,
      assignmentId: submission.assignmentId,
      pairId: submission.pairId,
      submissionId: submission.id,
      testerId: submission.testerId,
      testerAlias: submission.testerAlias,
      evidenceType,
      filename: `${submission.id.toLowerCase()}-${evidenceType.toLowerCase().replaceAll(" ", "-")}.${index === 0 ? "png" : index === 1 ? "mp4" : "json"}`,
      mimeType: index === 0 ? "image/png" : index === 1 ? "video/mp4" : "application/json",
      sizeBytes: index === 0 ? 842_130 + evidenceCounter * 1024 : index === 1 ? 7_420_000 + evidenceCounter * 4096 : 6_800 + evidenceCounter * 32,
      captureTimestamp: submission.quoteTimestamp,
      submissionTimestamp: submission.submittedAt,
      syntheticHash: `demo-sha256-${submission.pairId.toLowerCase()}-${id.toLowerCase()}-9f42a8c1`,
      integrityStatus: "complete",
      reviewStatus: submission.pairId === "PAIR-009" ? "Pending clarification" : "Ready",
      chainEventCount: 3 + index,
      isSynthetic: true,
      notes: "Synthetic evidence metadata only; not a cryptographic attestation.",
    });
  });
});

export const submissionsFixture = submissions;

const reviewByPair: Record<number, ReviewerDecision> = {
  1: { status: "accepted", reason: "Controls satisfied", note: "Technical controls appear satisfied for demonstration review.", decidedAt: "2026-05-07T15:30:00.000Z" },
  3: { status: "accepted", reason: "Controls satisfied", note: "Accepted for descriptive package inclusion.", decidedAt: "2026-05-09T16:10:00.000Z" },
  4: { status: "accepted", reason: "Controls satisfied", note: "No technical exceptions identified.", decidedAt: "2026-05-10T17:00:00.000Z" },
  6: { status: "accepted", reason: "Controls satisfied", note: "Controls conform to preliminary protocol.", decidedAt: "2026-05-12T18:15:00.000Z" },
  9: { status: "flagged", reason: "Timestamp concern", note: "Retain for expert follow-up on synchronization warning.", decidedAt: "2026-05-15T16:45:00.000Z" },
  11: { status: "rejected", reason: "Ride-tier mismatch", note: "Excluded from review-ready set due to multiple technical failures.", decidedAt: "2026-05-17T16:45:00.000Z" },
};

export const pairsFixture: TestPair[] = assignmentsFixture.map((assignment, index) => {
  const submissionA = submissionsFixture.find((submission) => submission.assignmentId === assignment.id && submission.testerRole === "Tester A");
  const submissionB = submissionsFixture.find((submission) => submission.assignmentId === assignment.id && submission.testerRole === "Tester B");
  const validation = validatePair(submissionA, submissionB, evidenceFixture);
  const decision = reviewByPair[index + 1] ?? { status: "pending" as const };
  const priceA = submissionA?.displayedPrice ?? 0;
  const priceB = submissionB?.displayedPrice ?? 0;
  return {
    id: assignment.pairId,
    studyId: assignment.studyId,
    assignmentId: assignment.id,
    testerASubmissionId: submissionA?.id,
    testerBSubmissionId: submissionB?.id,
    isolatedVariable: assignment.isolatedVariable,
    absolutePriceDifference: submissionA && submissionB ? absolutePriceDifference(priceA, priceB) : 0,
    percentagePriceDifference: submissionA && submissionB ? percentagePriceDifference(priceA, priceB) : 0,
    higherPricedTester: submissionA && submissionB
      ? higherPricedTester(priceA, priceB, submissionA.testerAlias, submissionB.testerAlias)
      : "Pending partner",
    timestampDifferenceSeconds: validation.timestampDifferenceSeconds,
    gpsDistanceFeet: validation.gpsDistanceFeet,
    validationResults: validation.results,
    overallValidationStatus: validation.status,
    evidenceStatus: validation.evidenceComplete ? (index === 8 ? "flagged" : "complete") : "missing",
    expertReviewStatus: decision.status,
    reviewerDecision: decision,
    reviewerNotes: decision.note ? [decision.note] : [],
    createdAt: isoAt(index + 1, 50),
    updatedAt: decision.decidedAt ?? isoAt(index + 1, 55),
  };
});

const eventTemplates = [
  ["Study created", "Study", studyFixture.id, "study"],
  ["Protocol version published", "Protocol", "PROTO-001", "protocol"],
  ["Assignment created", "Assignment", "ASN-001", "assignment"],
  ["Tester confirmed ready", "Submission", "SUB-A-008", "submission"],
  ["Partner submission received", "Submission", "SUB-B-008", "submission"],
  ["Pair automatically matched", "Pair", "PAIR-008", "validation"],
  ["Technical validation completed", "Pair", "PAIR-008", "validation"],
  ["Reviewer opened pair", "Pair", "PAIR-009", "review"],
  ["Reviewer added note", "Pair", "PAIR-009", "review"],
  ["Pair flagged", "Pair", "PAIR-009", "review"],
  ["Pair accepted", "Pair", "PAIR-006", "review"],
  ["Report generated", "Report", "PKG-001", "report"],
];
export const auditEventsFixture: AuditEvent[] = eventTemplates.map(([action, objectType, objectId, category], index) => ({
  id: `AUD-${pad(index + 1)}`,
  timestamp: new Date(Date.parse("2026-05-01T13:00:00.000Z") + index * 86_400_000 + index * 620_000).toISOString(),
  actor: index > 6 ? "Expert Reviewer 01" : index > 1 ? "Demonstration User" : "Protocol Working Group",
  actorRole: index > 6 ? "Expert Reviewer" : index > 1 ? "Tester / Coordinator" : "Coordinator",
  action,
  objectType,
  objectId,
  category,
  integrityIndicator: "Synthetic event record",
  note: "Demonstration activity; not an immutable audit record.",
}));

export const reportManifestFixture: ReportManifest = {
  packageId: demoConfig.reports.packageId,
  studyId: studyFixture.id,
  generatedAt: "2026-05-18T17:00:00.000Z",
  protocolVersion: protocolFixture.version,
  includedPairCount: pairsFixture.filter((pair) => pair.expertReviewStatus === "accepted").length,
  excludedPairCount: pairsFixture.filter((pair) => pair.expertReviewStatus === "rejected" || pair.overallValidationStatus === "invalid").length,
  evidenceRecordCount: evidenceFixture.length,
  missingEvidenceCount: pairsFixture.filter((pair) => pair.evidenceStatus === "missing").length,
  reports: [...demoConfig.reports.titles],
  disclaimer: demoConfig.disclaimer,
};

export const initialDemoState = {
  studies: [studyFixture],
  assignments: assignmentsFixture,
  submissions: submissionsFixture,
  pairs: pairsFixture,
  evidence: evidenceFixture,
  auditEvents: auditEventsFixture,
};

