import type { AssignmentSummary } from "@/lib/data/assignments";
import type { ExpertReview, MatchedPairSummary } from "@/lib/data/matched-pairs";

export function latestReviews(reviews: ExpertReview[]) {
  const latest = new Map<string, ExpertReview>();
  reviews.forEach((review) => { if (!latest.has(review.matched_pair_id)) latest.set(review.matched_pair_id, review); });
  return latest;
}

export function classifyReportPairs(pairs: MatchedPairSummary[], reviews: ExpertReview[]) {
  const latest = latestReviews(reviews);
  const included: MatchedPairSummary[] = [];
  const excluded: MatchedPairSummary[] = [];
  const pending: MatchedPairSummary[] = [];
  pairs.forEach((pair) => {
    const review = latest.get(pair.id)?.status ?? "pending";
    if (review === "pending") return pending.push(pair);
    const latestReview = latest.get(pair.id);
    if (review === "accepted" && pair.evidence_status === "complete" && (["valid", "warning"].includes(pair.technical_status) || latestReview?.technical_exception)) return included.push(pair);
    excluded.push(pair);
  });
  return { latest, included, excluded, pending };
}

export function pairExclusionReason(pair: MatchedPairSummary, latest: Map<string, ExpertReview>) {
  const review = latest.get(pair.id);
  if (review?.status === "rejected") return review.reason || "Rejected by expert reviewer";
  if (["invalid", "incomplete"].includes(pair.technical_status)) return `Technical validation: ${pair.technical_status}`;
  if (pair.evidence_status !== "complete") return `Evidence status: ${pair.evidence_status}`;
  return review?.reason || "Excluded from accepted results";
}

export function assignmentDisposition(assignments: AssignmentSummary[]) {
  const count = (status: AssignmentSummary["status"]) => assignments.filter((assignment) => assignment.status === status).length;
  return {
    total: assignments.length,
    completed: count("completed"),
    cancelled: count("cancelled"),
    expired: count("expired"),
    unfinished: assignments.filter((assignment) => !["completed", "cancelled", "expired"].includes(assignment.status)).length,
  };
}
