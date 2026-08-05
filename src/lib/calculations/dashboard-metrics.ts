import { median } from "@/lib/calculations/price-calculations";
import type { DashboardMetrics, TestPair } from "@/types/paired-testing-demo.types";

export function calculateDashboardMetrics(pairs: TestPair[], targetPairCount = 100): DashboardMetrics {
  const completed = pairs.filter((pair) => pair.overallValidationStatus !== "incomplete");
  const variances = completed.map((pair) => pair.percentagePriceDifference);
  const count = (status: TestPair["overallValidationStatus"]) =>
    pairs.filter((pair) => pair.overallValidationStatus === status).length;
  const reviews = (status: TestPair["expertReviewStatus"]) =>
    pairs.filter((pair) => pair.expertReviewStatus === status).length;
  const accepted = reviews("accepted");
  const reviewed = accepted + reviews("flagged") + reviews("rejected");
  return {
    totalPairs: pairs.length,
    validPairs: count("valid"),
    warningPairs: count("warning"),
    invalidPairs: count("invalid"),
    incompletePairs: count("incomplete"),
    acceptedPairs: accepted,
    flaggedPairs: reviews("flagged"),
    rejectedPairs: reviews("rejected"),
    pendingReviewPairs: reviews("pending"),
    completionPercentage: targetPairCount ? (completed.length / targetPairCount) * 100 : 0,
    validationRate: completed.length ? (count("valid") / completed.length) * 100 : 0,
    acceptanceRate: reviewed ? (accepted / reviewed) * 100 : 0,
    averageObservedVariance: variances.length ? variances.reduce((sum, value) => sum + value, 0) / variances.length : 0,
    medianObservedVariance: median(variances),
    largestObservedVariance: variances.length ? Math.max(...variances) : 0,
    smallestObservedVariance: variances.length ? Math.min(...variances) : 0,
    evidenceCompleteRate: pairs.length
      ? (pairs.filter((pair) => pair.evidenceStatus === "complete").length / pairs.length) * 100
      : 0,
  };
}

