import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export interface StudyCollectionCapacity {
  target: number | null;
  acceptedUsable: number;
  acceptedWithException: number;
  awaitingReview: number;
  activeUnpaired: number;
  rejected: number;
  coverage: number;
  assignmentsNeeded: number;
  replacementNeeded: number;
  canCreate: boolean;
}

export async function getStudyCollectionCapacity(studyId: string): Promise<StudyCollectionCapacity> {
  const supabase = await createClient();
  const [studyResult, assignmentsResult, pairsResult] = await Promise.all([
    supabase.from("studies").select("target_pair_count").eq("id", studyId).single(),
    supabase.from("assignments").select("id,status").eq("study_id", studyId),
    supabase.from("matched_pairs").select("id,assignment_id,technical_status,evidence_status").eq("study_id", studyId),
  ]);
  if (studyResult.error || assignmentsResult.error || pairsResult.error) throw new Error("Study collection capacity could not be loaded.");

  const pairs = pairsResult.data;
  const reviewsResult = pairs.length
    ? await supabase.from("expert_reviews").select("matched_pair_id,status,technical_exception,updated_at").in("matched_pair_id", pairs.map((pair) => pair.id)).order("updated_at", { ascending: false })
    : { data: [], error: null };
  if (reviewsResult.error) throw new Error("Study review decisions could not be loaded.");

  const latestReview = new Map<string, { status: Database["public"]["Enums"]["review_status"]; technicalException: boolean }>();
  for (const review of reviewsResult.data) {
    if (!latestReview.has(review.matched_pair_id)) latestReview.set(review.matched_pair_id, { status: review.status, technicalException: review.technical_exception });
  }

  const isUsable = (pair: typeof pairs[number]) => {
    const review = latestReview.get(pair.id);
    return review?.status === "accepted" && pair.evidence_status === "complete" && (["valid", "warning"].includes(pair.technical_status) || review.technicalException);
  };
  const acceptedUsable = pairs.filter(isUsable).length;
  const acceptedWithException = pairs.filter((pair) => isUsable(pair) && latestReview.get(pair.id)?.technicalException).length;
  const awaitingReview = pairs.filter((pair) => {
    const status = latestReview.get(pair.id)?.status ?? "pending";
    return status === "pending" || status === "flagged";
  }).length;
  const rejected = pairs.filter((pair) => latestReview.get(pair.id)?.status === "rejected").length;
  const pairedAssignmentIds = new Set(pairs.map((pair) => pair.assignment_id));
  const activeUnpaired = assignmentsResult.data.filter((assignment) => !pairedAssignmentIds.has(assignment.id) && !["completed", "cancelled", "expired"].includes(assignment.status)).length;
  const target = studyResult.data.target_pair_count;
  const coverage = acceptedUsable + awaitingReview + activeUnpaired;
  const assignmentsNeeded = target === null ? 0 : Math.max(target - coverage, 0);
  const replacementNeeded = Math.min(rejected, assignmentsNeeded);

  return { target, acceptedUsable, acceptedWithException, awaitingReview, activeUnpaired, rejected, coverage, assignmentsNeeded, replacementNeeded, canCreate: target === null || coverage < target };
}
