import { describe, expect, it } from "vitest";
import { pairsFixture } from "@/data/paired-testing-demo.fixtures";
import { calculateDashboardMetrics } from "@/lib/calculations/dashboard-metrics";

describe("dashboard metrics", () => {
  it("recalculates counts from pair state", () => {
    const metrics = calculateDashboardMetrics(pairsFixture);
    expect(metrics.totalPairs).toBe(12);
    expect(metrics.validPairs).toBe(8);
    expect(metrics.warningPairs).toBe(2);
    expect(metrics.incompletePairs).toBe(1);
    expect(metrics.acceptedPairs).toBe(4);
  });

  it("calculates median observed variance from completed pairs", () => {
    const metrics = calculateDashboardMetrics(pairsFixture);
    const sorted = pairsFixture
      .filter((pair) => pair.overallValidationStatus !== "incomplete")
      .map((pair) => pair.percentagePriceDifference)
      .sort((a, b) => a - b);
    expect(metrics.medianObservedVariance).toBe(sorted[Math.floor(sorted.length / 2)]);
  });

  it("updates review metrics when pair state changes", () => {
    const modified = pairsFixture.map((pair) => pair.id === "PAIR-008"
      ? { ...pair, expertReviewStatus: "accepted" as const }
      : pair);
    expect(calculateDashboardMetrics(modified).acceptedPairs).toBe(5);
  });
});

