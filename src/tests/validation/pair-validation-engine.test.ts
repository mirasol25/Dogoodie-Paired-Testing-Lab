import { describe, expect, it } from "vitest";
import { evidenceFixture, pairsFixture, submissionsFixture } from "@/data/paired-testing-demo.fixtures";
import { validatePair } from "@/lib/validation/pair-validation-engine";
import type { TestSubmission } from "@/types/paired-testing-demo.types";

const submissionA = submissionsFixture.find((item) => item.id === "SUB-A-008")!;
const submissionB = submissionsFixture.find((item) => item.id === "SUB-B-008")!;
const clone = (submission: TestSubmission, changes: Partial<TestSubmission> = {}) => ({ ...submission, ...changes });

describe("pair validation thresholds", () => {
  it("passes a timestamp difference of five seconds", () => {
    const result = validatePair(submissionA, clone(submissionB, { quoteTimestamp: "2026-05-14T14:14:27.400Z" }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "timestamp_sync")?.status).toBe("pass");
  });

  it("warns above five and through ten seconds", () => {
    const result = validatePair(submissionA, clone(submissionB, { quoteTimestamp: "2026-05-14T14:14:30.000Z" }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "timestamp_sync")?.status).toBe("warning");
    expect(result.status).toBe("warning");
  });

  it("fails above ten seconds", () => {
    const result = validatePair(submissionA, clone(submissionB, { quoteTimestamp: "2026-05-14T14:14:33.000Z" }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "timestamp_sync")?.status).toBe("fail");
    expect(result.status).toBe("invalid");
  });

  it("passes GPS proximity at five feet", () => {
    const result = validatePair(submissionA, clone(submissionB, { latitude: submissionA.latitude + 0.000013 }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "gps_distance")?.status).toBe("pass");
  });

  it("warns for GPS proximity above five and through fifteen feet", () => {
    const result = validatePair(submissionA, clone(submissionB, { latitude: submissionA.latitude + 0.000025 }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "gps_distance")?.status).toBe("warning");
  });

  it("fails for GPS proximity above fifteen feet", () => {
    const result = validatePair(submissionA, clone(submissionB, { latitude: submissionA.latitude + 0.00006 }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "gps_distance")?.status).toBe("fail");
  });
});

describe("pair conformity scenarios", () => {
  it("marks a fully conforming featured pair valid", () => {
    expect(validatePair(submissionA, submissionB, evidenceFixture).status).toBe("valid");
  });

  it("returns incomplete for a missing partner submission", () => {
    expect(validatePair(submissionA, undefined, evidenceFixture).status).toBe("incomplete");
  });

  it("returns incomplete when required evidence is missing", () => {
    const withoutRecordings = evidenceFixture.filter((item) => item.evidenceType !== "Screen recording");
    expect(validatePair(submissionA, submissionB, withoutRecordings).status).toBe("incomplete");
  });

  it("fails a platform mismatch", () => {
    const result = validatePair(submissionA, clone(submissionB, { platform: "RideApp B" }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "platform")?.status).toBe("fail");
    expect(result.status).toBe("invalid");
  });

  it("fails a route mismatch", () => {
    const result = validatePair(submissionA, clone(submissionB, { destination: "Different terminal" }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "destination")?.status).toBe("fail");
  });

  it("fails a ride-tier mismatch", () => {
    const result = validatePair(submissionA, clone(submissionB, { rideTier: "Priority Ride" }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "ride_tier")?.status).toBe("fail");
  });

  it("fails a configured app-version mismatch", () => {
    const result = validatePair(submissionA, clone(submissionB, { appVersion: "7.13.9" }), evidenceFixture);
    expect(result.results.find((item) => item.rule === "app_version")?.status).toBe("fail");
  });

  it("maintains the required deterministic fixture distribution", () => {
    const counts = pairsFixture.reduce<Record<string, number>>((result, pair) => {
      result[pair.overallValidationStatus] = (result[pair.overallValidationStatus] ?? 0) + 1;
      return result;
    }, {});
    expect(counts).toMatchObject({ valid: 8, warning: 2, invalid: 1, incomplete: 1 });
  });

  it("derives the featured pair calculations from its submissions", () => {
    const pair = pairsFixture.find((item) => item.id === "PAIR-008")!;
    expect(pair.absolutePriceDifference).toBeCloseTo(16.25);
    expect(pair.percentagePriceDifference).toBeCloseTo(34, 1);
    expect(pair.timestampDifferenceSeconds).toBeCloseTo(3.2);
    expect(pair.gpsDistanceFeet).toBeCloseTo(3.8, 1);
  });
});

